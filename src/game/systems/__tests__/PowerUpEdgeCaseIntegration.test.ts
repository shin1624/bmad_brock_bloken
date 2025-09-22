import { PowerUpStateManager, GameState } from '../PowerUpStateManager';
import { PowerUpConflictResolver } from '../PowerUpConflictResolver';
import { PowerUpValidator, ValidationContext } from '../PowerUpValidator';
import { PowerUp, PowerUpType } from '../../entities/PowerUp';

describe('Power-Up Edge Case Integration Tests', () => {
  let stateManager: PowerUpStateManager;
  let conflictResolver: PowerUpConflictResolver;
  let validator: PowerUpValidator;
  let validationContext: ValidationContext;

  beforeEach(() => {
    conflictResolver = new PowerUpConflictResolver();
    stateManager = new PowerUpStateManager(conflictResolver);
    validator = new PowerUpValidator();

    validationContext = {
      activePowerUps: [],
      gameState: 'playing',
      playerState: {
        lives: 3,
        score: 1000,
        level: 1
      },
      gameConfig: {
        maxPowerUpsActive: 10,
        allowStacking: true,
        debugMode: false
      }
    };

    stateManager.handleStateTransition(GameState.MENU, GameState.PLAYING);
  });

  describe('Complex Conflict Scenarios', () => {
    test('should handle rapid conflicting power-up additions', () => {
      // Add large paddle
      const largePaddle = new PowerUp(PowerUpType.PaddleSize, { x: 0, y: 0 }, 'large');
      largePaddle.duration = 5000;
      largePaddle.remainingTime = 5000;

      let resolution = stateManager.addPowerUp(largePaddle);
      expect(resolution.action).toBe('applied');

      // Immediately add small paddle (should override)
      const smallPaddle = new PowerUp(PowerUpType.PaddleSize, { x: 10, y: 10 }, 'small');
      smallPaddle.duration = 3000;
      smallPaddle.remainingTime = 3000;

      resolution = stateManager.addPowerUp(smallPaddle);
      expect(resolution.action).toBe('overridden');
      expect(resolution.removedPowerUps).toHaveLength(1);

      // Verify only small paddle remains
      const activePowerUps = stateManager.getActivePowerUps();
      expect(activePowerUps).toHaveLength(1);
      expect(activePowerUps[0].variant).toBe('small');
    });

    test('should handle multi-ball stacking edge cases', () => {
      const multiBalls: PowerUp[] = [];

      // Add 4 multi-ball power-ups (exceeds limit of 3)
      for (let i = 0; i < 4; i++) {
        const multiBall = new PowerUp(PowerUpType.MultiBall, { x: i * 10, y: 0 });
        multiBall.id = `multi-ball-${i}`;
        multiBall.activatedAt = Date.now() - (1000 * (4 - i)); // Oldest first
        multiBalls.push(multiBall);

        const resolution = stateManager.addPowerUp(multiBall);
        
        if (i < 3) {
          expect(resolution.action).toBe('stacked');
          expect(resolution.removedPowerUps).toHaveLength(0);
        } else {
          // 4th should cause oldest to be removed
          expect(resolution.action).toBe('stacked');
          expect(resolution.removedPowerUps).toHaveLength(1);
          expect(resolution.removedPowerUps[0].id).toBe('multi-ball-0');
        }
      }

      // Verify final state
      const activePowerUps = stateManager.getActivePowerUps();
      expect(activePowerUps).toHaveLength(3);
      expect(activePowerUps.map(p => p.id)).not.toContain('multi-ball-0');
    });

    test('should handle conflicting power-ups during state transitions', () => {
      // Add power-ups while playing
      const multiBall = new PowerUp(PowerUpType.MultiBall, { x: 0, y: 0 });
      const shield = new PowerUp(PowerUpType.Shield, { x: 10, y: 10 });
      const scoreMultiplier = new PowerUp(PowerUpType.ScoreMultiplier, { x: 20, y: 20 });

      stateManager.addPowerUp(multiBall);
      stateManager.addPowerUp(shield);
      stateManager.addPowerUp(scoreMultiplier);

      expect(stateManager.getActivePowerUps()).toHaveLength(3);

      // Transition to level complete (should preserve only score multiplier)
      stateManager.handleStateTransition(GameState.PLAYING, GameState.LEVEL_COMPLETE);

      const preservedPowerUps = stateManager.getActivePowerUps();
      expect(preservedPowerUps).toHaveLength(1);
      expect(preservedPowerUps[0].type).toBe(PowerUpType.ScoreMultiplier);

      // Add conflicting power-up during level complete (should be rejected)
      const newMultiBall = new PowerUp(PowerUpType.MultiBall, { x: 30, y: 30 });
      const resolution = stateManager.addPowerUp(newMultiBall);
      
      expect(resolution.action).toBe('rejected');
      expect(resolution.message).toContain('during gameplay');
    });
  });

  describe('Validation Integration Scenarios', () => {
    test('should integrate validation with conflict resolution', () => {
      // Create power-up with validation issues
      const invalidPowerUp = new PowerUp(PowerUpType.MultiBall, { x: -10, y: -5 });
      invalidPowerUp.duration = -1000;
      invalidPowerUp.remainingTime = 2000; // Exceeds duration

      validationContext.activePowerUps = stateManager.getActivePowerUps();

      // Validate first
      const validation = validator.validatePowerUp(invalidPowerUp, validationContext);
      expect(validation.isValid).toBe(false);

      // Auto-fix the power-up
      const fixResult = validator.autoFixPowerUp(invalidPowerUp, validationContext);
      expect(fixResult.fixed).toBe(true);

      // Now try to add the fixed power-up
      const resolution = stateManager.addPowerUp(fixResult.fixedPowerUp);
      expect(resolution.action).toBe('applied');
    });

    test('should handle validation during batch power-up operations', () => {
      const powerUps = [
        new PowerUp(PowerUpType.MultiBall, { x: 0, y: 0 }),
        new PowerUp(PowerUpType.Shield, { x: 10, y: 10 }),
        new PowerUp(PowerUpType.PaddleSize, { x: -5, y: 5 }), // Invalid position
      ];

      // Set duration issues
      powerUps[0].duration = -500;
      powerUps[2].remainingTime = 10000;
      powerUps[2].duration = 5000;

      validationContext.activePowerUps = stateManager.getActivePowerUps();

      // Batch validate
      const batchValidation = validator.validateBatch(powerUps, validationContext);
      expect(batchValidation.overallValid).toBe(false);

      // Fix invalid power-ups
      const fixedPowerUps = powerUps.map(powerUp => {
        const fixResult = validator.autoFixPowerUp(powerUp, validationContext);
        return fixResult.fixed ? fixResult.fixedPowerUp : powerUp;
      });

      // Add fixed power-ups
      fixedPowerUps.forEach(powerUp => {
        const resolution = stateManager.addPowerUp(powerUp);
        expect(resolution.action).toBe('applied');
      });

      expect(stateManager.getActivePowerUps()).toHaveLength(3);
    });
  });

  describe('State Management Edge Cases', () => {
    test('should handle rapid state transitions with active power-ups', () => {
      // Add power-ups
      const powerUps = [
        new PowerUp(PowerUpType.MultiBall, { x: 0, y: 0 }),
        new PowerUp(PowerUpType.Shield, { x: 10, y: 10 }),
        new PowerUp(PowerUpType.ScoreMultiplier, { x: 20, y: 20 })
      ];

      powerUps.forEach(p => {
        p.duration = 5000;
        p.remainingTime = 3000;
        stateManager.addPowerUp(p);
      });

      // Rapid transitions: Playing -> Paused -> Playing -> Game Over
      stateManager.handleStateTransition(GameState.PLAYING, GameState.PAUSED);
      expect(stateManager.getActivePowerUps()).toHaveLength(0); // Paused

      stateManager.handleStateTransition(GameState.PAUSED, GameState.PLAYING);
      expect(stateManager.getActivePowerUps()).toHaveLength(3); // Restored

      stateManager.handleStateTransition(GameState.PLAYING, GameState.GAME_OVER);
      expect(stateManager.getActivePowerUps()).toHaveLength(0); // Cleared

      // Verify configuration is valid after transitions
      const validation = stateManager.validateConfiguration();
      expect(validation.isValid).toBe(true);
    });

    test('should handle memory leaks during state transitions', () => {
      // Create many power-ups and transition repeatedly
      for (let cycle = 0; cycle < 10; cycle++) {
        // Add power-ups
        for (let i = 0; i < 5; i++) {
          const powerUp = new PowerUp(PowerUpType.MultiBall, { x: i, y: cycle });
          powerUp.id = `cycle-${cycle}-powerup-${i}`;
          stateManager.addPowerUp(powerUp);
        }

        // Transition to pause and back
        stateManager.handleStateTransition(GameState.PLAYING, GameState.PAUSED);
        stateManager.handleStateTransition(GameState.PAUSED, GameState.PLAYING);

        // Clear for next cycle
        stateManager.handleStateTransition(GameState.PLAYING, GameState.MENU);
        stateManager.handleStateTransition(GameState.MENU, GameState.PLAYING);
      }

      // Verify no memory leaks (all power-ups should be cleared)
      expect(stateManager.getActivePowerUps()).toHaveLength(0);
      
      const validation = stateManager.validateConfiguration();
      expect(validation.isValid).toBe(true);
    });
  });

  describe('Emergency Recovery Scenarios', () => {
    test('should handle corrupted power-up state recovery', () => {
      // Add normal power-ups
      const normalPowerUps = [
        new PowerUp(PowerUpType.MultiBall, { x: 0, y: 0 }),
        new PowerUp(PowerUpType.Shield, { x: 10, y: 10 })
      ];

      normalPowerUps.forEach(p => stateManager.addPowerUp(p));

      // Simulate corrupted state by adding invalid power-up manually
      const corruptedPowerUp = new PowerUp('corrupted' as PowerUpType, { x: -100, y: -100 });
      corruptedPowerUp.duration = -5000;
      corruptedPowerUp.remainingTime = 10000;
      corruptedPowerUp.id = 'corrupted-powerup';

      // Force add corrupted power-up (bypassing normal validation)
      (stateManager as unknown).activePowerUps.set(corruptedPowerUp.id, corruptedPowerUp);

      // Detect corruption
      const validation = stateManager.validateConfiguration();
      expect(validation.isValid).toBe(false);

      // Emergency recovery
      stateManager.emergencyDeactivatePowerUp('corrupted-powerup');

      // Verify recovery
      const postRecoveryValidation = stateManager.validateConfiguration();
      expect(postRecoveryValidation.isValid).toBe(true);
      expect(stateManager.getActivePowerUps()).toHaveLength(2); // Normal power-ups remain
    });

    test('should handle complete system reset when needed', () => {
      // Create complex state with multiple power-ups
      const powerUps = Array.from({ length: 8 }, (_, i) => {
        const powerUp = new PowerUp(
          i % 2 === 0 ? PowerUpType.MultiBall : PowerUpType.ScoreMultiplier,
          { x: i * 10, y: i * 5 }
        );
        powerUp.id = `powerup-${i}`;
        return powerUp;
      });

      powerUps.forEach(p => stateManager.addPowerUp(p));

      // Transition to paused to create paused state
      stateManager.handleStateTransition(GameState.PLAYING, GameState.PAUSED);

      // Verify complex state
      expect(stateManager.getCurrentState()).toBe(GameState.PAUSED);
      expect(stateManager.getActivePowerUps()).toHaveLength(0);

      // Emergency reset
      stateManager.emergencyReset();

      // Verify complete reset
      expect(stateManager.getCurrentState()).toBe(GameState.MENU);
      expect(stateManager.getActivePowerUps()).toHaveLength(0);
      
      const validation = stateManager.validateConfiguration();
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('Performance Edge Cases', () => {
    test('should handle large numbers of power-ups efficiently', () => {
      const startTime = Date.now();
      
      // Add many power-ups
      for (let i = 0; i < 100; i++) {
        const powerUp = new PowerUp(PowerUpType.ScoreMultiplier, { x: i, y: 0 });
        powerUp.id = `perf-test-${i}`;
        powerUp.duration = 1000 + i;
        powerUp.remainingTime = 500 + i;
        
        // This should be efficient even with many power-ups
        stateManager.addPowerUp(powerUp);
      }

      const addTime = Date.now() - startTime;
      expect(addTime).toBeLessThan(1000); // Should complete within 1 second

      // Test bulk operations
      const updateStartTime = Date.now();
      const expired = stateManager.updatePowerUps(1000);
      const updateTime = Date.now() - updateStartTime;

      expect(updateTime).toBeLessThan(100); // Should be very fast
      expect(expired.length).toBeGreaterThan(0);
    });

    test('should handle power-up updates with extreme time deltas', () => {
      const powerUp = new PowerUp(PowerUpType.MultiBall, { x: 0, y: 0 });
      powerUp.duration = 5000;
      powerUp.remainingTime = 5000;

      stateManager.addPowerUp(powerUp);

      // Update with extremely large delta (e.g., game was paused for hours)
      const expired = stateManager.updatePowerUps(1000000); // 1000 seconds

      expect(expired).toHaveLength(1);
      expect(expired[0]).toBe(powerUp);
      expect(stateManager.getActivePowerUps()).toHaveLength(0);
    });
  });
});