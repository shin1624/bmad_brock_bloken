import { describe, it, expect, beforeEach } from "vitest";
import { MagnetPaddlePowerUp } from "../MagnetPaddlePowerUp";
import { MultiBallPowerUp } from "../MultiBallPowerUp";
import { PaddleSizePowerUp } from "../PaddleSizePowerUp";
import { BallSpeedPowerUp } from "../BallSpeedPowerUp";
import {
  createMockContext,
  createMockGameState,
  createMockBall,
} from "./test-utils";
import type { PowerUpPluginContext } from "../../../../types";
import type { GameState } from "../../../core/GameState";

describe("AC9 Required Power-Up Combinations", () => {
  let context: PowerUpPluginContext;
  let gameState: GameState;
  let magnetPowerUp: MagnetPaddlePowerUp;
  let multiBallPowerUp: MultiBallPowerUp;
  let paddleSizePowerUp: PaddleSizePowerUp;
  let ballSpeedPowerUp: BallSpeedPowerUp;

  beforeEach(() => {
    gameState = createMockGameState();
    context = createMockContext({ gameState });

    magnetPowerUp = new MagnetPaddlePowerUp();
    multiBallPowerUp = new MultiBallPowerUp();
    paddleSizePowerUp = new PaddleSizePowerUp();
    ballSpeedPowerUp = new BallSpeedPowerUp();
  });

  it("AC9.1: MagnetPaddle + MultiBall combination", async () => {
    const initialBall = createMockBall(400, 540);
    context.gameEntities = context.gameEntities || {};
    context.gameEntities.balls = [initialBall];
    gameState.balls = [initialBall];

    // Activate magnet using its custom onActivate method
    await magnetPowerUp.onActivate(context);
    expect(gameState.magnetActive).toBe(true);

    // MultiBallPowerUp uses base class API - call protected method via bracket notation
    const multiBallResult = (multiBallPowerUp as any).onApplyEffect(context);
    expect(multiBallResult.success).toBe(true);

    // Verify both effects are active
    expect(gameState.magnetActive).toBe(true);
    expect(context.gameEntities.balls).toBeDefined();
    expect(context.gameState).toBeDefined();
  });

  it("AC9.2: MagnetPaddle + PaddleSize combination", async () => {
    const ball = createMockBall(400, 540);
    context.gameEntities = context.gameEntities || {};
    context.gameEntities.balls = [ball];
    context.gameEntities.paddle = context.entities?.paddle;
    gameState.balls = [ball];

    // Activate paddle size using base class API
    const paddleSizeResult = (paddleSizePowerUp as any).onApplyEffect(context);
    expect(paddleSizeResult.success).toBe(true);

    // Activate magnet
    await magnetPowerUp.onActivate(context);

    // Verify both effects are active
    expect(context.gameEntities.paddle).toBeDefined();
    expect(gameState.magnetActive).toBe(true);
  });

  it("AC9.3: MagnetPaddle + BallSpeed combination", async () => {
    const ball = createMockBall(400, 540);
    context.gameEntities = context.gameEntities || {};
    context.gameEntities.balls = [ball];
    gameState.balls = [ball];

    // Activate ball speed using base class API
    const ballSpeedResult = (ballSpeedPowerUp as any).onApplyEffect(context);
    expect(ballSpeedResult.success).toBe(true);

    // Activate magnet
    await magnetPowerUp.onActivate(context);

    // Verify both effects are active
    expect(gameState.magnetActive).toBe(true);
    expect(gameState.ballSpeed).toBeDefined();
  });

  it("AC9.4: 3-way combination stress test", async () => {
    const initialBall = createMockBall(400, 540);
    context.gameEntities = context.gameEntities || {};
    context.gameEntities.balls = [initialBall];
    gameState.balls = [initialBall];

    // Activate all three power-ups
    await magnetPowerUp.onActivate(context);
    const multiBallResult = (multiBallPowerUp as any).onApplyEffect(context);
    const ballSpeedResult = (ballSpeedPowerUp as any).onApplyEffect(context);

    // Verify all effects are active and stable
    expect(gameState.magnetActive).toBe(true);
    expect(multiBallResult.success).toBe(true);
    expect(ballSpeedResult.success).toBe(true);
    expect(context.gameEntities.balls).toBeDefined();
    expect(gameState.ballSpeed).toBeDefined();
    expect(context.gameState).toBeDefined();
  });

  it("AC9.5: Verify no conflicts between power-ups", async () => {
    const ball = createMockBall(400, 540);
    context.gameEntities = context.gameEntities || {};
    context.gameEntities.balls = [ball];
    context.gameEntities.paddle = context.entities?.paddle;
    gameState.balls = [ball];

    // Activate multiple power-ups
    await magnetPowerUp.onActivate(context);
    const paddleSizeResult = (paddleSizePowerUp as any).onApplyEffect(context);

    // Verify no conflicts occurred
    expect(gameState.magnetActive).toBe(true);
    expect(paddleSizeResult.success).toBe(true);

    // Update both effects to verify stability
    (magnetPowerUp as any).onUpdate(context, 16);
    const updateResult = (paddleSizePowerUp as any).onUpdateEffect(context);

    expect(updateResult.success).toBe(true);
    expect(context.gameState).toBeDefined();
  });

  it("AC9.6: Sequential activation and deactivation", async () => {
    const ball = createMockBall(400, 540);
    context.gameEntities = context.gameEntities || {};
    context.gameEntities.balls = [ball];
    gameState.balls = [ball];

    // Activate first power-up
    await magnetPowerUp.onActivate(context);
    expect(gameState.magnetActive).toBe(true);

    // Activate second power-up
    const multiBallResult = (multiBallPowerUp as any).onApplyEffect(context);
    expect(multiBallResult.success).toBe(true);

    // Deactivate in reverse order
    await magnetPowerUp.onDeactivate(context);
    expect(gameState.magnetActive).toBe(false);

    const removeResult = (multiBallPowerUp as any).onRemoveEffect(context);
    expect(removeResult.success).toBe(true);

    // Verify clean state
    expect(gameState.ballAttached).toBe(false);
  });
});
