/**
 * Unit Tests for BallSpeedPowerUp Plugin
 * Story 4.2, Task 3: Test ball speed modification functionality
 */
import { BallSpeedPowerUp, BallSpeedVariant } from '../BallSpeedPowerUp';
import { PowerUpPluginContext } from '../../PowerUpPlugin';
import { PowerUpType } from '../../../entities/PowerUp';

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

  constructor(id?: string) {
    this.id = id;
  }
}

describe('BallSpeedPowerUp', () => {
  let fastPowerUp: BallSpeedPowerUp;
  let slowPowerUp: BallSpeedPowerUp;
  let mockContext: PowerUpPluginContext;
  let mockBalls: MockBall[];

  beforeEach(async () => {
    fastPowerUp = new BallSpeedPowerUp(BallSpeedVariant.Fast);
    slowPowerUp = new BallSpeedPowerUp(BallSpeedVariant.Slow);
    await fastPowerUp.init();
    await slowPowerUp.init();

    // Create mock balls array
    mockBalls = [
      new MockBall('ball1'),
      new MockBall('ball2')
    ];

    // Create mock context
    mockContext = {
      powerUpType: PowerUpType.BallSpeed,
      powerUpId: 'test-ballspeed',
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
    await fastPowerUp.destroy();
    await slowPowerUp.destroy();
  });

  describe('Initialization', () => {
    it('should initialize fast variant correctly', () => {
      expect(fastPowerUp.name).toBe('BallSpeedPowerUp_fast');
      expect(fastPowerUp.version).toBe('1.0.0');
      expect(fastPowerUp.powerUpType).toBe(PowerUpType.BallSpeed);
    });

    it('should initialize slow variant correctly', () => {
      expect(slowPowerUp.name).toBe('BallSpeedPowerUp_slow');
      expect(slowPowerUp.version).toBe('1.0.0');
      expect(slowPowerUp.powerUpType).toBe(PowerUpType.BallSpeed);
    });

    it('should have correct metadata for fast variant', () => {
      const metadata = fastPowerUp.getMetadata();
      expect(metadata.type).toBe(PowerUpType.BallSpeed);
      expect(metadata.rarity).toBe('common');
      expect(metadata.duration).toBe(15000);
      expect(metadata.icon).toBe('💨');
      expect(metadata.color).toBe('#45b7d1');
    });

    it('should have correct metadata for slow variant', () => {
      const metadata = slowPowerUp.getMetadata();
      expect(metadata.type).toBe(PowerUpType.BallSpeed);
      expect(metadata.rarity).toBe('common');
      expect(metadata.duration).toBe(15000);
      expect(metadata.icon).toBe('🐌');
      expect(metadata.color).toBe('#96ceb4');
    });
  });

  describe('Fast Ball Effect', () => {
    it('should increase ball speed when applied', () => {
      const originalSpeeds = mockBalls.map(ball => ball.speed);

      const result = fastPowerUp.applyEffect(mockContext);

      expect(result.success).toBe(true);
      expect(result.modified).toBe(true);
      
      mockBalls.forEach((ball, index) => {
        expect(ball.speed).toBeGreaterThan(originalSpeeds[index]);
      });
    });

    it('should apply correct speed multiplier', () => {
      const originalSpeed = mockBalls[0].speed;
      const expectedSpeed = originalSpeed * BallSpeedPowerUp.getMultiplier(BallSpeedVariant.Fast);

      fastPowerUp.applyEffect(mockContext);

      expect(mockBalls[0].speed).toBeCloseTo(expectedSpeed, 1);
    });

    it('should update velocity magnitude to match new speed', () => {
      fastPowerUp.applyEffect(mockContext);

      mockBalls.forEach(ball => {
        const velocityMagnitude = Math.sqrt(ball.velocity.x ** 2 + ball.velocity.y ** 2);
        expect(velocityMagnitude).toBeCloseTo(ball.speed, 1);
      });
    });

    it('should store original speeds for rollback', () => {
      const originalSpeeds = mockBalls.map(ball => ball.speed);

      fastPowerUp.applyEffect(mockContext);

      expect(mockContext.effectData).toBeDefined();
      const effectData = mockContext.effectData as any;
      expect(effectData.variant).toBe(BallSpeedVariant.Fast);
      expect(effectData.affectedBallIds).toHaveLength(2);
      expect(Object.keys(effectData.originalSpeeds)).toHaveLength(2);
    });
  });

  describe('Slow Ball Effect', () => {
    it('should decrease ball speed when applied', () => {
      const originalSpeeds = mockBalls.map(ball => ball.speed);

      const result = slowPowerUp.applyEffect(mockContext);

      expect(result.success).toBe(true);
      expect(result.modified).toBe(true);
      
      mockBalls.forEach((ball, index) => {
        expect(ball.speed).toBeLessThan(originalSpeeds[index]);
      });
    });

    it('should apply correct speed multiplier', () => {
      const originalSpeed = mockBalls[0].speed;
      const expectedSpeed = originalSpeed * BallSpeedPowerUp.getMultiplier(BallSpeedVariant.Slow);

      slowPowerUp.applyEffect(mockContext);

      expect(mockBalls[0].speed).toBeCloseTo(expectedSpeed, 1);
    });

    it('should not make balls too slow', () => {
      // Set ball to minimum speed threshold
      mockBalls[0].speed = 100; // Would become 50px/s, exactly at minimum

      const result = slowPowerUp.applyEffect(mockContext);

      expect(result.success).toBe(true);
      expect(mockBalls[0].speed).toBeGreaterThanOrEqual(50); // MIN_SPEED
    });

    it('should skip balls that would become too slow', () => {
      // Set ball to speed that would become too slow
      mockBalls[0].speed = 80; // Would become 40px/s, below minimum
      const originalSpeed = mockBalls[0].speed;

      const result = slowPowerUp.applyEffect(mockContext);

      // Should still succeed for other balls but skip this one
      expect(result.success).toBe(true);
      expect(mockBalls[0].speed).toBe(originalSpeed); // Unchanged
    });
  });

  describe('Speed Limit Handling', () => {
    it('should not exceed maximum speed', () => {
      // Set ball to high speed
      mockBalls[0].speed = 600; // Would become 900px/s, above maximum

      const result = fastPowerUp.applyEffect(mockContext);

      expect(result.success).toBe(true);
      // Should skip this ball due to speed limit
      expect(mockBalls[0].speed).toBe(600); // Unchanged
    });

    it('should handle all balls being outside speed limits', () => {
      // Set all balls to extreme speeds
      mockBalls.forEach(ball => {
        ball.speed = 600; // Too high for fast effect
      });

      const result = fastPowerUp.applyEffect(mockContext);

      expect(result.success).toBe(true);
      expect(result.modified).toBe(false);
    });

    it('should provide speed limit information', () => {
      const limits = BallSpeedPowerUp.getSpeedLimits();
      expect(limits.min).toBe(50);
      expect(limits.max).toBe(800);
    });
  });

  describe('Effect Removal', () => {
    beforeEach(() => {
      fastPowerUp.applyEffect(mockContext);
    });

    it('should restore original speeds when removed', () => {
      const originalSpeeds = [200, 200]; // Original mock ball speeds
      
      const result = fastPowerUp.removeEffect(mockContext);

      expect(result.success).toBe(true);
      expect(result.modified).toBe(true);
      
      mockBalls.forEach((ball, index) => {
        expect(ball.speed).toBe(originalSpeeds[index]);
      });
    });

    it('should restore velocity magnitudes', () => {
      fastPowerUp.removeEffect(mockContext);

      mockBalls.forEach(ball => {
        const velocityMagnitude = Math.sqrt(ball.velocity.x ** 2 + ball.velocity.y ** 2);
        expect(velocityMagnitude).toBeCloseTo(ball.speed, 1);
      });
    });

    it('should handle missing effect data gracefully', () => {
      mockContext.effectData = null;

      const result = fastPowerUp.removeEffect(mockContext);

      expect(result.success).toBe(true);
      expect(result.modified).toBe(false);
    });

    it('should handle missing balls gracefully', () => {
      mockContext.gameEntities.balls = [];

      const result = fastPowerUp.removeEffect(mockContext);

      expect(result.success).toBe(true);
      expect(result.modified).toBe(false);
    });
  });

  describe('Effect Updates', () => {
    beforeEach(() => {
      fastPowerUp.applyEffect(mockContext);
    });

    it('should handle update calls without errors', () => {
      const result = fastPowerUp.updateEffect(mockContext);

      expect(result.success).toBe(true);
      expect(result.modified).toBe(false);
    });

    it('should correct velocity drift during updates', () => {
      // Simulate velocity drift
      mockBalls[0].velocity = { x: 250, y: 0 }; // Different from speed
      
      fastPowerUp.updateEffect(mockContext);

      const velocityMagnitude = Math.sqrt(mockBalls[0].velocity.x ** 2 + mockBalls[0].velocity.y ** 2);
      expect(velocityMagnitude).toBeCloseTo(mockBalls[0].speed, 1);
    });
  });

  describe('Conflict Handling', () => {
    it('should handle ball speed conflicts by replacing effect', () => {
      // Apply fast effect first
      fastPowerUp.applyEffect(mockContext);
      const fastSpeed = mockBalls[0].speed;

      // Simulate conflict with slow effect
      const result = slowPowerUp.handleConflict(PowerUpType.BallSpeed, mockContext);

      expect(result.success).toBe(true);
      expect(mockBalls[0].speed).not.toBe(fastSpeed);
    });

    it('should conflict with magnet power-up', () => {
      fastPowerUp.applyEffect(mockContext);

      const result = fastPowerUp.handleConflict(PowerUpType.Magnet, mockContext);

      expect(result.success).toBe(true);
      // Should remove speed effect due to conflict
    });

    it('should not conflict with other power-up types', () => {
      const result = fastPowerUp.handleConflict(PowerUpType.MultiBall, mockContext);

      expect(result.success).toBe(true);
      expect(result.modified).toBe(false);
    });
  });

  describe('Static Methods', () => {
    it('should return correct multipliers', () => {
      expect(BallSpeedPowerUp.getMultiplier(BallSpeedVariant.Fast)).toBe(1.5);
      expect(BallSpeedPowerUp.getMultiplier(BallSpeedVariant.Slow)).toBe(0.5);
    });

    it('should correctly check speed safety', () => {
      expect(BallSpeedPowerUp.isSpeedSafe(200, BallSpeedVariant.Fast)).toBe(true);
      expect(BallSpeedPowerUp.isSpeedSafe(600, BallSpeedVariant.Fast)).toBe(false);
      expect(BallSpeedPowerUp.isSpeedSafe(100, BallSpeedVariant.Slow)).toBe(true);
      expect(BallSpeedPowerUp.isSpeedSafe(80, BallSpeedVariant.Slow)).toBe(false);
    });

    it('should create correct variants through factory methods', () => {
      const fast = BallSpeedPowerUp.createFast();
      const slow = BallSpeedPowerUp.createSlow();

      expect(fast.name).toContain('fast');
      expect(slow.name).toContain('slow');
    });
  });

  describe('Performance', () => {
    it('should complete effect application within time budget', () => {
      const startTime = performance.now();
      
      fastPowerUp.applyEffect(mockContext);
      
      const elapsed = performance.now() - startTime;
      expect(elapsed).toBeLessThan(16); // 16ms frame budget
    });

    it('should track execution metrics', () => {
      fastPowerUp.applyEffect(mockContext);
      fastPowerUp.removeEffect(mockContext);

      const metrics = fastPowerUp.getPerformanceMetrics();
      expect(metrics.activations).toBe(1);
      expect(metrics.totalExecutionTime).toBeGreaterThan(0);
      expect(metrics.isInitialized).toBe(true);
    });
  });

  describe('Rollback Functionality', () => {
    it('should provide rollback function', () => {
      const result = fastPowerUp.applyEffect(mockContext);

      expect(result.success).toBe(true);
      expect(result.rollback).toBeDefined();
      expect(typeof result.rollback).toBe('function');
    });

    it('should rollback changes when rollback is called', () => {
      const originalSpeeds = mockBalls.map(ball => ball.speed);
      const result = fastPowerUp.applyEffect(mockContext);
      
      // Verify speeds changed
      mockBalls.forEach((ball, index) => {
        expect(ball.speed).toBeGreaterThan(originalSpeeds[index]);
      });

      if (result.rollback) {
        result.rollback();
      }

      // Verify speeds restored
      mockBalls.forEach((ball, index) => {
        expect(ball.speed).toBe(originalSpeeds[index]);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty balls array', () => {
      mockContext.gameEntities.balls = [];

      const result = fastPowerUp.applyEffect(mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle null balls array', () => {
      mockContext.gameEntities.balls = null as any;

      const result = fastPowerUp.applyEffect(mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle balls with zero velocity', () => {
      mockBalls[0].velocity = { x: 0, y: 0 };

      const result = fastPowerUp.applyEffect(mockContext);

      expect(result.success).toBe(true);
      
      // Should assign random direction with correct speed
      const velocityMagnitude = Math.sqrt(mockBalls[0].velocity.x ** 2 + mockBalls[0].velocity.y ** 2);
      expect(velocityMagnitude).toBeCloseTo(mockBalls[0].speed, 1);
    });

    it('should handle inactive balls', () => {
      mockBalls[0].active = false;

      const result = fastPowerUp.applyEffect(mockContext);

      expect(result.success).toBe(true);
      // Should only affect active balls
      expect(mockContext.effectData).toBeDefined();
      const effectData = mockContext.effectData as any;
      expect(effectData.affectedBallIds).toHaveLength(1); // Only second ball
    });

    it('should handle balls without IDs', () => {
      delete mockBalls[0].id;

      const result = fastPowerUp.applyEffect(mockContext);

      expect(result.success).toBe(true);
      expect(result.modified).toBe(true);
      
      const effectData = mockContext.effectData as any;
      expect(effectData.affectedBallIds).toContain('ball_0'); // Generated ID
    });
  });
});