/**
 * Particle System for visual effects
 * Manages particle creation, update, and rendering with object pooling
 */
import { Particle, ParticleOptions } from '../entities/Particle';
import { ObjectPool } from '../utils/ObjectPool';
import { Vector2D, BlockType } from '../../types/game.types';
import { EventBus } from '../core/EventBus';
import { ParticleBatchRenderer } from '../rendering/ParticleBatchRenderer';

export interface ParticleSystemConfig {
  maxParticles: number;
  preFillCount: number;
  enableDebugMode: boolean;
  useAdvancedPool?: boolean;
  enableSpatialOptimization?: boolean;
  enableLOD?: boolean;
  qualityScale?: number;
}

type ParticleThemePreset = 'neon' | 'pixel' | 'synthwave' | 'minimal';

interface ParticleThemeColors {
  particle: string;
  trail: string;
}

interface ParticleThemeSizes {
  min: number;
  max: number;
}

interface ParticleThemeEffects {
  glow: boolean;
  trail: boolean;
}

interface ParticleTheme {
  colors: ParticleThemeColors;
  sizes: ParticleThemeSizes;
  effects: ParticleThemeEffects;
}

type ParticleThemeConfig = {
  colors?: Partial<ParticleThemeColors>;
  sizes?: Partial<ParticleThemeSizes>;
  effects?: Partial<ParticleThemeEffects>;
};

type ThemeEffect = (particle: Particle) => void;

type PerformanceChangeEvent =
  | {
      type: 'qualityChange';
      previousLevel: number;
      currentLevel: number;
      fps: number;
    }
  | {
      type: 'memoryWarning';
      utilizationRate: number;
      poolStats: ReturnType<ObjectPool<Particle>['getStats']>;
    };

type PerformanceChangeCallback = (event: PerformanceChangeEvent) => void;

const THEME_PRESETS: Record<ParticleThemePreset, ParticleTheme> = {
  neon: {
    colors: { particle: '#ffffff', trail: '#ffffff80' },
    sizes: { min: 1, max: 4 },
    effects: { glow: false, trail: false },
  },
  pixel: {
    colors: { particle: '#4ECDC4', trail: '#F7FFF780' },
    sizes: { min: 1, max: 3 },
    effects: { glow: false, trail: false },
  },
  synthwave: {
    colors: { particle: '#FF71CE', trail: '#01CDFE80' },
    sizes: { min: 1, max: 4 },
    effects: { glow: true, trail: true },
  },
  minimal: {
    colors: { particle: '#F5F5F5', trail: '#E5E7EB80' },
    sizes: { min: 1, max: 2 },
    effects: { glow: false, trail: false },
  },
};

const DEFAULT_THEME: ParticleTheme = THEME_PRESETS.neon;

const cloneTheme = (theme: ParticleTheme): ParticleTheme => ({
  colors: { ...theme.colors },
  sizes: { ...theme.sizes },
  effects: { ...theme.effects },
});

const THEME_COLOR_MAP: Record<ParticleThemePreset, { primary: string; secondary: string; accent: string }> = {
  neon: {
    primary: '#00FFFF',
    secondary: '#FF00FF',
    accent: '#FFFF00',
  },
  pixel: {
    primary: '#4ECDC4',
    secondary: '#F7FFF7',
    accent: '#FF6B6B',
  },
  synthwave: {
    primary: '#FF006E',
    secondary: '#8338EC',
    accent: '#FB5607',
  },
  minimal: {
    primary: '#333333',
    secondary: '#666666',
    accent: '#0066CC',
  },
};

export class ParticleSystem {
  private activeParticles: Set<Particle>;
  private particlePool: ObjectPool<Particle>;
  private eventBus: EventBus;
  private config: ParticleSystemConfig;
  private debugMode: boolean;

  private themeEffects: Map<ParticleThemePreset, ThemeEffect> = new Map();
  private batchRenderer: ParticleBatchRenderer;
  private useBatchRendering: boolean = true;
  private cameraOffset: Vector2D = { x: 0, y: 0 };
  private viewportBounds: { x: number; y: number; width: number; height: number } | null = null;

  // Performance tracking
  private particleCount: number = 0;
  private totalParticlesCreated: number = 0;
  private frameTime: number = 0;
  private lastFrameTime: number = 0;
  private fps: number = 60;
  private qualityLevel: number = 1.0; // 1.0 = full quality, 0.5 = half, 0.25 = quarter
  private autoQualityEnabled: boolean = true;
  private performanceWarningThreshold: number = 50; // FPS below this triggers warning
  private performanceCriticalThreshold: number = 30; // FPS below this disables effects
  private memoryWarningThreshold: number = 0.8; // 80% pool utilization triggers warning
  private performanceThresholdCallbacks: {
    warning?: () => void;
    critical?: () => void;
  } = {};
  private performanceChangeCallbacks: Map<string, PerformanceChangeCallback> = new Map();
  private activeTheme: ParticleTheme = cloneTheme(DEFAULT_THEME);
  private activeThemePreset: ParticleThemePreset | null = 'neon';

  constructor(eventBus: EventBus, config: Partial<ParticleSystemConfig> = {}) {
    this.eventBus = eventBus;
    this.config = {
      maxParticles: config.maxParticles || 1000,
      preFillCount: config.preFillCount || 100,
      enableDebugMode: config.enableDebugMode || false,
      qualityScale: config.qualityScale || 1.0
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

    // Initialize batch renderer
    this.batchRenderer = new ParticleBatchRenderer({
      maxBatchSize: 100,
      enableBlending: true,
      enableGlow: true
    });

    this.setupEventListeners();
    this.setupThemeEffects();
  }
  /**
   * Setup theme-specific particle effects
   */
  private setupThemeEffects(): void {
    // Neon theme - glowing particles with trails
    this.themeEffects.set('neon', (particle: Particle) => {
      // Add glow effect by increasing size slightly
      particle.size *= 1.2;
      // Add trail effect
      if (particle.trail) {
        particle.trail.maxLength = 8;
        particle.trail.width = particle.size * 0.5;
      }
    });

    // Pixel theme - blocky, no anti-aliasing
    this.themeEffects.set('pixel', (particle: Particle) => {
      // Snap to pixel grid
      particle.position.x = Math.floor(particle.position.x);
      particle.position.y = Math.floor(particle.position.y);
      // Make size consistent
      particle.size = Math.floor(particle.size);
    });

    // Synthwave theme - neon colors with chromatic aberration
    this.themeEffects.set('synthwave', (particle: Particle) => {
      // Add extra particles for chromatic effect
      particle.chromatic = true;
      particle.size *= 1.1;
      // Stronger gravity for dramatic effect
      particle.gravity *= 1.3;
    });

    // Minimal theme - simple, clean particles
    this.themeEffects.set('minimal', (particle: Particle) => {
      // Smaller, simpler particles
      particle.size *= 0.8;
      particle.fadeOut = true;
      // No trails or special effects
      particle.trail = undefined;
    });
  }

  /**
   * Apply theme-specific effects to a particle
   */
  private applyThemeEffects(particle: Particle): void {
    if (!this.activeThemePreset) {
      return;
    }

    const themeEffect = this.themeEffects.get(this.activeThemePreset);
    if (themeEffect) {
      themeEffect(particle);
    }
  }



  /**
   * Get theme-specific particle colors
  */
  private getThemeColors(): { primary: string; secondary: string; accent: string } {
    if (this.activeThemePreset) {
      return THEME_COLOR_MAP[this.activeThemePreset];
    }

    const { particle, trail } = this.activeTheme.colors;
    const accent = this.activeTheme.effects.glow ? trail : particle;

    return {
      primary: particle,
      secondary: trail,
      accent,
    };
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

    // Power-up collection effect
    this.eventBus.on('powerup:collected', (data: {
      type: string;
      position: Vector2D;
    }) => {
      this.createEffect('powerup', data.position);
    });

    // Ball collision effect
    this.eventBus.on('ball:collision', (data: {
      position: Vector2D;
      velocity?: Vector2D;
      intensity?: number;
    }) => {
      // Create spark effect at collision point
      this.createEffect('spark', data.position);
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
   * Create a named effect at a specific position
   */
  public createEffect(effectName: string, position: { x: number; y: number }): void {
    const themeColors = this.getThemeColors();
    
    switch (effectName) {
      case "explosion":
        this.createBlockDestructionEffect(position, BlockType.Normal);
        break;
      case "spark":
        // Use theme accent color for sparks
        this.createCustomEffect(position, {
          particleCount: 5,
          colors: [themeColors.accent],
          speedRange: { min: 200, max: 400 },
          sizeRange: { min: 1, max: 3 },
          lifespan: 0.3,
          gravity: 0,
          spread: Math.PI * 2
        });
        break;
      case "powerup":
        // Use theme secondary color for power-ups
        this.createCustomEffect(position, {
          particleCount: 15,
          colors: [themeColors.secondary],
          speedRange: { min: 150, max: 350 },
          sizeRange: { min: 2, max: 5 },
          lifespan: 0.6,
          gravity: 100,
          spread: Math.PI * 2
        });
        break;
      default:
        // Default to theme primary color
        this.createCustomEffect(position, {
          particleCount: 10,
          colors: [themeColors.primary],
          speedRange: { min: 100, max: 300 },
          sizeRange: { min: 2, max: 4 },
          lifespan: 0.5,
          gravity: 150,
          spread: Math.PI * 2
        });
    }
  }

  /**
   * Set the viewport for spatial culling
   */
  public setViewport(x: number, y: number, width: number, height: number): void {
    this.viewportBounds = { x, y, width, height };
    this.batchRenderer.updateCanvasSize(width, height);
  }

  /**
   * Set camera offset for viewport-relative rendering
   */
  public setCameraOffset(offset: Vector2D): void {
    this.cameraOffset = offset;
  }

  /**
   * Check if particle is within viewport bounds
   */
  private isInViewport(particle: Particle): boolean {
    if (!this.viewportBounds) return true;
    
    const pos = particle.position;
    const bounds = this.viewportBounds;
    const margin = particle.size * 2;
    
    return pos.x >= bounds.x - margin &&
           pos.x <= bounds.x + bounds.width + margin &&
           pos.y >= bounds.y - margin &&
           pos.y <= bounds.y + bounds.height + margin;
  }

  /**
   * Get current quality level
   */
  public getQualityLevel(): number {
    return this.qualityLevel;
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
    
    // Apply theme-specific effects
    this.applyThemeEffects(particle);
    
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
    const themeColors = this.getThemeColors();
    
    // Use theme colors for different block types
    switch (blockType) {
      case BlockType.Normal:
        return themeColors.primary;
      case BlockType.Hard:
        return themeColors.secondary;
      case BlockType.Indestructible:
        return themeColors.accent;
      default:
        return themeColors.primary;
    }
  }

  /**
   * Update all active particles
   */
  public update(deltaTime: number): void {
    const startTime = performance.now();
    
    // Update FPS tracking
    const currentTime = startTime;
    if (this.lastFrameTime > 0) {
      const frameDelta = currentTime - this.lastFrameTime;
      this.fps = 1000 / frameDelta;
      
      // Auto quality adjustment
      if (this.autoQualityEnabled) {
        this.updateQualityLevel();
      }
      
      // Performance monitoring
      this.checkPerformanceThresholds();
    }
    this.lastFrameTime = currentTime;
    
    // Apply quality level to particle count
    const maxParticlesThisFrame = Math.floor(this.config.maxParticles * this.qualityLevel);
    
    const particlesToRemove: Particle[] = [];
    let processedCount = 0;
    
    this.activeParticles.forEach(particle => {
      // Skip processing if we've exceeded quality-adjusted limit
      if (processedCount >= maxParticlesThisFrame) {
        particlesToRemove.push(particle);
        return;
      }
      
      particle.update(deltaTime);
      
      if (!particle.isAlive()) {
        particlesToRemove.push(particle);
      }
      processedCount++;
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
    // Apply camera transform
    ctx.save();
    ctx.translate(-this.cameraOffset.x, -this.cameraOffset.y);
    
    if (this.useBatchRendering) {
      // Use optimized batch rendering
      const visibleParticles = new Set<Particle>();
      
      // Cull particles outside viewport
      this.activeParticles.forEach(particle => {
        if (this.isInViewport(particle)) {
          visibleParticles.add(particle);
        }
      });
      
      // Batch and render visible particles
      const batches = this.batchRenderer.batchParticles(visibleParticles);
      this.batchRenderer.renderBatches(ctx, batches);
    } else {
      // Fallback to individual particle rendering
      this.activeParticles.forEach(particle => {
        if (this.isInViewport(particle)) {
          particle.render(ctx);
        }
      });
    }
    
    ctx.restore();

    // Debug rendering (not affected by camera)
    if (this.debugMode) {
      this.renderDebugInfo(ctx);
    }
  }

  /**
   * Enable or disable batch rendering
   */
  public setBatchRendering(enabled: boolean): void {
    this.useBatchRendering = enabled;
  }

  /**
   * Get batch renderer statistics
   */
  public getBatchRenderStats(): {
    drawCalls: number;
    stateChanges: number;
    offscreenSupported: boolean;
  } {
    return this.batchRenderer.getRenderStats();
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
   * Update quality level based on current FPS
   */
  private updateQualityLevel(): void {
    const prevQuality = this.qualityLevel;
    
    if (this.fps < this.performanceCriticalThreshold) {
      // Critical performance - minimum quality
      this.qualityLevel = 0.25;
    } else if (this.fps < this.performanceWarningThreshold) {
      // Poor performance - reduce quality
      this.qualityLevel = Math.max(0.5, this.qualityLevel - 0.1);
    } else if (this.fps > 58) {
      // Good performance - gradually increase quality
      this.qualityLevel = Math.min(1.0, this.qualityLevel + 0.05);
    }
    
    // Emit event if quality changed significantly
    if (Math.abs(prevQuality - this.qualityLevel) > 0.1) {
      this.eventBus.emit('particles:qualityChanged', {
        previousLevel: prevQuality,
        currentLevel: this.qualityLevel,
        fps: this.fps
      });
      
      // Trigger callbacks
      this.performanceChangeCallbacks.forEach(callback => {
        callback({
          type: 'qualityChange',
          previousLevel: prevQuality,
          currentLevel: this.qualityLevel,
          fps: this.fps
        });
      });
    }
  }
  
  /**
   * Check performance thresholds and emit warnings
   */
  private checkPerformanceThresholds(): void {
    const poolStats = this.particlePool.getStats();
    const memoryUsage = poolStats.utilizationRate;
    
    // Check FPS thresholds
    if (this.fps < this.performanceCriticalThreshold) {
      this.eventBus.emit('particles:performanceCritical', {
        fps: this.fps,
        particleCount: this.activeParticles.size,
        qualityLevel: this.qualityLevel
      });
      
      // Trigger critical callback
      if (this.performanceThresholdCallbacks.critical) {
        this.performanceThresholdCallbacks.critical();
      }
    } else if (this.fps < this.performanceWarningThreshold) {
      this.eventBus.emit('particles:performanceWarning', {
        fps: this.fps,
        particleCount: this.activeParticles.size,
        qualityLevel: this.qualityLevel
      });
      
      // Trigger warning callback
      if (this.performanceThresholdCallbacks.warning) {
        this.performanceThresholdCallbacks.warning();
      }
    }
    
    // Check memory threshold
    if (memoryUsage > this.memoryWarningThreshold) {
      this.eventBus.emit('particles:memoryWarning', {
        utilizationRate: memoryUsage,
        activeCount: poolStats.activeCount,
        poolSize: poolStats.poolSize
      });
    }
  }
  
  /**
   * Set performance thresholds
   */
  public setPerformanceThresholds(warning: number, critical: number): void {
    this.performanceWarningThreshold = warning;
    this.performanceCriticalThreshold = critical;
  }
  
  /**
   * Enable or disable auto quality adjustment
   */
  public setAutoQuality(enabled: boolean): void {
    this.autoQualityEnabled = enabled;
    if (!enabled) {
      this.qualityLevel = 1.0; // Reset to full quality
    }
  }
  
  /**
   * Manually set quality level (0.25 to 1.0)
   */
  public setQualityLevel(level: number): void {
    this.qualityLevel = Math.max(0.25, Math.min(1.0, level));
    this.autoQualityEnabled = false; // Disable auto when manually set
  }
  
  /**
   * Register performance callback
   */
  public onPerformanceChange(id: string, callback: PerformanceChangeCallback): void {
    this.performanceChangeCallbacks.set(id, callback);
  }
  
  /**
   * Unregister performance callback
   */
  public offPerformanceChange(id: string): void {
    this.performanceChangeCallbacks.delete(id);
  }
  
  /**
   * Get comprehensive performance metrics
   */
  public getPerformanceMetrics(): {
    fps: number;
    frameTime: number;
    particleCount: number;
    activeParticles: number;
    qualityLevel: number;
    memoryUsage: number;
    updateTime?: number;
    particlePoolUtilization: number;
    poolStats: ReturnType<ObjectPool<Particle>['getStats']>;
    renderStats: ReturnType<ParticleBatchRenderer['getRenderStats']>;
    totalParticlesCreated: number;
    autoQualityEnabled: boolean;
    thresholds: {
      warning: number;
      critical: number;
      memory: number;
    };
  } {
    const poolStats = this.particlePool.getStats();
    const renderStats = this.batchRenderer.getRenderStats();
    
    return {
      fps: this.fps,
      frameTime: this.frameTime,
      particleCount: this.activeParticles.size,
      activeParticles: this.activeParticles.size,
      qualityLevel: this.qualityLevel,
      memoryUsage: poolStats.utilizationRate,
      updateTime: this.frameTime,
      particlePoolUtilization: poolStats.utilizationRate,
      poolStats,
      renderStats,
      totalParticlesCreated: this.totalParticlesCreated,
      autoQualityEnabled: this.autoQualityEnabled,
      thresholds: {
        warning: this.performanceWarningThreshold,
        critical: this.performanceCriticalThreshold,
        memory: this.memoryWarningThreshold
      }
    };
  }
  
  /**
   * Force optimize particle system (emergency performance recovery)
   */
  public forceOptimize(): void {
    // Clear half of the particles
    const particlesToRemove: Particle[] = [];
    let count = 0;
    const targetRemoval = Math.floor(this.activeParticles.size / 2);
    
    this.activeParticles.forEach(particle => {
      if (count < targetRemoval) {
        particlesToRemove.push(particle);
        count++;
      }
    });
    
    particlesToRemove.forEach(particle => {
      this.removeParticle(particle);
    });
    
    // Set quality to minimum
    this.qualityLevel = 0.25;
    
    // Emit optimization event
    this.eventBus.emit('particles:forceOptimized', {
      particlesRemoved: targetRemoval,
      newQualityLevel: this.qualityLevel
    });
  }
  
  /**
   * Get current particle count
   */
  /**
   * Emit particles from a specific position
   */
  public emit(x: number, y: number, options: {
    count: number;
    speed?: number;
    spread?: number;
    color?: string;
  }): void {
    const { count, speed = 100, spread = Math.PI * 2, color = '#ffffff' } = options;
    
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * spread + (Math.random() - 0.5) * 0.2;
      const particleSpeed = speed * (0.8 + Math.random() * 0.4);
      
      this.createParticle({
        position: { x, y },
        velocity: {
          x: Math.cos(angle) * particleSpeed,
          y: Math.sin(angle) * particleSpeed
        },
        color,
        size: 2 + Math.random() * 2,
        lifespan: 0.5 + Math.random() * 0.5,
        gravity: 200,
        damping: 0.98,
        fadeOut: true
      });
    }
  }
  
  /**
   * Create an explosion effect
   */
  public createExplosion(x: number, y: number, options: {
    count: number;
    speed?: number;
    color?: string;
  }): void {
    const { count, speed = 200, color = '#ff6b6b' } = options;
    
    this.emit(x, y, {
      count,
      speed,
      spread: Math.PI * 2,
      color
    });
  }
  
  /**
   * Create an impact effect
   */
  public createImpactEffect(x: number, y: number, options: {
    count: number;
    speed?: number;
  }): void {
    const { count, speed = 150 } = options;
    
    this.emit(x, y, {
      count,
      speed,
      spread: Math.PI,
      color: '#4ecdc4'
    });
  }
  
  /**
   * Register a performance warning callback
   */
  public onPerformanceWarning(callback: () => void): void {
    this.performanceThresholdCallbacks.warning = callback;
  }
  
  /**
   * Register a performance critical callback
   */
  public onPerformanceCritical(callback: () => void): void {
    this.performanceThresholdCallbacks.critical = callback;
  }
  
  /**
   * Set the particle theme
   */
  public setTheme(theme: ParticleThemePreset | ParticleThemeConfig | null): void {
    if (theme === null) {
      this.activeTheme = cloneTheme(DEFAULT_THEME);
      this.activeThemePreset = 'neon';
      this.clear();
      return;
    }

    if (typeof theme === 'string') {
      const preset = THEME_PRESETS[theme];
      if (!preset) {
        return;
      }

      this.activeTheme = cloneTheme(preset);
      this.activeThemePreset = theme;
      this.clear();
      this.eventBus.emit('particles:themeChanged', { theme });
      return;
    }

    this.activeTheme = {
      colors: {
        particle: theme.colors?.particle ?? DEFAULT_THEME.colors.particle,
        trail: theme.colors?.trail ?? DEFAULT_THEME.colors.trail,
      },
      sizes: {
        min: Math.max(0, theme.sizes?.min ?? DEFAULT_THEME.sizes.min),
        max: Math.max(1, theme.sizes?.max ?? DEFAULT_THEME.sizes.max),
      },
      effects: {
        glow: theme.effects?.glow ?? DEFAULT_THEME.effects.glow,
        trail: theme.effects?.trail ?? DEFAULT_THEME.effects.trail,
      },
    };
    this.activeThemePreset = null;
  }

  public getParticleCount(): number {
    return this.activeParticles.size;
  }

  /**
   * Alias for getPerformanceMetrics for backwards compatibility
   */
  public getPerformanceStats(): ReturnType<ParticleSystem['getPerformanceMetrics']> {
    return this.getPerformanceMetrics();
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
    this.eventBus.off('powerup:collected');
    this.eventBus.off('ball:collision');
  }
}
