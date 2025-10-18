/**
 * SlowMotionEffect - Visual feedback for Slow Motion power-up
 * Story 4.3b - AC11: Visual feedback distinct and non-interfering
 *
 * Features:
 * - Vignette effect (darker edges)
 * - Edge wave distortion
 * - Smooth transitions
 * - Quality settings integration
 */
import { getQualitySettings } from '../../../stores/qualitySettingsStore';

export interface SlowMotionEffectConfig {
  vignetteColor: string;
  vignetteIntensity: number;
  waveAmplitude: number;
  waveFrequency: number;
  transitionDuration: number; // milliseconds
}

const DEFAULT_CONFIG: SlowMotionEffectConfig = {
  vignetteColor: 'rgba(138, 43, 226, 0.3)', // Purple
  vignetteIntensity: 0.3,
  waveAmplitude: 5,
  waveFrequency: 0.002,
  transitionDuration: 500,
};

export class SlowMotionEffect {
  private active: boolean = false;
  private intensity: number = 0; // 0-1
  private config: SlowMotionEffectConfig;
  private wavePhase: number = 0;
  private transitionStartTime: number = 0;
  private targetIntensity: number = 0;

  constructor(config: Partial<SlowMotionEffectConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Activate the effect
   */
  public activate(): void {
    this.targetIntensity = 1.0;
    this.transitionStartTime = Date.now();
    this.active = true;
  }

  /**
   * Deactivate the effect
   */
  public deactivate(): void {
    this.targetIntensity = 0.0;
    this.transitionStartTime = Date.now();
  }

  /**
   * Update effect state
   */
  public update(deltaTime: number): void {
    // Update intensity transition
    const elapsed = Date.now() - this.transitionStartTime;
    const progress = Math.min(elapsed / this.config.transitionDuration, 1.0);

    // Smooth ease-in-out
    const easedProgress =
      progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    const currentIntensity = this.intensity;
    this.intensity =
      currentIntensity + (this.targetIntensity - currentIntensity) * easedProgress;

    // Deactivate if fully faded out
    if (this.intensity < 0.01 && this.targetIntensity === 0) {
      this.active = false;
      this.intensity = 0;
    }

    // Update wave phase for animation
    this.wavePhase += deltaTime * 0.001; // Convert to seconds
  }

  /**
   * Render the effect
   */
  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.active || this.intensity <= 0) {
      return;
    }

    // Check quality settings
    const qualitySettings = getQualitySettings();
    if (!qualitySettings.visualEffects) {
      return;
    }

    const { width, height } = ctx.canvas;

    // Save context state
    ctx.save();

    // Render vignette effect
    this.renderVignette(ctx, width, height);

    // Render edge waves (only at high quality)
    if (qualitySettings.glowEffects) {
      this.renderEdgeWaves(ctx, width, height);
    }

    ctx.restore();
  }

  /**
   * Render vignette effect (darker edges)
   */
  private renderVignette(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    const gradient = ctx.createRadialGradient(
      width / 2,
      height / 2,
      0,
      width / 2,
      height / 2,
      Math.max(width, height) / 2
    );

    // Parse color and apply intensity
    const alpha = this.config.vignetteIntensity * this.intensity;
    const color = this.config.vignetteColor.replace(/[\d.]+\)$/g, `${alpha})`);

    gradient.addColorStop(0, 'rgba(138, 43, 226, 0)');
    gradient.addColorStop(1, color);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  /**
   * Render edge wave distortion effect
   */
  private renderEdgeWaves(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    const waveIntensity = this.intensity * this.config.waveAmplitude;
    const edgeThickness = 20;

    ctx.strokeStyle = `rgba(138, 43, 226, ${0.2 * this.intensity})`;
    ctx.lineWidth = 2;

    // Top edge
    ctx.beginPath();
    for (let x = 0; x <= width; x += 5) {
      const y =
        edgeThickness +
        Math.sin(x * this.config.waveFrequency + this.wavePhase) * waveIntensity;
      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Bottom edge
    ctx.beginPath();
    for (let x = 0; x <= width; x += 5) {
      const y =
        height -
        edgeThickness +
        Math.sin(x * this.config.waveFrequency + this.wavePhase + Math.PI) *
          waveIntensity;
      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Left edge
    ctx.beginPath();
    for (let y = 0; y <= height; y += 5) {
      const x =
        edgeThickness +
        Math.sin(y * this.config.waveFrequency + this.wavePhase) * waveIntensity;
      if (y === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Right edge
    ctx.beginPath();
    for (let y = 0; y <= height; y += 5) {
      const x =
        width -
        edgeThickness +
        Math.sin(y * this.config.waveFrequency + this.wavePhase + Math.PI) *
          waveIntensity;
      if (y === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }

  /**
   * Check if effect is active
   */
  public isActive(): boolean {
    return this.active;
  }

  /**
   * Get current intensity
   */
  public getIntensity(): number {
    return this.intensity;
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<SlowMotionEffectConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
