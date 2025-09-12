/**
 * Entity base class following ECS pattern
 * Provides common interface for all game entities
 */
import { Vector2D, Size } from '../../types/game.types';

export abstract class Entity {
  public id: string;
  public position: Vector2D;
  public velocity: Vector2D;
  public active: boolean;

  constructor() {
    this.id = Math.random().toString(36).substr(2, 9);
    this.position = { x: 0, y: 0 };
    this.velocity = { x: 0, y: 0 };
    this.active = true;
  }

  /**
   * Update entity state - to be implemented by subclasses
   */
  abstract update(deltaTime: number): void;

  /**
   * Render entity - to be implemented by subclasses
   */
  abstract render(ctx: CanvasRenderingContext2D): void;

  /**
   * Get entity bounds for collision detection
   */
  abstract getBounds(): { x: number; y: number; width: number; height: number };

  /**
   * Destroy entity and cleanup resources
   */
  destroy(): void {
    this.active = false;
  }
}