import { PowerUpConflictResolver, ConflictRule } from '../PowerUpConflictResolver';
import { PowerUp, PowerUpType } from '../../entities/PowerUp';

describe('PowerUpConflictResolver', () => {
  let resolver: PowerUpConflictResolver;

  beforeEach(() => {
    resolver = new PowerUpConflictResolver();
  });

  describe('Conflict Resolution Strategies', () => {
    test('should override conflicting paddle size power-ups', () => {
      const largePaddle = new PowerUp(PowerUpType.PaddleSize, { x: 0, y: 0 }, 'large');
      largePaddle.id = 'large-paddle-1';
      largePaddle.activatedAt = Date.now() - 1000;

      const smallPaddle = new PowerUp(PowerUpType.PaddleSize, { x: 10, y: 10 }, 'small');
      smallPaddle.id = 'small-paddle-1';

      const resolution = resolver.resolveConflict(smallPaddle, [largePaddle]);

      expect(resolution.action).toBe('overridden');
      expect(resolution.removedPowerUps).toHaveLength(1);
      expect(resolution.removedPowerUps[0].id).toBe('large-paddle-1');
      expect(resolution.message).toContain('override');
    });

    test('should stack multi-ball power-ups up to limit', () => {
      const multiBall1 = new PowerUp(PowerUpType.MultiBall, { x: 0, y: 0 });
      multiBall1.id = 'multi-ball-1';
      multiBall1.activatedAt = Date.now() - 2000;

      const multiBall2 = new PowerUp(PowerUpType.MultiBall, { x: 10, y: 10 });
      multiBall2.id = 'multi-ball-2';
      multiBall2.activatedAt = Date.now() - 1000;

      const multiBall3 = new PowerUp(PowerUpType.MultiBall, { x: 20, y: 20 });
      multiBall3.id = 'multi-ball-3';

      // Should allow stacking up to 3
      const resolution1 = resolver.resolveConflict(multiBall3, [multiBall1, multiBall2]);
      expect(resolution1.action).toBe('stacked');
      expect(resolution1.removedPowerUps).toHaveLength(0);

      // Adding a 4th should remove the oldest
      const multiBall4 = new PowerUp(PowerUpType.MultiBall, { x: 30, y: 30 });
      multiBall4.id = 'multi-ball-4';

      const resolution2 = resolver.resolveConflict(multiBall4, [multiBall1, multiBall2, multiBall3]);
      expect(resolution2.action).toBe('stacked');
      expect(resolution2.removedPowerUps).toHaveLength(1);
      expect(resolution2.removedPowerUps[0].id).toBe('multi-ball-1'); // Oldest
    });

    test('should reject duplicate shield power-ups', () => {
      const shield1 = new PowerUp(PowerUpType.Shield, { x: 0, y: 0 });
      shield1.id = 'shield-1';

      const shield2 = new PowerUp(PowerUpType.Shield, { x: 10, y: 10 });
      shield2.id = 'shield-2';

      const resolution = resolver.resolveConflict(shield2, [shield1]);

      expect(resolution.action).toBe('rejected');
      expect(resolution.removedPowerUps).toHaveLength(0);
      expect(resolution.message).toContain('rejected');
    });

    test('should handle priority-based conflicts', () => {
      // Add a high-priority rule
      resolver.addConflictRule(PowerUpType.ExtraLife, {
        conflictingTypes: [PowerUpType.ExtraLife],
        resolutionStrategy: 'priority',
        priority: 10
      });

      const lowPriorityLife = new PowerUp(PowerUpType.ExtraLife, { x: 0, y: 0 });
      lowPriorityLife.id = 'low-priority';

      // Mock low priority for existing power-up
      resolver.addConflictRule(PowerUpType.ExtraLife, {
        conflictingTypes: [PowerUpType.ExtraLife],
        resolutionStrategy: 'priority',
        priority: 5
      });

      const highPriorityLife = new PowerUp(PowerUpType.ExtraLife, { x: 10, y: 10 });
      highPriorityLife.id = 'high-priority';

      // Reset to high priority rule
      resolver.addConflictRule(PowerUpType.ExtraLife, {
        conflictingTypes: [PowerUpType.ExtraLife],
        resolutionStrategy: 'priority',
        priority: 10
      });

      const resolution = resolver.resolveConflict(highPriorityLife, [lowPriorityLife]);
      
      expect(resolution.action).toBe('applied');
      expect(resolution.removedPowerUps).toHaveLength(1);
    });
  });

  describe('Configuration Validation', () => {
    test('should validate power-up configuration correctly', () => {
      const powerUps = [
        new PowerUp(PowerUpType.MultiBall, { x: 0, y: 0 }),
        new PowerUp(PowerUpType.MultiBall, { x: 10, y: 10 }),
        new PowerUp(PowerUpType.MultiBall, { x: 20, y: 20 })
      ];

      const validation = resolver.validatePowerUpConfiguration(powerUps);
      expect(validation.isValid).toBe(true);
      expect(validation.conflicts).toHaveLength(0);
    });

    test('should detect configuration violations', () => {
      const powerUps = [
        new PowerUp(PowerUpType.MultiBall, { x: 0, y: 0 }),
        new PowerUp(PowerUpType.MultiBall, { x: 10, y: 10 }),
        new PowerUp(PowerUpType.MultiBall, { x: 20, y: 20 }),
        new PowerUp(PowerUpType.MultiBall, { x: 30, y: 30 }) // 4th one exceeds limit of 3
      ];

      const validation = resolver.validatePowerUpConfiguration(powerUps);
      expect(validation.isValid).toBe(false);
      expect(validation.conflicts).toHaveLength(1);
      expect(validation.conflicts[0].type).toBe(PowerUpType.MultiBall);
      expect(validation.conflicts[0].count).toBe(4);
      expect(validation.conflicts[0].maxAllowed).toBe(3);
    });
  });

  describe('Custom Rules', () => {
    test('should allow adding custom conflict rules', () => {
      const customRule: ConflictRule = {
        conflictingTypes: [PowerUpType.ScoreMultiplier],
        resolutionStrategy: 'stack',
        maxStack: 5
      };

      resolver.addConflictRule(PowerUpType.ScoreMultiplier, customRule);
      
      const rule = resolver.getConflictRule(PowerUpType.ScoreMultiplier);
      expect(rule).toEqual(customRule);
    });

    test('should allow removing conflict rules', () => {
      const removed = resolver.removeConflictRule(PowerUpType.PaddleSize);
      expect(removed).toBe(true);

      const rule = resolver.getConflictRule(PowerUpType.PaddleSize);
      expect(rule).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty active power-ups list', () => {
      const powerUp = new PowerUp(PowerUpType.MultiBall, { x: 0, y: 0 });
      const resolution = resolver.resolveConflict(powerUp, []);

      expect(resolution.action).toBe('applied');
      expect(resolution.removedPowerUps).toHaveLength(0);
    });

    test('should handle power-up with no conflict rules', () => {
      // Create a power-up type that has no rules
      const unknownPowerUp = new PowerUp('unknown' as PowerUpType, { x: 0, y: 0 });
      const resolution = resolver.resolveConflict(unknownPowerUp, []);

      expect(resolution.action).toBe('applied');
      expect(resolution.removedPowerUps).toHaveLength(0);
    });

    test('should handle oldest power-up detection correctly', () => {
      const now = Date.now();
      
      const powerUp1 = new PowerUp(PowerUpType.MultiBall, { x: 0, y: 0 });
      powerUp1.id = 'power-up-1';
      powerUp1.activatedAt = now - 3000; // Oldest

      const powerUp2 = new PowerUp(PowerUpType.MultiBall, { x: 10, y: 10 });
      powerUp2.id = 'power-up-2';
      powerUp2.activatedAt = now - 2000;

      const powerUp3 = new PowerUp(PowerUpType.MultiBall, { x: 20, y: 20 });
      powerUp3.id = 'power-up-3';
      powerUp3.activatedAt = now - 1000; // Newest

      const newPowerUp = new PowerUp(PowerUpType.MultiBall, { x: 30, y: 30 });
      newPowerUp.id = 'new-power-up';

      const resolution = resolver.resolveConflict(newPowerUp, [powerUp1, powerUp2, powerUp3]);

      expect(resolution.action).toBe('stacked');
      expect(resolution.removedPowerUps).toHaveLength(1);
      expect(resolution.removedPowerUps[0].id).toBe('power-up-1'); // Should remove oldest
    });
  });
});