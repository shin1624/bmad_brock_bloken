/**
 * Enhanced Particle Object Pooling System
 * Phase 3: Memory efficiency improvements for particle effects
 */
import { ObjectPool } from './ObjectPool';
import { Particle, ParticleOptions } from '../entities/Particle';
import { Vector2D } from '../../types/game.types';

export interface ParticlePoolConfig {
  maxParticles: number;
  preFillCount: number;
  enableBatching: boolean;
  batchSize: number;
  enableSpatialOptimization: boolean;
  spatialGridSize: number;
  enableLOD: boolean; // Level of Detail for distant particles
  lodDistanceThreshold: number;
  gcInterval: number; // milliseconds
  memoryThreshold: number; // MB
}

export interface ParticlePoolStats {
  totalParticles: number;
  activeParticles: number;
  pooledParticles: number;
  memoryUsage: number;
  utilizationRate: number;
  spatialCells: number;
  lodReductions: number;
  gcEvents: number;
  frameTime: number;
}

export interface SpatialCell {
  x: number;
  y: number;
  particles: Set<Particle>;
}

/**
 * Advanced Particle Pool with Spatial Optimization and LOD
 */
export class ParticlePool {
  private pool: ObjectPool<Particle>;
  private config: ParticlePoolConfig;
  private stats: ParticlePoolStats;
  
  // Spatial optimization
  private spatialGrid: Map<string, SpatialCell>;
  private activeParticles: Set<Particle>;
  
  // Batching
  private batchBuffer: Particle[];
  private pendingUpdates: Particle[];
  
  // Performance tracking
  private lastGCTime: number = 0;
  private frameStartTime: number = 0;

  constructor(config?: Partial<ParticlePoolConfig>) {
    this.config = {
      maxParticles: 1000,
      preFillCount: 100,
      enableBatching: true,
      batchSize: 50,
      enableSpatialOptimization: true,
      spatialGridSize: 64, // 64x64 pixel cells
      enableLOD: true,
      lodDistanceThreshold: 300,
      gcInterval: 30000, // 30 seconds
      memoryThreshold: 10, // 10 MB
      ...config
    };

    this.activeParticles = new Set();
    this.spatialGrid = new Map();
    this.batchBuffer = [];
    this.pendingUpdates = [];
    this.stats = this.initializeStats();

    this.initializePool();
  }

  /**
   * Initialize statistics
   */
  private initializeStats(): ParticlePoolStats {
    return {
      totalParticles: 0,
      activeParticles: 0,
      pooledParticles: 0,
      memoryUsage: 0,
      utilizationRate: 0,
      spatialCells: 0,
      lodReductions: 0,
      gcEvents: 0,
      frameTime: 0
    };
  }

  /**
   * Initialize the particle pool
   */
  private initializePool(): void {
    this.pool = new ObjectPool<Particle>(
      () => {
        return new Particle({
          position: { x: 0, y: 0 },
          velocity: { x: 0, y: 0 },
          color: '#FFFFFF',
          size: 1,
          lifespan: 1
        });
      },
      (particle) => {
        // Reset particle state
        particle.active = false;
        particle.alpha = 1.0;
        particle.lifespan = 0;
        particle.position = { x: 0, y: 0 };
        particle.velocity = { x: 0, y: 0 };
      },
      this.config.maxParticles
    );

    // Pre-fill pool
    this.pool.preFill(this.config.preFillCount);
    this.stats.pooledParticles = this.config.preFillCount;
  }

  /**
   * Acquire particle from pool
   */
  public acquire(options: ParticleOptions): Particle {
    const particle = this.pool.acquire();
    particle.reset(options);
    
    this.activeParticles.add(particle);
    this.addToSpatialGrid(particle);
    
    this.stats.activeParticles++;
    this.stats.totalParticles++;
    
    return particle;
  }

  /**
   * Batch acquire multiple particles
   */
  public batchAcquire(optionsArray: ParticleOptions[]): Particle[] {
    const particles: Particle[] = [];
    
    for (const options of optionsArray) {
      if (this.activeParticles.size >= this.config.maxParticles) {
        break; // Stop if we hit the limit
      }
      
      const particle = this.acquire(options);
      particles.push(particle);
    }
    
    return particles;
  }

  /**
   * Release particle back to pool
   */
  public release(particle: Particle): void {
    if (!this.activeParticles.has(particle)) {
      return; // Particle not managed by this pool
    }

    this.activeParticles.delete(particle);
    this.removeFromSpatialGrid(particle);
    this.pool.release(particle);
    
    this.stats.activeParticles--;
    this.stats.pooledParticles++;
  }

  /**
   * Batch release multiple particles
   */
  public batchRelease(particles: Particle[]): void {
    particles.forEach(particle => this.release(particle));
  }

  /**
   * Add particle to spatial grid for optimization
   */
  private addToSpatialGrid(particle: Particle): void {
    if (!this.config.enableSpatialOptimization) {
      return;
    }

    const cellKey = this.getSpatialCellKey(particle.position);
    
    if (!this.spatialGrid.has(cellKey)) {
      const coords = this.parseCellKey(cellKey);
      this.spatialGrid.set(cellKey, {
        x: coords.x,
        y: coords.y,
        particles: new Set()
      });
      this.stats.spatialCells++;
    }
    
    this.spatialGrid.get(cellKey)!.particles.add(particle);
  }

  /**
   * Remove particle from spatial grid
   */
  private removeFromSpatialGrid(particle: Particle): void {
    if (!this.config.enableSpatialOptimization) {
      return;
    }

    const cellKey = this.getSpatialCellKey(particle.position);
    const cell = this.spatialGrid.get(cellKey);
    
    if (cell) {
      cell.particles.delete(particle);
      
      // Clean up empty cells
      if (cell.particles.size === 0) {
        this.spatialGrid.delete(cellKey);
        this.stats.spatialCells--;
      }
    }
  }

  /**
   * Get spatial cell key for position
   */
  private getSpatialCellKey(position: Vector2D): string {
    const x = Math.floor(position.x / this.config.spatialGridSize);
    const y = Math.floor(position.y / this.config.spatialGridSize);
    return `${x},${y}`;
  }

  /**
   * Parse cell key back to coordinates
   */
  private parseCellKey(key: string): { x: number; y: number } {
    const [x, y] = key.split(',').map(Number);
    return { x, y };
  }

  /**
   * Update all particles with optimizations
   */
  public update(deltaTime: number, cameraPosition?: Vector2D): void {
    this.frameStartTime = performance.now();
    
    if (this.config.enableBatching) {
      this.updateBatched(deltaTime, cameraPosition);
    } else {
      this.updateDirect(deltaTime, cameraPosition);
    }
    
    this.performMaintenance();
    this.updateStats();
    
    this.stats.frameTime = performance.now() - this.frameStartTime;
  }

  /**
   * Batched update for better performance
   */
  private updateBatched(deltaTime: number, cameraPosition?: Vector2D): void {
    this.batchBuffer = Array.from(this.activeParticles);
    const batchSize = this.config.batchSize;
    
    for (let i = 0; i < this.batchBuffer.length; i += batchSize) {
      const batch = this.batchBuffer.slice(i, i + batchSize);
      this.updateParticleBatch(batch, deltaTime, cameraPosition);
    }
  }

  /**
   * Direct update for all particles
   */
  private updateDirect(deltaTime: number, cameraPosition?: Vector2D): void {
    const deadParticles: Particle[] = [];
    
    this.activeParticles.forEach(particle => {
      if (this.shouldUpdateParticle(particle, cameraPosition)) {
        particle.update(deltaTime);
        this.updateParticleSpatialPosition(particle);
      }
      
      if (!particle.isAlive()) {
        deadParticles.push(particle);
      }
    });
    
    deadParticles.forEach(particle => this.release(particle));
  }

  /**
   * Update a batch of particles
   */
  private updateParticleBatch(batch: Particle[], deltaTime: number, cameraPosition?: Vector2D): void {
    const deadParticles: Particle[] = [];
    
    batch.forEach(particle => {
      if (this.shouldUpdateParticle(particle, cameraPosition)) {
        particle.update(deltaTime);
        this.updateParticleSpatialPosition(particle);
      }
      
      if (!particle.isAlive()) {
        deadParticles.push(particle);
      }
    });
    
    // Batch release dead particles
    this.batchRelease(deadParticles);
  }

  /**
   * Check if particle should be updated (LOD optimization)
   */
  private shouldUpdateParticle(particle: Particle, cameraPosition?: Vector2D): boolean {
    if (!this.config.enableLOD || !cameraPosition) {
      return true;
    }

    const distance = Math.sqrt(
      Math.pow(particle.position.x - cameraPosition.x, 2) +
      Math.pow(particle.position.y - cameraPosition.y, 2)
    );

    // Skip updates for very distant particles
    if (distance > this.config.lodDistanceThreshold) {
      this.stats.lodReductions++;
      return Math.random() < 0.3; // Only update 30% of distant particles
    }

    return true;
  }

  /**
   * Update particle's spatial grid position
   */
  private updateParticleSpatialPosition(particle: Particle): void {
    if (!this.config.enableSpatialOptimization) {
      return;
    }

    // Note: For performance, we don't move particles between cells during updates
    // Only during initial placement and cleanup
  }

  /**
   * Get particles in a specific area (for culling)
   */
  public getParticlesInArea(bounds: { x: number; y: number; width: number; height: number }): Particle[] {
    if (!this.config.enableSpatialOptimization) {
      return Array.from(this.activeParticles);
    }

    const particles: Particle[] = [];
    const startX = Math.floor(bounds.x / this.config.spatialGridSize);
    const endX = Math.floor((bounds.x + bounds.width) / this.config.spatialGridSize);
    const startY = Math.floor(bounds.y / this.config.spatialGridSize);
    const endY = Math.floor((bounds.y + bounds.height) / this.config.spatialGridSize);

    for (let x = startX; x <= endX; x++) {
      for (let y = startY; y <= endY; y++) {
        const cellKey = `${x},${y}`;
        const cell = this.spatialGrid.get(cellKey);
        
        if (cell) {
          cell.particles.forEach(particle => {
            if (this.isParticleInBounds(particle, bounds)) {
              particles.push(particle);
            }
          });
        }
      }
    }

    return particles;
  }

  /**
   * Check if particle is within bounds
   */
  private isParticleInBounds(particle: Particle, bounds: { x: number; y: number; width: number; height: number }): boolean {
    return (
      particle.position.x >= bounds.x &&
      particle.position.x <= bounds.x + bounds.width &&
      particle.position.y >= bounds.y &&
      particle.position.y <= bounds.y + bounds.height
    );
  }

  /**
   * Render particles with culling optimization
   */
  public render(ctx: CanvasRenderingContext2D, viewBounds?: { x: number; y: number; width: number; height: number }): void {
    let particlesToRender: Particle[];
    
    if (viewBounds && this.config.enableSpatialOptimization) {
      particlesToRender = this.getParticlesInArea(viewBounds);
    } else {
      particlesToRender = Array.from(this.activeParticles);
    }

    // Batch render for better performance
    if (this.config.enableBatching) {
      this.batchRender(ctx, particlesToRender);
    } else {
      particlesToRender.forEach(particle => particle.render(ctx));
    }
  }

  /**
   * Batch render particles
   */
  private batchRender(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
    // Group particles by color for batch rendering
    const colorGroups = new Map<string, Particle[]>();
    
    particles.forEach(particle => {
      if (!colorGroups.has(particle.color)) {
        colorGroups.set(particle.color, []);
      }
      colorGroups.get(particle.color)!.push(particle);
    });

    // Render each color group in batch
    colorGroups.forEach((groupParticles, color) => {
      ctx.save();
      ctx.fillStyle = color;
      ctx.beginPath();
      
      groupParticles.forEach(particle => {
        if (particle.isAlive()) {
          ctx.globalAlpha = particle.alpha;
          ctx.arc(particle.position.x, particle.position.y, particle.size, 0, Math.PI * 2);
        }
      });
      
      ctx.fill();
      ctx.restore();
    });
  }

  /**
   * Perform maintenance tasks
   */
  private performMaintenance(): void {
    const now = Date.now();
    
    if (now - this.lastGCTime > this.config.gcInterval) {
      this.performGarbageCollection();
      this.lastGCTime = now;
    }
  }

  /**
   * Perform garbage collection
   */
  private performGarbageCollection(): void {
    // Clean up empty spatial cells
    const emptyCells: string[] = [];
    
    this.spatialGrid.forEach((cell, key) => {
      if (cell.particles.size === 0) {
        emptyCells.push(key);
      }
    });
    
    emptyCells.forEach(key => {
      this.spatialGrid.delete(key);
      this.stats.spatialCells--;
    });

    // Check memory usage and resize pool if needed
    if (this.stats.memoryUsage > this.config.memoryThreshold) {
      const newSize = Math.max(
        this.config.preFillCount,
        Math.floor(this.pool.getStats().maxSize * 0.8)
      );
      this.pool.resize(newSize);
    }

    this.stats.gcEvents++;
  }

  /**
   * Update statistics
   */
  private updateStats(): void {
    const poolStats = this.pool.getStats();
    
    this.stats.activeParticles = this.activeParticles.size;
    this.stats.pooledParticles = poolStats.poolSize;
    this.stats.utilizationRate = poolStats.utilizationRate;
    
    // Rough memory estimation
    this.stats.memoryUsage = (poolStats.totalObjects * 150) / (1024 * 1024); // ~150 bytes per particle
  }

  /**
   * Get current statistics
   */
  public getStats(): ParticlePoolStats {
    return { ...this.stats };
  }

  /**
   * Clear all particles
   */
  public clear(): void {
    this.activeParticles.forEach(particle => this.release(particle));
    this.spatialGrid.clear();
    this.stats = this.initializeStats();
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<ParticlePoolConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get debug information
   */
  public getDebugInfo(): string {
    const lines: string[] = [];
    lines.push('=== Particle Pool Debug Info ===');
    lines.push(`Active Particles: ${this.stats.activeParticles}`);
    lines.push(`Pooled Particles: ${this.stats.pooledParticles}`);
    lines.push(`Memory Usage: ${this.stats.memoryUsage.toFixed(2)} MB`);
    lines.push(`Utilization Rate: ${(this.stats.utilizationRate * 100).toFixed(1)}%`);
    lines.push(`Spatial Cells: ${this.stats.spatialCells}`);
    lines.push(`LOD Reductions: ${this.stats.lodReductions}`);
    lines.push(`GC Events: ${this.stats.gcEvents}`);
    lines.push(`Frame Time: ${this.stats.frameTime.toFixed(2)}ms`);
    
    return lines.join('\n');
  }
}