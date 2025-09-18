/**
 * Paddle Size Power-Up Plugin Implementation
 * Story 4.2, Task 2: Modifies paddle size (large/small)
 */
import { PowerUpPlugin, PowerUpPluginContext, EffectResult } from '../PowerUpPlugin';
import { PowerUpType, PowerUpEffect } from '../../entities/PowerUp';
import { Paddle } from '../../entities/Paddle';

export enum PaddleSizeVariant {
  Large = 'large',
  Small = 'small'
}

interface PaddleSizeEffectData {
  variant: PaddleSizeVariant;
  originalWidth: number;
  originalHeight: number;
  sizeMultiplier: number;
  paddleId: string;
}

export class PaddleSizePowerUp extends PowerUpPlugin {
  private static readonly LARGE_MULTIPLIER = 1.5;
  private static readonly SMALL_MULTIPLIER = 0.75;
  private static readonly MIN_PADDLE_WIDTH = 30; // Minimum usable paddle width
  private static readonly TRANSITION_SPEED = 0.1; // Animation speed for size changes

  private variant: PaddleSizeVariant;

  constructor(variant: PaddleSizeVariant = PaddleSizeVariant.Large) {
    const effect: PowerUpEffect = {
      id: `paddle_size_${variant}_effect`,
      priority: 5,
      stackable: false,
      conflictsWith: [PowerUpType.PaddleSize], // Conflicts with other paddle size changes
      apply: () => {}, // Implementation in onApplyEffect
      remove: () => {} // Implementation in onRemoveEffect
    };

    super(
      `PaddleSizePowerUp_${variant}`,
      '1.0.0',
      PowerUpType.PaddleSize,
      effect,
      `Modifies paddle size (${variant})`,
      []
    );

    this.variant = variant;
  }

  protected async onInit(): Promise<void> {
    this.log(`PaddleSize (${this.variant}) power-up plugin initialized`);
  }

  protected async onDestroy(): Promise<void> {
    this.log(`PaddleSize (${this.variant}) power-up plugin destroyed`);
  }

  protected onApplyEffect(context: PowerUpPluginContext): EffectResult {
    try {
      const paddle = context.gameEntities.paddle as Paddle;
      if (!paddle || !paddle.active) {
        this.log('No active paddle found', 'error');
        return {
          success: false,
          modified: false,
          error: new Error('No active paddle available for size modification')
        };
      }

      // Calculate new size
      const multiplier = this.variant === PaddleSizeVariant.Large ? 
        PaddleSizePowerUp.LARGE_MULTIPLIER : PaddleSizePowerUp.SMALL_MULTIPLIER;

      const originalSize = paddle.getBounds();
      const newWidth = originalSize.width * multiplier;

      // Ensure minimum paddle width
      if (newWidth < PaddleSizePowerUp.MIN_PADDLE_WIDTH) {
        this.log(`Paddle would be too small (${newWidth}px), effect not applied`, 'warn');
        return {
          success: true,
          modified: false
        };
      }

      // Store original size for rollback
      const effectData: PaddleSizeEffectData = {
        variant: this.variant,
        originalWidth: originalSize.width,
        originalHeight: originalSize.height,
        sizeMultiplier: multiplier,
        paddleId: (paddle as any).id || 'main_paddle'
      };

      // Apply size change
      const config = {
        width: newWidth,
        height: originalSize.height * multiplier
      };

      paddle.updateConfig(config);

      // Adjust paddle position to prevent going off-screen
      this.adjustPaddlePosition(paddle);

      // Store effect data in context for later cleanup
      context.effectData = effectData;

      this.log(`PaddleSize (${this.variant}) effect applied: ${originalSize.width}px → ${newWidth}px`);

      return {
        success: true,
        modified: true,
        rollback: () => this.rollbackEffect(context)
      };

    } catch (error) {
      this.log(`Failed to apply PaddleSize effect: ${error.message}`, 'error');
      return {
        success: false,
        modified: false,
        error: error as Error
      };
    }
  }

  protected onRemoveEffect(context: PowerUpPluginContext): EffectResult {
    try {
      const effectData = context.effectData as PaddleSizeEffectData;
      if (!effectData) {
        this.log('No effect data found for removal', 'warn');
        return { success: true, modified: false };
      }

      const paddle = context.gameEntities.paddle as Paddle;
      if (!paddle || !paddle.active) {
        this.log('No active paddle found for effect removal', 'warn');
        return { success: true, modified: false };
      }

      // Restore original size
      const config = {
        width: effectData.originalWidth,
        height: effectData.originalHeight
      };

      paddle.updateConfig(config);

      // Adjust position after size change
      this.adjustPaddlePosition(paddle);

      this.log(`PaddleSize (${effectData.variant}) effect removed: restored to ${effectData.originalWidth}px`);

      return {
        success: true,
        modified: true
      };

    } catch (error) {
      this.log(`Failed to remove PaddleSize effect: ${error.message}`, 'error');
      return {
        success: false,
        modified: false,
        error: error as Error
      };
    }
  }

  protected onUpdateEffect(context: PowerUpPluginContext): EffectResult {
    // PaddleSize doesn't need frame-by-frame updates
    // The size change is applied once and persists
    return { success: true, modified: false };
  }

  protected onHandleConflict(
    conflictingType: PowerUpType,
    context: PowerUpPluginContext
  ): EffectResult {
    if (conflictingType === PowerUpType.PaddleSize) {
      // Handle paddle size conflicts: higher priority wins
      this.log(`PaddleSize conflict detected with ${conflictingType}, applying priority-based resolution`);
      
      // Remove existing effect before applying new one
      const removeResult = this.onRemoveEffect(context);
      if (!removeResult.success) {
        return removeResult;
      }

      // Apply new effect
      return this.onApplyEffect(context);
    }

    // No conflicts with other power-up types
    return { success: true, modified: false };
  }

  protected getIcon(): string {
    return this.variant === PaddleSizeVariant.Large ? '🏓' : '🏓';
  }

  protected getColor(): string {
    return this.variant === PaddleSizeVariant.Large ? '#4ecdc4' : '#ff9f43';
  }

  protected getRarity(): 'common' | 'rare' | 'epic' {
    return 'common';
  }

  protected getDuration(): number {
    return 20000; // 20 seconds
  }

  /**
   * Adjust paddle position to stay within screen bounds after size change
   */
  private adjustPaddlePosition(paddle: Paddle): void {
    const bounds = paddle.getBounds();
    const maxX = paddle.maxX;

    // Ensure paddle doesn't go off the right edge
    if (bounds.x + bounds.width > maxX) {
      paddle.position.x = maxX - bounds.width;
    }

    // Ensure paddle doesn't go off the left edge
    if (paddle.position.x < 0) {
      paddle.position.x = 0;
    }
  }

  /**
   * Rollback effect implementation
   */
  private rollbackEffect(context: PowerUpPluginContext): void {
    try {
      const effectData = context.effectData as PaddleSizeEffectData;
      if (!effectData) return;

      const paddle = context.gameEntities.paddle as Paddle;
      if (!paddle || !paddle.active) return;

      // Restore original size
      const config = {
        width: effectData.originalWidth,
        height: effectData.originalHeight
      };

      paddle.updateConfig(config);
      this.adjustPaddlePosition(paddle);

      this.log('PaddleSize effect rolled back successfully');
    } catch (error) {
      this.log(`Failed to rollback PaddleSize effect: ${error.message}`, 'error');
    }
  }

  /**
   * Factory method to create large paddle power-up
   */
  public static createLarge(): PaddleSizePowerUp {
    return new PaddleSizePowerUp(PaddleSizeVariant.Large);
  }

  /**
   * Factory method to create small paddle power-up
   */
  public static createSmall(): PaddleSizePowerUp {
    return new PaddleSizePowerUp(PaddleSizeVariant.Small);
  }

  /**
   * Get size multiplier for variant
   */
  public static getMultiplier(variant: PaddleSizeVariant): number {
    return variant === PaddleSizeVariant.Large ? 
      PaddleSizePowerUp.LARGE_MULTIPLIER : PaddleSizePowerUp.SMALL_MULTIPLIER;
  }

  /**
   * Check if paddle would be too small
   */
  public static wouldBeTooSmall(currentWidth: number, variant: PaddleSizeVariant): boolean {
    const multiplier = PaddleSizePowerUp.getMultiplier(variant);
    return (currentWidth * multiplier) < PaddleSizePowerUp.MIN_PADDLE_WIDTH;
  }
}