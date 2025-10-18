/**
 * Test Utilities for Power-Up Plugin Testing
 * Provides common mocks and helpers for consistent test setup
 */

import { vi } from "vitest";
import { PowerUpPluginContext } from "../../PowerUpPlugin";
import { GameState } from "../../../core/GameState";
import { Ball } from "../../../entities/Ball";
import { Paddle } from "../../../entities/Paddle";
import { Block } from "../../../entities/Block";
import { BlockType } from "../../../../types/game.types";

/**
 * Creates a mock GameState with default values
 */
export function createMockGameState(
  overrides: Partial<GameState> = {},
): GameState {
  return {
    isRunning: true,
    isPaused: false,
    score: 0,
    lives: 3,
    level: 1,
    balls: [],
    paddlePosition: { x: 375, y: 550 },
    paddleWidth: 100,
    blocks: [],
    powerUps: [],
    combo: 0,
    lastScoreTime: Date.now(),
    ballSpeed: 5,
    shieldActive: false,
    pierceActive: false,
    pierceBlocksRemaining: 0,
    magnetActive: false,
    ballAttached: false,
    ...overrides,
  } as GameState;
}

/**
 * Creates a mock PowerUpPluginContext
 */
export function createMockContext(
  overrides: Partial<PowerUpPluginContext> = {},
): PowerUpPluginContext {
  const defaultContext: PowerUpPluginContext = {
    gameState: createMockGameState(),
    entities: {
      ball: new Ball(400, 300, 5, 3, -4),
      paddle: new Paddle(375, 550, 100, 15),
      blocks: [],
      powerUps: [],
      particles: [],
    },
    renderer: {
      renderBall: vi.fn(),
      renderPaddle: vi.fn(),
      renderBlock: vi.fn(),
      renderPowerUp: vi.fn(),
      renderParticle: vi.fn(),
      clear: vi.fn(),
      setGlobalAlpha: vi.fn(),
      resetGlobalAlpha: vi.fn(),
    },
    audioSystem: {
      playPowerUpSound: vi.fn(),
      playExpireSound: vi.fn(),
      playSound: vi.fn(),
    },
    eventBus: {
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    },
    inputSystem: {
      isSpacePressed: vi.fn(() => false),
      isMouseClicked: vi.fn(() => false),
    },
  } as unknown as PowerUpPluginContext;

  // Merge overrides
  return {
    ...defaultContext,
    ...overrides,
    entities: {
      ...defaultContext.entities,
      ...(overrides.entities || {}),
    },
    renderer: {
      ...defaultContext.renderer,
      ...(overrides.renderer || {}),
    },
    audioSystem: {
      ...defaultContext.audioSystem,
      ...(overrides.audioSystem || {}),
    },
    eventBus: {
      ...defaultContext.eventBus,
      ...(overrides.eventBus || {}),
    },
    inputSystem: {
      ...defaultContext.inputSystem,
      ...(overrides.inputSystem || {}),
    },
  } as PowerUpPluginContext;
}

/**
 * Creates a mock Ball entity
 */
export function createMockBall(
  x = 400,
  y = 300,
  speed = 5,
  vX = 3,
  vY = -4,
): Ball {
  return new Ball(x, y, speed, vX, vY);
}

/**
 * Creates a mock Paddle entity
 */
export function createMockPaddle(
  x = 375,
  y = 550,
  width = 100,
  height = 15,
): Paddle {
  return new Paddle(x, y, width, height);
}

/**
 * Creates a mock Block entity
 */
export function createMockBlock(
  x: number,
  y: number,
  width = 60,
  height = 20,
  type = BlockType.Normal,
  hits = 1,
): Block {
  return new Block(x, y, width, height, type, hits);
}

/**
 * Creates a mock Canvas rendering context
 */
export function createMockCanvasContext(): CanvasRenderingContext2D {
  return {
    strokeStyle: "",
    lineWidth: 0,
    shadowColor: "",
    shadowBlur: 0,
    globalAlpha: 1,
    fillStyle: "",
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    setLineDash: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    canvas: { width: 800, height: 600 },
  } as unknown as CanvasRenderingContext2D;
}

/**
 * Test helper to verify event emissions
 */
export function expectEventEmitted(
  context: PowerUpPluginContext,
  eventName: string,
  payload?: any,
) {
  const eventBus = context.eventBus as any;
  if (payload) {
    expect(eventBus.emit).toHaveBeenCalledWith(eventName, payload);
  } else {
    expect(eventBus.emit).toHaveBeenCalledWith(eventName, expect.anything());
  }
}

/**
 * Test helper to verify audio playback
 */
export function expectSoundPlayed(
  context: PowerUpPluginContext,
  soundType: "powerup" | "expire" | "general",
  soundName?: string,
) {
  const audioSystem = context.audioSystem as any;

  switch (soundType) {
    case "powerup":
      if (soundName) {
        expect(audioSystem.playPowerUpSound).toHaveBeenCalledWith(soundName);
      } else {
        expect(audioSystem.playPowerUpSound).toHaveBeenCalled();
      }
      break;
    case "expire":
      if (soundName) {
        expect(audioSystem.playExpireSound).toHaveBeenCalledWith(soundName);
      } else {
        expect(audioSystem.playExpireSound).toHaveBeenCalled();
      }
      break;
    case "general":
      if (soundName) {
        expect(audioSystem.playSound).toHaveBeenCalledWith(soundName);
      } else {
        expect(audioSystem.playSound).toHaveBeenCalled();
      }
      break;
  }
}

/**
 * Test helper for async operations
 */
export async function waitForNextUpdate(ms = 16): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
