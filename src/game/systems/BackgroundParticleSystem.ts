/**
 * Background Particle Animation System
 * Provides subtle ambient particle effects that enhance visual atmosphere
 * without impacting gameplay performance
 */
import { ParticleSystem } from './ParticleSystem';
import { EventBus } from '../core/EventBus';
import { Vector2D } from '../../types/game.types';

export interface BackgroundLayer {
  depth: number; // 0 = furthest back, 1 = closest to game layer
  particleCount: number;
  speed: number; // Base speed multiplier
  opacity: number; // Alpha value for layer
  color?: string; // Override color for this layer
  parallaxFactor: number; // How much the layer moves relative to camera
}

export class BackgroundParticleSystem {
  private particleSystem: ParticleSystem;
  private layers: BackgroundLayer[];
  private enabled: boolean = true;
  private viewport: { width: number; height: number } = { width: 800, height: 600 };
  private animationTime: number = 0;
  private performanceMode: 'high' | 'medium' | 'low' = 'high';
  private ambientParticles: Map<number, Vector2D[]> = new Map();

  constructor(eventBus: EventBus) {
    // Create a dedicated particle system for background effects
    this.particleSystem = new ParticleSystem(eventBus, {
      maxParticles: 200, // Lower limit for background particles
      preFillCount: 50,
      enableDebugMode: false
    });

    // Define background layers with different depths
    this.layers = [
      {
        depth: 0.2,
        particleCount: 30,
        speed: 0.3,
        opacity: 0.2,
        parallaxFactor: 0.2
      },
      {
        depth: 0.5,
        particleCount: 20,
        speed: 0.5,
        opacity: 0.3,
        parallaxFactor: 0.5
      },
      {
        depth: 0.8,
        particleCount: 15,
        speed: 0.8,
        opacity: 0.4,
        parallaxFactor: 0.8
      }
    ];

    this.initializeAmbientParticles();
    this.setupPerformanceMonitoring();
  }

  /**
   * Initialize ambient floating particles for each layer
   */
  private initializeAmbientParticles(): void {
    this.layers.forEach((layer, index) => {
      const particles: Vector2D[] = [];
      
      for (let i = 0; i < layer.particleCount; i++) {
        particles.push({
          x: Math.random() * this.viewport.width,
          y: Math.random() * this.viewport.height
        });
      }
      
      this.ambientParticles.set(index, particles);
    });
  }

  /**
   * Setup performance monitoring and auto-scaling
   */
  private setupPerformanceMonitoring(): void {
    // Monitor FPS and adjust quality automatically
    setInterval(() => {
      const stats = this.particleSystem.getPerformanceStats();
      
      if (stats.fps < 30) {
        this.setPerformanceMode('low');
      } else if (stats.fps < 50) {
        this.setPerformanceMode('medium');
      } else {
        this.setPerformanceMode('high');
      }
    }, 1000);
  }

  /**
   * Set viewport dimensions for particle bounds
   */
  public setViewport(width: number, height: number): void {
    this.viewport = { width, height };
    this.particleSystem.setViewport(0, 0, width, height);
    
    // Reinitialize particles for new viewport
    this.initializeAmbientParticles();
  }

  /**
   * Update background particles with subtle animations
   */
  public update(deltaTime: number): void {
    if (!this.enabled) return;

    this.animationTime += deltaTime;

    // Update each layer with different speeds and patterns
    this.layers.forEach((layer, layerIndex) => {
      const particles = this.ambientParticles.get(layerIndex);
      if (!particles) return;

      particles.forEach((particle, index) => {
        // Subtle floating motion using sine waves
        const floatSpeed = layer.speed * 20;
        const horizontalDrift = Math.sin(this.animationTime + index) * floatSpeed * deltaTime;
        const verticalDrift = Math.cos(this.animationTime * 0.7 + index) * floatSpeed * deltaTime;

        // Update particle position
        particle.x += horizontalDrift;
        particle.y += verticalDrift;

        // Wrap particles around viewport edges
        if (particle.x < -20) particle.x = this.viewport.width + 20;
        if (particle.x > this.viewport.width + 20) particle.x = -20;
        if (particle.y < -20) particle.y = this.viewport.height + 20;
        if (particle.y > this.viewport.height + 20) particle.y = -20;

        // Create subtle glow effect occasionally
        if (Math.random() < 0.001 * this.getPerformanceMultiplier()) {
          this.createSubtleGlow(particle, layer);
        }
      });
    });

    // Update particle system
    this.particleSystem.update(deltaTime);
  }

  /**
   * Create a subtle glow effect at a particle position
   */
  private createSubtleGlow(position: Vector2D, layer: BackgroundLayer): void {
    const themeColors = this.particleSystem['getThemeColors']();
    const color = layer.color || themeColors.primary;

    this.particleSystem.createCustomEffect(position, {
      particleCount: Math.floor(3 * this.getPerformanceMultiplier()),
      colors: [color],
      speedRange: { min: 5, max: 15 },
      sizeRange: { min: 1, max: 2 },
      lifespan: 2.0,
      gravity: 0,
      spread: Math.PI * 2
    });
  }

  /**
   * Render background particles with depth layers
   */
  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.enabled) return;

    ctx.save();

    // Render each layer from back to front
    this.layers.forEach((layer, layerIndex) => {
      const particles = this.ambientParticles.get(layerIndex);
      if (!particles) return;

      ctx.globalAlpha = layer.opacity * this.getPerformanceMultiplier();
      const themeColors = this.particleSystem['getThemeColors']();
      const color = layer.color || themeColors.accent;

      particles.forEach((particle) => {
        // Draw small, subtle particles
        const size = 1 + layer.depth * 2;
        
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
        ctx.fill();

        // Add subtle glow for larger particles
        if (size > 2 && this.performanceMode !== 'low') {
          ctx.globalAlpha = layer.opacity * 0.3;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, size * 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = layer.opacity;
        }
      });
    });

    ctx.restore();

    // Render particle system effects
    this.particleSystem.render(ctx);
  }

  /**
   * Apply parallax effect when camera moves
   */
  public applyParallax(cameraOffset: Vector2D): void {
    this.layers.forEach((layer, layerIndex) => {
      const particles = this.ambientParticles.get(layerIndex);
      if (!particles) return;

      particles.forEach((particle) => {
        // Apply parallax based on layer depth
        particle.x += cameraOffset.x * layer.parallaxFactor;
        particle.y += cameraOffset.y * layer.parallaxFactor;
      });
    });
  }

  /**
   * Set performance mode for quality scaling
   */
  public setPerformanceMode(mode: 'high' | 'medium' | 'low'): void {
    this.performanceMode = mode;

    // Adjust particle counts based on performance mode
    switch (mode) {
      case 'low':
        this.layers.forEach(layer => {
          layer.particleCount = Math.floor(layer.particleCount * 0.3);
        });
        break;
      case 'medium':
        this.layers.forEach(layer => {
          layer.particleCount = Math.floor(layer.particleCount * 0.6);
        });
        break;
      case 'high':
        // Reset to original counts
        this.layers[0].particleCount = 30;
        this.layers[1].particleCount = 20;
        this.layers[2].particleCount = 15;
        break;
    }

    // Reinitialize with new counts
    this.initializeAmbientParticles();
  }

  /**
   * Get performance multiplier for scaling effects
   */
  private getPerformanceMultiplier(): number {
    switch (this.performanceMode) {
      case 'low': return 0.3;
      case 'medium': return 0.6;
      case 'high': return 1.0;
      default: return 1.0;
    }
  }

  /**
   * Enable or disable background animations
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    
    if (!enabled) {
      this.particleSystem.clear();
    }
  }

  /**
   * Get performance statistics
   */
  public getStats(): {
    enabled: boolean;
    performanceMode: string;
    layerCount: number;
    totalParticles: number;
  } {
    const totalParticles = this.layers.reduce(
      (sum, layer) => sum + layer.particleCount, 
      0
    );

    return {
      enabled: this.enabled,
      performanceMode: this.performanceMode,
      layerCount: this.layers.length,
      totalParticles
    };
  }

  /**
   * Set theme for background particles
   */
  public setTheme(themeName: string): void {
    this.particleSystem.setTheme(themeName);
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.particleSystem.destroy();
    this.ambientParticles.clear();
  }
}