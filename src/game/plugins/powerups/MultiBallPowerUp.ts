/**
 * Multi-Ball Power-Up Plugin Implementation
 * Story 4.2, Task 1: Creates additional balls for multi-ball gameplay
 */
import {
  PowerUpPlugin,
  PowerUpPluginContext,
  EffectResult,
} from "../PowerUpPlugin";
import { PowerUpType, PowerUpEffect } from "../../entities/PowerUp";
import { Ball } from "../../entities/Ball";
import { BallConfiguration } from "../../../types/game.types";

interface MultiBallEffectData {
  originalBallCount: number;
  addedBallIds: string[];
  maxBalls: number;
}

export class MultiBallPowerUp extends PowerUpPlugin {
  private static readonly MAX_BALLS = 3;
  private static readonly SPAWN_ANGLE_SPREAD = Math.PI / 3; // 60 degrees spread
  private static readonly SPEED_VARIATION = 0.8; // 20% speed variation

  constructor() {
    const effect: PowerUpEffect = {
      id: "multiball_effect",
      priority: 10,
      stackable: true,
      apply: () => {}, // Implementation in onApplyEffect
      remove: () => {}, // Implementation in onRemoveEffect
    };

    super(
      "MultiBallPowerUp",
      "1.0.0",
      PowerUpType.MultiBall,
      effect,
      "Spawns additional balls for multi-ball gameplay",
      [],
    );
  }

  protected async onInit(): Promise<void> {
    this.log("MultiBall power-up plugin initialized");
  }

  protected async onDestroy(): Promise<void> {
    this.log("MultiBall power-up plugin destroyed");
  }

  protected onApplyEffect(context: PowerUpPluginContext): EffectResult {
    try {
      const balls = context.gameEntities.balls;
      const effectData: MultiBallEffectData = {
        originalBallCount: balls.length,
        addedBallIds: [],
        maxBalls: MultiBallPowerUp.MAX_BALLS,
      };

      // Check if we're already at max balls
      if (balls.length >= MultiBallPowerUp.MAX_BALLS) {
        this.log("Already at maximum ball count, effect not applied", "warn");
        return {
          success: true,
          modified: false,
        };
      }

      // Calculate how many balls to add
      const ballsToAdd = Math.min(
        MultiBallPowerUp.MAX_BALLS - balls.length,
        2, // Add up to 2 balls per power-up
      );

      // Find the primary ball (first active ball)
      const primaryBall = balls.find((ball) => ball && ball.active);
      if (!primaryBall) {
        this.log("No active ball found to clone", "error");
        return {
          success: false,
          modified: false,
          error: new Error("No active ball available for multi-ball effect"),
        };
      }

      // Create additional balls with varied trajectories
      for (let i = 0; i < ballsToAdd; i++) {
        const newBall = this.createClonedBall(primaryBall, i + 1);

        // Add unique identifier for tracking
        const ballId = `multiball_${Date.now()}_${i}`;
        newBall.id = ballId;
        effectData.addedBallIds.push(ballId);

        // Add to game entities
        balls.push(newBall);
      }

      // Store effect data in context for later cleanup
      context.effectData = effectData;

      this.log(
        `MultiBall effect applied: added ${ballsToAdd} balls (total: ${balls.length})`,
      );

      return {
        success: true,
        modified: true,
        rollback: () => this.rollbackEffect(context),
      };
    } catch (error) {
      this.log(`Failed to apply MultiBall effect: ${error.message}`, "error");
      return {
        success: false,
        modified: false,
        error: error as Error,
      };
    }
  }

  protected onRemoveEffect(context: PowerUpPluginContext): EffectResult {
    try {
      const effectData = context.effectData as MultiBallEffectData;
      if (!effectData) {
        this.log("No effect data found for removal", "warn");
        return { success: true, modified: false };
      }

      const balls = context.gameEntities.balls;
      let removedCount = 0;

      // Remove balls that were added by this effect
      for (let i = balls.length - 1; i >= 0; i--) {
        const ball = balls[i];
        if (ball && ball.id && effectData.addedBallIds.includes(ball.id)) {
          // Safely remove ball
          ball.active = false;
          balls.splice(i, 1);
          removedCount++;
        }
      }

      this.log(
        `MultiBall effect removed: removed ${removedCount} balls (remaining: ${balls.length})`,
      );

      return {
        success: true,
        modified: removedCount > 0,
      };
    } catch (error) {
      this.log(`Failed to remove MultiBall effect: ${error.message}`, "error");
      return {
        success: false,
        modified: false,
        error: error as Error,
      };
    }
  }

  protected onUpdateEffect(context: PowerUpPluginContext): EffectResult {
    // MultiBall doesn't need frame-by-frame updates
    // The balls update themselves through the physics system
    return { success: true, modified: false };
  }

  protected onHandleConflict(
    conflictingType: PowerUpType,
    context: PowerUpPluginContext,
  ): EffectResult {
    // MultiBall is stackable and doesn't conflict with other power-ups
    this.log(`MultiBall effect stacking with ${conflictingType}`);
    return { success: true, modified: false };
  }

  protected getIcon(): string {
    return "⚡";
  }

  protected getColor(): string {
    return "#ff6b6b";
  }

  protected getRarity(): "common" | "rare" | "epic" {
    return "rare";
  }

  protected getDuration(): number {
    return 30000; // 30 seconds
  }

  /**
   * Create a cloned ball with varied trajectory
   */
  private createClonedBall(originalBall: Ball, cloneIndex: number): Ball {
    // Create ball configuration based on original
    const config: BallConfiguration = {
      initialPosition: { ...originalBall.position },
      initialRadius: originalBall.radius,
      initialSpeed:
        originalBall.speed *
        (1 + (Math.random() - 0.5) * MultiBallPowerUp.SPEED_VARIATION),
      maxSpeed: originalBall.maxSpeed,
      minSpeed: originalBall.minSpeed,
      bounceDamping: originalBall.bounceDamping,
    };

    const newBall = new Ball(config);

    // Calculate varied angle based on original velocity
    const originalAngle = Math.atan2(
      originalBall.velocity.y,
      originalBall.velocity.x,
    );
    const angleVariation =
      (cloneIndex * MultiBallPowerUp.SPAWN_ANGLE_SPREAD) / 2 -
      MultiBallPowerUp.SPAWN_ANGLE_SPREAD / 4;
    const newAngle = originalAngle + angleVariation;

    // Set new velocity with varied direction
    const speed = config.initialSpeed;
    newBall.setVelocity({
      x: Math.cos(newAngle) * speed,
      y: Math.sin(newAngle) * speed,
    });

    // Add slight position offset to prevent initial collision
    const offsetDistance = originalBall.radius * 3;
    newBall.position.x += Math.cos(newAngle) * offsetDistance;
    newBall.position.y += Math.sin(newAngle) * offsetDistance;

    return newBall;
  }

  /**
   * Rollback effect implementation
   */
  private rollbackEffect(context: PowerUpPluginContext): void {
    try {
      const effectData = context.effectData as MultiBallEffectData;
      if (!effectData) return;

      const balls = context.gameEntities.balls;

      // Remove all balls added by this effect
      for (let i = balls.length - 1; i >= 0; i--) {
        const ball = balls[i];
        if (
          ball &&
          (ball as any).id &&
          effectData.addedBallIds.includes((ball as any).id)
        ) {
          ball.active = false;
          balls.splice(i, 1);
        }
      }

      this.log("MultiBall effect rolled back successfully");
    } catch (error) {
      this.log(
        `Failed to rollback MultiBall effect: ${error.message}`,
        "error",
      );
    }
  }

  /**
   * Check if ball limit would be exceeded
   */
  public static wouldExceedLimit(currentBallCount: number): boolean {
    return currentBallCount >= MultiBallPowerUp.MAX_BALLS;
  }

  /**
   * Get maximum allowed balls
   */
  public static getMaxBalls(): number {
    return MultiBallPowerUp.MAX_BALLS;
  }
}
