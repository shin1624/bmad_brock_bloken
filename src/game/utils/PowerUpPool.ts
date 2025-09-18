/**
 * Enhanced PowerUp Object Pooling System
 * Phase 3: Memory efficiency improvements for power-up entities
 */
import { ObjectPool } from './ObjectPool';
import { PowerUp, PowerUpType, PowerUpMetadata } from '../entities/PowerUp';
import { Vector2D } from '../../types/game.types';

export interface PowerUpPoolConfig {
  maxPowerUpsPerType: number;
  preFillCount: number;
  enableDebug: boolean;
  gcThreshold: number; // Memory pressure threshold for cleanup
}

export interface PowerUpPoolStats {
  totalPools: number;
  totalAllocated: number;
  totalReused: number;
  memoryUsage: number;
  utilizationByType: Record<PowerUpType, number>;
  gcEvents: number;
}

/**
 * Enhanced PowerUp Pool Manager
 * Manages separate pools for each PowerUp type with memory optimization
 */
export class PowerUpPool {
  private pools: Map<PowerUpType, ObjectPool<PowerUp>>;
  private config: PowerUpPoolConfig;
  private stats: PowerUpPoolStats;
  private lastGCTime: number = 0;
  private gcInterval: number = 30000; // 30 seconds

  constructor(config?: Partial<PowerUpPoolConfig>) {
    this.config = {
      maxPowerUpsPerType: 20,
      preFillCount: 3,
      enableDebug: false,
      gcThreshold: 50, // MB
      ...config
    };

    this.pools = new Map();
    this.stats = this.initializeStats();
    this.initializePools();
  }

  /**
   * Initialize stats object
   */
  private initializeStats(): PowerUpPoolStats {
    return {
      totalPools: 0,
      totalAllocated: 0,
      totalReused: 0,
      memoryUsage: 0,
      utilizationByType: {} as Record<PowerUpType, number>,
      gcEvents: 0
    };
  }

  /**
   * Initialize pools for each PowerUp type
   */
  private initializePools(): void {
    Object.values(PowerUpType).forEach(type => {
      const metadata = PowerUp.getMetadata(type);
      
      const pool = new ObjectPool<PowerUp>(
        () => {
          const powerUp = new PowerUp(type, metadata);
          this.stats.totalAllocated++;
          return powerUp;
        },
        (powerUp) => this.resetPowerUp(powerUp),
        this.config.maxPowerUpsPerType
      );

      // Pre-fill with configured amount
      pool.preFill(this.config.preFillCount);
      
      this.pools.set(type, pool);
      this.stats.totalPools++;

      if (this.config.enableDebug) {
        console.log(`PowerUpPool: Created pool for ${type} (capacity: ${this.config.maxPowerUpsPerType})`);
      }
    });
  }

  /**
   * Reset PowerUp to default state when returned to pool
   */
  private resetPowerUp(powerUp: PowerUp): void {
    powerUp.active = false;
    powerUp.collected = false;
    powerUp.timeAlive = 0;
    powerUp.animationPhase = 0;
    powerUp.position = { x: 0, y: 0 };
    powerUp.velocity = { x: 0, y: powerUp.config.speed };
  }

  /**
   * Acquire PowerUp from pool
   */
  public acquire(type: PowerUpType, position?: Vector2D): PowerUp {
    const pool = this.pools.get(type);
    if (!pool) {
      throw new Error(`PowerUpPool: No pool found for type ${type}`);
    }

    const powerUp = pool.acquire();
    
    // Configure the acquired PowerUp
    if (position) {
      powerUp.position = { ...position };
    }
    
    powerUp.active = true;
    powerUp.collected = false;
    powerUp.timeAlive = 0;
    powerUp.animationPhase = Math.random() * Math.PI * 2; // Random start phase

    this.stats.totalReused++;
    
    if (this.config.enableDebug) {
      console.log(`PowerUpPool: Acquired ${type} powerup (pool size: ${pool.getPoolSize()})`);
    }

    return powerUp;
  }

  /**
   * Release PowerUp back to pool
   */
  public release(powerUp: PowerUp): void {
    if (!powerUp || !powerUp.type) {
      console.warn('PowerUpPool: Invalid powerUp provided for release');
      return;
    }

    const pool = this.pools.get(powerUp.type);
    if (!pool) {
      console.warn(`PowerUpPool: No pool found for type ${powerUp.type}`);
      return;
    }

    pool.release(powerUp);
    
    if (this.config.enableDebug) {
      console.log(`PowerUpPool: Released ${powerUp.type} powerup (pool size: ${pool.getPoolSize()})`);
    }
  }

  /**
   * Batch acquire multiple PowerUps of same type
   */
  public batchAcquire(type: PowerUpType, count: number, positions?: Vector2D[]): PowerUp[] {
    const powerUps: PowerUp[] = [];
    
    for (let i = 0; i < count; i++) {
      const position = positions?.[i] || undefined;
      const powerUp = this.acquire(type, position);
      powerUps.push(powerUp);
    }
    
    if (this.config.enableDebug) {
      console.log(`PowerUpPool: Batch acquired ${count} ${type} powerups`);
    }
    
    return powerUps;
  }

  /**
   * Batch release multiple PowerUps
   */
  public batchRelease(powerUps: PowerUp[]): void {
    const releaseCount = new Map<PowerUpType, number>();
    
    powerUps.forEach(powerUp => {
      this.release(powerUp);
      
      const count = releaseCount.get(powerUp.type) || 0;
      releaseCount.set(powerUp.type, count + 1);
    });
    
    if (this.config.enableDebug) {
      releaseCount.forEach((count, type) => {
        console.log(`PowerUpPool: Batch released ${count} ${type} powerups`);
      });
    }
  }

  /**
   * Update pool statistics and perform maintenance
   */
  public updateStats(): void {
    this.stats.utilizationByType = {};
    let totalMemory = 0;
    
    this.pools.forEach((pool, type) => {
      const poolStats = pool.getStats();
      this.stats.utilizationByType[type] = poolStats.utilizationRate;
      
      // Estimate memory usage (rough calculation)
      totalMemory += poolStats.totalObjects * this.estimatePowerUpMemorySize(type);
    });
    
    this.stats.memoryUsage = totalMemory / (1024 * 1024); // Convert to MB
    
    // Perform garbage collection if needed
    this.performMaintenanceGC();
  }

  /**
   * Estimate memory size of a PowerUp instance
   */
  private estimatePowerUpMemorySize(type: PowerUpType): number {
    // Rough estimation in bytes
    const baseSize = 200; // Base object overhead
    const metadataSize = 150; // Metadata object
    const configSize = 100; // Config object
    
    return baseSize + metadataSize + configSize;
  }

  /**
   * Perform maintenance garbage collection
   */
  private performMaintenanceGC(): void {
    const now = Date.now();
    
    // Only perform GC at intervals and when memory usage is high
    if (now - this.lastGCTime < this.gcInterval || this.stats.memoryUsage < this.config.gcThreshold) {
      return;
    }
    
    let cleaned = 0;
    
    this.pools.forEach((pool, type) => {
      const poolStats = pool.getStats();
      
      // If pool utilization is low, reduce its size
      if (poolStats.utilizationRate < 0.3 && poolStats.poolSize > this.config.preFillCount) {
        const targetSize = Math.max(this.config.preFillCount, Math.ceil(poolStats.poolSize * 0.7));
        pool.resize(targetSize);
        cleaned++;
        
        if (this.config.enableDebug) {
          console.log(`PowerUpPool: GC reduced ${type} pool from ${poolStats.poolSize} to ${targetSize}`);
        }
      }
    });
    
    if (cleaned > 0) {
      this.stats.gcEvents++;
      this.lastGCTime = now;
      
      if (this.config.enableDebug) {
        console.log(`PowerUpPool: GC event completed, cleaned ${cleaned} pools`);
      }
    }
  }

  /**
   * Get specific pool statistics
   */
  public getPoolStats(type: PowerUpType): ReturnType<ObjectPool<PowerUp>['getStats']> | null {
    const pool = this.pools.get(type);
    return pool ? pool.getStats() : null;
  }

  /**
   * Get overall pool statistics
   */
  public getOverallStats(): PowerUpPoolStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * Clear all pools
   */
  public clear(): void {
    this.pools.forEach((pool, type) => {
      pool.clear();
      if (this.config.enableDebug) {
        console.log(`PowerUpPool: Cleared ${type} pool`);
      }
    });
    
    this.stats = this.initializeStats();
    this.stats.totalPools = this.pools.size;
  }

  /**
   * Resize pools dynamically based on usage patterns
   */
  public optimizePools(): void {
    this.pools.forEach((pool, type) => {
      const poolStats = pool.getStats();
      
      // If utilization is consistently high, increase pool size
      if (poolStats.utilizationRate > 0.8) {
        const newSize = Math.min(this.config.maxPowerUpsPerType * 2, poolStats.maxSize + 5);
        pool.resize(newSize);
        
        if (this.config.enableDebug) {
          console.log(`PowerUpPool: Increased ${type} pool size to ${newSize}`);
        }
      }
      // If utilization is consistently low, decrease pool size
      else if (poolStats.utilizationRate < 0.2 && poolStats.maxSize > this.config.preFillCount) {
        const newSize = Math.max(this.config.preFillCount, poolStats.maxSize - 3);
        pool.resize(newSize);
        
        if (this.config.enableDebug) {
          console.log(`PowerUpPool: Decreased ${type} pool size to ${newSize}`);
        }
      }
    });
  }

  /**
   * Force garbage collection
   */
  public forceGC(): void {
    this.lastGCTime = 0; // Reset timer to force GC
    this.performMaintenanceGC();
  }

  /**
   * Get debug information
   */
  public getDebugInfo(): string {
    const lines: string[] = [];
    lines.push('=== PowerUp Pool Debug Info ===');
    lines.push(`Total Pools: ${this.stats.totalPools}`);
    lines.push(`Total Allocated: ${this.stats.totalAllocated}`);
    lines.push(`Total Reused: ${this.stats.totalReused}`);
    lines.push(`Memory Usage: ${this.stats.memoryUsage.toFixed(2)} MB`);
    lines.push(`GC Events: ${this.stats.gcEvents}`);
    lines.push('');
    
    this.pools.forEach((pool, type) => {
      const poolStats = pool.getStats();
      lines.push(`${type}:`);
      lines.push(`  Pool Size: ${poolStats.poolSize}/${poolStats.maxSize}`);
      lines.push(`  Utilization: ${(poolStats.utilizationRate * 100).toFixed(1)}%`);
      lines.push(`  Total Objects: ${poolStats.totalObjects}`);
    });
    
    return lines.join('\n');
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<PowerUpPoolConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (this.config.enableDebug) {
      console.log('PowerUpPool: Configuration updated', this.config);
    }
  }

  /**
   * Check if pools are healthy (no memory leaks, good utilization)
   */
  public checkHealth(): { isHealthy: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Check memory usage
    if (this.stats.memoryUsage > this.config.gcThreshold * 1.5) {
      issues.push(`High memory usage: ${this.stats.memoryUsage.toFixed(2)} MB`);
    }
    
    // Check for pool imbalances
    this.pools.forEach((pool, type) => {
      const poolStats = pool.getStats();
      
      if (poolStats.utilizationRate > 0.95) {
        issues.push(`${type} pool near capacity (${(poolStats.utilizationRate * 100).toFixed(1)}%)`);
      }
      
      if (poolStats.totalObjects > poolStats.maxSize * 1.2) {
        issues.push(`${type} pool has leaked objects`);
      }
    });
    
    return {
      isHealthy: issues.length === 0,
      issues
    };
  }
}