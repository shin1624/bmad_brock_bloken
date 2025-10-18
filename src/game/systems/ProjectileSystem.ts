/**
 * ProjectileSystem - Manages laser projectiles and collision detection
 * Story 4.3b - Phase 2 Advanced Power-ups
 *
 * Features:
 * - Object pooling for performance
 * - Collision detection with blocks
 * - Automatic cleanup of off-screen projectiles
 * - Event-driven architecture
 */
import { Projectile, ProjectileConfig } from "../entities/Projectile";
import { ProjectilePool } from "../utils/ProjectilePool";
import { Block } from "../entities/Block";
import { EventBus } from "../core/EventBus";
import { getQualitySettings } from "../../stores/qualitySettingsStore";

export interface ProjectileSystemConfig {
  maxActiveProjectiles: number;
  poolSize: number;
  enableDebugMode: boolean;
}

export interface ProjectileSystemContext {
  canvasWidth: number;
  canvasHeight: number;
  blocks: Block[];
  eventBus?: EventBus;
}

/**
 * ProjectileSystem manages laser projectiles lifecycle
 */
export class ProjectileSystem {
  private projectiles: Projectile[] = [];
  private projectilePool: ProjectilePool;
  private config: ProjectileSystemConfig;
  private context: ProjectileSystemContext;

  // Performance monitoring
  private lastCleanupTime: number = 0;
  private cleanupInterval: number = 1000; // Clean up every 1 second

  constructor(
    context: ProjectileSystemContext,
    config: Partial<ProjectileSystemConfig> = {},
  ) {
    this.context = context;

    // Get quality settings to determine maxActiveProjectiles
    const qualitySettings = getQualitySettings();

    this.config = {
      maxActiveProjectiles:
        config.maxActiveProjectiles || qualitySettings.maxActiveProjectiles,
      poolSize: config.poolSize || qualitySettings.maxActiveProjectiles,
      enableDebugMode: config.enableDebugMode || false,
    };

    this.projectilePool = ProjectilePool.getInstance(this.config.poolSize);
  }

  /**
   * Spawn a new projectile
   */
  public spawn(config: ProjectileConfig): Projectile | null {
    // Check if we've hit the limit
    if (this.projectiles.length >= this.config.maxActiveProjectiles) {
      if (this.config.enableDebugMode) {
        console.warn("ProjectileSystem: Max projectiles reached");
      }
      return null;
    }

    // Acquire from pool
    const projectile = this.projectilePool.acquire();
    if (!projectile) {
      if (this.config.enableDebugMode) {
        console.error(
          "ProjectileSystem: Failed to acquire projectile from pool",
        );
      }
      return null;
    }

    // Initialize and add to active list
    projectile.initialize(config);
    this.projectiles.push(projectile);

    // Emit spawn event
    if (this.context.eventBus) {
      this.context.eventBus.emit("projectile:spawned", {
        type: config.type,
        position: config.position,
      });
    }

    return projectile;
  }

  /**
   * Update all active projectiles
   */
  public update(deltaTime: number): void {
    const now = Date.now();

    // Update positions
    for (const projectile of this.projectiles) {
      if (!projectile.active) continue;
      projectile.update(deltaTime);
    }

    // Check collisions
    this.checkCollisions();

    // Periodic cleanup
    if (now - this.lastCleanupTime > this.cleanupInterval) {
      this.cleanup();
      this.lastCleanupTime = now;
    }
  }

  /**
   * Check projectile collisions with blocks
   */
  private checkCollisions(): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      if (!projectile.active) continue;

      // Check collision with each block
      for (const block of this.context.blocks) {
        if (!block.active || block.isDestroyed) continue;

        const collision = this.checkProjectileBlockCollision(projectile, block);
        if (collision) {
          this.handleCollision(projectile, block);
          break; // Projectile destroyed, check next projectile
        }
      }
    }
  }

  /**
   * Simple AABB collision detection
   */
  private checkProjectileBlockCollision(
    projectile: Projectile,
    block: Block,
  ): boolean {
    const pLeft = projectile.position.x - projectile.size.width / 2;
    const pRight = projectile.position.x + projectile.size.width / 2;
    const pTop = projectile.position.y - projectile.size.height / 2;
    const pBottom = projectile.position.y + projectile.size.height / 2;

    const bLeft = block.position.x;
    const bRight = block.position.x + block.width;
    const bTop = block.position.y;
    const bBottom = block.position.y + block.height;

    return !(
      pRight < bLeft ||
      pLeft > bRight ||
      pBottom < bTop ||
      pTop > bBottom
    );
  }

  /**
   * Handle collision between projectile and block
   */
  private handleCollision(projectile: Projectile, block: Block): void {
    // Apply damage to block
    block.currentHitPoints -= projectile.damage;
    if (block.currentHitPoints <= 0) {
      block.isDestroyed = true;
      block.active = false;
    }

    // Deactivate projectile
    projectile.active = false;

    // Emit collision event
    if (this.context.eventBus) {
      this.context.eventBus.emit("projectile:hit", {
        projectile: {
          id: projectile.id,
          type: projectile.type,
          position: projectile.position,
        },
        block: {
          id: block.id,
          type: block.type,
          position: { x: block.position.x, y: block.position.y },
          destroyed: block.isDestroyed,
        },
      });
    }

    if (this.config.enableDebugMode) {
      console.log(`Projectile ${projectile.id} hit block ${block.id}`);
    }
  }

  /**
   * Clean up inactive and off-screen projectiles
   */
  private cleanup(): void {
    const beforeCount = this.projectiles.length;

    // Remove inactive or off-screen projectiles
    this.projectiles = this.projectiles.filter((projectile) => {
      if (!projectile.active) {
        this.projectilePool.release(projectile);
        return false;
      }

      if (projectile.isExpired()) {
        projectile.active = false;
        this.projectilePool.release(projectile);
        return false;
      }

      if (
        projectile.isOffScreen(
          this.context.canvasWidth,
          this.context.canvasHeight,
        )
      ) {
        projectile.active = false;
        this.projectilePool.release(projectile);
        return false;
      }

      return true;
    });

    const afterCount = this.projectiles.length;
    if (this.config.enableDebugMode && beforeCount !== afterCount) {
      console.log(
        `ProjectileSystem: Cleaned up ${beforeCount - afterCount} projectiles`,
      );
    }
  }

  /**
   * Render all active projectiles
   */
  public render(ctx: CanvasRenderingContext2D): void {
    for (const projectile of this.projectiles) {
      if (projectile.active) {
        projectile.render(ctx);
      }
    }
  }

  /**
   * Clear all projectiles
   */
  public clear(): void {
    for (const projectile of this.projectiles) {
      projectile.active = false;
      this.projectilePool.release(projectile);
    }
    this.projectiles = [];
  }

  /**
   * Update context (canvas size, blocks reference)
   */
  public updateContext(context: Partial<ProjectileSystemContext>): void {
    if (context.canvasWidth !== undefined) {
      this.context.canvasWidth = context.canvasWidth;
    }
    if (context.canvasHeight !== undefined) {
      this.context.canvasHeight = context.canvasHeight;
    }
    if (context.blocks !== undefined) {
      this.context.blocks = context.blocks;
    }
    if (context.eventBus !== undefined) {
      this.context.eventBus = context.eventBus;
    }
  }

  /**
   * Get statistics for debugging
   */
  public getStats(): {
    activeCount: number;
    poolStats: ReturnType<ProjectilePool["getStats"]>;
  } {
    return {
      activeCount: this.projectiles.length,
      poolStats: this.projectilePool.getStats(),
    };
  }

  /**
   * Destroy system and release resources
   */
  public destroy(): void {
    this.clear();
    // Pool is singleton, don't destroy it
  }
}
