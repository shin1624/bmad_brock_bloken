/**
 * Performance Validation Tests
 * Story 4.1, Task 5: 60 FPS maintenance validation for power-up system
 * Ensures power-up system meets performance requirements
 */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { PowerUp, PowerUpType } from "../entities/PowerUp";
import { PluginManager } from "../plugins/PluginManager";
import { PowerUpSystem } from "../systems/PowerUpSystem";

// Performance test configuration
const PERFORMANCE_CONFIG = {
  TARGET_FPS: 60,
  FRAME_TIME_MS: 16.67, // 1000ms / 60fps
  MAX_FRAME_TIME_MS: 20, // Allow some variance
  TEST_DURATION_MS: 1000,
  MAX_POWERUPS: 50,
  ACCEPTABLE_FRAME_DROPS: 5, // Max frames that can exceed budget
};

describe("Power-Up System Performance", () => {
  let pluginManager: PluginManager;
  let powerUpSystem: PowerUpSystem;
  let mockGameState: unknown;
  let mockContext: CanvasRenderingContext2D;

  beforeEach(() => {
    pluginManager = new PluginManager({
      performanceMonitoring: true,
      maxExecutionTimePerFrame: 2,
    });

    powerUpSystem = new PowerUpSystem(pluginManager, {
      performanceMonitoring: true,
    });

    mockGameState = {
      balls: [],
      paddle: { x: 100, y: 500, width: 80, height: 10 },
      blocks: [],
      powerUps: [],
    };

    // Mock canvas context with performance tracking
    mockContext = {
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      roundRect: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn(() => ({ width: 10 })),
    } as unknown as CanvasRenderingContext2D;

    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("PowerUp Entity Performance", () => {
    it("should update multiple PowerUps within frame budget", () => {
      const powerUps: PowerUp[] = [];

      // Create multiple PowerUps
      for (let i = 0; i < PERFORMANCE_CONFIG.MAX_POWERUPS; i++) {
        const powerUp = PowerUp.create(PowerUpType.MultiBall, {
          x: i * 10,
          y: i * 5,
        });
        powerUps.push(powerUp);
      }

      const startTime = performance.now();

      // Simulate frame update
      powerUps.forEach((powerUp) => {
        powerUp.update(PERFORMANCE_CONFIG.FRAME_TIME_MS);
      });

      const frameTime = performance.now() - startTime;

      expect(frameTime).toBeLessThan(PERFORMANCE_CONFIG.MAX_FRAME_TIME_MS);
      expect(powerUps).toHaveLength(PERFORMANCE_CONFIG.MAX_POWERUPS);
    });

    it("should render multiple PowerUps within frame budget", () => {
      const powerUps: PowerUp[] = [];

      // Create PowerUps at different positions
      for (let i = 0; i < PERFORMANCE_CONFIG.MAX_POWERUPS; i++) {
        const powerUp = PowerUp.create(
          Object.values(PowerUpType)[i % Object.values(PowerUpType).length],
          { x: i * 15, y: i * 10 },
        );
        powerUps.push(powerUp);
      }

      const startTime = performance.now();

      // Simulate frame render
      powerUps.forEach((powerUp) => {
        powerUp.render(mockContext);
      });

      const renderTime = performance.now() - startTime;

      expect(renderTime).toBeLessThan(PERFORMANCE_CONFIG.MAX_FRAME_TIME_MS);
    });

    it("should maintain consistent performance over time", () => {
      const powerUp = PowerUp.create(PowerUpType.MultiBall);
      const frameTimes: number[] = [];

      // Simulate 60 frames (1 second at 60 FPS)
      for (let frame = 0; frame < 60; frame++) {
        const frameStart = performance.now();

        powerUp.update(PERFORMANCE_CONFIG.FRAME_TIME_MS);
        powerUp.render(mockContext);

        const frameTime = performance.now() - frameStart;
        frameTimes.push(frameTime);
      }

      const averageFrameTime =
        frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
      const maxFrameTime = Math.max(...frameTimes);
      const framesExceedingBudget = frameTimes.filter(
        (time) => time > PERFORMANCE_CONFIG.MAX_FRAME_TIME_MS,
      ).length;

      expect(averageFrameTime).toBeLessThan(PERFORMANCE_CONFIG.FRAME_TIME_MS);
      expect(maxFrameTime).toBeLessThan(
        PERFORMANCE_CONFIG.MAX_FRAME_TIME_MS * 2,
      );
      expect(framesExceedingBudget).toBeLessThanOrEqual(
        PERFORMANCE_CONFIG.ACCEPTABLE_FRAME_DROPS,
      );
    });
  });

  describe("Plugin System Performance", () => {
    it("should register plugins without blocking", async () => {
      const startTime = performance.now();

      // Register multiple plugins
      const registrationPromises = [];
      for (let i = 0; i < 20; i++) {
        const mockPlugin = {
          name: `plugin-${i}`,
          version: "1.0.0",
          init: vi.fn().mockResolvedValue(undefined),
          destroy: vi.fn().mockResolvedValue(undefined),
        };
        registrationPromises.push(pluginManager.register(mockPlugin));
      }

      await Promise.all(registrationPromises);

      const registrationTime = performance.now() - startTime;

      expect(registrationTime).toBeLessThan(100); // Should complete in <100ms
      expect(pluginManager.getPluginNames()).toHaveLength(20);
    });

    it("should enforce plugin execution time budget", async () => {
      const fastPlugin = {
        name: "fast-plugin",
        version: "1.0.0",
        init: vi.fn().mockResolvedValue(undefined),
        destroy: vi.fn().mockResolvedValue(undefined),
        execute: vi.fn(() => {
          // Fast execution
          return "done";
        }),
      };

      const slowPlugin = {
        name: "slow-plugin",
        version: "1.0.0",
        init: vi.fn().mockResolvedValue(undefined),
        destroy: vi.fn().mockResolvedValue(undefined),
        execute: vi.fn(() => {
          // Simulate slow execution
          const start = performance.now();
          while (performance.now() - start < 5) {
            // Busy wait for 5ms (exceeds 2ms budget)
          }
          return "done";
        }),
      };

      await pluginManager.register(fastPlugin);
      await pluginManager.register(slowPlugin);
      await pluginManager.initializeAll();

      const fastResult = pluginManager.executePlugin("fast-plugin", "execute");
      const slowResult = pluginManager.executePlugin("slow-plugin", "execute");

      expect(fastResult.exceeded_budget).toBeFalsy();
      expect(slowResult.exceeded_budget).toBe(true);
      expect(slowResult.executionTime).toBeGreaterThan(2);
    });
  });

  describe("PowerUpSystem Performance", () => {
    it("should handle maximum active effects efficiently", async () => {
      // Create mock plugins for all power-up types
      const mockPlugins = Object.values(PowerUpType).map((type) => ({
        name: `${type}-plugin`,
        version: "1.0.0",
        powerUpType: type,
        effect: {
          id: `${type}-effect`,
          priority: 5,
          stackable: true,
          apply: vi.fn(),
          remove: vi.fn(),
        },
        init: vi.fn().mockResolvedValue(undefined),
        destroy: vi.fn().mockResolvedValue(undefined),
        applyEffect: vi.fn().mockReturnValue({ success: true, modified: true }),
        removeEffect: vi
          .fn()
          .mockReturnValue({ success: true, modified: true }),
        updateEffect: vi
          .fn()
          .mockReturnValue({ success: true, modified: false }),
        getMetadata: vi.fn().mockReturnValue({
          type,
          name: type,
          duration: 10000,
          icon: "🧪",
          color: "#ff0000",
        }),
      }));

      // Register all plugins
      for (const plugin of mockPlugins) {
        await pluginManager.register(plugin as any);
      }
      await pluginManager.initializeAll();

      const startTime = performance.now();

      // Apply maximum number of effects
      const applicationPromises = [];
      for (let i = 0; i < 8; i++) {
        // Default max active effects
        const type =
          Object.values(PowerUpType)[i % Object.values(PowerUpType).length];
        applicationPromises.push(
          powerUpSystem.applyEffect(type, `powerup-${i}`, mockGameState),
        );
      }

      await Promise.all(applicationPromises);

      // Update all effects for multiple frames
      for (let frame = 0; frame < 10; frame++) {
        powerUpSystem.update(PERFORMANCE_CONFIG.FRAME_TIME_MS, mockGameState);
      }

      const totalTime = performance.now() - startTime;

      expect(totalTime).toBeLessThan(50); // Should complete in <50ms
      expect(powerUpSystem.getActiveEffects()).toHaveLength(5); // Limited by unique types
    });

    it("should maintain 60 FPS with complex effect combinations", async () => {
      // Setup complex scenario with multiple effect types
      const mockPlugins = Object.values(PowerUpType).map((type) => ({
        name: `${type}-plugin`,
        version: "1.0.0",
        powerUpType: type,
        effect: {
          id: `${type}-effect`,
          priority: Math.floor(Math.random() * 10),
          stackable: Math.random() > 0.5,
          conflictsWith:
            Math.random() > 0.7 ? [Object.values(PowerUpType)[0]] : [],
          apply: vi.fn(),
          remove: vi.fn(),
        },
        init: vi.fn().mockResolvedValue(undefined),
        destroy: vi.fn().mockResolvedValue(undefined),
        applyEffect: vi.fn().mockReturnValue({ success: true, modified: true }),
        removeEffect: vi
          .fn()
          .mockReturnValue({ success: true, modified: true }),
        updateEffect: vi
          .fn()
          .mockReturnValue({ success: true, modified: false }),
        getMetadata: vi.fn().mockReturnValue({
          type,
          name: type,
          duration: 5000 + Math.random() * 10000, // Random durations
          icon: "🧪",
          color: "#ff0000",
        }),
      }));

      for (const plugin of mockPlugins) {
        await pluginManager.register(plugin as any);
      }
      await pluginManager.initializeAll();

      const frameTimes: number[] = [];

      // Simulate 60 frames with dynamic effect management
      for (let frame = 0; frame < 60; frame++) {
        const frameStart = performance.now();

        // Randomly apply new effects
        if (Math.random() > 0.7) {
          const type =
            Object.values(PowerUpType)[
              Math.floor(Math.random() * Object.values(PowerUpType).length)
            ];
          await powerUpSystem.applyEffect(
            type,
            `powerup-${frame}`,
            mockGameState,
          );
        }

        // Update all effects
        powerUpSystem.update(PERFORMANCE_CONFIG.FRAME_TIME_MS, mockGameState);

        const frameTime = performance.now() - frameStart;
        frameTimes.push(frameTime);
      }

      const averageFrameTime =
        frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
      const framesExceedingBudget = frameTimes.filter(
        (time) => time > PERFORMANCE_CONFIG.MAX_FRAME_TIME_MS,
      ).length;

      expect(averageFrameTime).toBeLessThan(PERFORMANCE_CONFIG.FRAME_TIME_MS);
      expect(framesExceedingBudget).toBeLessThanOrEqual(
        PERFORMANCE_CONFIG.ACCEPTABLE_FRAME_DROPS,
      );
    });
  });

  describe("Memory Performance", () => {
    it("should not leak memory during power-up lifecycle", async () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Create and destroy many power-ups
      for (let cycle = 0; cycle < 10; cycle++) {
        const powerUps: PowerUp[] = [];

        // Create power-ups
        for (let i = 0; i < 20; i++) {
          const powerUp = PowerUp.create(PowerUpType.MultiBall);
          powerUps.push(powerUp);
        }

        // Update and render
        for (let frame = 0; frame < 30; frame++) {
          powerUps.forEach((powerUp) => {
            powerUp.update(PERFORMANCE_CONFIG.FRAME_TIME_MS);
            powerUp.render(mockContext);
          });
        }

        // Cleanup
        powerUps.forEach((powerUp) => powerUp.destroy());
      }

      // Force garbage collection if available
      if ((global as any).gc) {
        (global as any).gc();
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be minimal (less than 1MB)
      expect(memoryIncrease).toBeLessThan(1024 * 1024);
    });

    it("should cleanup expired effects efficiently", async () => {
      // Setup system with short cleanup interval
      const testSystem = new PowerUpSystem(pluginManager, {
        autoCleanup: true,
        cleanupInterval: 10,
      });

      // Create plugin
      const mockPlugin = {
        name: "test-plugin",
        version: "1.0.0",
        powerUpType: PowerUpType.MultiBall,
        effect: {
          id: "test",
          priority: 5,
          stackable: true,
          apply: vi.fn(),
          remove: vi.fn(),
        },
        init: vi.fn().mockResolvedValue(undefined),
        destroy: vi.fn().mockResolvedValue(undefined),
        applyEffect: vi.fn().mockReturnValue({ success: true, modified: true }),
        removeEffect: vi
          .fn()
          .mockReturnValue({ success: true, modified: true }),
        updateEffect: vi
          .fn()
          .mockReturnValue({ success: true, modified: false }),
        getMetadata: vi.fn().mockReturnValue({
          type: PowerUpType.MultiBall,
          name: "Test",
          duration: 100, // Very short duration
          icon: "🧪",
          color: "#ff0000",
        }),
      };

      await pluginManager.register(mockPlugin as any);
      await pluginManager.initializePlugin("test-plugin");

      // Apply many short-lived effects
      for (let i = 0; i < 50; i++) {
        await testSystem.applyEffect(
          PowerUpType.MultiBall,
          `powerup-${i}`,
          mockGameState,
        );
      }

      const initialActiveCount = testSystem.getActiveEffects().length;

      // Wait for effects to expire and cleanup
      vi.advanceTimersByTime(200);

      const finalActiveCount = testSystem.getActiveEffects().length;

      expect(initialActiveCount).toBeGreaterThan(0);
      expect(finalActiveCount).toBe(0);
    });
  });

  describe("Stress Testing", () => {
    it("should handle rapid power-up creation and destruction", async () => {
      const operations = [];
      const startTime = performance.now();

      // Perform many rapid operations
      for (let i = 0; i < 1000; i++) {
        const powerUp = PowerUp.create(
          Object.values(PowerUpType)[i % Object.values(PowerUpType).length],
          { x: Math.random() * 800, y: Math.random() * 600 },
        );

        powerUp.update(1);
        powerUp.render(mockContext);
        powerUp.destroy();

        operations.push(powerUp);
      }

      const totalTime = performance.now() - startTime;

      expect(totalTime).toBeLessThan(500); // Should complete in <500ms
      expect(operations).toHaveLength(1000);
    });

    it("should maintain performance under concurrent load", async () => {
      const concurrentOperations = [];

      // Create multiple concurrent test scenarios
      for (let scenario = 0; scenario < 5; scenario++) {
        const operation = (async () => {
          const powerUps: PowerUp[] = [];

          for (let i = 0; i < 20; i++) {
            const powerUp = PowerUp.create(PowerUpType.MultiBall);
            powerUps.push(powerUp);
          }

          for (let frame = 0; frame < 30; frame++) {
            powerUps.forEach((powerUp) => {
              powerUp.update(PERFORMANCE_CONFIG.FRAME_TIME_MS);
            });
          }

          return powerUps.length;
        })();

        concurrentOperations.push(operation);
      }

      const startTime = performance.now();
      const results = await Promise.all(concurrentOperations);
      const totalTime = performance.now() - startTime;

      expect(results.every((result) => result === 20)).toBe(true);
      expect(totalTime).toBeLessThan(200); // Should complete in <200ms
    });
  });
});
