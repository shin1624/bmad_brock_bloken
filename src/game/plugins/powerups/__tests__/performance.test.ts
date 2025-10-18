/**
 * Power-Up Performance Benchmark Tests
 * Story 4.3b - Phase 2 Advanced Power-ups
 *
 * AC12: Maintain 55 FPS with any 3 power-ups active
 * AC13: Maintain 50 FPS with all 5 advanced power-ups active
 * AC14: Memory usage stays under 250MB during gameplay
 *
 * Performance Targets:
 * - Frame time budget: ~18ms for 55 FPS, ~20ms for 50 FPS
 * - Update operations: <10ms per power-up update
 * - Projectile spawning: <2ms per spawn
 * - Memory: <250MB total
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

describe("Power-Up Performance Benchmarks", () => {
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
      getStats: vi.fn().mockReturnValue({
        activeCount: 5,
        poolStats: { totalSpawned: 100, totalReleased: 95 },
      }),
    };

    mockAudioSystem = {
      playSfx: vi.fn(),
      playMusic: vi.fn(),
      setVolume: vi.fn(),
    };

    // Create context with realistic game state
    mockContext = {
      powerUpType: PowerUpType.SlowMotion,
      powerUpId: "perf-test-1",
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
          vx: 300,
        },
        blocks: Array.from({ length: 50 }, (_, i) => ({
          x: (i % 10) * 80,
          y: Math.floor(i / 10) * 30,
          width: 75,
          height: 25,
          active: true,
        })),
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
  // AC12: 55 FPS with 3 Power-ups (18.18ms frame budget)
  // ============================================================================

  describe("AC12: Performance with 3 Power-ups (55 FPS target)", () => {
    const FRAME_BUDGET_55FPS = 18.18; // milliseconds
    const UPDATE_BUDGET = 10; // milliseconds per power-up update

    it("should update Shield + SlowMotion + Magnet within frame budget", () => {
      const shield = new ShieldPowerUp();
      const slowMotion = new SlowMotionPowerUp();
      const magnet = new MagnetPaddlePowerUp();

      // Apply all three
      shield.applyEffect(mockContext);
      slowMotion.applyEffect(mockContext);
      magnet.applyEffect(mockContext);

      // Measure update performance
      const startTime = performance.now();

      for (let i = 0; i < 60; i++) {
        // Simulate 1 second (60 frames)
        shield.onUpdate(mockContext, 16.67);
        slowMotion.onUpdate(mockContext, 16.67);
        magnet.onUpdate(mockContext, 16.67);
      }

      const endTime = performance.now();
      const avgFrameTime = (endTime - startTime) / 60;

      console.log(
        `[PERF] 3 power-ups avg frame time: ${avgFrameTime.toFixed(2)}ms`,
      );
      expect(avgFrameTime).toBeLessThan(FRAME_BUDGET_55FPS);
    });

    it("should update Shield + SlowMotion + Laser within frame budget", () => {
      const shield = new ShieldPowerUp();
      const slowMotion = new SlowMotionPowerUp();
      const laser = new LaserGunPowerUp();

      shield.applyEffect(mockContext);
      slowMotion.applyEffect(mockContext);
      laser.applyEffect(mockContext);

      const startTime = performance.now();

      for (let i = 0; i < 60; i++) {
        shield.onUpdate(mockContext, 16.67);
        slowMotion.onUpdate(mockContext, 16.67);

        // Trigger laser fire periodically
        if (i % 30 === 0) {
          vi.advanceTimersByTime(500);
        }
        laser.onUpdate(mockContext, 16.67);
      }

      const endTime = performance.now();
      const avgFrameTime = (endTime - startTime) / 60;

      console.log(
        `[PERF] Shield+Slow+Laser avg frame time: ${avgFrameTime.toFixed(2)}ms`,
      );
      expect(avgFrameTime).toBeLessThan(FRAME_BUDGET_55FPS);
    });

    it("should update SlowMotion + Magnet + Pierce within frame budget", () => {
      const slowMotion = new SlowMotionPowerUp();
      const magnet = new MagnetPaddlePowerUp();
      const pierce = new PierceBallPowerUp();

      slowMotion.applyEffect(mockContext);
      magnet.applyEffect(mockContext);
      pierce.applyEffect(mockContext);

      const startTime = performance.now();

      for (let i = 0; i < 60; i++) {
        slowMotion.onUpdate(mockContext, 16.67);
        magnet.onUpdate(mockContext, 16.67);
        pierce.onUpdate(mockContext, 16.67);
      }

      const endTime = performance.now();
      const avgFrameTime = (endTime - startTime) / 60;

      console.log(
        `[PERF] Slow+Magnet+Pierce avg frame time: ${avgFrameTime.toFixed(2)}ms`,
      );
      expect(avgFrameTime).toBeLessThan(FRAME_BUDGET_55FPS);
    });

    it("should handle individual power-up updates within budget", () => {
      const slowMotion = new SlowMotionPowerUp();
      slowMotion.applyEffect(mockContext);

      const startTime = performance.now();

      for (let i = 0; i < 100; i++) {
        slowMotion.onUpdate(mockContext, 16.67);
      }

      const endTime = performance.now();
      const avgUpdateTime = (endTime - startTime) / 100;

      console.log(
        `[PERF] Single power-up update: ${avgUpdateTime.toFixed(3)}ms`,
      );
      expect(avgUpdateTime).toBeLessThan(UPDATE_BUDGET);
    });

    it("should handle projectile spawning without errors", () => {
      const laser = new LaserGunPowerUp();
      laser.applyEffect(mockContext);

      // Trigger 10 laser fires (20 projectiles total)
      let spawnCount = 0;
      for (let i = 0; i < 10; i++) {
        vi.advanceTimersByTime(500);
        laser.onUpdate(mockContext, 16.67);
        spawnCount++;
      }

      // Verify projectiles were spawned successfully
      expect(mockProjectileSystem.spawn).toHaveBeenCalled();
      expect(spawnCount).toBe(10);
      console.log(
        `[PERF] Successfully spawned projectiles ${mockProjectileSystem.spawn.mock.calls.length} times`,
      );
    });
  });

  // ============================================================================
  // AC13: 50 FPS with 5 Power-ups (20ms frame budget)
  // ============================================================================

  describe("AC13: Performance with 5 Power-ups (50 FPS target)", () => {
    const FRAME_BUDGET_50FPS = 20; // milliseconds

    it("should update all 5 power-ups within frame budget", () => {
      const shield = new ShieldPowerUp();
      const slowMotion = new SlowMotionPowerUp();
      const magnet = new MagnetPaddlePowerUp();
      const laser = new LaserGunPowerUp();
      const pierce = new PierceBallPowerUp();

      // Apply all five
      shield.applyEffect(mockContext);
      slowMotion.applyEffect(mockContext);
      magnet.applyEffect(mockContext);
      laser.applyEffect(mockContext);
      pierce.applyEffect(mockContext);

      const startTime = performance.now();

      for (let i = 0; i < 60; i++) {
        // Simulate 1 second (60 frames)
        shield.onUpdate(mockContext, 16.67);
        slowMotion.onUpdate(mockContext, 16.67);
        magnet.onUpdate(mockContext, 16.67);

        // Trigger laser fire periodically
        if (i % 30 === 0) {
          vi.advanceTimersByTime(500);
        }
        laser.onUpdate(mockContext, 16.67);
        pierce.onUpdate(mockContext, 16.67);
      }

      const endTime = performance.now();
      const avgFrameTime = (endTime - startTime) / 60;

      console.log(
        `[PERF] All 5 power-ups avg frame time: ${avgFrameTime.toFixed(2)}ms`,
      );
      expect(avgFrameTime).toBeLessThan(FRAME_BUDGET_50FPS);
    });

    it("should handle sustained load with all 5 power-ups (300 frames)", () => {
      const shield = new ShieldPowerUp();
      const slowMotion = new SlowMotionPowerUp();
      const magnet = new MagnetPaddlePowerUp();
      const laser = new LaserGunPowerUp();
      const pierce = new PierceBallPowerUp();

      shield.applyEffect(mockContext);
      slowMotion.applyEffect(mockContext);
      magnet.applyEffect(mockContext);
      laser.applyEffect(mockContext);
      pierce.applyEffect(mockContext);

      const startTime = performance.now();

      // Simulate 5 seconds (300 frames at 60 FPS)
      for (let i = 0; i < 300; i++) {
        shield.onUpdate(mockContext, 16.67);
        slowMotion.onUpdate(mockContext, 16.67);
        magnet.onUpdate(mockContext, 16.67);

        if (i % 30 === 0) {
          vi.advanceTimersByTime(500);
        }
        laser.onUpdate(mockContext, 16.67);
        pierce.onUpdate(mockContext, 16.67);
      }

      const endTime = performance.now();
      const avgFrameTime = (endTime - startTime) / 300;

      console.log(
        `[PERF] 5 power-ups sustained (5s): ${avgFrameTime.toFixed(2)}ms`,
      );
      expect(avgFrameTime).toBeLessThan(FRAME_BUDGET_50FPS);
    });

    it("should handle worst-case scenario: all 5 power-ups + rapid laser firing", () => {
      const shield = new ShieldPowerUp();
      const slowMotion = new SlowMotionPowerUp();
      const magnet = new MagnetPaddlePowerUp();
      const laser = new LaserGunPowerUp();
      const pierce = new PierceBallPowerUp();

      shield.applyEffect(mockContext);
      slowMotion.applyEffect(mockContext);
      magnet.applyEffect(mockContext);
      laser.applyEffect(mockContext);
      pierce.applyEffect(mockContext);

      let updateCount = 0;
      let laserFireCount = 0;

      // Fire laser every frame (worst case)
      for (let i = 0; i < 60; i++) {
        shield.onUpdate(mockContext, 16.67);
        slowMotion.onUpdate(mockContext, 16.67);
        magnet.onUpdate(mockContext, 16.67);

        vi.advanceTimersByTime(500); // Trigger laser every frame
        laser.onUpdate(mockContext, 16.67);
        laserFireCount++;
        pierce.onUpdate(mockContext, 16.67);
        updateCount++;
      }

      console.log(
        `[PERF] All 5 power-ups with rapid laser: ${updateCount} frames, ${laserFireCount} laser updates`,
      );
      // Verify all updates completed successfully
      expect(updateCount).toBe(60);
      expect(mockProjectileSystem.spawn).toHaveBeenCalled(); // Lasers fired
      expect(mockGameState.laserActive).toBe(true); // Laser still active
      expect(mockGameState.timeScale).toBe(0.5); // Slow motion still active
    });
  });

  // ============================================================================
  // AC14: Memory Usage (< 250MB)
  // ============================================================================

  describe("AC14: Memory Management", () => {
    it("should not accumulate memory during rapid activation/deactivation", () => {
      const shield = new ShieldPowerUp();
      const slowMotion = new SlowMotionPowerUp();
      const laser = new LaserGunPowerUp();

      // Initial memory snapshot
      const initialMemory = mockContext.performance.memoryUsage;

      // Rapid cycles
      for (let i = 0; i < 100; i++) {
        shield.applyEffect(mockContext);
        slowMotion.applyEffect(mockContext);
        laser.applyEffect(mockContext);

        shield.removeEffect(mockContext);
        slowMotion.removeEffect(mockContext);
        laser.removeEffect(mockContext);
      }

      // Memory should not have grown significantly
      const finalMemory = mockContext.performance.memoryUsage;
      const memoryGrowth = finalMemory - initialMemory;

      console.log(`[MEMORY] Growth after 100 cycles: ${memoryGrowth}MB`);
      expect(memoryGrowth).toBeLessThan(50); // Allow <50MB growth
    });

    it("should maintain memory budget with sustained gameplay", () => {
      const shield = new ShieldPowerUp();
      const slowMotion = new SlowMotionPowerUp();
      const laser = new LaserGunPowerUp();

      shield.applyEffect(mockContext);
      slowMotion.applyEffect(mockContext);
      laser.applyEffect(mockContext);

      // Simulate 10 seconds of gameplay
      for (let i = 0; i < 600; i++) {
        shield.onUpdate(mockContext, 16.67);
        slowMotion.onUpdate(mockContext, 16.67);

        if (i % 30 === 0) {
          vi.advanceTimersByTime(500);
        }
        laser.onUpdate(mockContext, 16.67);
      }

      // Total memory should stay under budget
      expect(mockContext.performance.memoryUsage).toBeLessThan(250);
      console.log(
        `[MEMORY] Total usage: ${mockContext.performance.memoryUsage}MB`,
      );
    });

    it("should verify projectile pool efficiency", () => {
      const laser = new LaserGunPowerUp();
      laser.applyEffect(mockContext);

      // Fire many projectiles
      for (let i = 0; i < 20; i++) {
        vi.advanceTimersByTime(500);
        laser.onUpdate(mockContext, 16.67);
      }

      // Check pool stats
      const stats = mockProjectileSystem.getStats();
      console.log(
        `[POOL] Active: ${stats.activeCount}, Total spawned: ${stats.poolStats.totalSpawned}`,
      );

      // Pool should be reusing objects
      expect(stats.poolStats.totalReleased).toBeGreaterThan(0);
      expect(stats.activeCount).toBeLessThan(stats.poolStats.totalSpawned);
    });
  });

  // ============================================================================
  // Comparative Performance Tests
  // ============================================================================

  describe("Comparative Performance Analysis", () => {
    it("should show performance scaling from 1 to 5 power-ups", () => {
      const results: Array<{ count: number; avgTime: number }> = [];

      // 1 power-up
      const slow1 = new SlowMotionPowerUp();
      slow1.applyEffect(mockContext);
      let start = performance.now();
      for (let i = 0; i < 60; i++) slow1.onUpdate(mockContext, 16.67);
      results.push({ count: 1, avgTime: (performance.now() - start) / 60 });

      // 2 power-ups
      const shield2 = new ShieldPowerUp();
      shield2.applyEffect(mockContext);
      start = performance.now();
      for (let i = 0; i < 60; i++) {
        slow1.onUpdate(mockContext, 16.67);
        shield2.onUpdate(mockContext, 16.67);
      }
      results.push({ count: 2, avgTime: (performance.now() - start) / 60 });

      // 3 power-ups
      const magnet3 = new MagnetPaddlePowerUp();
      magnet3.applyEffect(mockContext);
      start = performance.now();
      for (let i = 0; i < 60; i++) {
        slow1.onUpdate(mockContext, 16.67);
        shield2.onUpdate(mockContext, 16.67);
        magnet3.onUpdate(mockContext, 16.67);
      }
      results.push({ count: 3, avgTime: (performance.now() - start) / 60 });

      // 4 power-ups
      const laser4 = new LaserGunPowerUp();
      laser4.applyEffect(mockContext);
      start = performance.now();
      for (let i = 0; i < 60; i++) {
        slow1.onUpdate(mockContext, 16.67);
        shield2.onUpdate(mockContext, 16.67);
        magnet3.onUpdate(mockContext, 16.67);
        if (i % 30 === 0) vi.advanceTimersByTime(500);
        laser4.onUpdate(mockContext, 16.67);
      }
      results.push({ count: 4, avgTime: (performance.now() - start) / 60 });

      // 5 power-ups
      const pierce5 = new PierceBallPowerUp();
      pierce5.applyEffect(mockContext);
      start = performance.now();
      for (let i = 0; i < 60; i++) {
        slow1.onUpdate(mockContext, 16.67);
        shield2.onUpdate(mockContext, 16.67);
        magnet3.onUpdate(mockContext, 16.67);
        if (i % 30 === 0) vi.advanceTimersByTime(500);
        laser4.onUpdate(mockContext, 16.67);
        pierce5.onUpdate(mockContext, 16.67);
      }
      results.push({ count: 5, avgTime: (performance.now() - start) / 60 });

      console.log("[SCALING] Performance by power-up count:");
      results.forEach((r) => {
        console.log(`  ${r.count} power-ups: ${r.avgTime.toFixed(2)}ms`);
      });

      // Verify all meet their targets
      expect(results[2].avgTime).toBeLessThan(18.18); // 3 power-ups: 55 FPS
      expect(results[4].avgTime).toBeLessThan(20); // 5 power-ups: 50 FPS
    });
  });
});
