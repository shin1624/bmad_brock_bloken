/**
 * Block entity class for breakout game
 * Supports multiple block types with hit points and visual feedback
 */
import { Entity } from './Entity';
import { BlockType, BlockConfiguration, Vector2D } from '../../types/game.types';

export class Block extends Entity {
  public type: BlockType;
  public currentHitPoints: number;
  public maxHitPoints: number;
  public scoreValue: number;
  public width: number;
  public height: number;
  public gridRow: number;
  public gridColumn: number;
  public isDestroyed: boolean;
  public color: string;

  // Block configurations for different types
  public static readonly CONFIGURATIONS: Record<BlockType, BlockConfiguration> = {
    [BlockType.Normal]: {
      type: BlockType.Normal,
      maxHitPoints: 1,
      scoreValue: 100,
      color: '#3B82F6', // Blue
      width: 75,
      height: 25
    },
    [BlockType.Hard]: {
      type: BlockType.Hard,
      maxHitPoints: 2,
      scoreValue: 200,
      color: '#EF4444', // Red
      width: 75,
      height: 25
    },
    [BlockType.Indestructible]: {
      type: BlockType.Indestructible,
      maxHitPoints: Infinity,
      scoreValue: 0,
      color: '#6B7280', // Gray
      width: 75,
      height: 25
    }
  };

  constructor(
    type: BlockType,
    gridRow: number,
    gridColumn: number,
    position: Vector2D
  ) {
    super();
    
    const config = Block.CONFIGURATIONS[type];
    this.type = type;
    this.maxHitPoints = config.maxHitPoints;
    this.currentHitPoints = config.maxHitPoints;
    this.scoreValue = config.scoreValue;
    this.width = config.width;
    this.height = config.height;
    this.color = config.color;
    this.gridRow = gridRow;
    this.gridColumn = gridColumn;
    this.isDestroyed = false;
    
    // Set position (blocks are static, no velocity)
    this.position = { ...position };
    this.velocity = { x: 0, y: 0 };
  }

  /**
   * Handle hit from ball - reduce hit points and check destruction
   */
  public hit(): { destroyed: boolean; score: number } {
    if (this.type === BlockType.Indestructible || this.isDestroyed) {
      return { destroyed: false, score: 0 };
    }

    this.currentHitPoints--;
    
    if (this.currentHitPoints <= 0) {
      this.isDestroyed = true;
      this.active = false;
      return { destroyed: true, score: this.scoreValue };
    }
    
    return { destroyed: false, score: 0 };
  }

  /**
   * Get visual feedback color based on hit points
   */
  private getVisualFeedbackColor(): string {
    if (this.isDestroyed) {
      return 'transparent';
    }
    
    if (this.type === BlockType.Hard && this.currentHitPoints === 1) {
      // Damaged hard block - lighter color
      return '#FCA5A5'; // Light red
    }
    
    return this.color;
  }

  /**
   * Update block state
   */
  public update(deltaTime: number): void {
    // Blocks are static - no update needed unless animated effects are added
  }

  /**
   * Render block with visual feedback
   */
  public render(ctx: CanvasRenderingContext2D): void {
    if (this.isDestroyed) {
      return; // Don't render destroyed blocks
    }

    const renderColor = this.getVisualFeedbackColor();
    
    // Draw block rectangle
    ctx.fillStyle = renderColor;
    ctx.fillRect(this.position.x, this.position.y, this.width, this.height);
    
    // Draw border for better visibility
    ctx.strokeStyle = '#1F2937'; // Dark gray border
    ctx.lineWidth = 1;
    ctx.strokeRect(this.position.x, this.position.y, this.width, this.height);
    
    // Draw hit point indicator for hard blocks
    if (this.type === BlockType.Hard && !this.isDestroyed) {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        this.currentHitPoints.toString(),
        this.position.x + this.width / 2,
        this.position.y + this.height / 2
      );
    }
  }

  /**
   * Get bounds for collision detection
   */
  public getBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.position.x,
      y: this.position.y,
      width: this.width,
      height: this.height
    };
  }

  /**
   * Get block state for game state management
   */
  public getState(): {
    id: string;
    type: BlockType;
    currentHitPoints: number;
    maxHitPoints: number;
    isDestroyed: boolean;
    position: Vector2D;
    gridRow: number;
    gridColumn: number;
  } {
    return {
      id: this.id,
      type: this.type,
      currentHitPoints: this.currentHitPoints,
      maxHitPoints: this.maxHitPoints,
      isDestroyed: this.isDestroyed,
      position: { ...this.position },
      gridRow: this.gridRow,
      gridColumn: this.gridColumn
    };
  }
}