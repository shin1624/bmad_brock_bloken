/**
 * Particle entity for visual effects
 * Used for block destruction, power-up effects, etc.
 */
import { Entity } from "./Entity";
import { Vector2D } from "../../types/game.types";
import { ParticleState } from "../../types/particle.types";

export interface ParticleOptions {
  position: Vector2D;
  velocity: Vector2D;
  color: string;
  size: number;
  lifespan: number;
  gravity?: number;
  damping?: number;
  fadeOut?: boolean;
}

export class Particle extends Entity {
  public size: number;
  public color: string;
  public lifespan: number;
  public maxLifespan: number;
  public gravity: number;
  public damping: number;
  public fadeOut: boolean;
  public alpha: number;
  public state: ParticleState;
  public trail?: { maxLength: number; width: number; points: Vector2D[] };
  public chromatic?: boolean;
  public glow?: { intensity: number; radius: number };

  constructor(options: ParticleOptions) {
    super();

    this.position = { ...options.position };
    this.velocity = { ...options.velocity };
    this.size = options.size;
    this.color = options.color;
    this.lifespan = options.lifespan;
    this.maxLifespan = options.lifespan;
    this.gravity = options.gravity || 200; // pixels/second²
    this.damping = options.damping || 0.98; // velocity multiplier per frame
    this.fadeOut = options.fadeOut !== false; // default true
    this.alpha = 1.0;
    this.state = ParticleState.Active;
  }

  /**
   * Reset particle for object pooling
   */
  public reset(options: ParticleOptions): void {
    this.position = { ...options.position };
    this.velocity = { ...options.velocity };
    this.size = options.size;
    this.color = options.color;
    this.lifespan = options.lifespan;
    this.maxLifespan = options.lifespan;
    this.gravity = options.gravity || 200;
    this.damping = options.damping || 0.98;
    this.fadeOut = options.fadeOut !== false;
    this.alpha = 1.0;
    this.active = true;

    // Generate new ID for pooled particle
    this.id = Math.random().toString(36).substr(2, 9);
  }

  /**
   * Update particle physics and lifetime
   */
  public update(deltaTime: number): void {
    if (!this.active) return;

    // Update lifetime
    this.lifespan -= deltaTime;

    if (this.lifespan <= 0) {
      this.active = false;
      return;
    }

    // Apply gravity
    this.velocity.y += this.gravity * deltaTime;

    // Apply damping
    this.velocity.x *= this.damping;
    this.velocity.y *= this.damping;

    // Update position
    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;

    // Update alpha for fade out effect
    if (this.fadeOut) {
      this.alpha = this.lifespan / this.maxLifespan;
    }
  }

  /**
   * Render particle
   */
  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.active || this.alpha <= 0) return;

    ctx.save();

    // Set alpha
    ctx.globalAlpha = this.alpha;

    // Draw particle as circle
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.size, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * Get bounds for collision detection (if needed)
   */
  public getBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.position.x - this.size,
      y: this.position.y - this.size,
      width: this.size * 2,
      height: this.size * 2,
    };
  }

  /**
   * Check if particle is alive
   */
  public isAlive(): boolean {
    return this.active && this.lifespan > 0;
  }

  /**
   * Get remaining life percentage (0-1)
   */
  public getLifePercentage(): number {
    return Math.max(0, this.lifespan / this.maxLifespan);
  }

  /**
   * Create explosion particles configuration
   */
  public static createExplosionConfig(
    center: Vector2D,
    color: string,
    count: number = 8,
  ): ParticleOptions[] {
    const particles: ParticleOptions[] = [];

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 100 + Math.random() * 100; // 100-200 pixels/second

      particles.push({
        position: { ...center },
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed,
        },
        color: color,
        size: 2 + Math.random() * 3, // 2-5 pixels
        lifespan: 0.4 + Math.random() * 0.2, // 0.4-0.6 seconds
        gravity: 150 + Math.random() * 100, // 150-250 gravity
        damping: 0.95 + Math.random() * 0.04, // 0.95-0.99 damping
        fadeOut: true,
      });
    }

    return particles;
  }

  /**
   * Create sparkle particles configuration
   */
  public static createSparkleConfig(
    center: Vector2D,
    color: string,
    count: number = 4,
  ): ParticleOptions[] {
    const particles: ParticleOptions[] = [];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 50; // 50-100 pixels/second

      particles.push({
        position: {
          x: center.x + (Math.random() - 0.5) * 20,
          y: center.y + (Math.random() - 0.5) * 20,
        },
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed - 50, // upward bias
        },
        color: color,
        size: 1 + Math.random() * 2, // 1-3 pixels
        lifespan: 0.3 + Math.random() * 0.4, // 0.3-0.7 seconds
        gravity: 100,
        damping: 0.99,
        fadeOut: true,
      });
    }

    return particles;
  }
}
