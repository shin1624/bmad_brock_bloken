/**
 * Pierce Ball Power-Up Plugin Implementation
 * Story 4.3a - Phase 1 Advanced Power-ups
 * Ball passes through blocks without bouncing for 15 seconds or 10 blocks
 */
import { BasePowerUpPlugin } from "./BasePowerUpPlugin";
import { PowerUpType, PowerUpEffect } from "../../entities/PowerUp";
import { PowerUpPluginContext, EffectResult } from "../PowerUpPlugin";
import type { GameState } from "../../../types/game.types";

export class PierceBallPowerUp extends BasePowerUpPlugin {
  private static readonly DURATION = 15000; // 15 seconds
  private static readonly MAX_BLOCKS = 10; // Maximum blocks to pierce
  private static readonly TRAIL_COLOR = "rgba(255, 255, 0, 0.7)";
  private static readonly TRAIL_WIDTH = 3;

  private elapsedTime: number = 0;
  private blocksDestroyed: number = 0;

  constructor() {
    const effect: PowerUpEffect = {
      id: "pierce_effect",
      priority: 5, // Medium priority - ball modification
      stackable: false,
      conflictsWith: [],
      apply: () => {},
      remove: () => {},
    };

    super(
      "Pierce Ball PowerUp",
      "1.0.0",
      PowerUpType.Pierce,
      effect,
      "Ball pierces through blocks without bouncing",
      [],
    );
  }

  /**
   * Get plugin configuration (for testing)
   */
  public getConfig() {
    return {
      duration: PierceBallPowerUp.DURATION,
      maxBlocks: PierceBallPowerUp.MAX_BLOCKS,
      trailColor: PierceBallPowerUp.TRAIL_COLOR,
      trailWidth: PierceBallPowerUp.TRAIL_WIDTH,
      canStack: false,
      priority: 7,
      conflictsWith: [] as string[],
    };
  }

  /**
   * Activate pierce mode (alias for applyEffect)
   */
  public async onActivate(context: PowerUpPluginContext): Promise<void> {
    this.elapsedTime = 0;
    this.blocksDestroyed = 0;
    await this.applyEffect(context);

    // Play activation sound
    if (context.audioSystem?.playPowerUpSound) {
      context.audioSystem.playPowerUpSound("pierce");
    }

    // Emit activation event
    if (context.eventBus?.emit) {
      context.eventBus.emit("powerup:activated", {
        type: PowerUpType.Pierce,
      });
    }
  }

  protected onApplyEffect(context: PowerUpPluginContext): EffectResult {
    try {
      // Enable pierce in game state
      const gameState = context.gameState as GameState;
      if (gameState) {
        gameState.pierceActive = true;
        gameState.pierceBlocksRemaining = PierceBallPowerUp.MAX_BLOCKS;
      }

      // Record activation time
      this.elapsedTime = 0;
      this.blocksDestroyed = 0;

      // Add trail effect to balls
      this.addPierceTrailEffect(context);

      this.log(
        `Pierce Ball activated - ${PierceBallPowerUp.MAX_BLOCKS} blocks or ${PierceBallPowerUp.DURATION / 1000}s`,
      );

      return {
        success: true,
        modified: true,
        message: "Pierce Ball activated",
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
      // Disable pierce in game state
      const gameState = context.gameState as GameState;
      if (gameState) {
        gameState.pierceActive = false;
        gameState.pierceBlocksRemaining = 0;
      }

      // Remove trail effect
      this.removePierceTrailEffect(context);

      this.log("Pierce Ball deactivated");

      return {
        success: true,
        modified: true,
        message: "Pierce Ball removed",
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
   * Add trail effect to piercing balls
   */
  private addPierceTrailEffect(context: PowerUpPluginContext): void {
    const renderer = context.renderer as any;
    if (!renderer || !renderer.addCustomRender) {
      return;
    }

    // Store previous ball positions for trail
    const ballTrails: Map<
      string,
      Array<{ x: number; y: number; time: number }>
    > = new Map();

    renderer.addCustomRender("pierceTrail", (ctx: CanvasRenderingContext2D) => {
      const gameState = context.gameState as GameState;
      if (!gameState?.pierceActive || !context.gameEntities?.balls) {
        return;
      }

      // Update and render trails for each ball
      context.gameEntities.balls.forEach((ball: any) => {
        if (!ball.active) return;

        // Initialize trail for new balls
        if (!ballTrails.has(ball.id)) {
          ballTrails.set(ball.id, []);
        }

        const trail = ballTrails.get(ball.id)!;
        const now = Date.now();

        // Add current position to trail
        trail.push({ x: ball.position.x, y: ball.position.y, time: now });

        // Remove old trail points (older than 200ms)
        while (trail.length > 0 && now - trail[0].time > 200) {
          trail.shift();
        }

        // Render trail
        if (trail.length > 1) {
          ctx.save();
          ctx.strokeStyle = PierceBallPowerUp.TRAIL_COLOR;
          ctx.lineWidth = PierceBallPowerUp.TRAIL_WIDTH;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";

          ctx.beginPath();
          trail.forEach((point, index) => {
            const alpha = (index / trail.length) * 0.7;
            ctx.globalAlpha = alpha;

            if (index === 0) {
              ctx.moveTo(point.x, point.y);
            } else {
              ctx.lineTo(point.x, point.y);
            }
          });
          ctx.stroke();

          // Add glow effect
          ctx.shadowColor = "yellow";
          ctx.shadowBlur = 5;
          ctx.globalAlpha = 0.5;
          ctx.stroke();

          ctx.restore();
        }
      });

      // Clean up trails for inactive balls
      for (const [ballId, trail] of ballTrails.entries()) {
        const ballExists = context.gameEntities.balls.some(
          (b: any) => b.id === ballId && b.active,
        );
        if (!ballExists) {
          ballTrails.delete(ballId);
        }
      }
    });
  }

  /**
   * Remove trail effect from balls
   */
  private removePierceTrailEffect(context: PowerUpPluginContext): void {
    const renderer = context.renderer as any;
    if (!renderer || !renderer.removeCustomRender) {
      return;
    }

    renderer.removeCustomRender("pierceTrail");
  }

  /**
   * Update pierce state - check for expiration conditions
   */
  public update(context: PowerUpPluginContext): void {
    const gameState = context.gameState as GameState;
    if (!gameState?.pierceActive) {
      return;
    }

    // Check duration expiration
    if (this.elapsedTime >= PierceBallPowerUp.DURATION) {
      this.log("Pierce Ball expired - duration limit reached");
      this.onRemoveEffect(context);
      return;
    }

    // Check block count expiration
    if (gameState.pierceBlocksRemaining <= 0) {
      this.log("Pierce Ball expired - block limit reached");
      this.onRemoveEffect(context);
    }
  }

  /**
   * Handle block destruction while pierce is active
   */
  public onBlockDestroyed(): void {
    this.blocksDestroyed++;
    this.log(
      `Block pierced: ${this.blocksDestroyed}/${PierceBallPowerUp.MAX_BLOCKS}`,
    );
  }

  protected getRarity(): string {
    return "epic";
  }

  protected getDuration(): number {
    return PierceBallPowerUp.DURATION;
  }

  protected getIcon(): string {
    return "⚡";
  }

  protected getColor(): string {
    return "#FFD700";
  }

  public getMetadata() {
    return {
      type: this.powerUpType,
      rarity: this.getRarity(),
      duration: this.getDuration(),
      icon: this.getIcon(),
      color: this.getColor(),
      description: `Pierce through ${PierceBallPowerUp.MAX_BLOCKS} blocks or ${PierceBallPowerUp.DURATION / 1000}s`,
    };
  }

  public onUpdate(context: PowerUpPluginContext, deltaTime: number): void {
    const gameState = context.gameState as GameState;
    if (!gameState?.pierceActive) {
      return;
    }

    // Update elapsed time
    this.elapsedTime += deltaTime;

    // Check duration expiration
    if (this.elapsedTime >= PierceBallPowerUp.DURATION) {
      this.log("Pierce Ball expired - duration limit reached");
      gameState.pierceActive = false;
      if (context.audioSystem?.playExpireSound) {
        context.audioSystem.playExpireSound("pierce");
      }
      if (context.eventBus?.emit) {
        context.eventBus.emit("powerup:expired", {
          type: PowerUpType.Pierce,
        });
      }
      this.onRemoveEffect(context);
      return;
    }

    // Check block count expiration
    if (gameState.pierceBlocksRemaining <= 0) {
      this.log("Pierce Ball expired - block limit reached");
      gameState.pierceActive = false;
      if (context.audioSystem?.playExpireSound) {
        context.audioSystem.playExpireSound("pierce");
      }
      if (context.eventBus?.emit) {
        context.eventBus.emit("powerup:expired", {
          type: PowerUpType.Pierce,
        });
      }
      this.onRemoveEffect(context);
    }
  }

  public onBlockHit(
    context: PowerUpPluginContext,
    block: any,
    ball: any,
  ): void {
    const gameState = context.gameState as GameState;
    if (gameState?.pierceActive && gameState.pierceBlocksRemaining > 0) {
      gameState.pierceBlocksRemaining--;

      // Handle block destruction
      if (block.currentHitPoints !== undefined) {
        block.currentHitPoints = Math.max(0, block.currentHitPoints - 1);
        if (block.currentHitPoints === 0) {
          block.isDestroyed = true;
        }
      } else if (block.hits !== undefined) {
        // Fallback for test mocks
        block.hits = Math.max(0, block.hits - 1);
        if (block.hits === 0) {
          block.isDestroyed = true;
        }
      }

      this.onBlockDestroyed();

      // Check if we should deactivate
      if (gameState.pierceBlocksRemaining <= 0) {
        gameState.pierceActive = false;
        if (context.audioSystem?.playExpireSound) {
          context.audioSystem.playExpireSound("pierce");
        }
      }
    }
  }

  public getRemainingDuration(): number {
    return Math.max(0, PierceBallPowerUp.DURATION - this.elapsedTime);
  }

  public onRender(
    context: PowerUpPluginContext,
    ctx: CanvasRenderingContext2D,
  ): void {
    const gameState = context.gameState as GameState;
    if (!gameState?.pierceActive) return;

    const balls = context.gameEntities?.balls || [];
    balls.forEach((ball: any) => {
      ctx.save();
      ctx.strokeStyle = PierceBallPowerUp.TRAIL_COLOR;
      ctx.fillStyle = PierceBallPowerUp.TRAIL_COLOR;
      ctx.shadowColor = "#ffd93d";
      ctx.shadowBlur = 10;
      ctx.lineWidth = PierceBallPowerUp.TRAIL_WIDTH;

      // Fade trail based on remaining duration
      const remaining = this.getRemainingDuration();
      const alpha = Math.min(1, remaining / PierceBallPowerUp.DURATION);
      ctx.globalAlpha = alpha;

      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });
  }

  public async onDeactivate(context: PowerUpPluginContext): Promise<void> {
    const gameState = context.gameState as GameState;
    if (gameState) {
      gameState.pierceActive = false;
      gameState.pierceBlocksRemaining = 0;
    }
    this.elapsedTime = 0;
    this.blocksDestroyed = 0;

    // Emit deactivation event
    if (context.eventBus?.emit) {
      context.eventBus.emit("powerup:deactivated", {
        type: PowerUpType.Pierce,
      });
    }
  }
}
