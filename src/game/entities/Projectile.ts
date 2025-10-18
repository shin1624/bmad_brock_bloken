/**
 * Projectile Entity - Laser projectiles for LaserGunPowerUp
 * Story 4.3b - Phase 2 Advanced Power-ups
 */
import { Entity } from './Entity';
import { Vector2D } from '../../types/game.types';

export enum ProjectileType {
  LASER = 'laser',
  // Future extensions: MISSILE, PLASMA, etc.
}

export interface ProjectileConfig {
  type: ProjectileType;
  position: Vector2D;
  velocity: Vector2D;
  damage: number;
  size: { width: number; height: number };
  color: string;
  glowColor?: string;
  lifetime?: number; // milliseconds, optional
}

/**
 * Projectile entity for laser shots
 * Follows ECS pattern, uses object pooling for performance
 */
export class Projectile extends Entity {
  public type: ProjectileType;
  public damage: number;
  public size: { width: number; height: number };
  public color: string;
  public glowColor?: string;

  private createdAt: number = 0;
  private lifetime?: number;

  constructor(id?: string) {
    super();
    if (id) {
      this.id = id;
    }
    this.type = ProjectileType.LASER;
    this.damage = 1;
    this.size = { width: 4, height: 12 };
    this.color = '#FF0000';
    this.active = false; // Start inactive for pooling
  }

  /**
   * Initialize projectile with configuration
   * Called when acquired from pool
   */
  public initialize(config: ProjectileConfig): void {
    this.type = config.type;
    this.position = { ...config.position };
    this.velocity = { ...config.velocity };
    this.damage = config.damage;
    this.size = { ...config.size };
    this.color = config.color;
    this.glowColor = config.glowColor;
    this.lifetime = config.lifetime;
    this.active = true;
    this.createdAt = Date.now();
  }

  /**
   * Reset projectile state
   * Called when returned to pool
   */
  public reset(): void {
    this.active = false;
    this.position = { x: 0, y: 0 };
    this.velocity = { x: 0, y: 0 };
    this.createdAt = 0;
    this.lifetime = undefined;
  }

  /**
   * Check if projectile has expired based on lifetime
   */
  public isExpired(): boolean {
    if (!this.lifetime) return false;
    return Date.now() - this.createdAt > this.lifetime;
  }

  /**
   * Update projectile position based on velocity
   */
  public update(deltaTime: number): void {
    if (!this.active) return;

    // Update position based on velocity
    this.position.x += this.velocity.x * (deltaTime / 1000);
    this.position.y += this.velocity.y * (deltaTime / 1000);
  }

  /**
   * Render projectile with optional glow effect
   */
  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;

    ctx.save();

    // Draw glow effect if specified
    if (this.glowColor) {
      ctx.shadowColor = this.glowColor;
      ctx.shadowBlur = 10;
    }

    // Draw projectile
    ctx.fillStyle = this.color;
    ctx.fillRect(
      this.position.x - this.size.width / 2,
      this.position.y - this.size.height / 2,
      this.size.width,
      this.size.height
    );

    ctx.restore();
  }

  /**
   * Check if projectile is off-screen
   */
  public isOffScreen(canvasWidth: number, canvasHeight: number): boolean {
    return (
      this.position.x < -this.size.width ||
      this.position.x > canvasWidth + this.size.width ||
      this.position.y < -this.size.height ||
      this.position.y > canvasHeight + this.size.height
    );
  }

  /**
   * Get bounds for collision detection
   */
  public getBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.position.x - this.size.width / 2,
      y: this.position.y - this.size.height / 2,
      width: this.size.width,
      height: this.size.height,
    };
  }
}
