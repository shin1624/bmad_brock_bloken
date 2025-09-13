/**
 * Ball entity for breakout game
 * Implements physics-based movement with wall bouncing
 */
import { Entity } from './Entity';
import { Vector2D, BallConfiguration } from '../../types/game.types';

export class Ball extends Entity {
  public radius: number;
  public speed: number;
  public maxSpeed: number;
  public minSpeed: number;
  public bounceDamping: number;

  constructor(config: BallConfiguration) {
    super();
    
    this.position = { ...config.initialPosition };
    this.radius = config.initialRadius;
    this.speed = config.initialSpeed;
    this.maxSpeed = config.maxSpeed;
    this.minSpeed = config.minSpeed;
    this.bounceDamping = config.bounceDamping;
    
    // Initialize with normalized random direction
    const angle = Math.random() * Math.PI * 2;
    this.velocity = {
      x: Math.cos(angle) * this.speed,
      y: Math.sin(angle) * this.speed
    };
  }

  update(deltaTime: number): void {
    if (!this.active) return;

    // Update position based on velocity
    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;

    // Maintain speed consistency
    this.normalizeVelocity();
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;

    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  getBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.position.x - this.radius,
      y: this.position.y - this.radius,
      width: this.radius * 2,
      height: this.radius * 2
    };
  }

  /**
   * Reflect ball velocity off a surface with given normal
   */
  reflect(normal: Vector2D): void {
    const dot = this.velocity.x * normal.x + this.velocity.y * normal.y;
    this.velocity.x -= 2 * dot * normal.x;
    this.velocity.y -= 2 * dot * normal.y;
    
    // Apply bounce damping
    this.velocity.x *= this.bounceDamping;
    this.velocity.y *= this.bounceDamping;
    
    this.normalizeVelocity();
  }

  /**
   * Set ball velocity while maintaining speed constraints
   */
  setVelocity(velocity: Vector2D): void {
    this.velocity = { ...velocity };
    this.normalizeVelocity();
  }

  /**
   * Ensure velocity magnitude stays within speed limits
   */
  private normalizeVelocity(): void {
    const magnitude = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
    
    if (magnitude < 0.0001) { // Treat very small values as zero
      // Prevent zero velocity - use random direction
      const angle = Math.random() * Math.PI * 2;
      const speed = this.speed || this.minSpeed;
      this.velocity.x = Math.cos(angle) * speed;
      this.velocity.y = Math.sin(angle) * speed;
      this.speed = speed;
      return;
    }

    // Clamp speed to min/max bounds
    let targetSpeed = magnitude;
    if (targetSpeed > this.maxSpeed) {
      targetSpeed = this.maxSpeed;
    } else if (targetSpeed < this.minSpeed) {
      targetSpeed = this.minSpeed;
    }

    // Normalize and scale to target speed with precision correction
    const scale = targetSpeed / magnitude;
    this.velocity.x *= scale;
    this.velocity.y *= scale;
    
    // Round to avoid floating point precision issues
    this.velocity.x = Math.round(this.velocity.x * 1000000) / 1000000;
    this.velocity.y = Math.round(this.velocity.y * 1000000) / 1000000;
    
    this.speed = targetSpeed;
  }

  /**
   * Check if ball is within canvas bounds
   */
  isInBounds(canvasWidth: number, canvasHeight: number): boolean {
    return this.position.x - this.radius >= 0 &&
           this.position.x + this.radius <= canvasWidth &&
           this.position.y - this.radius >= 0 &&
           this.position.y + this.radius <= canvasHeight;
  }

  /**
   * Reset ball to initial state
   */
  reset(config: BallConfiguration): void {
    this.position = { ...config.initialPosition };
    this.radius = config.initialRadius;
    this.speed = config.initialSpeed;
    this.maxSpeed = config.maxSpeed;
    this.minSpeed = config.minSpeed;
    this.bounceDamping = config.bounceDamping;
    this.active = true;
    
    // Reset with random direction
    const angle = Math.random() * Math.PI * 2;
    this.velocity = {
      x: Math.cos(angle) * this.speed,
      y: Math.sin(angle) * this.speed
    };
  }
}