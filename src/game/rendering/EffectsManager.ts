/**
 * EffectsManager - Manages all visual effects for the game
 * Story 4.3b - AC11: Visual feedback integration
 *
 * Coordinates SlowMotionEffect and LaserEffect rendering
 */
import { SlowMotionEffect } from './effects/SlowMotionEffect';
import { LaserEffect } from './effects/LaserEffect';
import { Projectile } from '../entities/Projectile';
import { EventBus } from '../core/EventBus';

export interface EffectsManagerConfig {
  enableSlowMotion: boolean;
  enableLaser: boolean;
}

const DEFAULT_CONFIG: EffectsManagerConfig = {
  enableSlowMotion: true,
  enableLaser: true,
};

export class EffectsManager {
  private slowMotionEffect: SlowMotionEffect;
  private laserEffect: LaserEffect;
  private config: EffectsManagerConfig;
  private eventBus: EventBus;

  constructor(eventBus: EventBus, config: Partial<EffectsManagerConfig> = {}) {
    this.eventBus = eventBus;
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize effects
    this.slowMotionEffect = new SlowMotionEffect();
    this.laserEffect = new LaserEffect();

    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Setup event listeners for power-up activation
   */
  private setupEventListeners(): void {
    // Slow Motion events
    this.eventBus.on('slowmotion:transition', (data: { from: number; to: number }) => {
      if (!this.config.enableSlowMotion) return;

      // Activate effect when transitioning to slow motion
      if (data.to < 1.0) {
        this.slowMotionEffect.activate();
      } else {
        this.slowMotionEffect.deactivate();
      }
    });

    // Laser spawn events
    this.eventBus.on('projectile:spawned', (data: { type: string; position: { x: number; y: number } }) => {
      if (!this.config.enableLaser) return;

      // Create muzzle flash for laser projectiles
      if (data.type === 'laser') {
        this.laserEffect.createMuzzleFlash(data.position.x, data.position.y);
      }
    });
  }

  /**
   * Update all effects
   */
  public update(deltaTime: number): void {
    if (this.config.enableSlowMotion) {
      this.slowMotionEffect.update(deltaTime);
    }

    if (this.config.enableLaser) {
      this.laserEffect.update(deltaTime);
    }
  }

  /**
   * Render all effects
   * Should be called in specific order:
   * 1. Background effects (slow motion vignette)
   * 2. Game entities
   * 3. Foreground effects (laser effects)
   */
  public renderBackground(ctx: CanvasRenderingContext2D): void {
    if (this.config.enableSlowMotion) {
      this.slowMotionEffect.render(ctx);
    }
  }

  /**
   * Render foreground effects (after game entities)
   */
  public renderForeground(ctx: CanvasRenderingContext2D, projectiles: Projectile[]): void {
    if (this.config.enableLaser) {
      this.laserEffect.render(ctx, projectiles);
    }
  }

  /**
   * Clear all active effects
   */
  public clear(): void {
    this.slowMotionEffect.deactivate();
    this.laserEffect.clear();
  }

  /**
   * Enable/disable specific effects
   */
  public setEffectEnabled(effect: 'slowMotion' | 'laser', enabled: boolean): void {
    switch (effect) {
      case 'slowMotion':
        this.config.enableSlowMotion = enabled;
        if (!enabled) {
          this.slowMotionEffect.deactivate();
        }
        break;
      case 'laser':
        this.config.enableLaser = enabled;
        if (!enabled) {
          this.laserEffect.clear();
        }
        break;
    }
  }

  /**
   * Get slow motion effect instance
   */
  public getSlowMotionEffect(): SlowMotionEffect {
    return this.slowMotionEffect;
  }

  /**
   * Get laser effect instance
   */
  public getLaserEffect(): LaserEffect {
    return this.laserEffect;
  }

  /**
   * Check if any effects are active
   */
  public hasActiveEffects(): boolean {
    return this.slowMotionEffect.isActive() || this.laserEffect.getActiveMuzzleFlashCount() > 0;
  }
}
