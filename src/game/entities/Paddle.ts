import { Entity } from './Entity.js';
import { Vector2D, PaddleState } from '../../types/game.types.js';

export interface PaddleConfig {
  width: number;
  height: number;
  speed: number;
  color: string;
  maxX: number;
}

export class Paddle extends Entity {
  public size: Vector2D;
  public speed: number;
  public color: string;
  public maxX: number;

  constructor(config: PaddleConfig, initialPosition: Vector2D = { x: 0, y: 0 }) {
    super();
    
    this.position = { ...initialPosition };
    this.velocity = { x: 0, y: 0 };
    this.size = { x: config.width, y: config.height };
    this.speed = config.speed;
    this.color = config.color;
    this.maxX = config.maxX;
    this.active = true;
  }

  public update(deltaTime: number): void {
    if (!this.active) return;

    // Apply velocity to position
    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;

    // Constrain paddle to screen bounds (Story 2.1 requirement)
    this.position.x = Math.max(0, Math.min(this.position.x, this.maxX - this.size.x));
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;

    ctx.fillStyle = this.color;
    ctx.fillRect(this.position.x, this.position.y, this.size.x, this.size.y);
  }

  public getBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.position.x,
      y: this.position.y,
      width: this.size.x,
      height: this.size.y
    };
  }

  /**
   * Move paddle with keyboard input (8px/frame as per Story 2.1 spec)
   */
  public moveLeft(): void {
    this.velocity.x = -this.speed;
  }

  public moveRight(): void {
    this.velocity.x = this.speed;
  }

  public stopMoving(): void {
    this.velocity.x = 0;
  }

  /**
   * Set paddle position for mouse/touch input (immediate as per Story 2.1 spec)
   */
  public setTargetPosition(x: number): void {
    const constrainedX = Math.max(0, Math.min(x, this.maxX - this.size.x));
    this.position.x = constrainedX;
    this.velocity.x = 0; // Stop movement when positioning directly
  }

  /**
   * Get current paddle state for React integration
   */
  public getState(): PaddleState {
    return {
      position: { ...this.position },
      velocity: { ...this.velocity },
      size: { ...this.size },
      active: this.active
    };
  }

  /**
   * Set paddle configuration (for dynamic resizing or settings changes)
   */
  public updateConfig(config: Partial<PaddleConfig>): void {
    if (config.width !== undefined) this.size.x = config.width;
    if (config.height !== undefined) this.size.y = config.height;
    if (config.speed !== undefined) this.speed = config.speed;
    if (config.color !== undefined) this.color = config.color;
    if (config.maxX !== undefined) this.maxX = config.maxX;
  }
}