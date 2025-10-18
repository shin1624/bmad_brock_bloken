/**
 * ProjectilePool - Object pool for Projectile entities
 * Story 4.3b - Phase 2 Advanced Power-ups
 *
 * Singleton pattern for centralized projectile management
 * Pre-allocates projectiles to eliminate GC pressure
 */
import { ObjectPool } from "./ObjectPool";
import { Projectile } from "../entities/Projectile";

export class ProjectilePool extends ObjectPool<Projectile> {
  private static instance: ProjectilePool;
  private idCounter: number = 0;
  private readonly strictPoolSize: number;

  private constructor(poolSize: number = 20) {
    super(
      () => new Projectile(`projectile_${this.idCounter++}`),
      (projectile) => projectile.reset(),
      poolSize,
    );

    this.strictPoolSize = poolSize;

    // Pre-fill pool for zero-allocation gameplay
    this.preFill(poolSize);
  }

  /**
   * Acquire projectile from pool
   * Returns null if pool is exhausted (strict pool limit)
   */
  public acquire(): Projectile | null {
    // Only return projectiles from pre-filled pool
    if (this.isEmpty()) {
      return null;
    }
    return super.acquire();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(poolSize?: number): ProjectilePool {
    if (!ProjectilePool.instance) {
      ProjectilePool.instance = new ProjectilePool(poolSize);
    }
    return ProjectilePool.instance;
  }

  /**
   * Reset singleton (for testing)
   */
  public static resetInstance(): void {
    if (ProjectilePool.instance) {
      ProjectilePool.instance.clear();
    }
    ProjectilePool.instance = null as any;
  }
}
