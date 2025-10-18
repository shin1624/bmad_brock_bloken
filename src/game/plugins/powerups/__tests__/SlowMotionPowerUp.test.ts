/**
 * SlowMotionPowerUp Unit Tests
 * Story 4.3b - Phase 2 Advanced Power-ups
 *
 * Test Coverage:
 * - Constructor and initialization
 * - Effect application (timeScale = 0.5)
 * - Effect removal (timeScale = 1.0)
 * - Duration and timing (10 seconds)
 * - Smooth transition (500ms)
 * - Priority system (priority: 8)
 * - Update lifecycle and verification
 * - GameState integration
 * - EventBus integration
 * - Edge cases and error handling
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { SlowMotionPowerUp } from "../SlowMotionPowerUp";
import { PowerUpPluginContext } from "../../PowerUpPlugin";
import { PowerUpType } from "../../../entities/PowerUp";
import { EventBus } from "../../../core/EventBus";
import type { GameState } from "../../../core/GameState";

describe("SlowMotionPowerUp", () => {
  let powerUp: SlowMotionPowerUp;
  let mockContext: PowerUpPluginContext;
  let mockGameState: GameState;
  let mockEventBus: EventBus;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mock GameState with timeScale
    mockGameState = {
      timeScale: 1.0,
      score: 0,
      lives: 3,
      level: 1,
      isPaused: false,
      isGameOver: false,
      ballAttached: false,
      laserActive: false,
    } as GameState;

    // Create mock EventBus
    mockEventBus = new EventBus();

    // Create mock context
    mockContext = {
      powerUpType: PowerUpType.SlowMotion,
      powerUpId: "slow-motion-1",
      effectData: { duration: 10000 },
      gameEntities: {
        balls: [
          { x: 400, y: 300, vx: 200, vy: -200, radius: 8, active: true },
        ],
        paddle: { x: 350, y: 550, width: 100, height: 15, vx: 0 },
        blocks: [],
        powerUps: [],
        particles: [],
      },
      gameState: mockGameState,
      eventBus: mockEventBus,
      performance: { fps: 60, frameTime: 16.67, memoryUsage: 50 },
    };

    // Create PowerUp instance
    powerUp = new SlowMotionPowerUp();
  });

  // ============================================================================
  // Constructor and Initialization Tests
  // ============================================================================

  describe("Constructor", () => {
    it("should initialize with correct name and version", () => {
      expect(powerUp.name).toBe("SlowMotionPowerUp");
      expect(powerUp.version).toBe("1.0.0");
    });

    it("should set correct PowerUpType", () => {
      expect(powerUp.powerUpType).toBe(PowerUpType.SlowMotion);
    });

    it("should have correct priority (8)", () => {
      expect(powerUp.effect.priority).toBe(8);
    });

    it("should not be stackable", () => {
      expect(powerUp.effect.stackable).toBe(false);
    });

    it("should have no conflicts", () => {
      expect(powerUp.effect.conflictsWith).toEqual([]);
    });

    it("should have description", () => {
      expect(powerUp.description).toContain("Slows down game time");
      expect(powerUp.description).toContain("50%");
      expect(powerUp.description).toContain("10 seconds");
    });
  });

  // ============================================================================
  // Effect Application Tests
  // ============================================================================

  describe("applyEffect()", () => {
    it("should set timeScale to 0.5 when activated", () => {
      const result = powerUp.applyEffect(mockContext);

      expect(result.success).toBe(true);
      expect(result.modified).toBe(true);
      expect(mockGameState.timeScale).toBe(0.5);
    });

    it("should return effect data with timeScale and duration", () => {
      const result = powerUp.applyEffect(mockContext);

      expect(result.data).toBeDefined();
      expect(result.data?.timeScale).toBe(0.5);
      expect(result.data?.duration).toBe(10000);
      expect(result.data?.transitionDuration).toBe(500);
    });

    it("should emit slowmotion:transition event", () => {
      const transitionHandler = vi.fn();
      mockEventBus.on("slowmotion:transition", transitionHandler);

      powerUp.applyEffect(mockContext);

      expect(transitionHandler).toHaveBeenCalledWith({
        from: 1.0,
        to: 0.5,
        duration: 500,
      });
    });

    it("should handle missing gameState gracefully", () => {
      const contextWithoutGameState = {
        ...mockContext,
        gameState: undefined,
      };

      const result = powerUp.applyEffect(contextWithoutGameState);

      // Should still succeed but not modify gameState
      expect(result.success).toBe(true);
    });

    it("should handle missing eventBus gracefully", () => {
      const contextWithoutEventBus = {
        ...mockContext,
        eventBus: undefined,
      };

      const result = powerUp.applyEffect(contextWithoutEventBus);

      // Should succeed and modify gameState
      expect(result.success).toBe(true);
      expect(mockGameState.timeScale).toBe(0.5);
    });
  });

  // ============================================================================
  // Effect Removal Tests
  // ============================================================================

  describe("removeEffect()", () => {
    beforeEach(() => {
      // Apply effect first
      mockGameState.timeScale = 0.5;
    });

    it("should restore timeScale to 1.0 when deactivated", () => {
      const result = powerUp.removeEffect(mockContext);

      expect(result.success).toBe(true);
      expect(result.modified).toBe(true);
      expect(mockGameState.timeScale).toBe(1.0);
    });

    it("should return effect data with restored timeScale", () => {
      const result = powerUp.removeEffect(mockContext);

      expect(result.data).toBeDefined();
      expect(result.data?.timeScale).toBe(1.0);
    });

    it("should emit slowmotion:transition event with reverse values", () => {
      const transitionHandler = vi.fn();
      mockEventBus.on("slowmotion:transition", transitionHandler);

      powerUp.removeEffect(mockContext);

      expect(transitionHandler).toHaveBeenCalledWith({
        from: 0.5,
        to: 1.0,
        duration: 500,
      });
    });

    it("should handle missing gameState gracefully", () => {
      const contextWithoutGameState = {
        ...mockContext,
        gameState: undefined,
      };

      const result = powerUp.removeEffect(contextWithoutGameState);

      // Should still succeed
      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // Update Lifecycle Tests
  // ============================================================================

  describe("onUpdate()", () => {
    it("should verify timeScale is maintained during update", () => {
      // Apply effect first
      powerUp.applyEffect(mockContext);
      expect(mockGameState.timeScale).toBe(0.5);

      // Update should maintain timeScale
      powerUp.onUpdate(mockContext, 16.67);
      expect(mockGameState.timeScale).toBe(0.5);
    });

    it("should correct timeScale if it drifts from expected value", () => {
      // Apply effect
      powerUp.applyEffect(mockContext);

      // Simulate drift
      mockGameState.timeScale = 0.7;

      // Update should correct it
      powerUp.onUpdate(mockContext, 16.67);
      expect(mockGameState.timeScale).toBe(0.5);
    });

    it("should handle missing gameState gracefully", () => {
      const contextWithoutGameState = {
        ...mockContext,
        gameState: undefined,
      };

      // Should not throw
      expect(() => {
        powerUp.onUpdate(contextWithoutGameState, 16.67);
      }).not.toThrow();
    });
  });

  // ============================================================================
  // Metadata Tests
  // ============================================================================

  describe("Metadata", () => {
    it("should have correct rarity (rare)", () => {
      // Access protected method through type assertion
      const rarity = (powerUp as any).getRarity();
      expect(rarity).toBe("rare");
    });

    it("should have correct duration (10000ms)", () => {
      const duration = (powerUp as any).getDuration();
      expect(duration).toBe(10000);
    });

    it("should have correct icon (🐌)", () => {
      const icon = (powerUp as any).getIcon();
      expect(icon).toBe("🐌");
    });

    it("should have correct color (purple #9333EA)", () => {
      const color = (powerUp as any).getColor();
      expect(color).toBe("#9333EA");
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe("Full Lifecycle Integration", () => {
    it("should complete full activate -> update -> deactivate cycle", () => {
      // 1. Initial state
      expect(mockGameState.timeScale).toBe(1.0);

      // 2. Activate
      const activateResult = powerUp.applyEffect(mockContext);
      expect(activateResult.success).toBe(true);
      expect(mockGameState.timeScale).toBe(0.5);

      // 3. Update multiple frames
      for (let i = 0; i < 10; i++) {
        powerUp.onUpdate(mockContext, 16.67);
        expect(mockGameState.timeScale).toBe(0.5);
      }

      // 4. Deactivate
      const deactivateResult = powerUp.removeEffect(mockContext);
      expect(deactivateResult.success).toBe(true);
      expect(mockGameState.timeScale).toBe(1.0);
    });

    it("should emit correct sequence of events", () => {
      const events: Array<{ event: string; data: any }> = [];

      mockEventBus.on("slowmotion:transition", (data) => {
        events.push({ event: "slowmotion:transition", data });
      });

      // Apply and remove
      powerUp.applyEffect(mockContext);
      powerUp.removeEffect(mockContext);

      // Should have 2 transition events
      expect(events).toHaveLength(2);
      expect(events[0].data).toEqual({ from: 1.0, to: 0.5, duration: 500 });
      expect(events[1].data).toEqual({ from: 0.5, to: 1.0, duration: 500 });
    });
  });

  // ============================================================================
  // Edge Cases and Error Handling
  // ============================================================================

  describe("Edge Cases", () => {
    it("should handle rapid apply/remove cycles", () => {
      for (let i = 0; i < 5; i++) {
        powerUp.applyEffect(mockContext);
        expect(mockGameState.timeScale).toBe(0.5);

        powerUp.removeEffect(mockContext);
        expect(mockGameState.timeScale).toBe(1.0);
      }
    });

    it("should handle null context gracefully", () => {
      const nullContext = null as any;

      // Should not throw, but should fail validation
      const result = powerUp.applyEffect(nullContext);
      expect(result.success).toBe(false);
    });

    it("should handle context with missing gameEntities", () => {
      const invalidContext = {
        ...mockContext,
        gameEntities: undefined,
      } as any;

      // Should fail validation
      const result = powerUp.applyEffect(invalidContext);
      expect(result.success).toBe(false);
    });
  });
});
