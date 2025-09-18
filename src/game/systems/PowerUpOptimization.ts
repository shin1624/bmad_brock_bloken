/**
 * PowerUp Performance Optimization System
 * Story 4.2, Task 7: Optimize power-up rendering and entity management
 */
import { ObjectPool } from '../utils/ObjectPool';
import { Ball } from '../entities/Ball';
import { PowerUp } from '../entities/PowerUp';
import { Particle } from '../entities/Particle';

// Performance monitoring interface
export interface PerformanceMetrics {
  frameTime: number;
  entityCount: number;
  particleCount: number;
  poolUtilization: { [pool: string]: number };
  memoryUsage: number;
  renderCalls: number;
  lastUpdate: number;
}

// Performance configuration
export interface OptimizationConfig {
  targetFPS: number;
  maxEntities: number;
  maxParticles: number;
  cullOffscreen: boolean;
  useLOD: boolean; // Level of Detail
  batchRendering: boolean;
  profileMode: boolean;
}

/**
 * PowerUpOptimization Class
 * Manages performance optimization for power-up related entities
 */
export class PowerUpOptimization {
  private ballPool: ObjectPool<Ball>;
  private powerUpPool: ObjectPool<PowerUp>;
  private particlePool: ObjectPool<Particle>;
  private config: OptimizationConfig;
  private metrics: PerformanceMetrics;
  private frameTimings: number[] = [];
  private renderBatch: OffscreenCanvas | null = null;
  private renderContext: OffscreenCanvasRenderingContext2D | null = null;

  constructor(config?: Partial<OptimizationConfig>) {
    this.config = {
      targetFPS: 60,
      maxEntities: 50,
      maxParticles: 200,
      cullOffscreen: true,
      useLOD: true,
      batchRendering: true,
      profileMode: false,
      ...config
    };

    this.metrics = this.createEmptyMetrics();
    this.initializePools();
    this.initializeBatchRendering();
  }

  /**
   * Initialize object pools for different entity types
   */
  private initializePools(): void {
    // Ball pool for multi-ball power-up
    this.ballPool = new ObjectPool<Ball>(
      () => new Ball({
        initialPosition: { x: 0, y: 0 },
        initialRadius: 10,
        initialSpeed: 200,
        maxSpeed: 400,
        minSpeed: 50,
        bounceDamping: 0.95
      }),
      (ball) => {
        ball.active = false;
        ball.position = { x: 0, y: 0 };
        ball.velocity = { x: 0, y: 0 };
      },
      20 // Max 20 balls in pool
    );

    // PowerUp pool for spawned power-ups
    this.powerUpPool = new ObjectPool<PowerUp>(
      () => new PowerUp(
        'MultiBall' as any,
        PowerUp.getMetadata('MultiBall' as any)
      ),
      (powerUp) => {
        powerUp.active = false;
        powerUp.collected = false;
        powerUp.timeAlive = 0;
        powerUp.position = { x: 0, y: 0 };
      },
      10 // Max 10 power-ups in pool
    );

    // Particle pool for effects
    this.particlePool = new ObjectPool<Particle>(
      () => new Particle(),
      (particle) => {
        particle.active = false;
        particle.position = { x: 0, y: 0 };
        particle.velocity = { x: 0, y: 0 };
        particle.life = 1;
        particle.maxLife = 1;
      },
      this.config.maxParticles
    );

    // Pre-fill pools for better performance
    this.ballPool.preFill(5);
    this.powerUpPool.preFill(3);
    this.particlePool.preFill(50);
  }

  /**
   * Initialize batch rendering system
   */
  private initializeBatchRendering(): void {
    if (!this.config.batchRendering) return;

    try {
      this.renderBatch = new OffscreenCanvas(800, 600);
      this.renderContext = this.renderBatch.getContext('2d');
    } catch (error) {
      console.warn('PowerUpOptimization: OffscreenCanvas not available, falling back to direct rendering');
      this.config.batchRendering = false;
    }
  }

  /**
   * Acquire a ball from the pool
   */
  public acquireBall(): Ball {
    return this.ballPool.acquire();
  }

  /**
   * Release a ball back to the pool
   */
  public releaseBall(ball: Ball): void {
    this.ballPool.release(ball);
  }

  /**
   * Acquire a power-up from the pool
   */
  public acquirePowerUp(): PowerUp {
    return this.powerUpPool.acquire();
  }

  /**
   * Release a power-up back to the pool
   */
  public releasePowerUp(powerUp: PowerUp): void {
    this.powerUpPool.release(powerUp);
  }

  /**
   * Acquire a particle from the pool
   */
  public acquireParticle(): Particle {
    return this.particlePool.acquire();
  }

  /**
   * Release a particle back to the pool
   */
  public releaseParticle(particle: Particle): void {
    this.particlePool.release(particle);
  }

  /**
   * Update performance metrics
   */
  public updateMetrics(deltaTime: number, entities: any[], particles: any[]): void {
    const now = performance.now();
    
    // Update frame timing
    this.frameTimings.push(deltaTime);
    if (this.frameTimings.length > 60) {
      this.frameTimings.shift();
    }

    // Calculate average frame time
    const avgFrameTime = this.frameTimings.reduce((sum, time) => sum + time, 0) / this.frameTimings.length;

    // Update metrics
    this.metrics = {
      frameTime: avgFrameTime,
      entityCount: entities.length,
      particleCount: particles.length,
      poolUtilization: {
        balls: this.ballPool.getStats().utilizationRate,
        powerUps: this.powerUpPool.getStats().utilizationRate,
        particles: this.particlePool.getStats().utilizationRate
      },
      memoryUsage: this.estimateMemoryUsage(),
      renderCalls: this.metrics.renderCalls,
      lastUpdate: now
    };

    // Reset render call counter
    this.metrics.renderCalls = 0;

    // Performance warnings
    if (this.config.profileMode) {
      this.checkPerformanceWarnings();
    }
  }

  /**
   * Cull off-screen entities for better performance
   */
  public cullOffscreenEntities<T extends { position: { x: number; y: number }; active: boolean }>(
    entities: T[],
    screenBounds: { width: number; height: number },
    margin: number = 50
  ): T[] {
    if (!this.config.cullOffscreen) return entities;

    return entities.filter(entity => {
      if (!entity.active) return false;

      const { x, y } = entity.position;
      return (
        x >= -margin &&
        x <= screenBounds.width + margin &&
        y >= -margin &&
        y <= screenBounds.height + margin
      );
    });
  }

  /**
   * Apply Level of Detail optimization
   */
  public applyLOD<T extends { position: { x: number; y: number }; render?: (ctx: CanvasRenderingContext2D) => void }>(
    entities: T[],
    cameraPosition: { x: number; y: number },
    maxDetailDistance: number = 200
  ): Array<T & { lodLevel: number }> {
    if (!this.config.useLOD) {
      return entities.map(entity => ({ ...entity, lodLevel: 0 }));
    }

    return entities.map(entity => {
      const distance = Math.sqrt(
        Math.pow(entity.position.x - cameraPosition.x, 2) +
        Math.pow(entity.position.y - cameraPosition.y, 2)
      );

      let lodLevel = 0;
      if (distance > maxDetailDistance * 2) {
        lodLevel = 2; // Lowest detail
      } else if (distance > maxDetailDistance) {
        lodLevel = 1; // Medium detail
      }

      return { ...entity, lodLevel };
    });
  }

  /**
   * Batch render entities for improved performance
   */
  public batchRender(
    entities: Array<{ render: (ctx: CanvasRenderingContext2D) => void; lodLevel?: number }>,
    targetContext: CanvasRenderingContext2D
  ): void {
    if (!this.config.batchRendering || !this.renderContext) {
      // Fallback to direct rendering
      entities.forEach(entity => {
        entity.render(targetContext);
        this.metrics.renderCalls++;
      });
      return;
    }

    // Clear batch canvas
    this.renderContext.clearRect(0, 0, this.renderBatch!.width, this.renderBatch!.height);

    // Render entities to batch canvas
    entities.forEach(entity => {
      // Skip low-priority entities if performance is poor
      if (entity.lodLevel && entity.lodLevel > 1 && this.metrics.frameTime > 16.67) {
        return;
      }

      entity.render(this.renderContext!);
      this.metrics.renderCalls++;
    });

    // Draw batch to target canvas in one operation
    targetContext.drawImage(this.renderBatch!, 0, 0);
  }

  /**
   * Optimize particle systems
   */
  public optimizeParticles(particles: Particle[]): void {
    const maxParticles = this.config.maxParticles;
    
    // Remove excess particles if over limit
    if (particles.length > maxParticles) {
      // Remove oldest particles first
      particles.sort((a, b) => a.life - b.life);
      const excess = particles.length - maxParticles;
      
      for (let i = 0; i < excess; i++) {
        const particle = particles.shift();
        if (particle) {
          this.releaseParticle(particle);
        }
      }
    }

    // Merge nearby particles for better performance
    this.mergeNearbyParticles(particles);
  }

  /**
   * Merge nearby particles to reduce render calls
   */
  private mergeNearbyParticles(particles: Particle[], mergeDistance: number = 5): void {
    if (particles.length < 2) return;

    for (let i = particles.length - 1; i >= 0; i--) {
      const particle1 = particles[i];
      if (!particle1.active) continue;

      for (let j = i - 1; j >= 0; j--) {
        const particle2 = particles[j];
        if (!particle2.active) continue;

        const distance = Math.sqrt(
          Math.pow(particle1.position.x - particle2.position.x, 2) +
          Math.pow(particle1.position.y - particle2.position.y, 2)
        );

        if (distance < mergeDistance) {
          // Merge particles
          particle1.position.x = (particle1.position.x + particle2.position.x) / 2;
          particle1.position.y = (particle1.position.y + particle2.position.y) / 2;
          particle1.life = Math.max(particle1.life, particle2.life);
          
          // Remove merged particle
          particles.splice(j, 1);
          this.releaseParticle(particle2);
          break;
        }
      }
    }
  }

  /**
   * Get current performance metrics
   */
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get pool statistics
   */
  public getPoolStats(): {
    balls: ReturnType<ObjectPool<Ball>['getStats']>;
    powerUps: ReturnType<ObjectPool<PowerUp>['getStats']>;
    particles: ReturnType<ObjectPool<Particle>['getStats']>;
  } {
    return {
      balls: this.ballPool.getStats(),
      powerUps: this.powerUpPool.getStats(),
      particles: this.particlePool.getStats()
    };
  }

  /**
   * Check for performance warnings
   */
  private checkPerformanceWarnings(): void {
    const targetFrameTime = 1000 / this.config.targetFPS;
    
    if (this.metrics.frameTime > targetFrameTime * 1.5) {
      console.warn(`PowerUpOptimization: Frame time ${this.metrics.frameTime.toFixed(2)}ms exceeds target ${targetFrameTime.toFixed(2)}ms`);
    }

    if (this.metrics.entityCount > this.config.maxEntities) {
      console.warn(`PowerUpOptimization: Entity count ${this.metrics.entityCount} exceeds maximum ${this.config.maxEntities}`);
    }

    if (this.metrics.particleCount > this.config.maxParticles) {
      console.warn(`PowerUpOptimization: Particle count ${this.metrics.particleCount} exceeds maximum ${this.config.maxParticles}`);
    }
  }

  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(): number {
    const ballStats = this.ballPool.getStats();
    const powerUpStats = this.powerUpPool.getStats();
    const particleStats = this.particlePool.getStats();

    // Rough estimation in bytes
    const ballMemory = ballStats.totalObjects * 200; // ~200 bytes per ball
    const powerUpMemory = powerUpStats.totalObjects * 300; // ~300 bytes per power-up
    const particleMemory = particleStats.totalObjects * 100; // ~100 bytes per particle

    return ballMemory + powerUpMemory + particleMemory;
  }

  /**
   * Create empty metrics object
   */
  private createEmptyMetrics(): PerformanceMetrics {
    return {
      frameTime: 0,
      entityCount: 0,
      particleCount: 0,
      poolUtilization: { balls: 0, powerUps: 0, particles: 0 },
      memoryUsage: 0,
      renderCalls: 0,
      lastUpdate: 0
    };
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<OptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('PowerUpOptimization: Configuration updated');
  }

  /**
   * Clean up and dispose resources
   */
  public dispose(): void {
    this.ballPool.clear();
    this.powerUpPool.clear();
    this.particlePool.clear();
    this.frameTimings.length = 0;
    this.renderBatch = null;
    this.renderContext = null;
    console.log('PowerUpOptimization: Disposed');
  }
}