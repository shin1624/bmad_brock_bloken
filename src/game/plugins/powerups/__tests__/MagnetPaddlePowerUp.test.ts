/**
 * Unit Tests for Magnet Paddle Power-Up Plugin
 * Story 4.3a - Phase 1 Advanced Power-Ups
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { MagnetPaddlePowerUp } from "../MagnetPaddlePowerUp";
import { PowerUpPluginContext } from "../../PowerUpPlugin";
import { GameState } from "../../../core/GameState";
import { Ball } from "../../../entities/Ball";
import { Paddle } from "../../../entities/Paddle";
import { PowerUpType } from "../../../entities/PowerUp";

describe("MagnetPaddlePowerUp", () => {
  let plugin: MagnetPaddlePowerUp;
  let mockContext: PowerUpPluginContext;
  let mockGameState: GameState;
  let mockBall: Ball;
  let mockPaddle: Paddle;

  // Helper to sync ball properties
  const syncBall = (
    ball: Ball,
    x?: number,
    y?: number,
    vX?: number,
    vY?: number,
  ) => {
    if (x !== undefined) {
      ball.x = x;
      (ball as any).position.x = x;
    }
    if (y !== undefined) {
      ball.y = y;
      (ball as any).position.y = y;
    }
    if (vX !== undefined) {
      ball.vX = vX;
      (ball as any).velocity.x = vX;
    }
    if (vY !== undefined) {
      ball.vY = vY;
      (ball as any).velocity.y = vY;
    }
  };

  // Helper to sync paddle properties
  const syncPaddle = (paddle: Paddle, x?: number, y?: number) => {
    if (x !== undefined) {
      paddle.x = x;
      (paddle as any).position.x = x;
    }
    if (y !== undefined) {
      paddle.y = y;
      (paddle as any).position.y = y;
    }
  };

  beforeEach(() => {
    // Initialize plugin
    plugin = new MagnetPaddlePowerUp();

    // Create mock ball with both old and new property structures
    mockBall = new Ball(400, 540, 5, 3, -4);
    // Add new structure for compatibility
    (mockBall as any).position = { x: 400, y: 540 };
    (mockBall as any).velocity = { x: 3, y: -4 };

    // Create mock paddle with both old and new property structures
    mockPaddle = new Paddle(375, 550, 100, 15);
    // Add new structure for compatibility
    (mockPaddle as any).position = { x: 375, y: 550 };

    // Sync old properties with new ones
    mockBall.x = mockBall.position.x;
    mockBall.y = mockBall.position.y;
    mockBall.vX = mockBall.velocity.x;
    mockBall.vY = mockBall.velocity.y;

    mockPaddle.x = mockPaddle.position.x;
    mockPaddle.y = mockPaddle.position.y;
    (mockPaddle as any).width = 100;
    (mockPaddle as any).height = 15;

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
      ballAttachOffset: 0,
    } as unknown as GameState;

    // Create mock context
    mockContext = {
      gameState: mockGameState,
      gameEntities: {
        balls: [mockBall],
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
  });

  describe("Plugin Properties", () => {
    it("should have correct metadata", () => {
      expect(plugin.name).toBe("Magnet Paddle PowerUp");
      expect(plugin.version).toBe("1.0.0");
      expect(plugin.type).toBe("powerup");
      expect(plugin.powerUpType).toBe(PowerUpType.MagnetPaddle);
    });

    it("should have correct default configuration", () => {
      const config = plugin.getConfig();
      expect(config.duration).toBe(20000); // 20 seconds
      expect(config.catchRadius).toBe(10);
      expect(config.attachOffset).toBe(-20);
      expect(config.canStack).toBe(false);
      expect(config.priority).toBe(6);
      expect(config.conflictsWith).toEqual([]);
    });
  });

  describe("Activation", () => {
    it("should activate magnet mode on power-up collection", async () => {
      await plugin.onActivate(mockContext);

      expect(mockGameState.magnetActive).toBe(true);
      expect(mockContext.audioSystem.playPowerUpSound).toHaveBeenCalledWith(
        "magnet",
      );
      expect(mockContext.eventBus.emit).toHaveBeenCalledWith(
        "powerup:activated",
        {
          type: PowerUpType.MagnetPaddle,
        },
      );
    });

    it("should reset attachment state when reactivated", async () => {
      mockGameState.magnetActive = true;
      mockGameState.ballAttached = true;

      await plugin.onActivate(mockContext);

      expect(mockGameState.magnetActive).toBe(true);
      expect(mockGameState.ballAttached).toBe(false); // Reset attachment
    });
  });

  describe("Ball Catching Mechanics", () => {
    beforeEach(async () => {
      await plugin.onActivate(mockContext);
      // Ensure magnet is active
      mockGameState.magnetActive = true;
    });

    it("should catch ball when it hits paddle", () => {
      // Position ball to collide with paddle
      syncBall(mockBall, 425, 545, 3, 4); // Center of paddle, moving down

      plugin.onUpdate(mockContext, 16);

      expect(mockGameState.ballAttached).toBe(true);
      expect(mockBall.vX).toBe(0);
      expect(mockBall.vY).toBe(0);
      expect(mockContext.audioSystem.playSound).toHaveBeenCalledWith("attach");
    });

    it("should not catch ball moving away from paddle", () => {
      syncBall(mockBall, 425, 545, 3, -4); // Moving up, away from paddle

      plugin.onUpdate(mockContext, 16);

      expect(mockGameState.ballAttached).toBe(false);
      expect(mockBall.vY).toBe(-4); // Velocity unchanged
    });

    it("should maintain ball position when attached", () => {
      // Attach ball
      mockGameState.ballAttached = true;
      mockGameState.ballAttachOffset = 50; // 50 pixels from left of paddle
      syncBall(mockBall, 425, 530, 0, 0);

      // Move paddle
      syncPaddle(mockPaddle, 450, 550);
      mockGameState.paddlePosition.x = 450;

      plugin.onUpdate(mockContext, 16);

      // Ball should follow paddle
      expect(mockBall.x).toBe(500); // Paddle x (450) + offset (50)
    });

    it("should catch within catch radius", () => {
      syncBall(mockBall, 430, 542, 3, 4); // Within catch radius

      plugin.onUpdate(mockContext, 16);

      expect(mockGameState.ballAttached).toBe(true);
    });

    it("should not catch outside catch radius", () => {
      syncBall(mockBall, 500, 545, 3, 4); // Outside paddle bounds

      plugin.onUpdate(mockContext, 16);

      expect(mockGameState.ballAttached).toBe(false);
    });
  });

  describe("Ball Release Mechanics", () => {
    beforeEach(async () => {
      await plugin.onActivate(mockContext);
      // Ensure magnet is active
      mockGameState.magnetActive = true;
      // Attach ball
      mockGameState.ballAttached = true;
      syncBall(mockBall, 425, 530, 0, 0);
    });

    it("should release ball on space press", () => {
      mockContext.inputSystem.isSpacePressed = vi.fn(() => true);

      plugin.onUpdate(mockContext, 16);

      expect(mockGameState.ballAttached).toBe(false);
      expect(mockBall.vY).toBeLessThan(0); // Ball launched upward
      expect(Math.abs(mockBall.vX)).toBeGreaterThan(0); // Has horizontal velocity
      expect(mockContext.audioSystem.playSound).toHaveBeenCalledWith("release");
    });

    it("should release ball on mouse click", () => {
      mockContext.inputSystem.isMouseClicked = vi.fn(() => true);

      plugin.onUpdate(mockContext, 16);

      expect(mockGameState.ballAttached).toBe(false);
      expect(mockBall.vY).toBeLessThan(0);
      expect(mockContext.audioSystem.playSound).toHaveBeenCalledWith("release");
    });

    it("should calculate release angle based on paddle position", () => {
      // Ball at left edge of paddle
      syncBall(mockBall, mockPaddle.x, 530, 0, 0);
      mockContext.inputSystem.isSpacePressed = vi.fn(() => true);

      plugin.onUpdate(mockContext, 16);

      // Should launch to the left
      expect(mockBall.vX).toBeLessThan(0);
    });

    it("should calculate release angle from paddle center", () => {
      // Ball at right edge of paddle
      syncBall(mockBall, mockPaddle.x + mockPaddle.width, 530, 0, 0);
      mockContext.inputSystem.isSpacePressed = vi.fn(() => true);

      plugin.onUpdate(mockContext, 16);

      // Should launch to the right
      expect(mockBall.vX).toBeGreaterThan(0);
    });

    it("should maintain ball speed on release", () => {
      const originalSpeed = 5;
      mockGameState.ballSpeed = originalSpeed;
      mockContext.inputSystem.isSpacePressed = vi.fn(() => true);

      plugin.onUpdate(mockContext, 16);

      const speed = Math.sqrt(
        mockBall.vX * mockBall.vX + mockBall.vY * mockBall.vY,
      );
      expect(speed).toBeCloseTo(originalSpeed, 1);
    });
  });

  describe("Duration Management", () => {
    beforeEach(async () => {
      await plugin.onActivate(mockContext);
    });

    it("should track remaining duration", () => {
      const initialDuration = plugin.getRemainingDuration();
      expect(initialDuration).toBe(20000);

      plugin.onUpdate(mockContext, 1000);

      expect(plugin.getRemainingDuration()).toBe(19000);
    });

    it("should deactivate after duration expires", () => {
      // Fast forward to expiration
      plugin.onUpdate(mockContext, 20000);

      expect(mockGameState.magnetActive).toBe(false);
      expect(mockGameState.ballAttached).toBe(false);
      expect(mockContext.audioSystem.playExpireSound).toHaveBeenCalledWith(
        "magnet",
      );
    });

    it("should release ball on expiration if attached", () => {
      mockGameState.ballAttached = true;
      syncBall(mockBall, 425, 530, 0, 0);

      plugin.onUpdate(mockContext, 20000);

      expect(mockGameState.ballAttached).toBe(false);
      expect(mockBall.vY).toBeLessThan(0); // Ball released
    });
  });

  describe("Visual Effects", () => {
    it("should render magnetic field effect", () => {
      mockGameState.magnetActive = true;
      const mockCtx = {
        strokeStyle: "",
        lineWidth: 0,
        shadowColor: "",
        shadowBlur: 0,
        globalAlpha: 1,
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        arc: vi.fn(),
        stroke: vi.fn(),
        setLineDash: vi.fn(),
      } as unknown as CanvasRenderingContext2D;

      plugin.onRender(mockContext, mockCtx);

      // Should draw magnetic field arcs
      expect(mockCtx.strokeStyle).toBe("#9c88ff");
      expect(mockCtx.setLineDash).toHaveBeenCalledWith([5, 5]);
      expect(mockCtx.arc).toHaveBeenCalled();
      expect(mockCtx.stroke).toHaveBeenCalled();
    });

    it("should render attachment line when ball attached", () => {
      mockGameState.magnetActive = true;
      mockGameState.ballAttached = true;
      // Make ball appear attached (zero velocity)
      syncBall(mockBall, 425, 530, 0, 0);

      const mockCtx = {
        strokeStyle: "",
        lineWidth: 0,
        shadowColor: "",
        shadowBlur: 0,
        globalAlpha: 1,
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        arc: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        setLineDash: vi.fn(),
      } as unknown as CanvasRenderingContext2D;

      plugin.onRender(mockContext, mockCtx);

      // Should draw connection line
      expect(mockCtx.moveTo).toHaveBeenCalled();
      expect(mockCtx.lineTo).toHaveBeenCalled();
    });

    it("should not render when inactive", () => {
      mockGameState.magnetActive = false;
      const mockCtx = {
        beginPath: vi.fn(),
        stroke: vi.fn(),
      } as unknown as CanvasRenderingContext2D;

      plugin.onRender(mockContext, mockCtx);

      expect(mockCtx.beginPath).not.toHaveBeenCalled();
      expect(mockCtx.stroke).not.toHaveBeenCalled();
    });
  });

  describe("Multiple Balls", () => {
    it("should handle multiple balls correctly", () => {
      const ball2 = new Ball(200, 545, 5, 3, 4);
      (ball2 as any).position = { x: 200, y: 545 };
      (ball2 as any).velocity = { x: 3, y: 4 };
      ball2.x = 200;
      ball2.y = 545;
      ball2.vX = 3;
      ball2.vY = 4;

      mockGameState.balls = [mockBall, ball2];
      mockContext.gameEntities.balls = [mockBall, ball2];

      syncBall(mockBall, 425, 545, 3, 4);
      mockGameState.magnetActive = true;

      plugin.onUpdate(mockContext, 16);

      // Should only attach the first ball that collides
      expect(mockGameState.ballAttached).toBe(true);
      expect(mockBall.vX).toBe(0);
      expect(mockBall.vY).toBe(0);

      // Second ball should continue normally
      expect(ball2.vY).toBe(4);
    });

    it("should only release attached ball", () => {
      const ball2 = new Ball(200, 300, 5, 3, -4);
      (ball2 as any).position = { x: 200, y: 300 };
      (ball2 as any).velocity = { x: 3, y: -4 };
      ball2.x = 200;
      ball2.y = 300;
      ball2.vX = 3;
      ball2.vY = -4;

      mockGameState.balls = [mockBall, ball2];
      mockContext.gameEntities.balls = [mockBall, ball2];
      mockGameState.ballAttached = true;
      syncBall(mockBall, 425, 530, 0, 0);

      mockContext.inputSystem.isSpacePressed = vi.fn(() => true);
      plugin.onUpdate(mockContext, 16);

      // Attached ball should be released
      expect(mockBall.vY).toBeLessThan(0);
      // Other ball should not be affected
      expect(ball2.vY).toBe(-4);
    });
  });

  describe("Deactivation", () => {
    it("should properly deactivate plugin", async () => {
      mockGameState.magnetActive = true;
      mockGameState.ballAttached = true;

      await plugin.onDeactivate(mockContext);

      expect(mockGameState.magnetActive).toBe(false);
      expect(mockGameState.ballAttached).toBe(false);
      expect(mockContext.eventBus.emit).toHaveBeenCalledWith(
        "powerup:deactivated",
        {
          type: PowerUpType.MagnetPaddle,
        },
      );
    });

    it("should release ball on deactivation", async () => {
      mockGameState.magnetActive = true;
      mockGameState.ballAttached = true;
      syncBall(mockBall, 425, 530, 0, 0);

      await plugin.onDeactivate(mockContext);

      expect(mockBall.vY).toBeLessThan(0); // Ball should be released
    });
  });

  describe("Edge Cases", () => {
    it("should handle paddle at screen edge", () => {
      syncPaddle(mockPaddle, 0, 550); // Left edge
      syncBall(mockBall, 25, 545, 3, 4);
      mockGameState.magnetActive = true;

      plugin.onUpdate(mockContext, 16);

      expect(mockGameState.ballAttached).toBe(true);
    });

    it("should handle very fast ball", () => {
      syncBall(mockBall, 425, 545, 3, 20); // Very fast
      mockGameState.magnetActive = true;

      plugin.onUpdate(mockContext, 16);

      expect(mockGameState.ballAttached).toBe(true);
      expect(mockBall.vX).toBe(0);
      expect(mockBall.vY).toBe(0);
    });

    it("should not interfere with other power-ups", () => {
      mockGameState.shieldActive = true;
      mockGameState.pierceActive = true;
      mockGameState.magnetActive = true;

      plugin.onUpdate(mockContext, 16);

      expect(mockGameState.shieldActive).toBe(true);
      expect(mockGameState.pierceActive).toBe(true);
    });

    it("should handle simultaneous input", () => {
      mockGameState.ballAttached = true;
      syncBall(mockBall, 425, 530, 0, 0);
      mockContext.inputSystem.isSpacePressed = vi.fn(() => true);
      mockContext.inputSystem.isMouseClicked = vi.fn(() => true);

      plugin.onUpdate(mockContext, 16);

      // Should only release once
      expect(mockGameState.ballAttached).toBe(false);
      expect(mockContext.audioSystem.playSound).toHaveBeenCalledTimes(1);
    });
  });
});
