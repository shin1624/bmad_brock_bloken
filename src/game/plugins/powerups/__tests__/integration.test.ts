/**
 * Power-Up Integration Tests
 * Story 4.3b - Phase 2 Advanced Power-ups
 *
 * High-Risk Combination Testing (AC10):
 * 1. SlowMotion + MultiBall - Time scaling with multiple balls
 * 2. Laser + MultiBall - Projectile firing with multiple balls
 * 3. SlowMotion + Laser - Time scaling with rapid projectile spawning
 * 4. All 5 Advanced Power-ups - Complete system stress test
 *
 * Verification Points:
 * - No conflicts between power-ups
 * - Priority system works correctly
 * - Performance remains acceptable
 * - State management is consistent
 * - No memory leaks or resource exhaustion
 */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { SlowMotionPowerUp } from "../SlowMotionPowerUp";
import { LaserGunPowerUp } from "../LaserGunPowerUp";
import { MagnetPaddlePowerUp } from "../MagnetPaddlePowerUp";
import { ShieldPowerUp } from "../ShieldPowerUp";
import { PierceBallPowerUp } from "../PierceBallPowerUp";
import { PowerUpPluginContext } from "../../PowerUpPlugin";
import { PowerUpType } from "../../../entities/PowerUp";
import { ProjectileType } from "../../../entities/Projectile";
import { EventBus } from "../../../core/EventBus";
import type { GameState } from "../../../core/GameState";

describe("Power-Up Integration Tests", () => {
  let mockContext: PowerUpPluginContext;
  let mockGameState: GameState;
  let mockEventBus: EventBus;
  let mockProjectileSystem: any;
  let mockAudioSystem: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));

    // Create comprehensive mock GameState
    mockGameState = {
      timeScale: 1.0,
      score: 0,
      lives: 3,
      level: 1,
      isPaused: false,
      isGameOver: false,
      ballAttached: false,
      laserActive: false,
      shieldActive: false,
      magnetActive: false,
      pierceActive: false,
    } as GameState;

    mockEventBus = new EventBus();

    mockProjectileSystem = {
      spawn: vi.fn().mockReturnValue({
        id: `projectile-${Date.now()}`,
        type: ProjectileType.LASER,
        active: true,
      }),
      update: vi.fn(),
      render: vi.fn(),
      clear: vi.fn(),
      getStats: vi.fn().mockReturnValue({ activeCount: 0, poolStats: {} }),
    };

    mockAudioSystem = {
      playSfx: vi.fn(),
      playMusic: vi.fn(),
      setVolume: vi.fn(),
    };

    // Create context with multiple balls for MultiBall scenarios
    mockContext = {
      powerUpType: PowerUpType.SlowMotion,
      powerUpId: "integration-test-1",
      effectData: { duration: 10000 },
      gameEntities: {
        balls: [
          { x: 400, y: 300, vx: 200, vy: -200, radius: 8, active: true },
          { x: 350, y: 250, vx: -180, vy: 180, radius: 8, active: true },
          { x: 450, y: 350, vx: 150, vy: -150, radius: 8, active: true },
        ],
        paddle: {
          position: { x: 400, y: 550 },
          size: { width: 100, height: 15 },
          vx: 0,
        },
        blocks: [
          { x: 100, y: 50, width: 75, height: 25, active: true },
          { x: 200, y: 50, width: 75, height: 25, active: true },
        ],
        powerUps: [],
        particles: [],
      },
      gameState: mockGameState,
      eventBus: mockEventBus,
      projectileSystem: mockProjectileSystem,
      audioSystem: mockAudioSystem,
      performance: { fps: 60, frameTime: 16.67, memoryUsage: 50 },
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ============================================================================
  // Test 1: SlowMotion + MultiBall (HIGH RISK)
  // ============================================================================

  describe("HIGH RISK: SlowMotion + MultiBall", () => {
    it("should apply time scale without affecting ball count", () => {
      const slowMotion = new SlowMotionPowerUp();

      // Verify initial state
      expect(mockGameState.timeScale).toBe(1.0);
      expect(mockContext.gameEntities.balls).toHaveLength(3);

      // Apply slow motion
      const result = slowMotion.applyEffect(mockContext);

      expect(result.success).toBe(true);
      expect(mockGameState.timeScale).toBe(0.5);
      expect(mockContext.gameEntities.balls).toHaveLength(3); // Ball count unchanged
    });

    it("should maintain time scale across multiple updates with multiple balls", () => {
      const slowMotion = new SlowMotionPowerUp();
      slowMotion.applyEffect(mockContext);

      // Simulate 10 frames with multiple balls
      for (let i = 0; i < 10; i++) {
        slowMotion.onUpdate(mockContext, 16.67);
        expect(mockGameState.timeScale).toBe(0.5);
      }
    });

    it("should emit transition events correctly with multiple balls", () => {
      const slowMotion = new SlowMotionPowerUp();
      const transitionEvents: any[] = [];

      mockEventBus.on("slowmotion:transition", (data) => {
        transitionEvents.push(data);
      });

      slowMotion.applyEffect(mockContext);
      slowMotion.removeEffect(mockContext);

      expect(transitionEvents).toHaveLength(2);
      expect(transitionEvents[0]).toEqual({
        from: 1.0,
        to: 0.5,
        duration: 500,
      });
      expect(transitionEvents[1]).toEqual({
        from: 0.5,
        to: 1.0,
        duration: 500,
      });
    });

    it("should restore normal time scale when deactivated", () => {
      const slowMotion = new SlowMotionPowerUp();

      slowMotion.applyEffect(mockContext);
      expect(mockGameState.timeScale).toBe(0.5);

      slowMotion.removeEffect(mockContext);
      expect(mockGameState.timeScale).toBe(1.0);
    });
  });

  // ============================================================================
  // Test 2: Laser + MultiBall (HIGH RISK)
  // ============================================================================

  describe("HIGH RISK: Laser + MultiBall", () => {
    it("should fire lasers independently of ball count", () => {
      const laser = new LaserGunPowerUp();
      laser.applyEffect(mockContext);

      // Advance time to trigger laser fire
      vi.advanceTimersByTime(500);
      laser.onUpdate(mockContext, 16.67);

      // Should fire 2 projectiles (left and right edges) regardless of ball count
      expect(mockProjectileSystem.spawn).toHaveBeenCalledTimes(2);
    });

    it("should maintain fire rate with multiple balls in motion", () => {
      const laser = new LaserGunPowerUp();
      laser.applyEffect(mockContext);

      // Fire 3 times over 1.5 seconds
      for (let i = 0; i < 3; i++) {
        vi.advanceTimersByTime(500);
        laser.onUpdate(mockContext, 16.67);
      }

      // Should have fired 6 projectiles total (2 per fire × 3 fires)
      expect(mockProjectileSystem.spawn).toHaveBeenCalledTimes(6);
    });

    it("should emit laser:fired events correctly with multiple balls", () => {
      const laser = new LaserGunPowerUp();
      const laserEvents: any[] = [];

      mockEventBus.on("laser:fired", (data) => {
        laserEvents.push(data);
      });

      laser.applyEffect(mockContext);

      vi.advanceTimersByTime(500);
      laser.onUpdate(mockContext, 16.67);

      expect(laserEvents).toHaveLength(1);
      expect(laserEvents[0]).toEqual({
        position: { x: 400, y: 550 },
        projectileCount: 2,
      });
    });

    it("should handle projectile pool exhaustion with multiple balls", () => {
      const laser = new LaserGunPowerUp();
      laser.applyEffect(mockContext);

      // Simulate pool exhaustion
      mockProjectileSystem.spawn.mockReturnValue(null);

      vi.advanceTimersByTime(500);
      laser.onUpdate(mockContext, 16.67);

      // Should attempt to spawn but handle null gracefully
      expect(mockProjectileSystem.spawn).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Test 3: SlowMotion + Laser
  // ============================================================================

  describe("SlowMotion + Laser Combination", () => {
    it("should apply both effects without conflicts", () => {
      const slowMotion = new SlowMotionPowerUp();
      const laser = new LaserGunPowerUp();

      slowMotion.applyEffect(mockContext);
      laser.applyEffect(mockContext);

      expect(mockGameState.timeScale).toBe(0.5);
      expect(mockGameState.laserActive).toBe(true);
    });

    it("should maintain laser fire rate during slow motion", () => {
      const slowMotion = new SlowMotionPowerUp();
      const laser = new LaserGunPowerUp();

      slowMotion.applyEffect(mockContext);
      laser.applyEffect(mockContext);

      // Fire twice during slow motion
      vi.advanceTimersByTime(500);
      laser.onUpdate(mockContext, 16.67);

      vi.advanceTimersByTime(500);
      laser.onUpdate(mockContext, 16.67);

      // Should fire 4 projectiles total (2 per fire × 2 fires)
      expect(mockProjectileSystem.spawn).toHaveBeenCalledTimes(4);
    });

    it("should verify time scale correction during laser updates", () => {
      const slowMotion = new SlowMotionPowerUp();
      const laser = new LaserGunPowerUp();

      slowMotion.applyEffect(mockContext);
      laser.applyEffect(mockContext);

      // Simulate time scale drift
      mockGameState.timeScale = 0.7;

      // Both updates should maintain correct state
      slowMotion.onUpdate(mockContext, 16.67);
      laser.onUpdate(mockContext, 16.67);

      expect(mockGameState.timeScale).toBe(0.5); // Corrected by slow motion
    });

    it("should deactivate both effects independently", () => {
      const slowMotion = new SlowMotionPowerUp();
      const laser = new LaserGunPowerUp();

      slowMotion.applyEffect(mockContext);
      laser.applyEffect(mockContext);

      // Remove slow motion first
      slowMotion.removeEffect(mockContext);
      expect(mockGameState.timeScale).toBe(1.0);
      expect(mockGameState.laserActive).toBe(true);

      // Remove laser
      laser.removeEffect(mockContext);
      expect(mockGameState.laserActive).toBe(false);
    });
  });

  // ============================================================================
  // Test 4: All 5 Advanced Power-ups (MAXIMUM STRESS TEST)
  // ============================================================================

  describe("All 5 Advanced Power-ups Simultaneously", () => {
    it("should apply all power-ups without conflicts", () => {
      const shield = new ShieldPowerUp();
      const slowMotion = new SlowMotionPowerUp();
      const magnet = new MagnetPaddlePowerUp();
      const laser = new LaserGunPowerUp();
      const pierce = new PierceBallPowerUp();

      // Apply all power-ups
      const shieldResult = shield.applyEffect(mockContext);
      const slowResult = slowMotion.applyEffect(mockContext);
      const magnetResult = magnet.applyEffect(mockContext);
      const laserResult = laser.applyEffect(mockContext);
      const pierceResult = pierce.applyEffect(mockContext);

      // All should succeed
      expect(shieldResult.success).toBe(true);
      expect(slowResult.success).toBe(true);
      expect(magnetResult.success).toBe(true);
      expect(laserResult.success).toBe(true);
      expect(pierceResult.success).toBe(true);

      // Verify all states are active
      expect(mockGameState.shieldActive).toBe(true);
      expect(mockGameState.timeScale).toBe(0.5);
      expect(mockGameState.magnetActive).toBe(true);
      expect(mockGameState.laserActive).toBe(true);
      expect(mockGameState.pierceActive).toBe(true);
    });

    it("should respect priority order (Shield > Slow > Magnet > Laser > Pierce)", () => {
      const shield = new ShieldPowerUp();
      const slowMotion = new SlowMotionPowerUp();
      const magnet = new MagnetPaddlePowerUp();
      const laser = new LaserGunPowerUp();
      const pierce = new PierceBallPowerUp();

      // Verify priority values
      expect(shield.effect.priority).toBe(10);
      expect(slowMotion.effect.priority).toBe(8);
      expect(magnet.effect.priority).toBe(7);
      expect(laser.effect.priority).toBe(6);
      expect(pierce.effect.priority).toBe(5);
    });

    it("should maintain all effects during simultaneous updates", () => {
      const shield = new ShieldPowerUp();
      const slowMotion = new SlowMotionPowerUp();
      const magnet = new MagnetPaddlePowerUp();
      const laser = new LaserGunPowerUp();
      const pierce = new PierceBallPowerUp();

      // Apply all
      shield.applyEffect(mockContext);
      slowMotion.applyEffect(mockContext);
      magnet.applyEffect(mockContext);
      laser.applyEffect(mockContext);
      pierce.applyEffect(mockContext);

      // Update all simultaneously for 5 frames
      for (let i = 0; i < 5; i++) {
        shield.onUpdate(mockContext, 16.67);
        slowMotion.onUpdate(mockContext, 16.67);
        magnet.onUpdate(mockContext, 16.67);
        laser.onUpdate(mockContext, 16.67);
        pierce.onUpdate(mockContext, 16.67);

        // Verify all states maintained
        expect(mockGameState.shieldActive).toBe(true);
        expect(mockGameState.timeScale).toBe(0.5);
        expect(mockGameState.magnetActive).toBe(true);
        expect(mockGameState.laserActive).toBe(true);
        expect(mockGameState.pierceActive).toBe(true);
      }
    });

    it("should handle laser firing with all other power-ups active", () => {
      const shield = new ShieldPowerUp();
      const slowMotion = new SlowMotionPowerUp();
      const magnet = new MagnetPaddlePowerUp();
      const laser = new LaserGunPowerUp();
      const pierce = new PierceBallPowerUp();

      // Apply all
      shield.applyEffect(mockContext);
      slowMotion.applyEffect(mockContext);
      magnet.applyEffect(mockContext);
      laser.applyEffect(mockContext);
      pierce.applyEffect(mockContext);

      // Trigger laser fire
      vi.advanceTimersByTime(500);
      laser.onUpdate(mockContext, 16.67);

      // Should fire projectiles normally
      expect(mockProjectileSystem.spawn).toHaveBeenCalledTimes(2);
    });

    it("should deactivate all power-ups cleanly", () => {
      const shield = new ShieldPowerUp();
      const slowMotion = new SlowMotionPowerUp();
      const magnet = new MagnetPaddlePowerUp();
      const laser = new LaserGunPowerUp();
      const pierce = new PierceBallPowerUp();

      // Apply all
      shield.applyEffect(mockContext);
      slowMotion.applyEffect(mockContext);
      magnet.applyEffect(mockContext);
      laser.applyEffect(mockContext);
      pierce.applyEffect(mockContext);

      // Remove all
      shield.removeEffect(mockContext);
      slowMotion.removeEffect(mockContext);
      magnet.removeEffect(mockContext);
      laser.removeEffect(mockContext);
      pierce.removeEffect(mockContext);

      // Verify all deactivated
      expect(mockGameState.shieldActive).toBe(false);
      expect(mockGameState.timeScale).toBe(1.0);
      expect(mockGameState.magnetActive).toBe(false);
      expect(mockGameState.laserActive).toBe(false);
      expect(mockGameState.pierceActive).toBe(false);
    });

    it("should handle projectile system stress with all power-ups", () => {
      const shield = new ShieldPowerUp();
      const slowMotion = new SlowMotionPowerUp();
      const magnet = new MagnetPaddlePowerUp();
      const laser = new LaserGunPowerUp();
      const pierce = new PierceBallPowerUp();

      // Apply all
      shield.applyEffect(mockContext);
      slowMotion.applyEffect(mockContext);
      magnet.applyEffect(mockContext);
      laser.applyEffect(mockContext);
      pierce.applyEffect(mockContext);

      // Fire lasers multiple times
      for (let i = 0; i < 5; i++) {
        vi.advanceTimersByTime(500);
        laser.onUpdate(mockContext, 16.67);
      }

      // Should have fired 10 projectiles total
      expect(mockProjectileSystem.spawn).toHaveBeenCalledTimes(10);
    });
  });

  // ============================================================================
  // Performance and Resource Tests
  // ============================================================================

  describe("Performance and Resource Management", () => {
    it("should not leak resources during rapid activation/deactivation", () => {
      const slowMotion = new SlowMotionPowerUp();
      const laser = new LaserGunPowerUp();

      // Rapid cycles
      for (let i = 0; i < 10; i++) {
        slowMotion.applyEffect(mockContext);
        laser.applyEffect(mockContext);

        slowMotion.removeEffect(mockContext);
        laser.removeEffect(mockContext);
      }

      // Final state should be clean
      expect(mockGameState.timeScale).toBe(1.0);
      expect(mockGameState.laserActive).toBe(false);
    });

    it("should maintain consistent state with multiple balls and projectiles", () => {
      const slowMotion = new SlowMotionPowerUp();
      const laser = new LaserGunPowerUp();

      slowMotion.applyEffect(mockContext);
      laser.applyEffect(mockContext);

      // Simulate 20 frames of updates
      for (let i = 0; i < 20; i++) {
        slowMotion.onUpdate(mockContext, 16.67);

        if (i % 5 === 0) {
          // Fire laser every 5 frames
          vi.advanceTimersByTime(500);
          laser.onUpdate(mockContext, 16.67);
        }
      }

      // State should remain consistent
      expect(mockGameState.timeScale).toBe(0.5);
      expect(mockGameState.laserActive).toBe(true);
    });
  });
});
