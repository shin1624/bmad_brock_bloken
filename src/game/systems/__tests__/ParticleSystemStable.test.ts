/**
 * Stabilized particle system tests with reduced flakiness
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ParticleTestFactory, TestStabilizers, PerformanceTestUtils } from './ParticleTestHelpers';
import { ParticleSystem } from '../ParticleSystem';
import { EventBus } from '../../core/EventBus';

describe('ParticleSystem - Stable Tests', () => {
  let system: ParticleSystem;
  let eventBus: EventBus;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    eventBus = ParticleTestFactory.getEventBus();
    system = ParticleTestFactory.createLightweightParticleSystem();
  });

  afterEach(() => {
    system.destroy();
    ParticleTestFactory.cleanup();
    vi.useRealTimers();
  });

  describe('Timing-Stable Tests', () => {
    it('should handle FPS fluctuations without flaky assertions', async () => {
      system.setAutoQuality(true);
      
      // Create initial particles
      ParticleTestFactory.createMinimalEffect(system, 5);
      
      // Establish baseline with consistent timing
      system.update(0.016);
      vi.advanceTimersByTime(16);
      
      // Simulate low FPS with deterministic timing
      system.update(0.033);
      vi.advanceTimersByTime(33);
      
      // Use retry for timing-dependent assertion
      await TestStabilizers.retryAssertion(() => {
        const metrics = system.getPerformanceMetrics();
        return metrics.fps < 50 || metrics.qualityLevel < 1.0;
      });
    });

    it('should emit events consistently', async () => {
      const handler = vi.fn();
      eventBus.on('particles:performanceWarning', handler);
      
      // Force consistent FPS drop
      system.update(0.016);
      vi.advanceTimersByTime(16);
      
      // Create many particles to ensure performance impact
      for (let i = 0; i < 20; i++) {
        system.createEffect('explosion', { x: i * 10, y: i * 10 });
      }
      
      // Simulate frame drop
      vi.advanceTimersByTime(40);
      system.update(0.040);
      
      // Wait for event processing
      await TestStabilizers.waitForCondition(
        () => handler.mock.calls.length > 0 || system.getQualityLevel() < 1.0
      );
      
      // Either warning was emitted or quality was reduced
      expect(handler.mock.calls.length > 0 || system.getQualityLevel() < 1.0).toBe(true);
    });
  });

  describe('Memory-Stable Tests', () => {
    it('should maintain consistent memory usage', () => {
      const iterations = 10;
      const memoryReadings: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        // Create and destroy particles
        ParticleTestFactory.createMinimalEffect(system, 10);
        system.update(1000); // Fast forward to clear all
        system.clear();
        
        // Record memory usage
        const metrics = system.getPerformanceMetrics();
        memoryReadings.push(metrics.memoryUsage);
      }
      
      // Check memory stability - variance should be minimal
      const avgMemory = memoryReadings.reduce((a, b) => a + b) / iterations;
      const maxDeviation = Math.max(...memoryReadings.map(m => Math.abs(m - avgMemory)));
      
      expect(maxDeviation).toBeLessThan(0.1); // Less than 10% deviation
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent effect creation safely', async () => {
      const initialCount = system.getParticleCount();
      
      // Create effects concurrently
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          Promise.resolve().then(() => {
            system.createEffect('spark', { x: i * 10, y: i * 10 });
          })
        );
      }
      
      await Promise.all(promises);
      
      // Verify particle creation was successful
      expect(system.getParticleCount()).toBeGreaterThan(initialCount);
      
      // Verify no duplicate particles or corruption
      const metrics = system.getPerformanceMetrics();
      expect(metrics.particleCount).toBeLessThanOrEqual(metrics.poolStats.poolSize);
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet particle creation benchmark', async () => {
      const { duration } = await PerformanceTestUtils.runWithTiming(() => {
        for (let i = 0; i < 100; i++) {
          system.createEffect('spark', { x: 100, y: 100 });
        }
      }, 50); // Should complete in 50ms
      
      expect(duration).toBeLessThan(50);
    });

    it('should meet update cycle benchmark', async () => {
      // Create particles
      ParticleTestFactory.createMinimalEffect(system, 50);
      
      const { duration } = await PerformanceTestUtils.runWithTiming(() => {
        for (let i = 0; i < 60; i++) {
          system.update(0.016); // 60 frames
        }
      }, 100); // Should complete in 100ms
      
      expect(duration).toBeLessThan(100);
    });

    it('should meet render benchmark', async () => {
      const ctx = ParticleTestFactory.createMockContext();
      
      // Create particles
      ParticleTestFactory.createMinimalEffect(system, 30);
      
      const { duration } = await PerformanceTestUtils.runWithTiming(() => {
        system.render(ctx);
      }, 16); // Should render within single frame (16ms)
      
      expect(duration).toBeLessThan(16);
    });
  });
});