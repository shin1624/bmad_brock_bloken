/**
 * Unit Tests for Shield Power-Up Plugin
 * Story 4.3a - Phase 1 Advanced Power-Ups
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { ShieldPowerUp } from "../ShieldPowerUp";
import { PowerUpPluginContext } from "../../PowerUpPlugin";
import { GameState } from "../../../core/GameState";
import { Ball } from "../../../entities/Ball";
import { Paddle } from "../../../entities/Paddle";
import { PowerUpType } from "../../../entities/PowerUp";

describe("ShieldPowerUp", () => {
  let plugin: ShieldPowerUp;
  let mockContext: PowerUpPluginContext;
  let mockGameState: GameState;
  let mockBall: Ball;
  let mockPaddle: Paddle;

  beforeEach(() => {
    // Initialize plugin
    plugin = new ShieldPowerUp();

    // Create mock ball
    mockBall = new Ball(400, 300, 5, 3, -4);

    // Create mock paddle
    mockPaddle = new Paddle(375, 550, 100, 15);

    // Create mock game state
    mockGameState = {
      isRunning: true,
      isPaused: false,
      score: 0,
      lives: 3,
      level: 1,
      balls: [mockBall],
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
    } as unknown as GameState;

    // Create mock context
    mockContext = {
      gameState: mockGameState,
      entities: {
        ball: mockBall,
        paddle: mockPaddle,
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
      },
      eventBus: {
        emit: vi.fn(),
        on: vi.fn(),
        off: vi.fn(),
      },
    } as unknown as PowerUpPluginContext;
  });

  describe("Plugin Properties", () => {
    it("should have correct metadata", () => {
      expect(plugin.name).toBe("Shield PowerUp");
      expect(plugin.version).toBe("1.0.0");
      expect(plugin.type).toBe("powerup");
      expect(plugin.powerUpType).toBe(PowerUpType.Shield);
    });

    it("should have correct default configuration", () => {
      const config = plugin.getConfig();
      expect(config.isOneTime).toBe(true);
      expect(config.canStack).toBe(false);
      expect(config.priority).toBe(10);
      expect(config.conflictsWith).toEqual([]);
    });
  });

  describe("Activation", () => {
    it("should activate shield on power-up collection", async () => {
      await plugin.onActivate(mockContext);

      expect(mockGameState.shieldActive).toBe(true);
      expect(mockContext.audioSystem.playPowerUpSound).toHaveBeenCalledWith(
        "shield",
      );
      expect(mockContext.eventBus.emit).toHaveBeenCalledWith(
        "powerup:activated",
        {
          type: PowerUpType.Shield,
        },
      );
    });

    it("should handle activation when shield already active", async () => {
      mockGameState.shieldActive = true;

      await plugin.onActivate(mockContext);

      // Shield should remain active
      expect(mockGameState.shieldActive).toBe(true);
      // Should still play sound and emit event
      expect(mockContext.audioSystem.playPowerUpSound).toHaveBeenCalled();
      expect(mockContext.eventBus.emit).toHaveBeenCalled();
    });
  });

  describe("Ball Miss Protection", () => {
    it("should protect from ball miss when shield is active", () => {
      mockGameState.shieldActive = true;
      mockBall.y = 590; // Ball below screen
      mockBall.vY = 5; // Moving downward

      plugin.onUpdate(mockContext, 16);

      // Ball should bounce back up
      expect(mockBall.vY).toBeLessThan(0);
      // Shield should be consumed
      expect(mockGameState.shieldActive).toBe(false);
      // Should emit event
      expect(mockContext.eventBus.emit).toHaveBeenCalledWith("shield:consumed");
    });

    it("should not affect ball when shield is inactive", () => {
      mockGameState.shieldActive = false;
      mockBall.y = 590;
      const originalVY = 5;
      mockBall.vY = originalVY;

      plugin.onUpdate(mockContext, 16);

      // Ball velocity should not change
      expect(mockBall.vY).toBe(originalVY);
    });

    it("should not trigger on ball moving upward", () => {
      mockGameState.shieldActive = true;
      mockBall.y = 590;
      mockBall.vY = -5; // Moving upward

      plugin.onUpdate(mockContext, 16);

      // Shield should remain active
      expect(mockGameState.shieldActive).toBe(true);
      // Ball velocity should not change
      expect(mockBall.vY).toBe(-5);
    });

    it("should handle multiple balls correctly", () => {
      const ball2 = new Ball(200, 300, 5, 3, -4);
      mockGameState.balls = [mockBall, ball2];
      mockGameState.shieldActive = true;

      // Only first ball is out of bounds
      mockBall.y = 590;
      mockBall.vY = 5;
      ball2.y = 300;
      ball2.vY = -4;

      plugin.onUpdate(mockContext, 16);

      // Shield should be consumed by first ball
      expect(mockGameState.shieldActive).toBe(false);
      expect(mockBall.vY).toBeLessThan(0);
      // Second ball should not be affected
      expect(ball2.vY).toBe(-4);
    });
  });

  describe("Visual Effects", () => {
    it("should render shield barrier when active", () => {
      mockGameState.shieldActive = true;
      const mockCtx = {
        strokeStyle: "",
        lineWidth: 0,
        shadowColor: "",
        shadowBlur: 0,
        globalAlpha: 1,
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        setLineDash: vi.fn(),
        canvas: { width: 800, height: 600 },
      } as unknown as CanvasRenderingContext2D;

      plugin.onRender(mockContext, mockCtx);

      // Should set shield visual properties
      expect(mockCtx.strokeStyle).toBe("#00b8d4");
      expect(mockCtx.lineWidth).toBe(3);
      expect(mockCtx.shadowColor).toBe("#00b8d4");
      expect(mockCtx.shadowBlur).toBeGreaterThan(0);

      // Should draw shield line
      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.moveTo).toHaveBeenCalledWith(0, 580);
      expect(mockCtx.lineTo).toHaveBeenCalledWith(800, 580);
      expect(mockCtx.stroke).toHaveBeenCalled();
    });

    it("should not render when shield is inactive", () => {
      mockGameState.shieldActive = false;
      const mockCtx = {
        beginPath: vi.fn(),
        stroke: vi.fn(),
        canvas: { width: 800, height: 600 },
      } as unknown as CanvasRenderingContext2D;

      plugin.onRender(mockContext, mockCtx);

      // Should not draw anything
      expect(mockCtx.beginPath).not.toHaveBeenCalled();
      expect(mockCtx.stroke).not.toHaveBeenCalled();
    });

    it("should animate shield with pulsing effect", async () => {
      mockGameState.shieldActive = true;
      const mockCtx = {
        strokeStyle: "",
        lineWidth: 0,
        shadowColor: "",
        shadowBlur: 0,
        globalAlpha: 1,
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        setLineDash: vi.fn(),
        canvas: { width: 800, height: 600 },
      } as unknown as CanvasRenderingContext2D;

      // Test at different animation times
      plugin.onRender(mockContext, mockCtx);
      const opacity1 = mockCtx.globalAlpha;

      // Wait for animation to advance (Date.now() based)
      await new Promise((resolve) => setTimeout(resolve, 100));

      plugin.onRender(mockContext, mockCtx);
      const opacity2 = mockCtx.globalAlpha;

      // Opacity should vary for pulsing effect
      expect(opacity1).not.toBe(opacity2);
    });
  });

  describe("Deactivation", () => {
    it("should properly deactivate plugin", async () => {
      mockGameState.shieldActive = true;

      await plugin.onDeactivate(mockContext);

      expect(mockGameState.shieldActive).toBe(false);
      expect(mockContext.eventBus.emit).toHaveBeenCalledWith(
        "powerup:deactivated",
        {
          type: PowerUpType.Shield,
        },
      );
    });

    it("should handle deactivation when already inactive", async () => {
      mockGameState.shieldActive = false;

      await plugin.onDeactivate(mockContext);

      expect(mockGameState.shieldActive).toBe(false);
      expect(mockContext.eventBus.emit).toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    it("should handle shield consumption at exact boundary", () => {
      mockGameState.shieldActive = true;
      mockBall.y = 580; // Exactly at shield position
      mockBall.vY = 5;

      plugin.onUpdate(mockContext, 16);

      expect(mockBall.vY).toBeLessThan(0);
      expect(mockGameState.shieldActive).toBe(false);
    });

    it("should handle very fast moving balls", () => {
      mockGameState.shieldActive = true;
      mockBall.y = 590;
      mockBall.vY = 20; // Very fast

      plugin.onUpdate(mockContext, 16);

      // Should still reverse direction
      expect(mockBall.vY).toBe(-20);
      expect(mockGameState.shieldActive).toBe(false);
    });

    it("should not interfere with other power-ups", () => {
      mockGameState.shieldActive = true;
      mockGameState.pierceActive = true;
      mockGameState.magnetActive = true;

      plugin.onUpdate(mockContext, 16);

      // Other power-up states should remain unchanged
      expect(mockGameState.pierceActive).toBe(true);
      expect(mockGameState.magnetActive).toBe(true);
    });
  });
});
