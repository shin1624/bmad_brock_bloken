/**
 * Magnet Paddle Power-Up Plugin Implementation
 * Story 4.3a - Phase 1 Advanced Power-ups
 * Ball sticks to paddle on contact, release with click or space key
 */
import { BasePowerUpPlugin } from "./BasePowerUpPlugin";
import { PowerUpType, PowerUpEffect } from "../../entities/PowerUp";
import { PowerUpPluginContext, EffectResult } from "../PowerUpPlugin";
import type { GameState } from "../../../types/game.types";

export class MagnetPaddlePowerUp extends BasePowerUpPlugin {
  private static readonly FIELD_COLOR = "#9c88ff";
  private static readonly FIELD_RADIUS = 10;
  private static readonly ATTACH_OFFSET = -20; // pixels above paddle center
  private static readonly DURATION = 20000; // 20 seconds
  private static readonly CATCH_RADIUS = 10;

  private attachedBallId: string | null = null;
  private relativePosition: { x: number; y: number } | null = null;
  private releaseHandler: ((e: KeyboardEvent | MouseEvent) => void) | null =
    null;
  private activationTime: number = 0;
  private remainingDuration: number = 0;

  constructor() {
    const effect: PowerUpEffect = {
      id: "magnet_effect",
      priority: 7, // High priority - ball control
      stackable: false,
      conflictsWith: [],
      apply: () => {},
      remove: () => {},
    };

    super(
      "Magnet Paddle PowerUp",
      "1.0.0",
      PowerUpType.MagnetPaddle,
      effect,
      "Ball sticks to paddle on contact, release with space/click",
      [],
    );
  }

  /**
   * Get plugin configuration (for testing)
   */
  public getConfig() {
    return {
      fieldColor: MagnetPaddlePowerUp.FIELD_COLOR,
      fieldRadius: MagnetPaddlePowerUp.FIELD_RADIUS,
      attachOffset: MagnetPaddlePowerUp.ATTACH_OFFSET,
      duration: MagnetPaddlePowerUp.DURATION,
      catchRadius: MagnetPaddlePowerUp.CATCH_RADIUS,
      canStack: false,
      priority: 6,
      conflictsWith: [] as string[],
    };
  }

  /**
   * Activate magnet mode (alias for applyEffect)
   */
  public async onActivate(context: PowerUpPluginContext): Promise<void> {
    this.activationTime = Date.now();
    this.remainingDuration = MagnetPaddlePowerUp.DURATION;

    await this.applyEffect(context);

    // Play activation sound
    if (context.audioSystem?.playPowerUpSound) {
      context.audioSystem.playPowerUpSound("magnet");
    }

    // Emit activation event
    if (context.eventBus?.emit) {
      context.eventBus.emit("powerup:activated", {
        type: PowerUpType.MagnetPaddle,
      });
    }
  }

  protected onApplyEffect(context: PowerUpPluginContext): EffectResult {
    try {
      // Enable magnet in game state
      const gameState = context.gameState as GameState;
      if (gameState) {
        gameState.magnetActive = true;
        gameState.ballAttached = false;
      }

      // Add magnetic field visual
      this.addMagneticFieldVisual(context);

      // Setup input handlers for release
      this.setupReleaseHandlers(context);

      this.log("Magnet Paddle activated");

      return {
        success: true,
        modified: true,
        message: "Magnet Paddle activated",
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
      // Release any attached ball
      if (this.attachedBallId) {
        this.releaseBall(context);
      }

      // Disable magnet in game state
      const gameState = context.gameState as GameState;
      if (gameState) {
        gameState.magnetActive = false;
        gameState.ballAttached = false;
      }

      // Remove magnetic field visual
      this.removeMagneticFieldVisual(context);

      // Remove input handlers
      this.removeReleaseHandlers();

      this.log("Magnet Paddle deactivated");

      return {
        success: true,
        modified: true,
        message: "Magnet Paddle removed",
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
   * Add magnetic field visual effect to paddle
   */
  private addMagneticFieldVisual(context: PowerUpPluginContext): void {
    const renderer = context.renderer as any;
    if (!renderer || !renderer.addCustomRender) {
      return;
    }

    renderer.addCustomRender("magnetField", (ctx: CanvasRenderingContext2D) => {
      const gameState = context.gameState as GameState;
      if (!gameState?.magnetActive || !context.gameEntities?.paddle) {
        return;
      }

      const paddle = context.gameEntities.paddle;
      if (!paddle || !paddle.position) {
        return;
      }

      ctx.save();

      // Draw magnetic field effect
      const centerX = paddle.position.x + paddle.width / 2;
      const centerY = paddle.position.y;

      // Pulsing effect
      const pulseScale = 1 + Math.sin(Date.now() * 0.003) * 0.2;
      const fieldRadius = MagnetPaddlePowerUp.FIELD_RADIUS * pulseScale;

      // Create gradient for field
      const gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        fieldRadius + paddle.width / 2,
      );
      gradient.addColorStop(0, MagnetPaddlePowerUp.FIELD_COLOR);
      gradient.addColorStop(0.5, "rgba(0, 100, 255, 0.2)");
      gradient.addColorStop(1, "rgba(0, 100, 255, 0)");

      ctx.fillStyle = gradient;
      ctx.fillRect(
        paddle.position.x - fieldRadius,
        paddle.position.y - fieldRadius,
        paddle.width + fieldRadius * 2,
        paddle.height + fieldRadius * 2,
      );

      // Add electric arc effects
      ctx.strokeStyle = "rgba(100, 150, 255, 0.6)";
      ctx.lineWidth = 1;
      ctx.beginPath();

      for (let i = 0; i < 3; i++) {
        const arcX = paddle.position.x + (paddle.width / 4) * (i + 1);
        const arcY =
          paddle.position.y - 5 + Math.sin(Date.now() * 0.005 + i) * 3;

        ctx.moveTo(arcX - 5, arcY);
        ctx.quadraticCurveTo(arcX, arcY - 8, arcX + 5, arcY);
      }
      ctx.stroke();

      ctx.restore();
    });
  }

  /**
   * Remove magnetic field visual effect
   */
  private removeMagneticFieldVisual(context: PowerUpPluginContext): void {
    const renderer = context.renderer as any;
    if (!renderer || !renderer.removeCustomRender) {
      return;
    }

    renderer.removeCustomRender("magnetField");
  }

  /**
   * Setup input handlers for ball release
   */
  private setupReleaseHandlers(context: PowerUpPluginContext): void {
    this.releaseHandler = (event: KeyboardEvent | MouseEvent) => {
      const gameState = context.gameState as GameState;
      if (!gameState?.ballAttached) {
        return;
      }

      // Check for space key or mouse click
      if (
        (event instanceof KeyboardEvent && event.code === "Space") ||
        event instanceof MouseEvent
      ) {
        event.preventDefault();
        this.releaseBall(context);
      }
    };

    // Add event listeners
    window.addEventListener("keydown", this.releaseHandler as EventListener);
    window.addEventListener("click", this.releaseHandler as EventListener);
  }

  /**
   * Remove input handlers
   */
  private removeReleaseHandlers(): void {
    if (this.releaseHandler) {
      window.removeEventListener(
        "keydown",
        this.releaseHandler as EventListener,
      );
      window.removeEventListener("click", this.releaseHandler as EventListener);
      this.releaseHandler = null;
    }
  }

  /**
   * Attach ball to paddle (called by collision system)
   */
  public attachBall(ballId: string, context: PowerUpPluginContext): void {
    if (this.attachedBallId) {
      return; // Already have a ball attached
    }

    const gameState = context.gameState as GameState;
    const ball = context.gameEntities?.balls?.find((b: any) => b.id === ballId);
    const paddle = context.gameEntities?.paddle;

    if (!ball || !paddle || !gameState) {
      return;
    }

    // Calculate relative position
    this.attachedBallId = ballId;
    this.relativePosition = {
      x: ball.position.x - paddle.position.x,
      y: -MagnetPaddlePowerUp.ATTACH_OFFSET,
    };

    // Update game state
    gameState.ballAttached = true;

    // Stop ball movement
    ball.velocity.x = 0;
    ball.velocity.y = 0;

    this.log(`Ball attached: ${ballId}`);
  }

  /**
   * Release attached ball
   */
  private releaseBall(context: PowerUpPluginContext): void {
    if (!this.attachedBallId && !context.gameState.ballAttached) {
      return;
    }

    const gameState = context.gameState as GameState;
    const balls = context.gameEntities?.balls || [];

    // Find the attached ball (first ball if no specific ID)
    const ball = this.attachedBallId
      ? balls.find((b: any) => b.id === this.attachedBallId)
      : balls[0];

    if (!ball || !gameState) {
      return;
    }

    // Calculate release angle based on paddle position
    const paddle = context.gameEntities?.paddle;
    if (paddle) {
      // Support both old and new property structures
      const paddleWidth = paddle.width ?? 100;

      // Use ballAttachOffset if available, otherwise calculate from current position
      let offset: number;
      if (
        gameState.ballAttachOffset !== undefined &&
        gameState.ballAttachOffset !== 0
      ) {
        // Use stored attach offset (distance from paddle left edge)
        offset =
          (gameState.ballAttachOffset - paddleWidth / 2) / (paddleWidth / 2);
      } else {
        // Fallback: calculate from current position
        const paddleX = paddle.x ?? paddle.position?.x ?? 0;
        const paddleCenter = paddleX + paddleWidth / 2;
        const ballX = ball.x ?? ball.position?.x ?? 0;
        offset = (ballX - paddleCenter) / (paddleWidth / 2);
      }

      // Set release velocity with angle based on position
      const baseSpeed = gameState.ballSpeed || 5;

      // Calculate horizontal velocity (minimum 0.5 to avoid straight vertical shots)
      let vX = offset * baseSpeed * 0.7;
      if (Math.abs(vX) < 0.5) {
        vX = offset >= 0 ? 0.5 : -0.5;
      }
      const vY = -baseSpeed;

      if (ball.vX !== undefined) ball.vX = vX;
      if (ball.vY !== undefined) ball.vY = vY;
      if (ball.velocity) {
        ball.velocity.x = vX;
        ball.velocity.y = vY;
      }
    } else {
      // Fallback: launch straight up
      const baseSpeed = gameState.ballSpeed || 5;

      if (ball.vX !== undefined) ball.vX = 0;
      if (ball.vY !== undefined) ball.vY = -baseSpeed;
      if (ball.velocity) {
        ball.velocity.x = 0;
        ball.velocity.y = -baseSpeed;
      }
    }

    // Update game state
    gameState.ballAttached = false;
    this.attachedBallId = null;
    this.relativePosition = null;

    // Play release sound
    if (context.audioSystem?.playSound) {
      context.audioSystem.playSound("release");
    }

    this.log("Ball released");
  }

  /**
   * Update attached ball position (called each frame)
   */
  public update(context: PowerUpPluginContext, deltaTime: number): void {
    const gameState = context.gameState as GameState;
    if (!gameState?.magnetActive) {
      return;
    }

    // Update remaining duration
    if (this.remainingDuration > 0) {
      this.remainingDuration -= deltaTime;

      // Check for expiration
      if (this.remainingDuration <= 0) {
        this.remainingDuration = 0;

        // Release ball if attached
        if (gameState.ballAttached) {
          this.releaseBall(context);
        }

        // Deactivate power-up
        gameState.magnetActive = false;
        gameState.ballAttached = false;

        // Play expire sound
        if (context.audioSystem?.playExpireSound) {
          context.audioSystem.playExpireSound("magnet");
        }

        return;
      }
    }

    // Check for ball attachment
    if (!gameState.ballAttached) {
      this.checkBallCollision(context);
    }

    // Update attached ball position
    if (gameState.ballAttached) {
      this.updateAttachedBall(context);
    }
  }

  /**
   * Check for ball collision with paddle
   */
  private checkBallCollision(context: PowerUpPluginContext): void {
    const gameState = context.gameState as GameState;
    const paddle = context.gameEntities?.paddle;
    const balls = context.gameEntities?.balls || [];

    if (!paddle || balls.length === 0 || gameState.ballAttached) {
      return;
    }

    // Check each ball for collision
    for (const ball of balls) {
      // Support both old and new property structures
      const ballVY = ball.vY ?? ball.velocity?.y ?? 0;

      // Only catch balls moving down toward paddle (positive vY in canvas coords)
      if (ballVY < 0) {
        continue;
      }

      // Check if ball is within paddle bounds + catch radius
      const paddleX = paddle.x ?? paddle.position?.x ?? 0;
      const paddleY = paddle.y ?? paddle.position?.y ?? 0;
      const paddleWidth = paddle.width ?? 100;
      const paddleHeight = paddle.height ?? 15;

      const paddleCenterX = paddleX + paddleWidth / 2;
      const paddleCenterY = paddleY;

      const ballX = ball.x ?? ball.position?.x ?? 0;
      const ballY = ball.y ?? ball.position?.y ?? 0;

      const distanceX = Math.abs(ballX - paddleCenterX);
      const distanceY = Math.abs(ballY - paddleCenterY);

      // Check if within catch radius
      if (
        distanceX <= paddleWidth / 2 + MagnetPaddlePowerUp.CATCH_RADIUS &&
        distanceY <= paddleHeight + MagnetPaddlePowerUp.CATCH_RADIUS
      ) {
        // Attach this ball
        gameState.ballAttached = true;
        gameState.ballAttachOffset = ballX - paddleX;

        // Stop ball movement in both old and new structures
        if (ball.vX !== undefined) ball.vX = 0;
        if (ball.vY !== undefined) ball.vY = 0;
        if (ball.velocity) {
          ball.velocity.x = 0;
          ball.velocity.y = 0;
        }

        // Play attach sound
        if (context.audioSystem?.playSound) {
          context.audioSystem.playSound("attach");
        }

        // Only attach one ball at a time
        break;
      }
    }
  }

  /**
   * Update position of attached ball
   */
  private updateAttachedBall(context: PowerUpPluginContext): void {
    const gameState = context.gameState as GameState;
    const paddle = context.gameEntities?.paddle;
    const balls = context.gameEntities?.balls || [];

    if (!paddle || !gameState.ballAttached || balls.length === 0) {
      return;
    }

    // Find the first ball with zero velocity (attached ball)
    const ball = balls.find((b: any) => {
      const vX = b.vX ?? b.velocity?.x ?? 999;
      const vY = b.vY ?? b.velocity?.y ?? 999;
      return vX === 0 && vY === 0;
    });

    if (!ball) {
      return;
    }

    // Support both old and new property structures
    const paddleX = paddle.x ?? paddle.position?.x ?? 0;
    const paddleY = paddle.y ?? paddle.position?.y ?? 0;
    const paddleWidth = paddle.width ?? 100;

    // Update ball position to follow paddle
    const newX = paddleX + (gameState.ballAttachOffset || paddleWidth / 2);
    const newY = paddleY + MagnetPaddlePowerUp.ATTACH_OFFSET;

    if (ball.x !== undefined) ball.x = newX;
    if (ball.y !== undefined) ball.y = newY;
    if (ball.position) {
      ball.position.x = newX;
      ball.position.y = newY;
    }

    // Ensure velocity stays at zero
    if (ball.vX !== undefined) ball.vX = 0;
    if (ball.vY !== undefined) ball.vY = 0;
    if (ball.velocity) {
      ball.velocity.x = 0;
      ball.velocity.y = 0;
    }
  }

  protected getRarity(): string {
    return "rare";
  }

  protected getDuration(): number {
    return MagnetPaddlePowerUp.DURATION;
  }

  protected getIcon(): string {
    return "🧲";
  }

  protected getColor(): string {
    return "#0064FF";
  }

  public getMetadata() {
    return {
      type: this.powerUpType,
      rarity: this.getRarity(),
      duration: this.getDuration(),
      icon: this.getIcon(),
      color: this.getColor(),
      description: "Ball sticks to paddle, release with space/click",
    };
  }

  public onUpdate(context: PowerUpPluginContext, deltaTime: number): void {
    const gameState = context.gameState as GameState;

    // Check input for ball release
    if (gameState?.ballAttached && context.inputSystem) {
      const spacePressed = context.inputSystem.isSpacePressed?.() || false;
      const mouseClicked = context.inputSystem.isMouseClicked?.() || false;

      if (spacePressed || mouseClicked) {
        this.releaseBall(context);
        return;
      }
    }

    // Update magnet logic
    this.update(context, deltaTime);
  }

  public onBallCollision(
    context: PowerUpPluginContext,
    ball: any,
    paddle: any,
  ): void {
    const gameState = context.gameState as GameState;
    if (gameState?.magnetActive && !gameState.ballAttached) {
      gameState.ballAttached = true;
      gameState.ballAttachOffset = ball.x - paddle.x;
    }
  }

  public getRemainingDuration(): number {
    return this.remainingDuration;
  }

  public onRender(
    context: PowerUpPluginContext,
    ctx: CanvasRenderingContext2D,
  ): void {
    const gameState = context.gameState as GameState;
    if (!gameState?.magnetActive) return;

    const paddle = context.gameEntities?.paddle;
    if (!paddle) return;

    ctx.save();
    ctx.strokeStyle = MagnetPaddlePowerUp.FIELD_COLOR;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.3;
    ctx.setLineDash([5, 5]);

    // Draw magnetic field arcs
    const centerX = paddle.x + paddle.width / 2;
    const centerY = paddle.y;

    // Draw multiple arcs for field effect
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.arc(
        centerX,
        centerY,
        MagnetPaddlePowerUp.FIELD_RADIUS * i,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    }

    // Draw attachment line if ball is attached
    if (gameState.ballAttached) {
      const balls = context.gameEntities?.balls || [];
      const ball = balls.find((b: any) => b.vX === 0 && b.vY === 0);

      if (ball) {
        ctx.beginPath();
        ctx.moveTo(ball.x, ball.y);
        ctx.lineTo(centerX, centerY);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  public async onDeactivate(context: PowerUpPluginContext): Promise<void> {
    const gameState = context.gameState as GameState;

    // Release ball if attached
    if (gameState?.ballAttached) {
      this.releaseBall(context);
    }

    if (gameState) {
      gameState.magnetActive = false;
      gameState.ballAttached = false;
      gameState.ballAttachOffset = 0;
    }

    // Remove event handlers
    this.removeReleaseHandlers();

    // Remove visual effect
    this.removeMagneticFieldVisual(context);

    // Emit deactivation event
    if (context.eventBus?.emit) {
      context.eventBus.emit("powerup:deactivated", {
        type: PowerUpType.MagnetPaddle,
      });
    }
  }
}
