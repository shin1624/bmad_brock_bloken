/**
 * Shield Power-Up Plugin Implementation
 * Story 4.3a - Phase 1 Advanced Power-ups
 * Provides one-time ball miss protection
 */
import { BasePowerUpPlugin } from "./BasePowerUpPlugin";
import { PowerUpType, PowerUpEffect } from "../../entities/PowerUp";
import { PowerUpPluginContext, EffectResult } from "../PowerUpPlugin";
import type { GameState } from "../../../types/game.types";

export class ShieldPowerUp extends BasePowerUpPlugin {
  private static readonly SHIELD_Y_OFFSET = 50; // pixels from bottom
  private static readonly SHIELD_COLOR = "rgba(100, 200, 255, 0.5)";
  private static readonly SHIELD_THICKNESS = 4;

  constructor() {
    const effect: PowerUpEffect = {
      id: "shield_effect",
      priority: 10, // Highest priority - defensive critical
      stackable: false,
      conflictsWith: [],
      apply: () => {},
      remove: () => {},
    };

    super(
      "Shield PowerUp",
      "1.0.0",
      PowerUpType.Shield,
      effect,
      "Blocks one ball miss then deactivates",
      [],
    );
  }

  protected onApplyEffect(context: PowerUpPluginContext): EffectResult {
    try {
      // Enable shield in game state
      const gameState = context.gameState as GameState;
      if (gameState) {
        gameState.shieldActive = true;
      }

      // Add visual rendering callback
      if (context.renderer) {
        this.addShieldVisual(context);
      }

      this.log("Shield activated - one-time protection enabled");

      return {
        success: true,
        modified: true,
        message: "Shield protection activated",
      };
    } catch (error) {
      return {
        success: false,
        modified: false,
        error: error as Error,
      };
    }
  }

  protected onRemoveEffect(context: PowerUpPluginContext): EffectResult {
    try {
      // Disable shield in game state
      const gameState = context.gameState as GameState;
      if (gameState) {
        gameState.shieldActive = false;
      }

      // Remove visual rendering callback
      if (context.renderer) {
        this.removeShieldVisual(context);
      }

      this.log("Shield deactivated");

      return {
        success: true,
        modified: true,
        message: "Shield protection removed",
      };
    } catch (error) {
      return {
        success: false,
        modified: false,
        error: error as Error,
      };
    }
  }

  /**
   * Add shield visual rendering to the game
   */
  private addShieldVisual(context: PowerUpPluginContext): void {
    const renderer = context.renderer as any;
    if (!renderer || !renderer.addCustomRender) {
      return;
    }

    renderer.addCustomRender("shield", (ctx: CanvasRenderingContext2D) => {
      const gameState = context.gameState as GameState;
      if (!gameState?.shieldActive) {
        return;
      }

      const canvas = ctx.canvas;
      const shieldY = canvas.height - ShieldPowerUp.SHIELD_Y_OFFSET;

      // Draw shield barrier
      ctx.save();
      ctx.strokeStyle = ShieldPowerUp.SHIELD_COLOR;
      ctx.lineWidth = ShieldPowerUp.SHIELD_THICKNESS;
      ctx.shadowColor = "rgba(100, 200, 255, 0.8)";
      ctx.shadowBlur = 10;

      // Draw horizontal line with slight wave effect
      ctx.beginPath();
      for (let x = 0; x <= canvas.width; x += 10) {
        const waveY = shieldY + Math.sin(x * 0.02 + Date.now() * 0.002) * 2;
        if (x === 0) {
          ctx.moveTo(x, waveY);
        } else {
          ctx.lineTo(x, waveY);
        }
      }
      ctx.stroke();

      // Add shimmer effect
      const gradient = ctx.createLinearGradient(
        0,
        shieldY - 10,
        0,
        shieldY + 10,
      );
      gradient.addColorStop(0, "rgba(100, 200, 255, 0)");
      gradient.addColorStop(0.5, "rgba(100, 200, 255, 0.3)");
      gradient.addColorStop(1, "rgba(100, 200, 255, 0)");

      ctx.fillStyle = gradient;
      ctx.fillRect(0, shieldY - 10, canvas.width, 20);

      ctx.restore();
    });
  }

  /**
   * Remove shield visual rendering from the game
   */
  private removeShieldVisual(context: PowerUpPluginContext): void {
    const renderer = context.renderer as any;
    if (!renderer || !renderer.removeCustomRender) {
      return;
    }

    renderer.removeCustomRender("shield");
  }

  /**
   * Handle ball collision with shield (called by collision system)
   */
  public handleBallCollision(
    ballY: number,
    ballRadius: number,
    canvasHeight: number,
  ): boolean {
    const shieldY = canvasHeight - ShieldPowerUp.SHIELD_Y_OFFSET;
    const ballBottom = ballY + ballRadius;

    // Check if ball would miss (pass shield line)
    if (ballBottom >= shieldY) {
      this.log("Shield blocked ball miss - deactivating");
      return true; // Shield blocks the ball
    }

    return false;
  }

  protected getRarity(): string {
    return "rare";
  }

  protected getDuration(): number {
    return 0; // Single-use, no duration
  }

  protected getIcon(): string {
    return "🛡️";
  }

  protected getColor(): string {
    return "#64C8FF";
  }

  public getMetadata() {
    return {
      type: this.powerUpType,
      rarity: this.getRarity(),
      duration: this.getDuration(),
      icon: this.getIcon(),
      color: this.getColor(),
      description: "One-time ball miss protection",
    };
  }

  // Test-compatible methods
  public getConfig() {
    return {
      isOneTime: true,
      canStack: false,
      priority: 10,
      conflictsWith: [],
    };
  }

  public async onActivate(context: PowerUpPluginContext): Promise<void> {
    const result = this.onApplyEffect(context);

    // Play sound
    if (context.audioSystem?.playPowerUpSound) {
      context.audioSystem.playPowerUpSound("shield");
    }

    // Emit event
    if (context.eventBus?.emit) {
      context.eventBus.emit("powerup:activated", {
        type: PowerUpType.Shield,
      });
    }
  }

  public onUpdate(context: PowerUpPluginContext, deltaTime: number): void {
    const gameState = context.gameState as GameState;

    // Check if shield should consume itself
    if (gameState?.shieldActive && gameState.balls) {
      for (const ball of gameState.balls) {
        if (ball.y >= 580 && ball.vY > 0) {
          // Ball would miss - shield consumes itself
          ball.vY = -Math.abs(ball.vY); // Bounce back up
          gameState.shieldActive = false;

          if (context.eventBus?.emit) {
            context.eventBus.emit("shield:consumed");
          }
          break;
        }
      }
    }
  }

  public onRender(
    context: PowerUpPluginContext,
    ctx: CanvasRenderingContext2D,
  ): void {
    const gameState = context.gameState as GameState;

    if (!gameState?.shieldActive) {
      return;
    }

    const canvas = ctx.canvas;
    const shieldY = 580;

    // Pulsing effect
    const time = Date.now() / 1000;
    const pulse = Math.sin(time * 3) * 0.2 + 0.8;

    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = "#00b8d4";
    ctx.lineWidth = 3;
    ctx.shadowColor = "#00b8d4";
    ctx.shadowBlur = 10 + Math.sin(time * 5) * 5;
    ctx.setLineDash([10, 5]);

    ctx.beginPath();
    ctx.moveTo(0, shieldY);
    ctx.lineTo(canvas.width, shieldY);
    ctx.stroke();

    ctx.restore();
  }

  public async onDeactivate(context: PowerUpPluginContext): Promise<void> {
    const gameState = context.gameState as GameState;
    if (gameState) {
      gameState.shieldActive = false;
    }

    if (context.eventBus?.emit) {
      context.eventBus.emit("powerup:deactivated", {
        type: PowerUpType.Shield,
      });
    }
  }
}
