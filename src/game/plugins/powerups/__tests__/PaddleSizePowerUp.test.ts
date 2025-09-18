/**
 * Unit Tests for PaddleSizePowerUp Plugin
 * Story 4.2, Task 2: Test paddle size modification functionality
 */
import { PaddleSizePowerUp, PaddleSizeVariant } from '../PaddleSizePowerUp';
import { PowerUpPluginContext } from '../../PowerUpPlugin';
import { PowerUpType } from '../../../entities/PowerUp';

// Mock Paddle class for testing
class MockPaddle {
  public position = { x: 100, y: 400 };
  public size = { x: 80, y: 16 };
  public speed = 300;
  public color = '#ffffff';
  public maxX = 800;
  public active = true;
  public id = 'main_paddle';

  getBounds() {
    return {
      x: this.position.x,
      y: this.position.y,
      width: this.size.x,
      height: this.size.y
    };
  }

  updateConfig(config: { width?: number; height?: number }) {
    if (config.width !== undefined) this.size.x = config.width;
    if (config.height !== undefined) this.size.y = config.height;
  }
}

describe('PaddleSizePowerUp', () => {
  let largePowerUp: PaddleSizePowerUp;
  let smallPowerUp: PaddleSizePowerUp;
  let mockContext: PowerUpPluginContext;
  let mockPaddle: MockPaddle;

  beforeEach(async () => {
    largePowerUp = new PaddleSizePowerUp(PaddleSizeVariant.Large);
    smallPowerUp = new PaddleSizePowerUp(PaddleSizeVariant.Small);
    await largePowerUp.init();
    await smallPowerUp.init();

    // Create mock paddle
    mockPaddle = new MockPaddle();

    // Create mock context
    mockContext = {
      powerUpType: PowerUpType.PaddleSize,
      powerUpId: 'test-paddlesize',
      effectData: null,
      gameEntities: {
        balls: [],
        paddle: mockPaddle as any,
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
    await largePowerUp.destroy();
    await smallPowerUp.destroy();
  });

  describe('Initialization', () => {
    it('should initialize large variant correctly', () => {
      expect(largePowerUp.name).toBe('PaddleSizePowerUp_large');
      expect(largePowerUp.version).toBe('1.0.0');
      expect(largePowerUp.powerUpType).toBe(PowerUpType.PaddleSize);
    });

    it('should initialize small variant correctly', () => {
      expect(smallPowerUp.name).toBe('PaddleSizePowerUp_small');
      expect(smallPowerUp.version).toBe('1.0.0');
      expect(smallPowerUp.powerUpType).toBe(PowerUpType.PaddleSize);
    });

    it('should have correct metadata for large variant', () => {
      const metadata = largePowerUp.getMetadata();
      expect(metadata.type).toBe(PowerUpType.PaddleSize);
      expect(metadata.rarity).toBe('common');
      expect(metadata.duration).toBe(20000);
      expect(metadata.icon).toBe('🏓');
      expect(metadata.color).toBe('#4ecdc4');
    });

    it('should have correct metadata for small variant', () => {
      const metadata = smallPowerUp.getMetadata();
      expect(metadata.type).toBe(PowerUpType.PaddleSize);
      expect(metadata.rarity).toBe('common');
      expect(metadata.duration).toBe(20000);
      expect(metadata.icon).toBe('🏓');
      expect(metadata.color).toBe('#ff9f43');
    });
  });

  describe('Large Paddle Effect', () => {
    it('should increase paddle size when applied', () => {
      const originalWidth = mockPaddle.size.x;
      const originalHeight = mockPaddle.size.y;

      const result = largePowerUp.applyEffect(mockContext);

      expect(result.success).toBe(true);
      expect(result.modified).toBe(true);
      expect(mockPaddle.size.x).toBeGreaterThan(originalWidth);
      expect(mockPaddle.size.y).toBeGreaterThan(originalHeight);
    });

    it('should apply correct size multiplier', () => {
      const originalWidth = mockPaddle.size.x;
      const expectedWidth = originalWidth * PaddleSizePowerUp.getMultiplier(PaddleSizeVariant.Large);

      largePowerUp.applyEffect(mockContext);

      expect(mockPaddle.size.x).toBeCloseTo(expectedWidth, 1);
    });

    it('should store original size for rollback', () => {
      const originalWidth = mockPaddle.size.x;
      const originalHeight = mockPaddle.size.y;

      largePowerUp.applyEffect(mockContext);

      expect(mockContext.effectData).toBeDefined();
      const effectData = mockContext.effectData as any;
      expect(effectData.originalWidth).toBe(originalWidth);
      expect(effectData.originalHeight).toBe(originalHeight);
      expect(effectData.variant).toBe(PaddleSizeVariant.Large);
    });

    it('should restore original size when removed', () => {
      const originalWidth = mockPaddle.size.x;
      const originalHeight = mockPaddle.size.y;

      largePowerUp.applyEffect(mockContext);
      expect(mockPaddle.size.x).toBeGreaterThan(originalWidth);

      const result = largePowerUp.removeEffect(mockContext);

      expect(result.success).toBe(true);
      expect(result.modified).toBe(true);
      expect(mockPaddle.size.x).toBe(originalWidth);
      expect(mockPaddle.size.y).toBe(originalHeight);
    });
  });

  describe('Small Paddle Effect', () => {
    it('should decrease paddle size when applied', () => {
      const originalWidth = mockPaddle.size.x;
      const originalHeight = mockPaddle.size.y;

      const result = smallPowerUp.applyEffect(mockContext);

      expect(result.success).toBe(true);
      expect(result.modified).toBe(true);
      expect(mockPaddle.size.x).toBeLessThan(originalWidth);
      expect(mockPaddle.size.y).toBeLessThan(originalHeight);
    });

    it('should apply correct size multiplier', () => {
      const originalWidth = mockPaddle.size.x;
      const expectedWidth = originalWidth * PaddleSizePowerUp.getMultiplier(PaddleSizeVariant.Small);

      smallPowerUp.applyEffect(mockContext);

      expect(mockPaddle.size.x).toBeCloseTo(expectedWidth, 1);
    });

    it('should not make paddle too small', () => {
      // Set paddle to a size that would become too small
      mockPaddle.size.x = 40; // Would become 30px, which is exactly the minimum

      const result = smallPowerUp.applyEffect(mockContext);

      expect(result.success).toBe(true);
      expect(mockPaddle.size.x).toBeGreaterThanOrEqual(30); // MIN_PADDLE_WIDTH
    });

    it('should skip effect if paddle would be too small', () => {
      // Set paddle to a size that would become too small
      mockPaddle.size.x = 35; // Would become 26.25px, below minimum

      const result = smallPowerUp.applyEffect(mockContext);

      expect(result.success).toBe(true);
      expect(result.modified).toBe(false);
      expect(mockPaddle.size.x).toBe(35); // Unchanged
    });
  });

  describe('Position Adjustment', () => {
    it('should adjust paddle position when it goes off right edge', () => {
      mockPaddle.position.x = 750; // Near right edge
      mockPaddle.size.x = 80;

      largePowerUp.applyEffect(mockContext);

      const bounds = mockPaddle.getBounds();
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(mockPaddle.maxX);
    });

    it('should adjust paddle position when it goes off left edge', () => {
      mockPaddle.position.x = -10; // Off left edge

      largePowerUp.applyEffect(mockContext);

      expect(mockPaddle.position.x).toBeGreaterThanOrEqual(0);
    });

    it('should handle edge case where paddle is exactly at boundary', () => {
      mockPaddle.position.x = mockPaddle.maxX - mockPaddle.size.x;

      largePowerUp.applyEffect(mockContext);

      const bounds = mockPaddle.getBounds();
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(mockPaddle.maxX);
    });
  });

  describe('Effect Removal', () => {
    it('should handle missing effect data gracefully', () => {
      mockContext.effectData = null;

      const result = largePowerUp.removeEffect(mockContext);

      expect(result.success).toBe(true);
      expect(result.modified).toBe(false);
    });

    it('should handle missing paddle gracefully', () => {
      largePowerUp.applyEffect(mockContext);
      mockContext.gameEntities.paddle = null;

      const result = largePowerUp.removeEffect(mockContext);

      expect(result.success).toBe(true);
      expect(result.modified).toBe(false);
    });

    it('should handle inactive paddle gracefully', () => {
      largePowerUp.applyEffect(mockContext);
      mockPaddle.active = false;

      const result = largePowerUp.removeEffect(mockContext);

      expect(result.success).toBe(true);
      expect(result.modified).toBe(false);
    });
  });

  describe('Conflict Handling', () => {
    it('should handle paddle size conflicts by replacing effect', () => {
      // Apply large effect first
      largePowerUp.applyEffect(mockContext);
      const largeWidth = mockPaddle.size.x;

      // Simulate conflict with small effect
      const result = smallPowerUp.handleConflict(PowerUpType.PaddleSize, mockContext);

      expect(result.success).toBe(true);
      expect(mockPaddle.size.x).not.toBe(largeWidth);
    });

    it('should not conflict with other power-up types', () => {
      const result = largePowerUp.handleConflict(PowerUpType.MultiBall, mockContext);

      expect(result.success).toBe(true);
      expect(result.modified).toBe(false);
    });
  });

  describe('Static Methods', () => {
    it('should return correct multipliers', () => {
      expect(PaddleSizePowerUp.getMultiplier(PaddleSizeVariant.Large)).toBe(1.5);
      expect(PaddleSizePowerUp.getMultiplier(PaddleSizeVariant.Small)).toBe(0.75);
    });

    it('should correctly check if paddle would be too small', () => {
      expect(PaddleSizePowerUp.wouldBeTooSmall(40, PaddleSizeVariant.Small)).toBe(true);
      expect(PaddleSizePowerUp.wouldBeTooSmall(50, PaddleSizeVariant.Small)).toBe(false);
      expect(PaddleSizePowerUp.wouldBeTooSmall(40, PaddleSizeVariant.Large)).toBe(false);
    });

    it('should create correct variants through factory methods', () => {
      const large = PaddleSizePowerUp.createLarge();
      const small = PaddleSizePowerUp.createSmall();

      expect(large.name).toContain('large');
      expect(small.name).toContain('small');
    });
  });

  describe('Performance', () => {
    it('should complete effect application within time budget', () => {
      const startTime = performance.now();
      
      largePowerUp.applyEffect(mockContext);
      
      const elapsed = performance.now() - startTime;
      expect(elapsed).toBeLessThan(16); // 16ms frame budget
    });

    it('should track execution metrics', () => {
      largePowerUp.applyEffect(mockContext);
      largePowerUp.removeEffect(mockContext);

      const metrics = largePowerUp.getPerformanceMetrics();
      expect(metrics.activations).toBe(1);
      expect(metrics.totalExecutionTime).toBeGreaterThan(0);
      expect(metrics.isInitialized).toBe(true);
    });
  });

  describe('Rollback Functionality', () => {
    it('should provide rollback function', () => {
      const result = largePowerUp.applyEffect(mockContext);

      expect(result.success).toBe(true);
      expect(result.rollback).toBeDefined();
      expect(typeof result.rollback).toBe('function');
    });

    it('should rollback changes when rollback is called', () => {
      const originalWidth = mockPaddle.size.x;
      const result = largePowerUp.applyEffect(mockContext);
      
      expect(mockPaddle.size.x).toBeGreaterThan(originalWidth);

      if (result.rollback) {
        result.rollback();
      }

      expect(mockPaddle.size.x).toBe(originalWidth);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null paddle', () => {
      mockContext.gameEntities.paddle = null;

      const result = largePowerUp.applyEffect(mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle inactive paddle', () => {
      mockPaddle.active = false;

      const result = largePowerUp.applyEffect(mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle paddle with zero size', () => {
      mockPaddle.size.x = 0;
      mockPaddle.size.y = 0;

      const result = largePowerUp.applyEffect(mockContext);

      expect(result.success).toBe(true);
      expect(mockPaddle.size.x).toBeGreaterThan(0);
      expect(mockPaddle.size.y).toBeGreaterThan(0);
    });

    it('should handle paddle with extreme position', () => {
      mockPaddle.position.x = 10000;

      const result = largePowerUp.applyEffect(mockContext);

      expect(result.success).toBe(true);
      expect(mockPaddle.position.x).toBeLessThan(mockPaddle.maxX);
    });
  });
});