/**
 * LaserEffect - Visual feedback for Laser Gun projectiles
 * Story 4.3b - AC11: Visual feedback distinct and non-interfering
 *
 * Features:
 * - Glow effect (toggleable via quality settings)
 * - Muzzle flash at spawn point
 * - Trail effect
 * - Quality settings integration
 */
import { Projectile } from '../../entities/Projectile';
import { getQualitySettings } from '../../../stores/qualitySettingsStore';

export interface LaserEffectConfig {
  glowBlur: number;
  glowColor: string;
  muzzleFlashDuration: number; // milliseconds
  muzzleFlashRadius: number;
  trailLength: number;
}

const DEFAULT_CONFIG: LaserEffectConfig = {
  glowBlur: 10,
  glowColor: 'rgba(255, 100, 100, 0.8)',
  muzzleFlashDuration: 150,
  muzzleFlashRadius: 12,
  trailLength: 3,
};

interface MuzzleFlash {
  x: number;
  y: number;
  startTime: number;
  intensity: number;
}

export class LaserEffect {
  private config: LaserEffectConfig;
  private muzzleFlashes: MuzzleFlash[] = [];

  constructor(config: Partial<LaserEffectConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Render a single laser projectile
   */
  public renderProjectile(
    ctx: CanvasRenderingContext2D,
    projectile: Projectile
  ): void {
    if (!projectile.active) return;

    const qualitySettings = getQualitySettings();
    const { position, size, color } = projectile;

    ctx.save();

    // Render glow effect (if quality allows)
    if (qualitySettings.glowEffects) {
      ctx.shadowBlur = this.config.glowBlur;
      ctx.shadowColor = this.config.glowColor;
      ctx.fillStyle = color;
      ctx.fillRect(
        position.x - size.width / 2,
        position.y - size.height / 2,
        size.width,
        size.height
      );
      ctx.shadowBlur = 0;
    }

    // Render core laser beam
    ctx.fillStyle = color;
    ctx.fillRect(
      position.x - size.width / 2,
      position.y - size.height / 2,
      size.width,
      size.height
    );

    // Render trail (if quality allows)
    if (qualitySettings.visualEffects) {
      this.renderTrail(ctx, projectile);
    }

    ctx.restore();
  }

  /**
   * Render trail effect behind projectile
   */
  private renderTrail(
    ctx: CanvasRenderingContext2D,
    projectile: Projectile
  ): void {
    const { position, size, velocity, color } = projectile;

    // Skip if velocity is zero
    const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2);
    if (speed < 0.1) return;

    // Calculate trail direction (opposite of velocity)
    const dirX = -velocity.x / speed;
    const dirY = -velocity.y / speed;

    // Render trail segments
    for (let i = 1; i <= this.config.trailLength; i++) {
      const alpha = 1 - i / (this.config.trailLength + 1);
      const trailX = position.x + dirX * size.height * i;
      const trailY = position.y + dirY * size.height * i;

      ctx.fillStyle = color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
      ctx.fillRect(
        trailX - size.width / 2,
        trailY - size.height / 2,
        size.width,
        size.height * 0.8
      );
    }
  }

  /**
   * Create muzzle flash at spawn point
   */
  public createMuzzleFlash(x: number, y: number): void {
    const qualitySettings = getQualitySettings();
    if (!qualitySettings.visualEffects) {
      return;
    }

    this.muzzleFlashes.push({
      x,
      y,
      startTime: Date.now(),
      intensity: 1.0,
    });
  }

  /**
   * Update muzzle flashes
   */
  public update(deltaTime: number): void {
    const now = Date.now();

    // Update and remove expired flashes
    this.muzzleFlashes = this.muzzleFlashes.filter((flash) => {
      const elapsed = now - flash.startTime;
      if (elapsed >= this.config.muzzleFlashDuration) {
        return false;
      }

      // Update intensity (fade out)
      flash.intensity = 1 - elapsed / this.config.muzzleFlashDuration;
      return true;
    });
  }

  /**
   * Render all muzzle flashes
   */
  public renderMuzzleFlashes(ctx: CanvasRenderingContext2D): void {
    const qualitySettings = getQualitySettings();
    if (!qualitySettings.visualEffects) {
      return;
    }

    ctx.save();

    for (const flash of this.muzzleFlashes) {
      const radius = this.config.muzzleFlashRadius * flash.intensity;
      const alpha = flash.intensity * 0.8;

      // Outer glow (if quality allows)
      if (qualitySettings.glowEffects) {
        const gradient = ctx.createRadialGradient(
          flash.x,
          flash.y,
          0,
          flash.x,
          flash.y,
          radius * 1.5
        );
        gradient.addColorStop(0, `rgba(255, 200, 100, ${alpha})`);
        gradient.addColorStop(0.5, `rgba(255, 100, 100, ${alpha * 0.5})`);
        gradient.addColorStop(1, 'rgba(255, 100, 100, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(flash.x, flash.y, radius * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Core flash
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(flash.x, flash.y, radius * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Render all active effects
   */
  public render(
    ctx: CanvasRenderingContext2D,
    projectiles: Projectile[]
  ): void {
    // Render muzzle flashes first (behind projectiles)
    this.renderMuzzleFlashes(ctx);

    // Render projectiles with effects
    for (const projectile of projectiles) {
      if (projectile.active) {
        this.renderProjectile(ctx, projectile);
      }
    }
  }

  /**
   * Clear all active effects
   */
  public clear(): void {
    this.muzzleFlashes = [];
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<LaserEffectConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get number of active muzzle flashes
   */
  public getActiveMuzzleFlashCount(): number {
    return this.muzzleFlashes.length;
  }
}
