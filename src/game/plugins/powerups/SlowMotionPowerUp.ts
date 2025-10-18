/**
 * SlowMotionPowerUp Plugin
 * Story 4.3b - Phase 2 Advanced Power-ups
 *
 * Slows down game time to 50% for 10 seconds
 * Paddle maintains normal speed for player control
 */
import { BasePowerUpPlugin } from "./BasePowerUpPlugin";
import { PowerUpPluginContext, EffectResult } from "../PowerUpPlugin";
import { PowerUpType, PowerUpEffect } from "../../entities/PowerUp";

/**
 * SlowMotionPowerUp - Time manipulation power-up
 *
 * AC1: Game time slows to 50% speed for 10 seconds (paddle remains normal speed)
 * Priority: Shield > Slow Motion > Magnet > Laser > Pierce
 */
export class SlowMotionPowerUp extends BasePowerUpPlugin {
  private static readonly TIME_SCALE = 0.5; // 50% game speed
  private static readonly DURATION = 10000; // 10 seconds
  private static readonly TRANSITION_DURATION = 500; // 0.5 seconds smooth transition

  constructor() {
    const effect: PowerUpEffect = {
      id: "slow_motion_effect",
      priority: 8, // Shield(10) > Slow Motion(8) > Magnet(7)
      stackable: false,
      conflictsWith: [],
      apply: () => {},
      remove: () => {},
    };

    super(
      "SlowMotionPowerUp",
      "1.0.0",
      PowerUpType.SlowMotion,
      effect,
      "Slows down game time to 50% for 10 seconds. Paddle maintains normal speed.",
      [],
    );
  }

  protected onApplyEffect(context: PowerUpPluginContext): EffectResult {
    try {
      // Set time scale in game state
      if (context.gameState) {
        context.gameState.timeScale = SlowMotionPowerUp.TIME_SCALE;
      }

      // Apply smooth transition
      this.applyTransition(context, 1.0, SlowMotionPowerUp.TIME_SCALE);

      this.log(
        `Slow Motion activated: ${SlowMotionPowerUp.TIME_SCALE}x speed for ${SlowMotionPowerUp.DURATION}ms`,
      );

      return {
        success: true,
        modified: true,
        data: {
          timeScale: SlowMotionPowerUp.TIME_SCALE,
          duration: SlowMotionPowerUp.DURATION,
          transitionDuration: SlowMotionPowerUp.TRANSITION_DURATION,
        },
      };
    } catch (error) {
      this.log(`Failed to apply Slow Motion effect: ${error}`, "error");
      return {
        success: false,
        modified: false,
        error: error as Error,
      };
    }
  }

  protected onRemoveEffect(context: PowerUpPluginContext): EffectResult {
    try {
      // Restore normal time scale
      if (context.gameState) {
        context.gameState.timeScale = 1.0;
      }

      // Apply smooth transition back
      this.applyTransition(context, SlowMotionPowerUp.TIME_SCALE, 1.0);

      this.log("Slow Motion deactivated: returning to normal speed");

      return {
        success: true,
        modified: true,
        data: {
          timeScale: 1.0,
        },
      };
    } catch (error) {
      this.log(`Failed to remove Slow Motion effect: ${error}`, "error");
      return {
        success: false,
        modified: false,
        error: error as Error,
      };
    }
  }

  /**
   * Apply smooth transition between time scales
   */
  private applyTransition(
    context: PowerUpPluginContext,
    fromScale: number,
    toScale: number,
  ): void {
    // Emit transition event for visual effects
    if (context.eventBus) {
      context.eventBus.emit("slowmotion:transition", {
        from: fromScale,
        to: toScale,
        duration: SlowMotionPowerUp.TRANSITION_DURATION,
      });
    }

    // Note: Smooth interpolation handled by GameLoop
    // GameLoop will lerp timeScale over TRANSITION_DURATION
  }

  /**
   * Update method called every frame
   * SlowMotion doesn't need per-frame updates
   */
  public onUpdate(context: PowerUpPluginContext, _deltaTime: number): void {
    // Verify time scale is maintained
    if (
      context.gameState &&
      context.gameState.timeScale !== SlowMotionPowerUp.TIME_SCALE
    ) {
      this.log("Time scale mismatch detected, correcting", "warn");
      context.gameState.timeScale = SlowMotionPowerUp.TIME_SCALE;
    }
  }

  // Metadata methods
  protected getRarity(): string {
    return "rare";
  }

  protected getDuration(): number {
    return SlowMotionPowerUp.DURATION;
  }

  protected getIcon(): string {
    return "🐌"; // Slow motion icon
  }

  protected getColor(): string {
    return "#9333EA"; // Purple for time manipulation
  }
}
