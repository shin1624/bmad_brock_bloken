import { ParticleSystem } from '../ParticleSystem';
import { ParticleTestFactory, EdgeCaseGenerators, TestStabilizers, PerformanceTestUtils } from './ParticleTestHelpers';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('ParticleSystem Edge Cases', () => {
  let system: ParticleSystem;
  
  beforeEach(() => {
    vi.useFakeTimers();
    system = ParticleTestFactory.createLightweightParticleSystem();
  });
  
  afterEach(() => {
    vi.restoreAllMocks();
    ParticleTestFactory.reset();
  });

  describe('Boundary Conditions', () => {
    it('should handle exact maximum particle limit (1000)', async () => {
      // Create system with exact max limit
      const maxSystem = ParticleTestFactory.createLightweightParticleSystem({
        maxParticles: 1000,
        preFillCount: 1000
      });
      
      // Try to emit one more particle
      maxSystem.emit(500, 300, {
        count: 1,
        speed: 100,
        spread: 0
      });
      
      const metrics = maxSystem.getPerformanceMetrics();
      expect(metrics.activeParticles).toBeLessThanOrEqual(1000);
    });

    it('should handle particle limit +1 gracefully', () => {
      const config = {
        maxParticles: 100,
        preFillCount: 100
      };
      const boundarySystem = ParticleTestFactory.createLightweightParticleSystem(config);
      
      // Fill to max
      for (let i = 0; i < 100; i++) {
        boundarySystem.emit(i, i, { count: 1 });
      }
      
      // Try to exceed
      boundarySystem.emit(500, 300, { count: 10 });
      
      const metrics = boundarySystem.getPerformanceMetrics();
      expect(metrics.activeParticles).toBe(100);
      expect(metrics.particlePoolUtilization).toBe(1.0);
    });

    it('should handle zero particle emission', () => {
      system.emit(500, 300, {
        count: 0,
        speed: 100
      });
      
      const metrics = system.getPerformanceMetrics();
      expect(metrics.activeParticles).toBe(0);
    });

    it('should handle negative coordinates', () => {
      system.emit(-100, -200, {
        count: 5,
        speed: 50
      });
      
      system.update(0.016);
      const metrics = system.getPerformanceMetrics();
      expect(metrics.activeParticles).toBeGreaterThan(0);
    });

    it('should handle extremely large coordinates', () => {
      system.emit(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, {
        count: 5,
        speed: 50
      });
      
      system.update(0.016);
      const metrics = system.getPerformanceMetrics();
      expect(metrics.activeParticles).toBeGreaterThan(0);
    });
  });

  describe('Rapid FPS Fluctuations', () => {
    it('should stabilize quality during rapid FPS changes', async () => {
      const qualityChanges: number[] = [];
      
      system.onPerformanceWarning(() => {
        qualityChanges.push(system.getPerformanceMetrics().qualityLevel);
      });
      
      // Simulate rapid FPS fluctuations
      EdgeCaseGenerators.simulateFPSFluctuations(system, {
        pattern: 'rapid',
        duration: 1000,
        minFPS: 20,
        maxFPS: 120
      });
      
      await TestStabilizers.retryAssertion(() => {
        return qualityChanges.length > 0 && 
               qualityChanges.every(q => q >= 0.5 && q <= 1.0);
      });
    });

    it('should handle sine wave FPS pattern', () => {
      const fpsHistory: number[] = [];
      
      // Simulate sine wave FPS pattern
      EdgeCaseGenerators.simulateFPSFluctuations(system, {
        pattern: 'sine',
        duration: 2000,
        minFPS: 25,
        maxFPS: 75
      });
      
      for (let i = 0; i < 10; i++) {
        system.update(0.016);
        fpsHistory.push(system.getPerformanceMetrics().fps);
        vi.advanceTimersByTime(200);
      }
      
      // Verify FPS varied but stayed within bounds
      const minFps = Math.min(...fpsHistory);
      const maxFps = Math.max(...fpsHistory);
      expect(minFps).toBeGreaterThanOrEqual(20);
      expect(maxFps).toBeLessThanOrEqual(80);
    });

    it('should handle instant FPS drops', () => {
      // Start with good FPS
      for (let i = 0; i < 10; i++) {
        system.update(0.016);
        vi.advanceTimersByTime(16);
      }
      
      const initialQuality = system.getPerformanceMetrics().qualityLevel;
      expect(initialQuality).toBe(1.0);
      
      // Instant drop to critical FPS
      EdgeCaseGenerators.simulateFPSFluctuations(system, {
        pattern: 'instant',
        duration: 100,
        minFPS: 15,
        maxFPS: 15
      });
      
      // Quality should adjust
      const newQuality = system.getPerformanceMetrics().qualityLevel;
      expect(newQuality).toBeLessThan(initialQuality);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle simultaneous multi-point emissions', () => {
      const emissionPoints = [
        { x: 100, y: 100 },
        { x: 200, y: 200 },
        { x: 300, y: 300 },
        { x: 400, y: 400 },
        { x: 500, y: 500 }
      ];
      
      // Emit from all points simultaneously
      emissionPoints.forEach(point => {
        system.emit(point.x, point.y, {
          count: 20,
          speed: 100,
          spread: Math.PI * 2
        });
      });
      
      const metrics = system.getPerformanceMetrics();
      expect(metrics.activeParticles).toBeLessThanOrEqual(100);
      expect(metrics.particlePoolUtilization).toBeGreaterThan(0);
    });

    it('should handle rapid burst creation and clearing', () => {
      for (let i = 0; i < 10; i++) {
        // Create burst
        system.createExplosion(250, 250, {
          count: 50,
          speed: 200,
          color: '#ff0000'
        });
        
        // Update a few frames
        for (let j = 0; j < 3; j++) {
          system.update(0.016);
          vi.advanceTimersByTime(16);
        }
        
        // Clear all
        system.clear();
      }
      
      const finalMetrics = system.getPerformanceMetrics();
      expect(finalMetrics.activeParticles).toBe(0);
      expect(finalMetrics.updateTime).toBeLessThan(10);
    });

    it('should handle effect creation during update cycle', () => {
      let updateCount = 0;
      
      const originalUpdate = system.update.bind(system);
      system.update = function(deltaTime: number) {
        originalUpdate(deltaTime);
        updateCount++;
        
        // Create new effect during update
        if (updateCount === 5) {
          system.createImpactEffect(300, 300, {
            count: 30,
            speed: 150
          });
        }
      };
      
      for (let i = 0; i < 10; i++) {
        system.update(0.016);
        vi.advanceTimersByTime(16);
      }
      
      expect(system.getPerformanceMetrics().activeParticles).toBeGreaterThan(0);
    });
  });

  describe('Theme Switching Edge Cases', () => {
    it('should handle theme switch with active particles', () => {
      // Create particles with initial theme
      system.createExplosion(250, 250, {
        count: 50,
        speed: 100,
        color: '#ff0000'
      });
      
      const initialMetrics = system.getPerformanceMetrics();
      const initialParticles = initialMetrics.activeParticles;
      
      // Switch theme mid-animation
      system.setTheme({
        colors: {
          particle: '#00ff00',
          trail: '#00ff0080'
        },
        sizes: {
          min: 1,
          max: 5
        },
        effects: {
          glow: true,
          trail: false
        }
      });
      
      // Continue animation
      system.update(0.016);
      
      // Particles should persist
      expect(system.getPerformanceMetrics().activeParticles).toBe(initialParticles);
    });

    it('should handle null theme gracefully', () => {
      expect(() => {
        system.setTheme(null as unknown);
      }).not.toThrow();
      
      // System should continue functioning
      system.emit(100, 100, { count: 10 });
      expect(system.getPerformanceMetrics().activeParticles).toBeGreaterThan(0);
    });

    it('should handle malformed theme data', () => {
      const malformedTheme = {
        colors: null,
        sizes: {
          min: -10,  // Invalid negative size
          max: 'large' as unknown  // Invalid type
        },
        effects: 'all' as unknown  // Invalid type
      };
      
      expect(() => {
        system.setTheme(malformedTheme as unknown);
      }).not.toThrow();
      
      // System should use defaults
      system.emit(100, 100, { count: 5 });
      expect(system.getPerformanceMetrics().activeParticles).toBeGreaterThan(0);
    });
  });

  describe('Memory and Resource Management', () => {
    it('should not leak memory during extended operation', async () => {
      const memorySnapshots: number[] = [];
      
      for (let cycle = 0; cycle < 100; cycle++) {
        // Stress the system
        for (let i = 0; i < 10; i++) {
          system.emit(
            Math.random() * 800,
            Math.random() * 600,
            { count: 10 }
          );
        }
        
        // Update multiple frames
        for (let frame = 0; frame < 10; frame++) {
          system.update(0.016);
        }
        
        // Clear periodically
        if (cycle % 10 === 0) {
          system.clear();
          const metrics = system.getPerformanceMetrics();
          memorySnapshots.push(metrics.memoryUsage || 0);
        }
      }
      
      // Memory usage should stabilize
      if (memorySnapshots.length > 2) {
        const earlyAvg = memorySnapshots.slice(0, 3).reduce((a, b) => a + b) / 3;
        const lateAvg = memorySnapshots.slice(-3).reduce((a, b) => a + b) / 3;
        expect(lateAvg).toBeLessThanOrEqual(earlyAvg * 1.1); // Max 10% increase
      }
    });

    it('should handle particle pool exhaustion gracefully', () => {
      const smallPool = ParticleTestFactory.createLightweightParticleSystem({
        maxParticles: 10,
        preFillCount: 10
      });
      
      // Try to create way more particles than pool size
      for (let i = 0; i < 100; i++) {
        smallPool.emit(i * 5, i * 5, {
          count: 5,
          speed: 50
        });
      }
      
      const metrics = smallPool.getPerformanceMetrics();
      expect(metrics.activeParticles).toBeLessThanOrEqual(10);
      expect(metrics.particlePoolUtilization).toBe(1.0);
    });

    it('should recover from performance critical state', async () => {
      // Force critical state
      EdgeCaseGenerators.simulateFPSFluctuations(system, {
        pattern: 'instant',
        duration: 500,
        minFPS: 10,
        maxFPS: 10
      });
      
      await TestStabilizers.retryAssertion(() => {
        return system.getPerformanceMetrics().qualityLevel < 0.7;
      });
      
      // Simulate recovery
      EdgeCaseGenerators.simulateFPSFluctuations(system, {
        pattern: 'instant',
        duration: 500,
        minFPS: 60,
        maxFPS: 60
      });
      
      await TestStabilizers.retryAssertion(() => {
        return system.getPerformanceMetrics().qualityLevel >= 0.9;
      });
    });
  });

  describe('Numerical Edge Cases', () => {
    it('should handle Infinity values', () => {
      expect(() => {
        system.emit(Infinity, Infinity, {
          count: 5,
          speed: Infinity
        });
      }).not.toThrow();
      
      system.update(0.016);
      // System should handle gracefully
    });

    it('should handle NaN values', () => {
      expect(() => {
        system.emit(NaN, NaN, {
          count: 5,
          speed: NaN
        });
      }).not.toThrow();
      
      system.update(0.016);
      // System should handle gracefully
    });

    it('should handle extremely small delta times', () => {
      system.emit(250, 250, { count: 10 });
      
      // Update with tiny delta
      system.update(0.000001);
      
      const metrics = system.getPerformanceMetrics();
      expect(metrics.activeParticles).toBeGreaterThan(0);
      expect(metrics.updateTime).toBeDefined();
    });

    it('should handle extremely large delta times', () => {
      system.emit(250, 250, { count: 10 });
      
      // Update with huge delta (simulating lag spike)
      system.update(1000);
      
      // All particles should have expired
      const metrics = system.getPerformanceMetrics();
      expect(metrics.activeParticles).toBe(0);
    });
  });

  describe('Integration Stress Tests', () => {
    it('should handle mixed operation chaos', () => {
      const operations = [
        () => system.emit(Math.random() * 800, Math.random() * 600, { count: 5 }),
        () => system.createExplosion(400, 300, { count: 20 }),
        () => system.createImpactEffect(200, 200, { count: 15 }),
        () => system.clear(),
        () => system.update(0.016),
        () => system.setTheme({ colors: { particle: '#' + Math.floor(Math.random()*16777215).toString(16) } } as unknown),
        () => system.getPerformanceMetrics(),
        () => vi.advanceTimersByTime(16)
      ];
      
      // Run random operations
      for (let i = 0; i < 100; i++) {
        const op = operations[Math.floor(Math.random() * operations.length)];
        expect(() => op()).not.toThrow();
      }
      
      // System should still be functional
      system.clear();
      system.emit(400, 300, { count: 5 });
      expect(system.getPerformanceMetrics().activeParticles).toBeGreaterThan(0);
    });

    it('should maintain performance under sustained load', () => {
      const updateTimes: number[] = [];
      
      // Sustained particle generation
      const interval = setInterval(() => {
        system.emit(
          Math.random() * 800,
          Math.random() * 600,
          { count: 3 }
        );
      }, 50);
      
      // Run for simulated 5 seconds
      for (let frame = 0; frame < 300; frame++) {
        const start = performance.now();
        system.update(0.016);
        const updateTime = performance.now() - start;
        updateTimes.push(updateTime);
        vi.advanceTimersByTime(16);
      }
      
      clearInterval(interval);
      
      // Average update time should remain reasonable
      const avgUpdateTime = updateTimes.reduce((a, b) => a + b) / updateTimes.length;
      expect(avgUpdateTime).toBeLessThan(5);
      
      // 95th percentile should also be reasonable
      updateTimes.sort((a, b) => a - b);
      const p95 = updateTimes[Math.floor(updateTimes.length * 0.95)];
      expect(p95).toBeLessThan(10);
    });
  });
});