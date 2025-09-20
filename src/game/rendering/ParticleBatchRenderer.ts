/**
 * Particle Batch Renderer
 * Optimizes particle rendering by batching draw calls
 */
import { Particle } from '../entities/Particle';
import { ParticleState } from '../../types/particle.types';

interface BatchRenderConfig {
  maxBatchSize: number;
  enableBlending: boolean;
  enableShadows: boolean;
  enableGlow: boolean;
}

interface ParticleBatch {
  particles: Particle[];
  color: string;
  blendMode: GlobalCompositeOperation;
}

export class ParticleBatchRenderer {
  private config: BatchRenderConfig;
  private offscreenCanvas: OffscreenCanvas | null = null;
  private offscreenCtx: OffscreenCanvasRenderingContext2D | null = null;
  private drawCallCount: number = 0;
  private stateChangeCount: number = 0;
  private lastCompositeOp: GlobalCompositeOperation = 'source-over';
  private lastFillStyle: string | CanvasGradient | CanvasPattern = '';

  constructor(config: Partial<BatchRenderConfig> = {}) {
    this.config = {
      maxBatchSize: config.maxBatchSize || 100,
      enableBlending: config.enableBlending !== false,
      enableShadows: config.enableShadows || false,
      enableGlow: config.enableGlow || false
    };

    this.initializeOffscreenCanvas();
  }

  /**
   * Initialize OffscreenCanvas for parallel rendering if supported
   */
  private initializeOffscreenCanvas(): void {
    if (typeof OffscreenCanvas !== 'undefined') {
      try {
        this.offscreenCanvas = new OffscreenCanvas(800, 600);
        this.offscreenCtx = this.offscreenCanvas.getContext('2d');
      } catch (error) {
        console.warn('OffscreenCanvas not supported, falling back to direct rendering');
      }
    }
  }

  /**
   * Batch particles by visual properties for efficient rendering
   */
  public batchParticles(particles: Set<Particle>): ParticleBatch[] {
    const batches = new Map<string, ParticleBatch>();
    
    particles.forEach(particle => {
      if (!particle.active || particle.state === ParticleState.Dead) return;
      
      // Create batch key based on visual properties
      const batchKey = this.getBatchKey(particle);
      
      if (!batches.has(batchKey)) {
        batches.set(batchKey, {
          particles: [],
          color: particle.color,
          blendMode: this.getBlendMode(particle)
        });
      }
      
      const batch = batches.get(batchKey)!;
      
      // Check if batch is at max size before adding
      if (batch.particles.length < this.config.maxBatchSize) {
        batch.particles.push(particle);
      } else {
        // Create overflow batch
        const overflowKey = batchKey + '_overflow_' + Math.random();
        if (!batches.has(overflowKey)) {
          const newBatch: ParticleBatch = {
            particles: [],
            color: particle.color,
            blendMode: batch.blendMode
          };
          batches.set(overflowKey, newBatch);
        }
        batches.get(overflowKey)!.particles.push(particle);
      }
    });
    
    return Array.from(batches.values());
  }

  /**
   * Render all particle batches with minimal state changes
   */
  public renderBatches(ctx: CanvasRenderingContext2D, batches: ParticleBatch[]): void {
    this.drawCallCount = 0;
    this.stateChangeCount = 0;
    
    ctx.save();
    
    // Sort batches by blend mode to minimize state changes
    const sortedBatches = this.sortBatchesByState(batches);
    
    sortedBatches.forEach(batch => {
      this.renderBatch(ctx, batch);
    });
    
    ctx.restore();
  }

  /**
   * Render a single batch of particles
   */
  private renderBatch(ctx: CanvasRenderingContext2D, batch: ParticleBatch): void {
    if (batch.particles.length === 0) return;
    
    // Minimize state changes
    if (ctx.globalCompositeOperation !== batch.blendMode) {
      ctx.globalCompositeOperation = batch.blendMode;
      this.lastCompositeOp = batch.blendMode;
      this.stateChangeCount++;
    }
    
    if (ctx.fillStyle !== batch.color) {
      ctx.fillStyle = batch.color;
      this.lastFillStyle = batch.color;
      this.stateChangeCount++;
    }
    
    // Use path batching for circles
    ctx.beginPath();
    
    batch.particles.forEach(particle => {
      const alpha = particle.fadeOut ? 
        particle.alpha * (particle.lifespan / particle.maxLifespan) : 
        particle.alpha;
      
      if (alpha <= 0.01) return;
      
      // Add particle to path
      ctx.moveTo(particle.position.x + particle.size, particle.position.y);
      ctx.arc(
        particle.position.x,
        particle.position.y,
        particle.size,
        0,
        Math.PI * 2
      );
    });
    
    // Single fill operation for entire batch
    ctx.fill();
    this.drawCallCount++;
    
    // Render glow effect if enabled
    if (this.config.enableGlow && batch.particles[0].glow) {
      this.renderGlowBatch(ctx, batch);
    }
  }

  /**
   * Render glow effect for a batch
   */
  private renderGlowBatch(ctx: CanvasRenderingContext2D, batch: ParticleBatch): void {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.3;
    
    ctx.beginPath();
    batch.particles.forEach(particle => {
      if (!particle.glow) return;
      
      ctx.moveTo(
        particle.position.x + particle.size * 2,
        particle.position.y
      );
      ctx.arc(
        particle.position.x,
        particle.position.y,
        particle.size * (particle.glow.radius || 2),
        0,
        Math.PI * 2
      );
    });
    
    // Create gradient for glow
    if (batch.particles.length > 0) {
      const firstParticle = batch.particles[0];
      const gradient = ctx.createRadialGradient(
        firstParticle.position.x,
        firstParticle.position.y,
        0,
        firstParticle.position.x,
        firstParticle.position.y,
        firstParticle.size * 3
      );
      gradient.addColorStop(0, batch.color);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
    }
    
    ctx.fill();
    ctx.restore();
    this.drawCallCount++;
  }

  /**
   * Use OffscreenCanvas for parallel rendering if available
   */
  public renderToOffscreen(particles: Set<Particle>): ImageBitmap | null {
    if (!this.offscreenCanvas || !this.offscreenCtx) {
      return null;
    }
    
    // Clear offscreen canvas
    this.offscreenCtx.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
    
    // Batch and render particles
    const batches = this.batchParticles(particles);
    this.renderBatches(this.offscreenCtx, batches);
    
    // Return bitmap for main thread rendering
    return this.offscreenCanvas.transferToImageBitmap();
  }

  /**
   * Render particles using point sprites (WebGL-style optimization for 2D)
   */
  public renderAsPointSprites(ctx: CanvasRenderingContext2D, particles: Set<Particle>): void {
    ctx.save();
    
    // Use a single image for all particles of same type
    const particleImage = this.createParticleSprite(4);
    
    particles.forEach(particle => {
      if (!particle.active) return;
      
      const alpha = particle.fadeOut ? 
        particle.alpha * (particle.lifespan / particle.maxLifespan) : 
        particle.alpha;
      
      if (alpha <= 0.01) return;
      
      ctx.globalAlpha = alpha;
      ctx.drawImage(
        particleImage,
        particle.position.x - particle.size,
        particle.position.y - particle.size,
        particle.size * 2,
        particle.size * 2
      );
    });
    
    ctx.restore();
    this.drawCallCount++;
  }

  /**
   * Create a reusable particle sprite
   */
  private createParticleSprite(size: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = size * 2;
    canvas.height = size * 2;
    const ctx = canvas.getContext('2d')!;
    
    const gradient = ctx.createRadialGradient(size, size, 0, size, size, size);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size * 2, size * 2);
    
    return canvas;
  }

  /**
   * Generate batch key for particle grouping
   */
  private getBatchKey(particle: Particle): string {
    const colorKey = particle.color.replace(/[^a-zA-Z0-9]/g, '');
    const sizeKey = Math.floor(particle.size / 2) * 2; // Group by size ranges
    const stateKey = particle.state;
    const glowKey = particle.glow ? 'glow' : 'noglow';
    
    return `${colorKey}_${sizeKey}_${stateKey}_${glowKey}`;
  }

  /**
   * Get appropriate blend mode for particle
   */
  private getBlendMode(particle: Particle): GlobalCompositeOperation {
    if (!this.config.enableBlending) {
      return 'source-over';
    }
    
    // Use additive blending only for glowing particles
    if (particle.glow) {
      return 'lighter';
    }
    
    // Use additive for spawn state
    if (particle.state === ParticleState.Spawn) {
      return 'lighter';
    }
    
    // Use normal blending for others
    return 'source-over';
  }

  /**
   * Sort batches to minimize state changes
   */
  private sortBatchesByState(batches: ParticleBatch[]): ParticleBatch[] {
    return batches.sort((a, b) => {
      // Group by blend mode first
      if (a.blendMode !== b.blendMode) {
        return a.blendMode < b.blendMode ? -1 : 1;
      }
      // Then by color
      return a.color < b.color ? -1 : 1;
    });
  }

  /**
   * Update canvas size for OffscreenCanvas
   */
  public updateCanvasSize(width: number, height: number): void {
    if (this.offscreenCanvas && typeof OffscreenCanvas !== 'undefined') {
      this.offscreenCanvas = new OffscreenCanvas(width, height);
      this.offscreenCtx = this.offscreenCanvas.getContext('2d');
    }
  }

  /**
   * Get rendering statistics
   */
  public getRenderStats(): {
    drawCalls: number;
    stateChanges: number;
    offscreenSupported: boolean;
  } {
    return {
      drawCalls: this.drawCallCount,
      stateChanges: this.stateChangeCount,
      offscreenSupported: this.offscreenCanvas !== null
    };
  }

  /**
   * Clear statistics
   */
  public clearStats(): void {
    this.drawCallCount = 0;
    this.stateChangeCount = 0;
  }
}