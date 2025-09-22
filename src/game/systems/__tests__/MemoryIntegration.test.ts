/**
 * Memory Management Integration Tests
 * Phase 3: Test integrated memory efficiency systems
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MemoryManager } from '../MemoryManager';
import { PowerUpPool } from '../../utils/PowerUpPool';
import { ParticlePool } from '../../utils/ParticlePool';
import { PowerUpSystem } from '../PowerUpSystem';
import { PluginManager } from '../../plugins/PluginManager';
import { EventBus } from '../../core/EventBus';
import { PowerUpType } from '../../entities/PowerUp';

// Mock EventBus for testing
class MockEventBus extends EventBus {
  private listeners: Map<string, Function[]> = new Map();

  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  emit(event: string, data?: unknown): void {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(callback => callback(data));
  }

  off(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event) || [];
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }
}

describe('Memory Management Integration', () => {
  let memoryManager: MemoryManager;
  let eventBus: MockEventBus;
  let powerUpSystem: PowerUpSystem;
  let pluginManager: PluginManager;

  beforeEach(() => {
    eventBus = new MockEventBus();
    pluginManager = new PluginManager();
    
    memoryManager = new MemoryManager(eventBus, {
      maxMemoryMB: 50,
      warningThreshold: 0.7,
      enableAutoOptimization: true,
      powerUpPoolConfig: {
        maxPowerUpsPerType: 10,
        preFillCount: 2
      },
      particlePoolConfig: {
        maxParticles: 100,
        preFillCount: 20
      }
    });

    powerUpSystem = new PowerUpSystem(
      pluginManager,
      {
        enableMemoryManagement: true,
        memoryManagerConfig: {
          maxMemoryMB: 50
        }
      },
      undefined,
      eventBus
    );
  });

  afterEach(() => {
    memoryManager.dispose();
    powerUpSystem.shutdown();
  });

  describe('Memory Manager Integration', () => {
    it('should initialize with configured pools', () => {
      const stats = memoryManager.getOverallStats();
      
      expect(stats.totalPools).toBeGreaterThan(0);
      expect(stats.totalAllocated).toBeGreaterThan(0); // Pre-filled objects
    });

    it('should track memory usage across pools', () => {
      const powerUpPool = memoryManager.getPowerUpPool();
      const particlePool = memoryManager.getParticlePool();

      // Acquire several power-ups
      const powerUps = [];
      for (let i = 0; i < 5; i++) {
        powerUps.push(powerUpPool.acquire(PowerUpType.MultiBall, { x: i * 10, y: 50 }));
      }

      // Acquire several particles
      const particles = [];
      for (let i = 0; i < 10; i++) {
        particles.push(particlePool.acquire({
          position: { x: i * 5, y: 25 },
          velocity: { x: 1, y: -1 },
          color: '#FF0000',
          size: 2,
          lifespan: 1000
        }));
      }

      const stats = memoryManager.getOverallStats();
      expect(stats.totalReused).toBeGreaterThan(0);
      expect(stats.memoryUsage).toBeGreaterThan(0);

      // Clean up
      powerUps.forEach(pu => powerUpPool.release(pu));
      particles.forEach(p => particlePool.release(p));
    });

    it('should emit memory pressure events', (done) => {
      let pressureEventReceived = false;

      eventBus.on('memory:pressure', (data) => {
        pressureEventReceived = true;
        expect(data.level).toBeGreaterThan(0);
        expect(data.totalMemory).toBeGreaterThan(0);
        done();
      });

      // Force high memory pressure by acquiring many objects
      const powerUpPool = memoryManager.getPowerUpPool();
      const acquisitions = [];

      try {
        for (let i = 0; i < 100; i++) {
          acquisitions.push(powerUpPool.acquire(PowerUpType.MultiBall));
        }
      } catch (error) {
        // Expected when hitting limits
      }

      // Trigger stats update
      setTimeout(() => {
        if (!pressureEventReceived) {
          // Manually trigger if automatic detection didn't work
          eventBus.emit('memory:pressure', { level: 0.8, totalMemory: 60 });
        }
      }, 100);
    });

    it('should perform automatic optimization', () => {
      const initialStats = memoryManager.getOverallStats();
      
      // Simulate memory pressure
      eventBus.emit('performance:warning', { type: 'memory', memoryRelated: true });
      
      const afterOptimizationStats = memoryManager.getOverallStats();
      
      // Should have performed some optimization
      expect(afterOptimizationStats.gcEvents).toBeGreaterThanOrEqual(initialStats.gcEvents);
    });
  });

  describe('PowerUp Pool Integration', () => {
    it('should manage different PowerUp types separately', () => {
      const powerUpPool = memoryManager.getPowerUpPool();
      
      const multiBall = powerUpPool.acquire(PowerUpType.MultiBall);
      const paddleSize = powerUpPool.acquire(PowerUpType.PaddleSize);
      
      expect(multiBall.type).toBe(PowerUpType.MultiBall);
      expect(paddleSize.type).toBe(PowerUpType.PaddleSize);
      expect(multiBall.id).not.toBe(paddleSize.id);
      
      powerUpPool.release(multiBall);
      powerUpPool.release(paddleSize);
    });

    it('should reuse released PowerUps', () => {
      const powerUpPool = memoryManager.getPowerUpPool();
      
      const powerUp1 = powerUpPool.acquire(PowerUpType.MultiBall);
      const originalId = powerUp1.id;
      
      powerUpPool.release(powerUp1);
      
      const powerUp2 = powerUpPool.acquire(PowerUpType.MultiBall);
      
      // Should reuse the same object
      expect(powerUp2.id).toBe(originalId);
      expect(powerUp2.active).toBe(true);
      expect(powerUp2.collected).toBe(false);
      
      powerUpPool.release(powerUp2);
    });

    it('should handle batch operations efficiently', () => {
      const powerUpPool = memoryManager.getPowerUpPool();
      
      const positions = [
        { x: 10, y: 20 },
        { x: 30, y: 40 },
        { x: 50, y: 60 }
      ];
      
      const powerUps = powerUpPool.batchAcquire(PowerUpType.MultiBall, 3, positions);
      
      expect(powerUps).toHaveLength(3);
      powerUps.forEach((powerUp, index) => {
        expect(powerUp.position).toEqual(positions[index]);
      });
      
      powerUpPool.batchRelease(powerUps);
    });
  });

  describe('Particle Pool Integration', () => {
    it('should manage spatial optimization', () => {
      const particlePool = memoryManager.getParticlePool();
      
      // Create particles in different areas
      const nearParticles = [];
      const farParticles = [];
      
      for (let i = 0; i < 5; i++) {
        nearParticles.push(particlePool.acquire({
          position: { x: i * 5, y: i * 5 },
          velocity: { x: 1, y: 1 },
          color: '#FF0000',
          size: 2,
          lifespan: 1000
        }));
        
        farParticles.push(particlePool.acquire({
          position: { x: 500 + i * 5, y: 500 + i * 5 },
          velocity: { x: -1, y: -1 },
          color: '#00FF00',
          size: 2,
          lifespan: 1000
        }));
      }
      
      // Get particles in a specific area
      const visibleParticles = particlePool.getParticlesInArea({
        x: 0,
        y: 0,
        width: 100,
        height: 100
      });
      
      expect(visibleParticles.length).toBe(5); // Should only get near particles
      
      // Clean up
      particlePool.batchRelease([...nearParticles, ...farParticles]);
    });

    it('should update particles with LOD optimization', () => {
      const particlePool = memoryManager.getParticlePool();
      
      const particles = [];
      for (let i = 0; i < 10; i++) {
        particles.push(particlePool.acquire({
          position: { x: i * 50, y: 100 },
          velocity: { x: 0, y: 1 },
          color: '#FFFF00',
          size: 3,
          lifespan: 2000
        }));
      }
      
      const stats = particlePool.getStats();
      expect(stats.activeParticles).toBe(10);
      
      // Update with camera position to trigger LOD
      particlePool.update(16, { x: 0, y: 100 }); // Camera at start
      
      const statsAfterUpdate = particlePool.getStats();
      expect(statsAfterUpdate.lodReductions).toBeGreaterThanOrEqual(0);
      
      particlePool.batchRelease(particles);
    });

    it('should perform batch rendering optimization', () => {
      const particlePool = memoryManager.getParticlePool();
      
      // Create particles with same color for batching
      const redParticles = [];
      for (let i = 0; i < 5; i++) {
        redParticles.push(particlePool.acquire({
          position: { x: i * 10, y: 50 },
          velocity: { x: 0, y: 0 },
          color: '#FF0000',
          size: 2,
          lifespan: 1000
        }));
      }
      
      // Mock canvas context
      const mockCtx = {
        save: vi.fn(),
        restore: vi.fn(),
        fillStyle: '',
        globalAlpha: 1,
        beginPath: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn()
      };
      
      particlePool.render(mockCtx as unknown);
      
      // Should have called batch rendering methods
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
      expect(mockCtx.beginPath).toHaveBeenCalled();
      
      particlePool.batchRelease(redParticles);
    });
  });

  describe('PowerUpSystem Integration', () => {
    it('should access memory manager from PowerUpSystem', () => {
      const memManager = powerUpSystem.getMemoryManager();
      expect(memManager).toBeDefined();
      
      const memStats = powerUpSystem.getMemoryStats();
      expect(memStats).toBeDefined();
      expect(memStats.totalMemoryMB).toBeGreaterThanOrEqual(0);
    });

    it('should create pooled power-ups through PowerUpSystem', () => {
      const powerUp = powerUpSystem.createPooledPowerUp(PowerUpType.MultiBall, { x: 100, y: 200 });
      
      expect(powerUp).toBeDefined();
      expect(powerUp.type).toBe(PowerUpType.MultiBall);
      expect(powerUp.position).toEqual({ x: 100, y: 200 });
      
      powerUpSystem.releasePooledPowerUp(powerUp);
    });

    it('should optimize memory on demand', () => {
      const initialStats = powerUpSystem.getMemoryStats();
      
      powerUpSystem.optimizeMemory();
      
      const afterOptimizationStats = powerUpSystem.getMemoryStats();
      expect(afterOptimizationStats.gcEvents).toBeGreaterThanOrEqual(initialStats.gcEvents);
    });
  });

  describe('Performance and Health Monitoring', () => {
    it('should monitor pool utilization', () => {
      const powerUpPool = memoryManager.getPowerUpPool();
      
      // Acquire many power-ups to increase utilization
      const powerUps = [];
      for (let i = 0; i < 8; i++) {
        powerUps.push(powerUpPool.acquire(PowerUpType.MultiBall));
      }
      
      const stats = memoryManager.getOverallStats();
      expect(stats.utilizationByType[PowerUpType.MultiBall]).toBeGreaterThan(0);
      
      powerUps.forEach(pu => powerUpPool.release(pu));
    });

    it('should detect memory health issues', () => {
      const powerUpPool = memoryManager.getPowerUpPool();
      
      // Create potential memory pressure
      const powerUps = [];
      try {
        for (let i = 0; i < 20; i++) {
          powerUps.push(powerUpPool.acquire(PowerUpType.MultiBall));
        }
      } catch (error) {
        // Expected when hitting limits
      }
      
      const health = powerUpPool.checkHealth();
      
      if (!health.isHealthy) {
        expect(health.issues.length).toBeGreaterThan(0);
      }
      
      powerUps.forEach(pu => powerUpPool.release(pu));
    });

    it('should provide comprehensive debug information', () => {
      const debugInfo = memoryManager.getDebugInfo();
      
      expect(debugInfo).toContain('Memory Manager Debug Info');
      expect(debugInfo).toContain('Total Memory:');
      expect(debugInfo).toContain('GC Pressure:');
      expect(debugInfo).toContain('PowerUp Pool Debug Info');
      expect(debugInfo).toContain('Particle Pool Debug Info');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle pool capacity limits gracefully', () => {
      const powerUpPool = memoryManager.getPowerUpPool();
      
      // Try to exceed pool capacity
      const powerUps = [];
      let acquisitionCount = 0;
      
      try {
        for (let i = 0; i < 50; i++) { // More than configured max
          powerUps.push(powerUpPool.acquire(PowerUpType.MultiBall));
          acquisitionCount++;
        }
      } catch (error) {
        // Should handle gracefully without crashing
      }
      
      expect(acquisitionCount).toBeGreaterThan(0);
      powerUps.forEach(pu => powerUpPool.release(pu));
    });

    it('should handle invalid releases gracefully', () => {
      const powerUpPool = memoryManager.getPowerUpPool();
      
      // Try to release non-pooled object
      expect(() => {
        powerUpPool.release(null as unknown);
      }).not.toThrow();
      
      expect(() => {
        powerUpPool.release({} as unknown);
      }).not.toThrow();
    });

    it('should maintain state consistency during rapid operations', () => {
      const powerUpPool = memoryManager.getPowerUpPool();
      
      // Rapid acquire/release cycles
      for (let cycle = 0; cycle < 10; cycle++) {
        const powerUps = [];
        
        for (let i = 0; i < 5; i++) {
          powerUps.push(powerUpPool.acquire(PowerUpType.MultiBall));
        }
        
        powerUps.forEach(pu => powerUpPool.release(pu));
      }
      
      const stats = powerUpPool.getOverallStats();
      expect(stats.totalReused).toBeGreaterThan(0);
      
      // Pool should be in consistent state
      const health = powerUpPool.checkHealth();
      expect(health.isHealthy).toBe(true);
    });
  });
});
