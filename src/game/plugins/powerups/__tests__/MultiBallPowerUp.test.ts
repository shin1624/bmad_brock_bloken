/**
 * Unit Tests for MultiBallPowerUp Plugin
 * Story 4.2, Task 1: Test multi-ball power-up functionality
 */
import { MultiBallPowerUp } from '../MultiBallPowerUp';
import { Ball } from '../../../entities/Ball';
import { PowerUpPluginContext } from '../../PowerUpPlugin';
import { PowerUpType } from '../../../entities/PowerUp';
import { BallConfiguration } from '../../../../types/game.types';

// Mock Ball class for testing
class MockBall {
  public position = { x: 100, y: 100 };
  public velocity = { x: 100, y: -100 };
  public radius = 10;
  public speed = 200;
  public maxSpeed = 400;
  public minSpeed = 50;
  public bounceDamping = 0.95;
  public active = true;
  public id?: string;

  setVelocity(velocity: { x: number; y: number }) {
    this.velocity = velocity;
  }
}

describe('MultiBallPowerUp', () => {
  let powerUp: MultiBallPowerUp;
  let mockContext: PowerUpPluginContext;
  let mockBalls: MockBall[];

  beforeEach(async () => {
    powerUp = new MultiBallPowerUp();
    await powerUp.init();

    // Create mock balls array
    mockBalls = [new MockBall()];

    // Create mock context
    mockContext = {
      powerUpType: PowerUpType.MultiBall,
      powerUpId: 'test-multiball',
      effectData: null,
      gameEntities: {
        balls: mockBalls as any[],
        paddle: null,
        blocks: [],
        powerUps: []
      },
      performance: {
        startTime: performance.now(),
        maxExecutionTime: 16
      }
    };
  });

  afterEach(async () => {
    await powerUp.destroy();
  });

  describe('Initialization', () => {
    it('should initialize correctly', () => {
      expect(powerUp.name).toBe('MultiBallPowerUp');
      expect(powerUp.version).toBe('1.0.0');
      expect(powerUp.powerUpType).toBe(PowerUpType.MultiBall);
    });

    it('should have correct metadata', () => {
      const metadata = powerUp.getMetadata();
      expect(metadata.type).toBe(PowerUpType.MultiBall);
      expect(metadata.rarity).toBe('rare');
      expect(metadata.duration).toBe(30000);
      expect(metadata.icon).toBe('⚡');
      expect(metadata.color).toBe('#ff6b6b');
    });
  });

  describe('Effect Application', () => {
    it('should add balls when applied', () => {
      const initialCount = mockBalls.length;
      const result = powerUp.applyEffect(mockContext);

      expect(result.success).toBe(true);
      expect(result.modified).toBe(true);
      expect(mockBalls.length).toBeGreaterThan(initialCount);
      expect(mockBalls.length).toBeLessThanOrEqual(MultiBallPowerUp.getMaxBalls());
    });

    it('should not exceed maximum ball count', () => {
      // Fill to max balls
      for (let i = 1; i < MultiBallPowerUp.getMaxBalls(); i++) {
        mockBalls.push(new MockBall());
      }

      const result = powerUp.applyEffect(mockContext);

      expect(result.success).toBe(true);
      expect(result.modified).toBe(false);
      expect(mockBalls.length).toBe(MultiBallPowerUp.getMaxBalls());
    });

    it('should create balls with varied trajectories', () => {
      const originalBall = mockBalls[0];
      originalBall.velocity = { x: 100, y: -100 };

      const result = powerUp.applyEffect(mockContext);

      expect(result.success).toBe(true);
      expect(mockBalls.length).toBeGreaterThan(1);

      // Check that new balls have different velocities
      const velocities = mockBalls.map(ball => ({ x: ball.velocity.x, y: ball.velocity.y }));
      const uniqueVelocities = new Set(velocities.map(v => `${v.x},${v.y}`));
      expect(uniqueVelocities.size).toBeGreaterThan(1);
    });

    it('should assign unique IDs to created balls', () => {
      const result = powerUp.applyEffect(mockContext);

      expect(result.success).toBe(true);
      
      const ballsWithIds = mockBalls.filter(ball => ball.id);
      expect(ballsWithIds.length).toBeGreaterThan(0);

      // Check ID uniqueness
      const ids = ballsWithIds.map(ball => ball.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should fail when no active ball is available', () => {
      mockBalls[0].active = false;

      const result = powerUp.applyEffect(mockContext);

      expect(result.success).toBe(false);
      expect(result.modified).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should store effect data for cleanup', () => {
      const result = powerUp.applyEffect(mockContext);

      expect(result.success).toBe(true);
      expect(mockContext.effectData).toBeDefined();
      
      const effectData = mockContext.effectData as unknown;
      expect(effectData.originalBallCount).toBe(1);
      expect(effectData.addedBallIds).toBeDefined();
      expect(effectData.maxBalls).toBe(MultiBallPowerUp.getMaxBalls());
    });
  });

  describe('Effect Removal', () => {
    beforeEach(() => {
      // Apply effect first
      powerUp.applyEffect(mockContext);
    });

    it('should remove added balls when effect expires', () => {
      const ballCountAfterApply = mockBalls.length;
      
      const result = powerUp.removeEffect(mockContext);

      expect(result.success).toBe(true);
      expect(result.modified).toBe(true);
      expect(mockBalls.length).toBeLessThan(ballCountAfterApply);
    });

    it('should only remove balls added by this effect', () => {
      const originalBall = mockBalls[0];
      
      const result = powerUp.removeEffect(mockContext);

      expect(result.success).toBe(true);
      expect(mockBalls).toContain(originalBall);
    });

    it('should handle missing effect data gracefully', () => {
      mockContext.effectData = null;

      const result = powerUp.removeEffect(mockContext);

      expect(result.success).toBe(true);
      expect(result.modified).toBe(false);
    });

    it('should deactivate removed balls', () => {
      const ballCountBefore = mockBalls.length;
      
      powerUp.removeEffect(mockContext);

      // Check that removed balls are marked as inactive
      const activeBalls = mockBalls.filter(ball => ball.active);
      expect(activeBalls.length).toBeLessThan(ballCountBefore);
    });
  });

  describe('Effect Updates', () => {
    it('should handle update calls without errors', () => {
      powerUp.applyEffect(mockContext);

      const result = powerUp.updateEffect(mockContext);

      expect(result.success).toBe(true);
      expect(result.modified).toBe(false);
    });
  });

  describe('Conflict Handling', () => {
    it('should allow stacking with other power-ups', () => {
      const result = powerUp.handleConflict(PowerUpType.PaddleSize, mockContext);

      expect(result.success).toBe(true);
      expect(result.modified).toBe(false);
    });

    it('should stack with other MultiBall effects', () => {
      const result = powerUp.handleConflict(PowerUpType.MultiBall, mockContext);

      expect(result.success).toBe(true);
      expect(result.modified).toBe(false);
    });
  });

  describe('Static Methods', () => {
    it('should correctly identify when ball limit would be exceeded', () => {
      expect(MultiBallPowerUp.wouldExceedLimit(2)).toBe(false);
      expect(MultiBallPowerUp.wouldExceedLimit(3)).toBe(true);
      expect(MultiBallPowerUp.wouldExceedLimit(4)).toBe(true);
    });

    it('should return correct maximum ball count', () => {
      expect(MultiBallPowerUp.getMaxBalls()).toBe(3);
    });
  });

  describe('Performance', () => {
    it('should complete effect application within time budget', () => {
      const startTime = performance.now();
      
      powerUp.applyEffect(mockContext);
      
      const elapsed = performance.now() - startTime;
      expect(elapsed).toBeLessThan(16); // 16ms frame budget
    });

    it('should track execution metrics', () => {
      powerUp.applyEffect(mockContext);
      powerUp.removeEffect(mockContext);

      const metrics = powerUp.getPerformanceMetrics();
      expect(metrics.activations).toBe(1);
      expect(metrics.totalExecutionTime).toBeGreaterThan(0);
      expect(metrics.averageExecutionTime).toBeGreaterThan(0);
      expect(metrics.isInitialized).toBe(true);
    });
  });

  describe('Rollback Functionality', () => {
    it('should provide rollback function', () => {
      const result = powerUp.applyEffect(mockContext);

      expect(result.success).toBe(true);
      expect(result.rollback).toBeDefined();
      expect(typeof result.rollback).toBe('function');
    });

    it('should rollback changes when rollback is called', () => {
      const originalCount = mockBalls.length;
      const result = powerUp.applyEffect(mockContext);
      
      expect(mockBalls.length).toBeGreaterThan(originalCount);

      if (result.rollback) {
        result.rollback();
      }

      expect(mockBalls.length).toBe(originalCount);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty balls array', () => {
      mockContext.gameEntities.balls = [];

      const result = powerUp.applyEffect(mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle null/undefined balls array', () => {
      mockContext.gameEntities.balls = null as unknown;

      const result = powerUp.applyEffect(mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle balls with extreme positions', () => {
      mockBalls[0].position = { x: -1000, y: -1000 };

      const result = powerUp.applyEffect(mockContext);

      expect(result.success).toBe(true);
      expect(result.modified).toBe(true);
    });

    it('should handle balls with zero velocity', () => {
      mockBalls[0].velocity = { x: 0, y: 0 };

      const result = powerUp.applyEffect(mockContext);

      expect(result.success).toBe(true);
      expect(result.modified).toBe(true);

      // New balls should have non-zero velocity
      const newBalls = mockBalls.slice(1);
      newBalls.forEach(ball => {
        const magnitude = Math.sqrt(ball.velocity.x ** 2 + ball.velocity.y ** 2);
        expect(magnitude).toBeGreaterThan(0);
      });
    });
  });
});