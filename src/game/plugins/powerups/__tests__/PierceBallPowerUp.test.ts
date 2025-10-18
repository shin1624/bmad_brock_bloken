/**
 * Unit Tests for Pierce Ball Power-Up Plugin
 * Story 4.3a - Phase 1 Advanced Power-Ups
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { PierceBallPowerUp } from "../PierceBallPowerUp";
import { PowerUpPluginContext } from "../../PowerUpPlugin";
import { GameState } from "../../../core/GameState";
import { Ball } from "../../../entities/Ball";
import { Block } from "../../../entities/Block";
import { PowerUpType } from "../../../entities/PowerUp";
import { BlockType } from "../../../../types/game.types";

describe("PierceBallPowerUp", () => {
  let plugin: PierceBallPowerUp;
  let mockContext: PowerUpPluginContext;
  let mockGameState: GameState;
  let mockBall: Ball;
  let mockBlocks: Block[];

  beforeEach(() => {
    // Initialize plugin
    plugin = new PierceBallPowerUp();

    // Create mock ball
    mockBall = new Ball(400, 300, 5, 3, -4);

    // Create mock blocks
    mockBlocks = [
      new Block(BlockType.Normal, 0, 0, { x: 100, y: 100 }),
      new Block(BlockType.Normal, 0, 1, { x: 200, y: 100 }),
      new Block(BlockType.Hard, 0, 2, { x: 300, y: 100 }),
    ];

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
      blocks: mockBlocks,
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
      gameEntities: {
        balls: [mockBall],
        paddle: null,
        blocks: mockBlocks,
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
      expect(plugin.name).toBe("Pierce Ball PowerUp");
      expect(plugin.version).toBe("1.0.0");
      expect(plugin.type).toBe("powerup");
      expect(plugin.powerUpType).toBe(PowerUpType.Pierce);
    });

    it("should have correct default configuration", () => {
      const config = plugin.getConfig();
      expect(config.duration).toBe(15000); // 15 seconds
      expect(config.maxBlocks).toBe(10);
      expect(config.canStack).toBe(false);
      expect(config.priority).toBe(7);
      expect(config.conflictsWith).toEqual([]);
    });
  });

  describe("Activation", () => {
    it("should activate pierce mode on power-up collection", async () => {
      await plugin.onActivate(mockContext);

      expect(mockGameState.pierceActive).toBe(true);
      expect(mockGameState.pierceBlocksRemaining).toBe(10);
      expect(mockContext.audioSystem.playPowerUpSound).toHaveBeenCalledWith(
        "pierce",
      );
      expect(mockContext.eventBus.emit).toHaveBeenCalledWith(
        "powerup:activated",
        {
          type: PowerUpType.Pierce,
        },
      );
    });

    it("should reset block counter when reactivated", async () => {
      mockGameState.pierceActive = true;
      mockGameState.pierceBlocksRemaining = 3;

      await plugin.onActivate(mockContext);

      expect(mockGameState.pierceActive).toBe(true);
      expect(mockGameState.pierceBlocksRemaining).toBe(10); // Reset to max
    });
  });

  describe("Block Piercing Mechanics", () => {
    beforeEach(async () => {
      await plugin.onActivate(mockContext);
    });

    it("should allow ball to pass through blocks", () => {
      const block = mockBlocks[0];
      mockBall.vY = 5; // Moving down

      // Simulate collision
      plugin.onBlockHit(mockContext, block, mockBall);

      // Ball velocity should not be reversed
      expect(mockBall.vY).toBe(5);
      // Block counter should decrease
      expect(mockGameState.pierceBlocksRemaining).toBe(9);
    });

    it("should damage block on pierce", () => {
      const block = mockBlocks[0];
      const initialHits = block.currentHitPoints;

      plugin.onBlockHit(mockContext, block, mockBall);

      expect(block.currentHitPoints).toBe(initialHits - 1);
    });

    it("should handle tough blocks correctly", () => {
      const toughBlock = mockBlocks[2]; // Hard block with more hits
      const initialHits = toughBlock.currentHitPoints;

      plugin.onBlockHit(mockContext, toughBlock, mockBall);

      expect(toughBlock.currentHitPoints).toBe(initialHits - 1);
      expect(mockGameState.pierceBlocksRemaining).toBe(9);
    });

    it("should deactivate after reaching block limit", () => {
      mockGameState.pierceBlocksRemaining = 1;

      const block = mockBlocks[0];
      plugin.onBlockHit(mockContext, block, mockBall);

      expect(mockGameState.pierceBlocksRemaining).toBe(0);
      expect(mockGameState.pierceActive).toBe(false);
      expect(mockContext.audioSystem.playExpireSound).toHaveBeenCalledWith(
        "pierce",
      );
    });

    it("should not pierce when inactive", () => {
      mockGameState.pierceActive = false;
      mockGameState.pierceBlocksRemaining = 10;

      const block = mockBlocks[0];
      const originalVY = -5;
      mockBall.vY = originalVY;

      plugin.onBlockHit(mockContext, block, mockBall);

      // Should not affect ball or counter
      expect(mockBall.vY).toBe(originalVY);
      expect(mockGameState.pierceBlocksRemaining).toBe(10);
    });
  });

  describe("Duration Management", () => {
    beforeEach(async () => {
      await plugin.onActivate(mockContext);
    });

    it("should track remaining duration", () => {
      const initialDuration = plugin.getRemainingDuration();
      expect(initialDuration).toBe(15000);

      // Update for 1 second
      plugin.onUpdate(mockContext, 1000);

      expect(plugin.getRemainingDuration()).toBe(14000);
    });

    it("should deactivate after duration expires", () => {
      // Fast forward to expiration
      plugin.onUpdate(mockContext, 15000);

      expect(mockGameState.pierceActive).toBe(false);
      expect(mockContext.audioSystem.playExpireSound).toHaveBeenCalledWith(
        "pierce",
      );
      expect(mockContext.eventBus.emit).toHaveBeenCalledWith(
        "powerup:expired",
        {
          type: PowerUpType.Pierce,
        },
      );
    });

    it("should handle partial time updates", () => {
      plugin.onUpdate(mockContext, 500);
      plugin.onUpdate(mockContext, 500);
      plugin.onUpdate(mockContext, 500);

      expect(plugin.getRemainingDuration()).toBe(13500);
    });
  });

  describe("Visual Effects", () => {
    it("should render yellow trail effect", () => {
      mockGameState.pierceActive = true;
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
        fill: vi.fn(),
        fillStyle: "",
      } as unknown as CanvasRenderingContext2D;

      plugin.onRender(mockContext, mockCtx);

      // Should set yellow trail color
      expect(mockCtx.fillStyle).toContain("255"); // Yellow RGB component
      expect(mockCtx.shadowColor).toContain("#ffd93d");
      expect(mockCtx.shadowBlur).toBeGreaterThan(0);
    });

    it("should not render trail when inactive", () => {
      mockGameState.pierceActive = false;
      const mockCtx = {
        beginPath: vi.fn(),
        fill: vi.fn(),
      } as unknown as CanvasRenderingContext2D;

      plugin.onRender(mockContext, mockCtx);

      expect(mockCtx.beginPath).not.toHaveBeenCalled();
      expect(mockCtx.fill).not.toHaveBeenCalled();
    });

    it("should fade trail over time", async () => {
      await plugin.onActivate(mockContext); // Properly activate to set activationTime
      mockGameState.pierceActive = true;
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
        fill: vi.fn(),
        fillStyle: "",
      } as unknown as CanvasRenderingContext2D;

      // Create trail positions by calling render multiple times
      for (let i = 0; i < 5; i++) {
        plugin.onUpdate(mockContext, 16);
        plugin.onRender(mockContext, mockCtx);
      }

      // Should render trail for each update
      expect(mockCtx.arc).toHaveBeenCalledTimes(5);
    });
  });

  describe("Deactivation", () => {
    it("should properly deactivate plugin", async () => {
      mockGameState.pierceActive = true;
      mockGameState.pierceBlocksRemaining = 5;

      await plugin.onDeactivate(mockContext);

      expect(mockGameState.pierceActive).toBe(false);
      expect(mockGameState.pierceBlocksRemaining).toBe(0);
      expect(mockContext.eventBus.emit).toHaveBeenCalledWith(
        "powerup:deactivated",
        {
          type: PowerUpType.Pierce,
        },
      );
    });
  });

  describe("Interaction with Other Power-Ups", () => {
    it("should work with shield power-up", async () => {
      mockGameState.shieldActive = true;

      await plugin.onActivate(mockContext);

      expect(mockGameState.pierceActive).toBe(true);
      expect(mockGameState.shieldActive).toBe(true); // Should not affect shield
    });

    it("should work with magnet power-up", async () => {
      mockGameState.magnetActive = true;

      await plugin.onActivate(mockContext);

      expect(mockGameState.pierceActive).toBe(true);
      expect(mockGameState.magnetActive).toBe(true); // Should not affect magnet
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero blocks remaining", () => {
      mockGameState.pierceActive = true;
      mockGameState.pierceBlocksRemaining = 0;

      plugin.onUpdate(mockContext, 16);

      expect(mockGameState.pierceActive).toBe(false);
    });

    it("should handle multiple balls correctly", () => {
      const ball2 = new Ball(200, 300, 5, 3, -4);
      mockGameState.balls = [mockBall, ball2];
      mockGameState.pierceActive = true;
      mockGameState.pierceBlocksRemaining = 10;

      const block = mockBlocks[0];
      plugin.onBlockHit(mockContext, block, mockBall);

      // Should only decrement once per hit
      expect(mockGameState.pierceBlocksRemaining).toBe(9);
    });

    it("should handle destroyed blocks", () => {
      const block = mockBlocks[0];
      block.currentHitPoints = 1; // Will be destroyed on hit
      mockGameState.pierceActive = true;
      mockGameState.pierceBlocksRemaining = 10;

      plugin.onBlockHit(mockContext, block, mockBall);

      expect(block.currentHitPoints).toBe(0);
      expect(block.isDestroyed).toBe(true);
      expect(mockGameState.pierceBlocksRemaining).toBe(9);
    });

    it("should handle simultaneous expiration conditions", () => {
      mockGameState.pierceActive = true;
      mockGameState.pierceBlocksRemaining = 1;

      // Both time and block limit reached
      plugin.onUpdate(mockContext, 15000);
      const block = mockBlocks[0];
      plugin.onBlockHit(mockContext, block, mockBall);

      expect(mockGameState.pierceActive).toBe(false);
      expect(mockContext.audioSystem.playExpireSound).toHaveBeenCalledWith(
        "pierce",
      );
    });
  });
});
