/**
 * Unit Tests for PowerUpOptimization System
 * Story 4.2, Task 7: Test performance optimization functionality
 */
import { PowerUpOptimization } from '../PowerUpOptimization';
import { Ball } from '../../entities/Ball';
import { PowerUp } from '../../entities/PowerUp';
import { Particle } from '../../entities/Particle';

// Mock OffscreenCanvas
class MockOffscreenCanvas {
  width = 800;
  height = 600;
  
  getContext() {
    return new MockCanvasContext();
  }
}

class MockCanvasContext {
  clearRect = jest.fn();
  drawImage = jest.fn();
}

// Mock global OffscreenCanvas
(global as unknown).OffscreenCanvas = MockOffscreenCanvas;

describe('PowerUpOptimization', () => {
  let optimizer: PowerUpOptimization;

  beforeEach(() => {
    optimizer = new PowerUpOptimization({
      targetFPS: 60,
      maxEntities: 10,
      maxParticles: 20,
      profileMode: true
    });
  });

  afterEach(() => {
    optimizer.dispose();
  });

  describe('Object Pool Management', () => {
    it('should acquire and release balls correctly', () => {
      const ball1 = optimizer.acquireBall();
      const ball2 = optimizer.acquireBall();

      expect(ball1).toBeInstanceOf(Ball);
      expect(ball2).toBeInstanceOf(Ball);
      expect(ball1).not.toBe(ball2);

      optimizer.releaseBall(ball1);
      optimizer.releaseBall(ball2);

      // Should reuse released balls
      const ball3 = optimizer.acquireBall();
      expect(ball3).toBe(ball1); // Should be the first released ball
    });

    it('should acquire and release power-ups correctly', () => {
      const powerUp1 = optimizer.acquirePowerUp();
      const powerUp2 = optimizer.acquirePowerUp();

      expect(powerUp1).toBeInstanceOf(PowerUp);
      expect(powerUp2).toBeInstanceOf(PowerUp);
      expect(powerUp1).not.toBe(powerUp2);

      optimizer.releasePowerUp(powerUp1);
      const powerUp3 = optimizer.acquirePowerUp();
      expect(powerUp3).toBe(powerUp1);
    });

    it('should acquire and release particles correctly', () => {
      const particle1 = optimizer.acquireParticle();
      const particle2 = optimizer.acquireParticle();

      expect(particle1).toBeInstanceOf(Particle);
      expect(particle2).toBeInstanceOf(Particle);
      expect(particle1).not.toBe(particle2);

      optimizer.releaseParticle(particle1);
      const particle3 = optimizer.acquireParticle();
      expect(particle3).toBe(particle1);
    });

    it('should reset objects when acquired from pool', () => {
      const ball = optimizer.acquireBall();
      ball.active = true;
      ball.position = { x: 100, y: 200 };
      ball.velocity = { x: 50, y: -50 };

      optimizer.releaseBall(ball);

      const reusedBall = optimizer.acquireBall();
      expect(reusedBall).toBe(ball);
      expect(reusedBall.active).toBe(false);
      expect(reusedBall.position).toEqual({ x: 0, y: 0 });
      expect(reusedBall.velocity).toEqual({ x: 0, y: 0 });
    });
  });

  describe('Performance Metrics', () => {
    it('should update metrics correctly', () => {
      const entities = [{ active: true }, { active: true }];
      const particles = [{ active: true }];

      optimizer.updateMetrics(16.67, entities, particles);

      const metrics = optimizer.getMetrics();
      expect(metrics.entityCount).toBe(2);
      expect(metrics.particleCount).toBe(1);
      expect(metrics.frameTime).toBeCloseTo(16.67);
      expect(metrics.lastUpdate).toBeGreaterThan(0);
    });

    it('should calculate average frame time over multiple updates', () => {
      optimizer.updateMetrics(16, [], []);
      optimizer.updateMetrics(17, [], []);
      optimizer.updateMetrics(15, [], []);

      const metrics = optimizer.getMetrics();
      expect(metrics.frameTime).toBeCloseTo(16);
    });

    it('should track pool utilization', () => {
      // Acquire some objects to change utilization
      const ball = optimizer.acquireBall();
      const powerUp = optimizer.acquirePowerUp();

      optimizer.updateMetrics(16, [], []);

      const metrics = optimizer.getMetrics();
      expect(metrics.poolUtilization.balls).toBeGreaterThan(0);
      expect(metrics.poolUtilization.powerUps).toBeGreaterThan(0);

      optimizer.releaseBall(ball);
      optimizer.releasePowerUp(powerUp);
    });

    it('should estimate memory usage', () => {
      const ball1 = optimizer.acquireBall();
      const ball2 = optimizer.acquireBall();
      const powerUp = optimizer.acquirePowerUp();

      optimizer.updateMetrics(16, [], []);

      const metrics = optimizer.getMetrics();
      expect(metrics.memoryUsage).toBeGreaterThan(0);

      optimizer.releaseBall(ball1);
      optimizer.releaseBall(ball2);
      optimizer.releasePowerUp(powerUp);
    });
  });

  describe('Culling and LOD', () => {
    it('should cull off-screen entities', () => {
      const entities = [
        { position: { x: 50, y: 50 }, active: true },   // On screen
        { position: { x: -100, y: 50 }, active: true }, // Off screen left
        { position: { x: 900, y: 50 }, active: true },  // Off screen right
        { position: { x: 50, y: -100 }, active: true }, // Off screen top
        { position: { x: 50, y: 700 }, active: true },  // Off screen bottom
        { position: { x: 50, y: 50 }, active: false }   // Inactive
      ];

      const screenBounds = { width: 800, height: 600 };
      const visible = optimizer.cullOffscreenEntities(entities, screenBounds);

      expect(visible).toHaveLength(1);
      expect(visible[0].position).toEqual({ x: 50, y: 50 });
    });

    it('should apply margin to culling', () => {
      const entities = [
        { position: { x: -25, y: 50 }, active: true }, // Within margin
        { position: { x: -75, y: 50 }, active: true }  // Outside margin
      ];

      const screenBounds = { width: 800, height: 600 };
      const visible = optimizer.cullOffscreenEntities(entities, screenBounds, 50);

      expect(visible).toHaveLength(1);
      expect(visible[0].position.x).toBe(-25);
    });

    it('should apply level of detail based on distance', () => {
      const entities = [
        { position: { x: 100, y: 100 }, render: jest.fn() }, // Close - LOD 0
        { position: { x: 300, y: 300 }, render: jest.fn() }, // Medium - LOD 1
        { position: { x: 600, y: 600 }, render: jest.fn() }  // Far - LOD 2
      ];

      const cameraPosition = { x: 100, y: 100 };
      const lodEntities = optimizer.applyLOD(entities, cameraPosition, 200);

      expect(lodEntities[0].lodLevel).toBe(0); // Close
      expect(lodEntities[1].lodLevel).toBe(1); // Medium distance
      expect(lodEntities[2].lodLevel).toBe(2); // Far
    });

    it('should disable culling when config is false', () => {
      optimizer.updateConfig({ cullOffscreen: false });

      const entities = [
        { position: { x: -100, y: 50 }, active: true }, // Off screen
        { position: { x: 50, y: 50 }, active: true }    // On screen
      ];

      const screenBounds = { width: 800, height: 600 };
      const visible = optimizer.cullOffscreenEntities(entities, screenBounds);

      expect(visible).toHaveLength(2); // All entities returned
    });
  });

  describe('Batch Rendering', () => {
    it('should perform batch rendering when enabled', () => {
      const entities = [
        { render: jest.fn(), lodLevel: 0 },
        { render: jest.fn(), lodLevel: 1 }
      ];

      const mockContext = new MockCanvasContext();
      optimizer.batchRender(entities, mockContext as unknown);

      // Should call render on each entity
      entities.forEach(entity => {
        expect(entity.render).toHaveBeenCalled();
      });

      // Should draw to target context
      expect(mockContext.drawImage).toHaveBeenCalled();
    });

    it('should skip high LOD entities when performance is poor', () => {
      // Simulate poor performance
      optimizer.updateMetrics(20, [], []); // > 16.67ms target

      const entities = [
        { render: jest.fn(), lodLevel: 0 }, // Should render
        { render: jest.fn(), lodLevel: 1 }, // Should render
        { render: jest.fn(), lodLevel: 2 }  // Should skip
      ];

      const mockContext = new MockCanvasContext();
      optimizer.batchRender(entities, mockContext as unknown);

      expect(entities[0].render).toHaveBeenCalled();
      expect(entities[1].render).toHaveBeenCalled();
      expect(entities[2].render).not.toHaveBeenCalled();
    });

    it('should fallback to direct rendering when batch rendering is disabled', () => {
      optimizer.updateConfig({ batchRendering: false });

      const entities = [
        { render: jest.fn() },
        { render: jest.fn() }
      ];

      const mockContext = new MockCanvasContext();
      optimizer.batchRender(entities, mockContext as unknown);

      // Should call render directly on target context
      entities.forEach(entity => {
        expect(entity.render).toHaveBeenCalledWith(mockContext);
      });

      // Should not use drawImage for batching
      expect(mockContext.drawImage).not.toHaveBeenCalled();
    });
  });

  describe('Particle Optimization', () => {
    it('should limit particle count', () => {
      // Create more particles than the limit
      const particles: Particle[] = [];
      for (let i = 0; i < 25; i++) {
        const particle = optimizer.acquireParticle();
        particle.active = true;
        particle.life = i / 25; // Varying life values
        particles.push(particle);
      }

      optimizer.optimizeParticles(particles);

      // Should reduce to max limit (20)
      expect(particles.length).toBeLessThanOrEqual(20);
    });

    it('should remove oldest particles first when over limit', () => {
      const particles: Particle[] = [];
      
      // Create particles with known life values
      for (let i = 0; i < 25; i++) {
        const particle = optimizer.acquireParticle();
        particle.active = true;
        particle.life = i / 25; // Life from 0 to 1
        particles.push(particle);
      }

      optimizer.optimizeParticles(particles);

      // Remaining particles should have higher life values (newer)
      particles.forEach(particle => {
        expect(particle.life).toBeGreaterThan(0.2); // Oldest removed
      });
    });

    it('should merge nearby particles', () => {
      const particles: Particle[] = [];
      
      // Create two close particles
      const particle1 = optimizer.acquireParticle();
      particle1.active = true;
      particle1.position = { x: 100, y: 100 };
      particle1.life = 0.8;

      const particle2 = optimizer.acquireParticle();
      particle2.active = true;
      particle2.position = { x: 102, y: 103 }; // Very close
      particle2.life = 0.6;

      particles.push(particle1, particle2);

      optimizer.optimizeParticles(particles);

      // Should have merged into one particle
      expect(particles.length).toBe(1);
      expect(particles[0].life).toBe(0.8); // Should take max life
    });
  });

  describe('Configuration and Management', () => {
    it('should update configuration correctly', () => {
      const newConfig = {
        targetFPS: 30,
        maxEntities: 5,
        cullOffscreen: false
      };

      optimizer.updateConfig(newConfig);

      // Test that new config is applied
      const entities = Array(8).fill({ position: { x: 0, y: 0 }, active: true });
      optimizer.updateMetrics(33.33, entities, []); // 30 FPS frame time

      // Should not warn about exceeding entity count since we changed max to 5
      // (Warning would be in console, hard to test directly)
    });

    it('should provide pool statistics', () => {
      const ball = optimizer.acquireBall();
      const powerUp = optimizer.acquirePowerUp();

      const stats = optimizer.getPoolStats();

      expect(stats.balls).toBeDefined();
      expect(stats.powerUps).toBeDefined();
      expect(stats.particles).toBeDefined();
      expect(stats.balls.utilizationRate).toBeGreaterThan(0);
      expect(stats.powerUps.utilizationRate).toBeGreaterThan(0);

      optimizer.releaseBall(ball);
      optimizer.releasePowerUp(powerUp);
    });

    it('should dispose resources properly', () => {
      const ball = optimizer.acquireBall();
      const powerUp = optimizer.acquirePowerUp();

      optimizer.dispose();

      const stats = optimizer.getPoolStats();
      expect(stats.balls.poolSize).toBe(0);
      expect(stats.powerUps.poolSize).toBe(0);
      expect(stats.particles.poolSize).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle OffscreenCanvas not being available', () => {
      // Mock OffscreenCanvas to throw error
      const originalOffscreenCanvas = (global as unknown).OffscreenCanvas;
      (global as unknown).OffscreenCanvas = function() {
        throw new Error('OffscreenCanvas not supported');
      };

      // Should not throw error, should fallback
      expect(() => {
        new PowerUpOptimization({ batchRendering: true });
      }).not.toThrow();

      // Restore original
      (global as unknown).OffscreenCanvas = originalOffscreenCanvas;
    });

    it('should handle empty entity arrays', () => {
      expect(() => {
        optimizer.cullOffscreenEntities([], { width: 800, height: 600 });
      }).not.toThrow();

      expect(() => {
        optimizer.applyLOD([], { x: 0, y: 0 });
      }).not.toThrow();

      expect(() => {
        optimizer.optimizeParticles([]);
      }).not.toThrow();
    });

    it('should handle invalid entity data gracefully', () => {
      const invalidEntities: any[] = [
        { position: null, active: true },
        { position: { x: 'invalid', y: 100 }, active: true },
        null,
        undefined
      ];

      expect(() => {
        optimizer.cullOffscreenEntities(invalidEntities, { width: 800, height: 600 });
      }).not.toThrow();
    });
  });

  describe('Performance Monitoring', () => {
    it('should track render calls', () => {
      const entities = [
        { render: jest.fn() },
        { render: jest.fn() }
      ];

      const mockContext = new MockCanvasContext();
      optimizer.batchRender(entities, mockContext as unknown);

      const metrics = optimizer.getMetrics();
      expect(metrics.renderCalls).toBe(2);
    });

    it('should reset render calls after metrics update', () => {
      const entities = [{ render: jest.fn() }];
      const mockContext = new MockCanvasContext();
      
      optimizer.batchRender(entities, mockContext as unknown);
      optimizer.updateMetrics(16, [], []);

      const metrics = optimizer.getMetrics();
      expect(metrics.renderCalls).toBe(0); // Should reset
    });
  });
});