/**
 * Particle System for visual effects
 * Manages particle creation, update, and rendering with object pooling
 */
import { Particle, ParticleOptions } from '../entities/Particle';
import { ObjectPool } from '../utils/ObjectPool';
import { Vector2D, BlockType } from '../../types/game.types';
import { EventBus } from '../core/EventBus';

export interface ParticleSystemConfig {
  maxParticles: number;
  preFillCount: number;
  enableDebugMode: boolean;
}

export class ParticleSystem {
  private activeParticles: Set<Particle>;
  private particlePool: ObjectPool<Particle>;
  private eventBus: EventBus;
  private config: ParticleSystemConfig;
  private debugMode: boolean;

  // Performance tracking
  private particleCount: number = 0;
  private totalParticlesCreated: number = 0;
  private frameTime: number = 0;

  constructor(eventBus: EventBus, config: Partial<ParticleSystemConfig> = {}) {
    this.eventBus = eventBus;
    this.config = {
      maxParticles: config.maxParticles || 1000,
      preFillCount: config.preFillCount || 100,
      enableDebugMode: config.enableDebugMode || false
    };
    
    this.debugMode = this.config.enableDebugMode;
    this.activeParticles = new Set();
    
    // Initialize object pool
    this.particlePool = new ObjectPool<Particle>(
      () => new Particle({
        position: { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        color: '#FFFFFF',
        size: 1,
        lifespan: 1
      }),
      (particle) => {
        // Reset function - particle will be reset when acquired
      },
      this.config.maxParticles
    );

    // Pre-fill pool for better performance
    this.particlePool.preFill(this.config.preFillCount);

    this.setupEventListeners();
  }

  /**
   * Setup event listeners for particle effects
   */
  private setupEventListeners(): void {
    // Block destruction effect
    this.eventBus.on('block:destroyed', (data: {
      type: BlockType;
      position: Vector2D;
      score: number;
    }) => {
      this.createBlockDestructionEffect(data.position, data.type);
    });

    // Block hit effect (for hard blocks)
    this.eventBus.on('block:hit', (data: {
      type: BlockType;
      position: Vector2D;
    }) => {
      if (data.type === BlockType.Hard) {
        this.createBlockHitEffect(data.position, data.type);
      }
    });

    // Combo effect
    this.eventBus.on('combo:activated', (data: {
      combo: number;
      position: Vector2D;
    }) => {
      this.createComboEffect(data.position, data.combo);
    });
  }

  /**
   * Create block destruction explosion effect
   */
  public createBlockDestructionEffect(position: Vector2D, blockType: BlockType): void {
    const color = this.getBlockColor(blockType);
    const particleConfigs = Particle.createExplosionConfig(
      position,
      color,
      8 // 8 particles for block destruction
    );

    this.createParticles(particleConfigs);
  }

  /**
   * Create block hit sparkle effect
   */
  public createBlockHitEffect(position: Vector2D, blockType: BlockType): void {
    const color = this.getBlockColor(blockType);
    const particleConfigs = Particle.createSparkleConfig(
      position,
      color,
      4 // 4 particles for block hit
    );

    this.createParticles(particleConfigs);
  }

  /**
   * Create combo effect
   */
  public createComboEffect(position: Vector2D, comboCount: number): void {
    const particleCount = Math.min(comboCount * 2, 16); // Scale with combo, max 16
    const colors = ['#FFD700', '#FFA500', '#FF6347']; // Gold, orange, red
    
    for (let i = 0; i < particleCount; i++) {
      const color = colors[i % colors.length];
      const angle = (i / particleCount) * Math.PI * 2;
      const speed = 80 + comboCount * 10; // Faster particles for higher combos
      
      const particleConfig: ParticleOptions = {
        position: { ...position },
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed - 30 // Upward bias
        },
        color: color,
        size: 3 + Math.random() * 2,
        lifespan: 0.6 + comboCount * 0.1, // Longer life for higher combos
        gravity: 100,
        damping: 0.98,
        fadeOut: true
      };
      
      this.createParticle(particleConfig);
    }
  }

  /**
   * Create custom particle effect
   */
  public createCustomEffect(center: Vector2D, config: {
    particleCount: number;
    colors: string[];
    speedRange: { min: number; max: number };
    sizeRange: { min: number; max: number };
    lifespan: number;
    gravity?: number;
    spread?: number; // Angle spread in radians
  }): void {
    const spread = config.spread || Math.PI * 2;
    
    for (let i = 0; i < config.particleCount; i++) {
      const angle = (i / config.particleCount) * spread;
      const speed = config.speedRange.min + Math.random() * (config.speedRange.max - config.speedRange.min);
      const size = config.sizeRange.min + Math.random() * (config.sizeRange.max - config.sizeRange.min);
      const color = config.colors[Math.floor(Math.random() * config.colors.length)];
      
      const particleConfig: ParticleOptions = {
        position: { ...center },
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed
        },
        color: color,
        size: size,
        lifespan: config.lifespan,
        gravity: config.gravity || 200,
        damping: 0.98,
        fadeOut: true
      };
      
      this.createParticle(particleConfig);
    }
  }

  /**
   * Create multiple particles from configurations
   */
  private createParticles(configs: ParticleOptions[]): void {
    configs.forEach(config => this.createParticle(config));
  }

  /**
   * Create a single particle
   */
  private createParticle(config: ParticleOptions): Particle | null {
    if (this.activeParticles.size >= this.config.maxParticles) {
      // At capacity, remove oldest particle
      const oldestParticle = this.activeParticles.values().next().value;
      if (oldestParticle) {
        this.removeParticle(oldestParticle);
      }
    }

    const particle = this.particlePool.acquire();
    particle.reset(config);
    
    this.activeParticles.add(particle);
    this.particleCount++;
    this.totalParticlesCreated++;
    
    return particle;
  }

  /**
   * Remove a particle and return it to the pool
   */
  private removeParticle(particle: Particle): void {
    if (this.activeParticles.has(particle)) {
      this.activeParticles.delete(particle);
      this.particlePool.release(particle);
      this.particleCount--;
    }
  }

  /**
   * Get block color for particle effects
   */
  private getBlockColor(blockType: BlockType): string {
    switch (blockType) {
      case BlockType.Normal:
        return '#3B82F6'; // Blue
      case BlockType.Hard:
        return '#EF4444'; // Red
      case BlockType.Indestructible:
        return '#6B7280'; // Gray
      default:
        return '#FFFFFF'; // White fallback
    }
  }

  /**
   * Update all active particles
   */
  public update(deltaTime: number): void {
    const startTime = performance.now();
    
    const particlesToRemove: Particle[] = [];
    
    this.activeParticles.forEach(particle => {
      particle.update(deltaTime);
      
      if (!particle.isAlive()) {
        particlesToRemove.push(particle);
      }
    });
    
    // Remove dead particles
    particlesToRemove.forEach(particle => {
      this.removeParticle(particle);
    });
    
    this.frameTime = performance.now() - startTime;
  }

  /**
   * Render all active particles
   */
  public render(ctx: CanvasRenderingContext2D): void {
    this.activeParticles.forEach(particle => {
      particle.render(ctx);
    });

    // Debug rendering
    if (this.debugMode) {
      this.renderDebugInfo(ctx);
    }
  }

  /**
   * Render debug information
   */
  private renderDebugInfo(ctx: CanvasRenderingContext2D): void {
    const poolStats = this.particlePool.getStats();
    
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, 250, 120);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    
    const debugInfo = [
      `Active Particles: ${this.activeParticles.size}`,
      `Pool Size: ${poolStats.poolSize}`,
      `Total Created: ${this.totalParticlesCreated}`,
      `Utilization: ${(poolStats.utilizationRate * 100).toFixed(1)}%`,
      `Frame Time: ${this.frameTime.toFixed(2)}ms`,
      `Max Particles: ${this.config.maxParticles}`
    ];
    
    debugInfo.forEach((info, index) => {
      ctx.fillText(info, 15, 30 + index * 15);
    });
    
    ctx.restore();
  }

  /**
   * Clear all particles
   */
  public clear(): void {
    this.activeParticles.forEach(particle => {
      this.particlePool.release(particle);
    });
    this.activeParticles.clear();
    this.particleCount = 0;
  }

  /**
   * Get current particle count
   */
  public getParticleCount(): number {
    return this.activeParticles.size;
  }

  /**
   * Get performance statistics
   */
  public getStats(): {
    activeCount: number;
    totalCreated: number;
    frameTime: number;
    poolStats: ReturnType<ObjectPool<Particle>['getStats']>;
  } {
    return {
      activeCount: this.activeParticles.size,
      totalCreated: this.totalParticlesCreated,
      frameTime: this.frameTime,
      poolStats: this.particlePool.getStats()
    };
  }

  /**
   * Enable/disable debug mode
   */
  public setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  /**
   * Resize particle system capacity
   */
  public resize(maxParticles: number): void {
    this.config.maxParticles = maxParticles;
    this.particlePool.resize(maxParticles);
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.clear();
    this.particlePool.clear();
    this.eventBus.off('block:destroyed');
    this.eventBus.off('block:hit');
    this.eventBus.off('combo:activated');
  }
}