/**
 * Ball Speed Power-Up Plugin Implementation
 * Story 4.2, Task 3: Modifies ball speed (fast/slow)
 */
import {
  PowerUpPlugin,
  PowerUpPluginContext,
  EffectResult,
} from "../PowerUpPlugin";
import { PowerUpType, PowerUpEffect } from "../../entities/PowerUp";
import { Ball } from "../../entities/Ball";

export enum BallSpeedVariant {
  Fast = "fast",
  Slow = "slow",
}

interface BallSpeedEffectData {
  variant: BallSpeedVariant;
  affectedBallIds: string[];
  originalSpeeds: { [ballId: string]: number };
  speedMultiplier: number;
}

export class BallSpeedPowerUp extends PowerUpPlugin {
  private static readonly FAST_MULTIPLIER = 1.5;
  private static readonly SLOW_MULTIPLIER = 0.5;
  private static readonly MIN_SPEED = 50; // Minimum playable speed
  private static readonly MAX_SPEED = 800; // Maximum safe speed

  private variant: BallSpeedVariant;

  constructor(variant: BallSpeedVariant = BallSpeedVariant.Fast) {
    const effect: PowerUpEffect = {
      id: `ball_speed_${variant}_effect`,
      priority: 3,
      stackable: false,
      conflictsWith: [PowerUpType.BallSpeed, PowerUpType.Magnet],
      apply: () => {}, // Implementation in onApplyEffect
      remove: () => {}, // Implementation in onRemoveEffect
    };

    super(
      `BallSpeedPowerUp_${variant}`,
      "1.0.0",
      PowerUpType.BallSpeed,
      effect,
      `Modifies ball speed (${variant})`,
      [],
    );

    this.variant = variant;
  }

  protected async onInit(): Promise<void> {
    this.log(`BallSpeed (${this.variant}) power-up plugin initialized`);
  }

  protected async onDestroy(): Promise<void> {
    this.log(`BallSpeed (${this.variant}) power-up plugin destroyed`);
  }

  protected onApplyEffect(context: PowerUpPluginContext): EffectResult {
    try {
      const balls = context.gameEntities.balls as Ball[];
      if (!balls || balls.length === 0) {
        this.log("No balls found", "error");
        return {
          success: false,
          modified: false,
          error: new Error("No balls available for speed modification"),
        };
      }

      // Filter active balls
      const activeBalls = balls.filter((ball) => ball && ball.active);
      if (activeBalls.length === 0) {
        this.log("No active balls found", "error");
        return {
          success: false,
          modified: false,
          error: new Error("No active balls available for speed modification"),
        };
      }

      const multiplier =
        this.variant === BallSpeedVariant.Fast
          ? BallSpeedPowerUp.FAST_MULTIPLIER
          : BallSpeedPowerUp.SLOW_MULTIPLIER;

      const effectData: BallSpeedEffectData = {
        variant: this.variant,
        affectedBallIds: [],
        originalSpeeds: {},
        speedMultiplier: multiplier,
      };

      let modifiedCount = 0;

      // Apply speed modification to all active balls
      for (const ball of activeBalls) {
        const ballId = ball.id || `ball_${balls.indexOf(ball)}`;
        const currentSpeed = ball.speed;
        const newSpeed = currentSpeed * multiplier;

        // Check speed limits
        if (
          newSpeed < BallSpeedPowerUp.MIN_SPEED ||
          newSpeed > BallSpeedPowerUp.MAX_SPEED
        ) {
          this.log(
            `Ball ${ballId} speed would be out of bounds (${newSpeed}), skipping`,
            "warn",
          );
          continue;
        }

        // Store original speed for rollback
        effectData.originalSpeeds[ballId] = currentSpeed;
        effectData.affectedBallIds.push(ballId);

        // Apply speed change by modifying ball properties
        ball.speed = newSpeed;
        ball.maxSpeed = Math.max(ball.maxSpeed, newSpeed);
        ball.minSpeed = Math.min(ball.minSpeed, newSpeed);

        // Update velocity magnitude to match new speed
        this.updateBallVelocity(ball, newSpeed);

        modifiedCount++;
      }

      if (modifiedCount === 0) {
        this.log("No balls could be modified within speed limits", "warn");
        return {
          success: true,
          modified: false,
        };
      }

      // Store effect data in context for later cleanup
      context.effectData = effectData;

      this.log(
        `BallSpeed (${this.variant}) effect applied to ${modifiedCount} balls (multiplier: ${multiplier})`,
      );

      return {
        success: true,
        modified: true,
        rollback: () => this.rollbackEffect(context),
      };
    } catch (error) {
      this.log(`Failed to apply BallSpeed effect: ${error.message}`, "error");
      return {
        success: false,
        modified: false,
        error: error as Error,
      };
    }
  }

  protected onRemoveEffect(context: PowerUpPluginContext): EffectResult {
    try {
      const effectData = context.effectData as BallSpeedEffectData;
      if (!effectData) {
        this.log("No effect data found for removal", "warn");
        return { success: true, modified: false };
      }

      const balls = context.gameEntities.balls as Ball[];
      if (!balls || balls.length === 0) {
        this.log("No balls found for effect removal", "warn");
        return { success: true, modified: false };
      }

      let restoredCount = 0;

      // Restore original speeds
      for (const ball of balls) {
        if (!ball || !ball.active) continue;

        const ballId = ball.id || `ball_${balls.indexOf(ball)}`;
        if (!effectData.affectedBallIds.includes(ballId)) continue;

        const originalSpeed = effectData.originalSpeeds[ballId];
        if (originalSpeed !== undefined) {
          // Restore original speed
          ball.speed = originalSpeed;

          // Update velocity magnitude to match restored speed
          this.updateBallVelocity(ball, originalSpeed);

          restoredCount++;
        }
      }

      this.log(
        `BallSpeed (${effectData.variant}) effect removed: restored ${restoredCount} balls`,
      );

      return {
        success: true,
        modified: restoredCount > 0,
      };
    } catch (error) {
      this.log(`Failed to remove BallSpeed effect: ${error.message}`, "error");
      return {
        success: false,
        modified: false,
        error: error as Error,
      };
    }
  }

  protected onUpdateEffect(context: PowerUpPluginContext): EffectResult {
    // BallSpeed modifications persist without frame-by-frame updates
    // However, we can monitor for physics stability here
    try {
      const effectData = context.effectData as BallSpeedEffectData;
      if (!effectData) return { success: true, modified: false };

      const balls = context.gameEntities.balls as Ball[];

      // Check if any affected balls have become unstable
      for (const ball of balls) {
        if (!ball || !ball.active) continue;

        const ballId = (ball as unknown).id || `ball_${balls.indexOf(ball)}`;
        if (!effectData.affectedBallIds.includes(ballId)) continue;

        // Check for physics anomalies
        const velocityMagnitude = Math.sqrt(
          ball.velocity.x ** 2 + ball.velocity.y ** 2,
        );
        if (Math.abs(velocityMagnitude - ball.speed) > 1) {
          // Velocity has drifted from expected speed, correct it
          this.updateBallVelocity(ball, ball.speed);
        }
      }

      return { success: true, modified: false };
    } catch (error) {
      this.log(
        `Error during BallSpeed effect update: ${error.message}`,
        "error",
      );
      return { success: false, modified: false, error: error as Error };
    }
  }

  protected onHandleConflict(
    conflictingType: PowerUpType,
    context: PowerUpPluginContext,
  ): EffectResult {
    if (conflictingType === PowerUpType.BallSpeed) {
      // Handle ball speed conflicts: remove existing effect first
      this.log(
        `BallSpeed conflict detected with ${conflictingType}, resolving...`,
      );

      const removeResult = this.onRemoveEffect(context);
      if (!removeResult.success) {
        return removeResult;
      }

      // Apply new effect
      return this.onApplyEffect(context);
    }

    if (conflictingType === PowerUpType.Magnet) {
      // Magnet conflicts with speed changes
      this.log(
        `BallSpeed conflicts with Magnet power-up, removing speed effect`,
      );
      return this.onRemoveEffect(context);
    }

    return { success: true, modified: false };
  }

  protected getIcon(): string {
    return this.variant === BallSpeedVariant.Fast ? "💨" : "🐌";
  }

  protected getColor(): string {
    return this.variant === BallSpeedVariant.Fast ? "#45b7d1" : "#96ceb4";
  }

  protected getRarity(): "common" | "rare" | "epic" {
    return "common";
  }

  protected getDuration(): number {
    return 15000; // 15 seconds
  }

  /**
   * Update ball velocity magnitude to match target speed while preserving direction
   */
  private updateBallVelocity(ball: Ball, targetSpeed: number): void {
    const currentMagnitude = Math.sqrt(
      ball.velocity.x ** 2 + ball.velocity.y ** 2,
    );

    if (currentMagnitude < 0.0001) {
      // If velocity is near zero, use random direction
      const angle = Math.random() * Math.PI * 2;
      ball.velocity.x = Math.cos(angle) * targetSpeed;
      ball.velocity.y = Math.sin(angle) * targetSpeed;
    } else {
      // Scale existing velocity to match target speed
      const scale = targetSpeed / currentMagnitude;
      ball.velocity.x *= scale;
      ball.velocity.y *= scale;
    }
  }

  /**
   * Rollback effect implementation
   */
  private rollbackEffect(context: PowerUpPluginContext): void {
    try {
      const effectData = context.effectData as BallSpeedEffectData;
      if (!effectData) return;

      const balls = context.gameEntities.balls as Ball[];

      // Restore original speeds for all affected balls
      for (const ball of balls) {
        if (!ball || !ball.active) continue;

        const ballId = (ball as unknown).id || `ball_${balls.indexOf(ball)}`;
        if (!effectData.affectedBallIds.includes(ballId)) continue;

        const originalSpeed = effectData.originalSpeeds[ballId];
        if (originalSpeed !== undefined) {
          ball.speed = originalSpeed;
          this.updateBallVelocity(ball, originalSpeed);
        }
      }

      this.log("BallSpeed effect rolled back successfully");
    } catch (error) {
      this.log(
        `Failed to rollback BallSpeed effect: ${error.message}`,
        "error",
      );
    }
  }

  /**
   * Factory method to create fast ball power-up
   */
  public static createFast(): BallSpeedPowerUp {
    return new BallSpeedPowerUp(BallSpeedVariant.Fast);
  }

  /**
   * Factory method to create slow ball power-up
   */
  public static createSlow(): BallSpeedPowerUp {
    return new BallSpeedPowerUp(BallSpeedVariant.Slow);
  }

  /**
   * Get speed multiplier for variant
   */
  public static getMultiplier(variant: BallSpeedVariant): number {
    return variant === BallSpeedVariant.Fast
      ? BallSpeedPowerUp.FAST_MULTIPLIER
      : BallSpeedPowerUp.SLOW_MULTIPLIER;
  }

  /**
   * Check if speed would be within safe limits
   */
  public static isSpeedSafe(
    currentSpeed: number,
    variant: BallSpeedVariant,
  ): boolean {
    const multiplier = BallSpeedPowerUp.getMultiplier(variant);
    const newSpeed = currentSpeed * multiplier;
    return (
      newSpeed >= BallSpeedPowerUp.MIN_SPEED &&
      newSpeed <= BallSpeedPowerUp.MAX_SPEED
    );
  }

  /**
   * Get safe speed limits
   */
  public static getSpeedLimits(): { min: number; max: number } {
    return {
      min: BallSpeedPowerUp.MIN_SPEED,
      max: BallSpeedPowerUp.MAX_SPEED,
    };
  }
}
