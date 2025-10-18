# ProjectileSystem Design Document

**Document Type**: Technical Design Specification  
**Status**: Draft for Architect Review  
**Created**: 2025-10-16  
**Author**: Dev Agent (James)  
**Related Story**: 4.3b - Advanced Power-ups Phase 2  

## Executive Summary

This document defines the architecture for a new ProjectileSystem that will enable the Laser Gun power-up in Story 4.3b. The system follows the established ECS pattern, integrates with existing collision detection, and uses object pooling for performance optimization.

### Design Goals
1. ✅ **Performance**: Maintain 55 FPS with 3 active power-ups
2. ✅ **Memory Efficiency**: Object pooling with max 250MB usage
3. ✅ **Integration**: Seamless integration with existing systems
4. ✅ **Extensibility**: Support future projectile types beyond laser

## System Overview

### Architecture Position
```
┌─────────────────────────────────────────────┐
│          Domain Layer (Game Core)            │
│                                               │
│  ┌──────────────┐      ┌─────────────────┐  │
│  │ PowerUpSystem│──────│ ProjectileSystem │  │ ← NEW
│  └──────────────┘      └─────────────────┘  │
│         ↓                       ↓             │
│  ┌──────────────┐      ┌─────────────────┐  │
│  │ PhysicsSystem│──────│ CollisionSystem  │  │
│  └──────────────┘      └─────────────────┘  │
└─────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│     Infrastructure Layer (Canvas)            │
│         RenderingSystem                       │
└─────────────────────────────────────────────┘
```

### Component Diagram
```
ProjectileSystem
├── ProjectilePool (Object Pool)
│   ├── create() → Projectile
│   ├── acquire() → Projectile
│   └── release(Projectile)
├── Projectile[] (Active projectiles)
├── CollisionDetector (Shared)
└── EventBus (Shared)
```

## Core Components

### 1. Projectile Entity

**File**: `src/game/entities/Projectile.ts`

```typescript
import { Entity } from './Entity';
import { Vector2D } from '../../types/game.types';

export enum ProjectileType {
  LASER = 'laser',
  // Future: MISSILE, PLASMA, etc.
}

export interface ProjectileConfig {
  type: ProjectileType;
  position: Vector2D;
  velocity: Vector2D;
  damage: number;
  size: { width: number; height: number };
  color: string;
  glowColor?: string;
  lifetime?: number; // milliseconds, optional
}

export class Projectile extends Entity {
  public type: ProjectileType;
  public damage: number;
  public size: { width: number; height: number };
  public color: string;
  public glowColor?: string;
  public active: boolean = false;
  
  private createdAt: number = 0;
  private lifetime?: number;

  constructor(id: string) {
    super(id);
    this.type = ProjectileType.LASER;
    this.damage = 1;
    this.size = { width: 4, height: 12 };
    this.color = '#FF0000';
  }

  /**
   * Initialize projectile with configuration
   * Called when acquired from pool
   */
  public initialize(config: ProjectileConfig): void {
    this.type = config.type;
    this.position = { ...config.position };
    this.velocity = { ...config.velocity };
    this.damage = config.damage;
    this.size = { ...config.size };
    this.color = config.color;
    this.glowColor = config.glowColor;
    this.lifetime = config.lifetime;
    this.active = true;
    this.createdAt = Date.now();
  }

  /**
   * Reset projectile state
   * Called when returned to pool
   */
  public reset(): void {
    this.active = false;
    this.position = { x: 0, y: 0 };
    this.velocity = { x: 0, y: 0 };
    this.createdAt = 0;
  }

  /**
   * Check if projectile has expired
   */
  public isExpired(): boolean {
    if (!this.lifetime) return false;
    return Date.now() - this.createdAt > this.lifetime;
  }

  /**
   * Update projectile position
   */
  public update(deltaTime: number): void {
    if (!this.active) return;

    // Update position based on velocity
    this.position.x += this.velocity.x * (deltaTime / 1000);
    this.position.y += this.velocity.y * (deltaTime / 1000);
  }

  /**
   * Render projectile
   */
  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;

    ctx.save();

    // Draw glow effect if specified
    if (this.glowColor) {
      ctx.shadowColor = this.glowColor;
      ctx.shadowBlur = 10;
    }

    // Draw projectile
    ctx.fillStyle = this.color;
    ctx.fillRect(
      this.position.x - this.size.width / 2,
      this.position.y - this.size.height / 2,
      this.size.width,
      this.size.height
    );

    ctx.restore();
  }

  /**
   * Check if projectile is off-screen
   */
  public isOffScreen(canvasWidth: number, canvasHeight: number): boolean {
    return (
      this.position.x < -this.size.width ||
      this.position.x > canvasWidth + this.size.width ||
      this.position.y < -this.size.height ||
      this.position.y > canvasHeight + this.size.height
    );
  }
}
```

### 2. ProjectilePool

**File**: `src/game/utils/ProjectilePool.ts`

```typescript
import { ObjectPool } from './ObjectPool';
import { Projectile } from '../entities/Projectile';

export class ProjectilePool extends ObjectPool<Projectile> {
  private static instance: ProjectilePool;
  private idCounter: number = 0;

  private constructor(poolSize: number = 20) {
    super(
      () => new Projectile(`projectile_${this.idCounter++}`),
      (projectile) => projectile.reset(),
      poolSize
    );
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
    ProjectilePool.instance = null as any;
  }
}
```

### 3. ProjectileSystem

**File**: `src/game/systems/ProjectileSystem.ts`

```typescript
import { Projectile, ProjectileConfig, ProjectileType } from '../entities/Projectile';
import { ProjectilePool } from '../utils/ProjectilePool';
import { CollisionDetector } from '../physics/CollisionDetector';
import { EventBus } from '../core/EventBus';
import { Block } from '../entities/Block';
import { Vector2D } from '../../types/game.types';

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
  collisionDetector?: CollisionDetector;
}

/**
 * ProjectileSystem manages laser projectiles and collision detection
 * Story 4.3b - Phase 2 Advanced Power-ups
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
    config: Partial<ProjectileSystemConfig> = {}
  ) {
    this.context = context;
    this.config = {
      maxActiveProjectiles: config.maxActiveProjectiles || 20,
      poolSize: config.poolSize || 20,
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
        console.warn('ProjectileSystem: Max projectiles reached');
      }
      return null;
    }

    // Acquire from pool
    const projectile = this.projectilePool.acquire();
    if (!projectile) {
      if (this.config.enableDebugMode) {
        console.error('ProjectileSystem: Failed to acquire projectile from pool');
      }
      return null;
    }

    // Initialize and add to active list
    projectile.initialize(config);
    this.projectiles.push(projectile);

    // Emit spawn event
    if (this.context.eventBus) {
      this.context.eventBus.emit('projectile:spawned', {
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
        if (!block.isActive || block.isDestroyed) continue;

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
    block: Block
  ): boolean {
    const pLeft = projectile.position.x - projectile.size.width / 2;
    const pRight = projectile.position.x + projectile.size.width / 2;
    const pTop = projectile.position.y - projectile.size.height / 2;
    const pBottom = projectile.position.y + projectile.size.height / 2;

    const bLeft = block.x;
    const bRight = block.x + block.width;
    const bTop = block.y;
    const bBottom = block.y + block.height;

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
      block.isActive = false;
    }

    // Deactivate projectile
    projectile.active = false;

    // Emit collision event
    if (this.context.eventBus) {
      this.context.eventBus.emit('projectile:hit', {
        projectile: {
          id: projectile.id,
          type: projectile.type,
          position: projectile.position,
        },
        block: {
          id: block.id,
          type: block.type,
          position: { x: block.x, y: block.y },
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
          this.context.canvasHeight
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
        `ProjectileSystem: Cleaned up ${beforeCount - afterCount} projectiles`
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
   * Get statistics for debugging
   */
  public getStats(): {
    activeCount: number;
    poolStats: ReturnType<ProjectilePool['getStats']>;
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
```

## Integration Points

### 1. Game Loop Integration

```typescript
// In GameLoop.ts update method
class GameLoop {
  private projectileSystem: ProjectileSystem;

  public update(deltaTime: number): void {
    // ... existing updates ...
    
    // Update projectiles
    if (this.gameState.laserActive) {
      this.projectileSystem.update(deltaTime);
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    // ... existing rendering ...
    
    // Render projectiles (after blocks, before particles)
    this.projectileSystem.render(ctx);
  }
}
```

### 2. LaserGunPowerUp Integration

```typescript
// In LaserGunPowerUp.ts
class LaserGunPowerUp extends BasePowerUpPlugin {
  private fireInterval: number = 500; // 2 shots per second
  private lastFireTime: number = 0;

  public onUpdate(context: PowerUpPluginContext, deltaTime: number): void {
    const now = Date.now();
    
    if (now - this.lastFireTime >= this.fireInterval) {
      this.fireLaser(context);
      this.lastFireTime = now;
    }
  }

  private fireLaser(context: PowerUpPluginContext): void {
    const paddle = context.gameEntities?.paddle;
    if (!paddle || !context.projectileSystem) return;

    // Fire from left edge
    context.projectileSystem.spawn({
      type: ProjectileType.LASER,
      position: { x: paddle.x - paddle.width / 2, y: paddle.y },
      velocity: { x: 0, y: -500 }, // 500 pixels/second upward
      damage: 1,
      size: { width: 4, height: 12 },
      color: '#FF0000',
      glowColor: '#FF4444',
    });

    // Fire from right edge
    context.projectileSystem.spawn({
      type: ProjectileType.LASER,
      position: { x: paddle.x + paddle.width / 2, y: paddle.y },
      velocity: { x: 0, y: -500 },
      damage: 1,
      size: { width: 4, height: 12 },
      color: '#FF0000',
      glowColor: '#FF4444',
    });
  }
}
```

### 3. GameState Extension

```typescript
// Add to src/types/game.types.ts
export interface GameState {
  // ... existing fields ...
  laserActive: boolean;
}
```

## Performance Considerations

### Object Pooling Strategy
- **Pool Size**: 20 projectiles (max 10 pairs from laser)
- **Pre-allocation**: All objects created at initialization
- **Reuse**: Zero GC pressure during gameplay
- **Cleanup**: Periodic cleanup every 1 second

### Memory Budget
- **Projectile Size**: ~200 bytes each
- **Pool Memory**: 20 × 200 = 4KB
- **Active Projectiles**: Max 20 × 200 = 4KB
- **Total System**: <10KB (negligible impact)

### Rendering Optimization
- **Batch Rendering**: Future enhancement
- **Culling**: Off-screen projectiles not rendered
- **Effect Quality**: Glow effects can be disabled on low settings

## Testing Strategy

### Unit Tests

1. **Projectile Entity Tests**
   - Initialization and reset
   - Position updates
   - Expiration logic
   - Off-screen detection

2. **ProjectilePool Tests**
   - Acquire/release cycle
   - Pool exhaustion
   - Reset functionality

3. **ProjectileSystem Tests**
   - Spawn limits
   - Collision detection
   - Cleanup behavior
   - Performance under load

### Integration Tests

1. **LaserGunPowerUp + ProjectileSystem**
   - Laser firing rate
   - Projectile trajectory
   - Block destruction

2. **Multi-power-up Scenarios**
   - Laser + Multi-ball (no interference)
   - Laser + Slow Motion (time-scaled firing)
   - Laser + Shield (independent operation)

### Performance Tests

1. **FPS Benchmarks**
   - 20 active projectiles + 3 power-ups = 55+ FPS
   - 20 active projectiles + 5 power-ups = 50+ FPS

2. **Memory Tests**
   - No memory leaks over 10 minutes
   - Pool reuse efficiency >95%
   - Total memory <250MB

## Risk Mitigation

### Risk 1: Performance Degradation
**Mitigation**:
- Object pooling eliminates GC pressure
- Periodic cleanup prevents array growth
- Quality settings allow effect reduction

### Risk 2: Collision Detection Complexity
**Mitigation**:
- Simple AABB collision (O(n×m) acceptable for small n, m)
- Early exit on first collision
- Future: Spatial partitioning if needed

### Risk 3: Event Bus Overhead
**Mitigation**:
- Optional event emission
- Batched events if needed
- Debounce collision events

## Future Extensions

### Phase 3 Enhancements
1. **Projectile Types**
   - Homing missiles
   - Plasma shots
   - Spread fire

2. **Advanced Physics**
   - Projectile gravity
   - Ricochet mechanics
   - Penetration system

3. **Visual Effects**
   - Projectile trails
   - Impact animations
   - Muzzle flash

## Acceptance Criteria Mapping

| AC | Requirement | Implementation |
|----|-------------|----------------|
| AC3 | ProjectileSystem with pooling | ✅ ProjectileSystem + ProjectilePool |
| AC2 | Laser fires 2 shots/second | ✅ LaserGunPowerUp.fireInterval = 500ms |
| AC9 | 90% test coverage | ✅ Unit + Integration tests planned |
| AC12 | 55 FPS with 3 power-ups | ✅ Object pooling + optimized rendering |
| AC14 | Memory <250MB | ✅ Pool size 20, <10KB system memory |

## Approval Checklist

- [ ] Architecture pattern follows existing ECS design
- [ ] Integration points clearly defined
- [ ] Performance targets achievable
- [ ] Testing strategy comprehensive
- [ ] Risk mitigation adequate
- [ ] Code examples demonstrate implementation
- [ ] Memory budget acceptable
- [ ] No breaking changes to existing systems

## Appendix

### A. Class Diagram

```
┌─────────────────┐
│   Projectile    │
├─────────────────┤
│ + type          │
│ + position      │
│ + velocity      │
│ + damage        │
│ + active        │
├─────────────────┤
│ + initialize()  │
│ + update()      │
│ + render()      │
│ + reset()       │
└─────────────────┘
         △
         │ extends
         │
┌─────────────────┐
│     Entity      │
├─────────────────┤
│ + id            │
│ + position      │
│ + velocity      │
└─────────────────┘

┌──────────────────┐      ┌─────────────────┐
│ ProjectileSystem │──────│  ProjectilePool │
├──────────────────┤      ├─────────────────┤
│ - projectiles[]  │      │ - pool[]        │
│ - config         │      │ - factory       │
├──────────────────┤      ├─────────────────┤
│ + spawn()        │      │ + acquire()     │
│ + update()       │      │ + release()     │
│ + render()       │      │ + getStats()    │
│ + cleanup()      │      └─────────────────┘
└──────────────────┘
```

### B. Sequence Diagram: Laser Fire

```
LaserGunPowerUp  ProjectileSystem  ProjectilePool  Projectile
      │                 │                │            │
      │─ fireLaser() ───┤                │            │
      │                 │─ spawn() ──────┤            │
      │                 │                │─ acquire() ┤
      │                 │                │            │─ initialize()
      │                 │                │            │
      │                 │                │◄───────────│ return
      │                 │◄───────────────│
      │◄────────────────│                │            │
      │                 │                │            │
     [Fire complete]    │                │            │
                        │                │            │
```

---

**End of Design Document**

**Next Steps**:
1. Architect Review
2. Prototype Implementation
3. Performance Validation
4. Story 4.3b Approval
