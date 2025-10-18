/**
 * LaserGunPowerUp Unit Tests
 * Story 4.3b - Phase 2 Advanced Power-ups
 *
 * Test Coverage:
 * - Constructor and initialization
 * - Effect application (laserActive = true)
 * - Effect removal (laserActive = false)
 * - Fire rate (2 shots per second = 500ms interval)
 * - Duration (20 seconds)
 * - Projectile spawning from paddle edges
 * - Update lifecycle and firing logic
 * - ProjectileSystem integration
 * - AudioSystem integration
 * - EventBus integration (laser:fired events)
 * - Priority system (priority: 6)
 * - Edge cases and error handling
 */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { LaserGunPowerUp } from "../LaserGunPowerUp";
import { PowerUpPluginContext } from "../../PowerUpPlugin";
import { PowerUpType } from "../../../entities/PowerUp";
import { ProjectileType } from "../../../entities/Projectile";
import { EventBus } from "../../../core/EventBus";
import type { GameState } from "../../../core/GameState";

describe("LaserGunPowerUp", () => {
  let powerUp: LaserGunPowerUp;
  let mockContext: PowerUpPluginContext;
  let mockGameState: GameState;
  let mockEventBus: EventBus;
  let mockProjectileSystem: any;
  let mockAudioSystem: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Use fake timers for Date.now() control
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));

    // Create mock GameState
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

    // Create mock ProjectileSystem with spawn method
    mockProjectileSystem = {
      spawn: vi.fn().mockReturnValue({
        id: "projectile-1",
        type: ProjectileType.LASER,
        active: true,
      }),
      update: vi.fn(),
      render: vi.fn(),
      clear: vi.fn(),
    };

    // Create mock AudioSystem
    mockAudioSystem = {
      playSfx: vi.fn(),
      playMusic: vi.fn(),
      setVolume: vi.fn(),
    };

    // Create mock context
    mockContext = {
      powerUpType: PowerUpType.Laser,
      powerUpId: "laser-gun-1",
      effectData: { duration: 20000 },
      gameEntities: {
        balls: [
          { x: 400, y: 300, vx: 200, vy: -200, radius: 8, active: true },
        ],
        paddle: {
          position: { x: 400, y: 550 },
          size: { width: 100, height: 15 },
          vx: 0,
        },
        blocks: [],
        powerUps: [],
        particles: [],
      },
      gameState: mockGameState,
      eventBus: mockEventBus,
      projectileSystem: mockProjectileSystem,
      audioSystem: mockAudioSystem,
      performance: { fps: 60, frameTime: 16.67, memoryUsage: 50 },
    };

    // Create PowerUp instance
    powerUp = new LaserGunPowerUp();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ============================================================================
  // Constructor and Initialization Tests
  // ============================================================================

  describe("Constructor", () => {
    it("should initialize with correct name and version", () => {
      expect(powerUp.name).toBe("LaserGunPowerUp");
      expect(powerUp.version).toBe("1.0.0");
    });

    it("should set correct PowerUpType", () => {
      expect(powerUp.powerUpType).toBe(PowerUpType.Laser);
    });

    it("should have correct priority (6)", () => {
      expect(powerUp.effect.priority).toBe(6);
    });

    it("should not be stackable", () => {
      expect(powerUp.effect.stackable).toBe(false);
    });

    it("should have no conflicts", () => {
      expect(powerUp.effect.conflictsWith).toEqual([]);
    });

    it("should have description", () => {
      expect(powerUp.description).toContain("laser projectiles");
      expect(powerUp.description).toContain("2 shots/second");
      expect(powerUp.description).toContain("20 seconds");
    });
  });

  // ============================================================================
  // Effect Application Tests
  // ============================================================================

  describe("applyEffect()", () => {
    it("should set laserActive to true when activated", () => {
      const result = powerUp.applyEffect(mockContext);

      expect(result.success).toBe(true);
      expect(result.modified).toBe(true);
      expect(mockGameState.laserActive).toBe(true);
    });

    it("should return effect data with fireRate, duration, and damage", () => {
      const result = powerUp.applyEffect(mockContext);

      expect(result.data).toBeDefined();
      expect(result.data?.fireRate).toBe(500); // 2 shots per second
      expect(result.data?.duration).toBe(20000); // 20 seconds
      expect(result.data?.damage).toBe(1); // instant block destruction
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
  });

  // ============================================================================
  // Effect Removal Tests
  // ============================================================================

  describe("removeEffect()", () => {
    beforeEach(() => {
      // Apply effect first
      powerUp.applyEffect(mockContext);
      expect(mockGameState.laserActive).toBe(true);
    });

    it("should set laserActive to false when deactivated", () => {
      const result = powerUp.removeEffect(mockContext);

      expect(result.success).toBe(true);
      expect(result.modified).toBe(true);
      expect(mockGameState.laserActive).toBe(false);
    });

    it("should return effect data with laserActive status", () => {
      const result = powerUp.removeEffect(mockContext);

      expect(result.data).toBeDefined();
      expect(result.data?.laserActive).toBe(false);
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
  // Update and Firing Tests
  // ============================================================================

  describe("onUpdate() - Firing Logic", () => {
    beforeEach(() => {
      powerUp.applyEffect(mockContext);
    });

    it("should not fire lasers before fire rate interval (500ms)", () => {
      // Advance time by 400ms (not enough)
      vi.advanceTimersByTime(400);
      powerUp.onUpdate(mockContext, 16.67);

      expect(mockProjectileSystem.spawn).not.toHaveBeenCalled();
    });

    it("should fire lasers after fire rate interval (500ms)", () => {
      // Advance time by 500ms (exactly)
      vi.advanceTimersByTime(500);
      powerUp.onUpdate(mockContext, 16.67);

      // Should fire 2 projectiles (left and right)
      expect(mockProjectileSystem.spawn).toHaveBeenCalledTimes(2);
    });

    it("should fire at correct rate (2 shots per second)", () => {
      // Fire at t=500ms
      vi.advanceTimersByTime(500);
      powerUp.onUpdate(mockContext, 16.67);
      expect(mockProjectileSystem.spawn).toHaveBeenCalledTimes(2);

      // Fire at t=1000ms
      vi.advanceTimersByTime(500);
      powerUp.onUpdate(mockContext, 16.67);
      expect(mockProjectileSystem.spawn).toHaveBeenCalledTimes(4);

      // Fire at t=1500ms
      vi.advanceTimersByTime(500);
      powerUp.onUpdate(mockContext, 16.67);
      expect(mockProjectileSystem.spawn).toHaveBeenCalledTimes(6);
    });

    it("should spawn projectiles from paddle left edge", () => {
      vi.advanceTimersByTime(500);
      powerUp.onUpdate(mockContext, 16.67);

      const leftCall = mockProjectileSystem.spawn.mock.calls[0][0];
      expect(leftCall.type).toBe(ProjectileType.LASER);
      expect(leftCall.position.x).toBe(350); // 400 - 100/2 = 350
      expect(leftCall.position.y).toBe(550);
      expect(leftCall.velocity.x).toBe(0);
      expect(leftCall.velocity.y).toBe(-500); // Upward
    });

    it("should spawn projectiles from paddle right edge", () => {
      vi.advanceTimersByTime(500);
      powerUp.onUpdate(mockContext, 16.67);

      const rightCall = mockProjectileSystem.spawn.mock.calls[1][0];
      expect(rightCall.type).toBe(ProjectileType.LASER);
      expect(rightCall.position.x).toBe(450); // 400 + 100/2 = 450
      expect(rightCall.position.y).toBe(550);
      expect(rightCall.velocity.x).toBe(0);
      expect(rightCall.velocity.y).toBe(-500); // Upward
    });

    it("should set correct projectile properties", () => {
      vi.advanceTimersByTime(500);
      powerUp.onUpdate(mockContext, 16.67);

      const projectileConfig = mockProjectileSystem.spawn.mock.calls[0][0];
      expect(projectileConfig.damage).toBe(1);
      expect(projectileConfig.size).toEqual({ width: 4, height: 12 });
      expect(projectileConfig.color).toBe("#FF0000");
      expect(projectileConfig.glowColor).toBe("#FF4444");
    });

    it("should not fire when inactive", () => {
      powerUp.removeEffect(mockContext);

      vi.advanceTimersByTime(500);
      powerUp.onUpdate(mockContext, 16.67);

      expect(mockProjectileSystem.spawn).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe("Integration with Systems", () => {
    beforeEach(() => {
      powerUp.applyEffect(mockContext);
    });

    it("should play laser sound when firing", () => {
      vi.advanceTimersByTime(500);
      powerUp.onUpdate(mockContext, 16.67);

      expect(mockAudioSystem.playSfx).toHaveBeenCalledWith("laser_shot", 0.3);
    });

    it("should emit laser:fired event when firing", () => {
      const laserFiredHandler = vi.fn();
      mockEventBus.on("laser:fired", laserFiredHandler);

      vi.advanceTimersByTime(500);
      powerUp.onUpdate(mockContext, 16.67);

      expect(laserFiredHandler).toHaveBeenCalledWith({
        position: { x: 400, y: 550 },
        projectileCount: 2,
      });
    });

    it("should handle missing paddle gracefully", () => {
      const contextWithoutPaddle = {
        ...mockContext,
        gameEntities: {
          ...mockContext.gameEntities,
          paddle: undefined,
        },
      };

      vi.advanceTimersByTime(500);
      powerUp.onUpdate(contextWithoutPaddle, 16.67);

      expect(mockProjectileSystem.spawn).not.toHaveBeenCalled();
    });

    it("should handle missing projectileSystem gracefully", () => {
      const contextWithoutProjectileSystem = {
        ...mockContext,
        projectileSystem: undefined,
      };

      vi.advanceTimersByTime(500);
      powerUp.onUpdate(contextWithoutProjectileSystem, 16.67);

      // Should not throw
      expect(() => {
        powerUp.onUpdate(contextWithoutProjectileSystem, 16.67);
      }).not.toThrow();
    });

    it("should handle partial projectile spawning (pool exhaustion)", () => {
      // Simulate pool exhaustion - only left projectile spawns
      mockProjectileSystem.spawn
        .mockReturnValueOnce({ id: "proj-1", active: true })
        .mockReturnValueOnce(null);

      const laserFiredHandler = vi.fn();
      mockEventBus.on("laser:fired", laserFiredHandler);

      vi.advanceTimersByTime(500);
      powerUp.onUpdate(mockContext, 16.67);

      // Should still emit event with projectileCount: 1
      expect(laserFiredHandler).toHaveBeenCalledWith({
        position: { x: 400, y: 550 },
        projectileCount: 1,
      });
    });
  });

  // ============================================================================
  // Metadata Tests
  // ============================================================================

  describe("Metadata", () => {
    it("should have correct rarity (epic)", () => {
      const rarity = (powerUp as any).getRarity();
      expect(rarity).toBe("epic");
    });

    it("should have correct duration (20000ms)", () => {
      const duration = (powerUp as any).getDuration();
      expect(duration).toBe(20000);
    });

    it("should have correct icon (🔫)", () => {
      const icon = (powerUp as any).getIcon();
      expect(icon).toBe("🔫");
    });

    it("should have correct color (red #EF4444)", () => {
      const color = (powerUp as any).getColor();
      expect(color).toBe("#EF4444");
    });
  });

  // ============================================================================
  // Edge Cases and Error Handling
  // ============================================================================

  describe("Edge Cases", () => {
    it("should handle rapid apply/remove cycles", () => {
      for (let i = 0; i < 3; i++) {
        powerUp.applyEffect(mockContext);
        expect(mockGameState.laserActive).toBe(true);

        powerUp.removeEffect(mockContext);
        expect(mockGameState.laserActive).toBe(false);
      }
    });

    it("should not fire when both paddle and projectileSystem are missing", () => {
      powerUp.applyEffect(mockContext);

      const invalidContext = {
        ...mockContext,
        gameEntities: { ...mockContext.gameEntities, paddle: undefined },
        projectileSystem: undefined,
      };

      vi.advanceTimersByTime(500);
      powerUp.onUpdate(invalidContext, 16.67);

      expect(mockProjectileSystem.spawn).not.toHaveBeenCalled();
    });

    it("should handle null context gracefully", () => {
      const nullContext = null as any;

      const result = powerUp.applyEffect(nullContext);
      expect(result.success).toBe(false);
    });
  });
});
