import { PowerUpValidator, ValidationContext, ValidationRule } from '../PowerUpValidator';
import { PowerUp, PowerUpType } from '../../entities/PowerUp';

describe('PowerUpValidator', () => {
  let validator: PowerUpValidator;
  let mockContext: ValidationContext;

  beforeEach(() => {
    validator = new PowerUpValidator();
    mockContext = {
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
  });

  describe('Default Validation Rules', () => {
    test('should validate power-up within limits', () => {
      const powerUp = new PowerUp(PowerUpType.MultiBall, { x: 10, y: 20 });
      powerUp.duration = 5000;
      powerUp.remainingTime = 3000;

      const result = validator.validatePowerUp(powerUp, mockContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    test('should reject power-up exceeding maximum limit', () => {
      mockContext.gameConfig.maxPowerUpsActive = 2;
      mockContext.activePowerUps = [
        new PowerUp(PowerUpType.MultiBall, { x: 0, y: 0 }),
        new PowerUp(PowerUpType.Shield, { x: 10, y: 10 })
      ];

      const powerUp = new PowerUp(PowerUpType.PaddleSize, { x: 20, y: 20 });
      const result = validator.validatePowerUp(powerUp, mockContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Maximum power-ups limit reached');
    });

    test('should reject invalid power-up type', () => {
      const powerUp = new PowerUp('invalid-type' as PowerUpType, { x: 0, y: 0 });
      const result = validator.validatePowerUp(powerUp, mockContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Invalid power-up type');
    });

    test('should warn about negative duration', () => {
      const powerUp = new PowerUp(PowerUpType.MultiBall, { x: 0, y: 0 });
      powerUp.duration = -1000;

      const result = validator.validatePowerUp(powerUp, mockContext);

      expect(result.isValid).toBe(false);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('duration cannot be negative');
    });

    test('should warn about excessive duration', () => {
      const powerUp = new PowerUp(PowerUpType.MultiBall, { x: 0, y: 0 });
      powerUp.duration = 400000; // Over 5 minutes

      const result = validator.validatePowerUp(powerUp, mockContext);

      expect(result.isValid).toBe(false);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('exceeds maximum allowed');
    });

    test('should warn about negative position coordinates', () => {
      const powerUp = new PowerUp(PowerUpType.MultiBall, { x: -10, y: -5 });
      const result = validator.validatePowerUp(powerUp, mockContext);

      expect(result.isValid).toBe(false);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('negative coordinates');
    });

    test('should reject remaining time exceeding duration', () => {
      const powerUp = new PowerUp(PowerUpType.MultiBall, { x: 0, y: 0 });
      powerUp.duration = 3000;
      powerUp.remainingTime = 5000;

      const result = validator.validatePowerUp(powerUp, mockContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Remaining time cannot exceed total duration');
    });

    test('should warn when stacking is disabled', () => {
      mockContext.gameConfig.allowStacking = false;
      mockContext.activePowerUps = [
        new PowerUp(PowerUpType.MultiBall, { x: 0, y: 0 })
      ];

      const powerUp = new PowerUp(PowerUpType.MultiBall, { x: 10, y: 10 });
      const result = validator.validatePowerUp(powerUp, mockContext);

      expect(result.isValid).toBe(false);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('Stacking is disabled');
    });

    test('should warn about maximum lives limit', () => {
      mockContext.playerState.lives = 10;

      const powerUp = new PowerUp(PowerUpType.ExtraLife, { x: 0, y: 0 });
      const result = validator.validatePowerUp(powerUp, mockContext);

      expect(result.isValid).toBe(false);
      expect(result.results.some(r => r.severity === 'info')).toBe(true);
    });

    test('should warn about excessive score multiplier', () => {
      // Add 19 score multipliers to context
      mockContext.activePowerUps = Array.from({ length: 19 }, (_, i) => 
        new PowerUp(PowerUpType.ScoreMultiplier, { x: i, y: 0 })
      );

      const powerUp = new PowerUp(PowerUpType.ScoreMultiplier, { x: 20, y: 0 });
      const result = validator.validatePowerUp(powerUp, mockContext);

      expect(result.isValid).toBe(false);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('exceed reasonable limits');
    });
  });

  describe('Custom Validation Rules', () => {
    test('should allow adding custom validation rules', () => {
      const customRule: ValidationRule = {
        name: 'custom_test_rule',
        severity: 'error',
        validate: (powerUp, context) => ({
          isValid: powerUp.position.x < 100,
          message: 'X position must be less than 100'
        })
      };

      validator.addValidationRule(customRule);

      const powerUp = new PowerUp(PowerUpType.MultiBall, { x: 150, y: 0 });
      const result = validator.validatePowerUp(powerUp, mockContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('X position must be less than 100');
    });

    test('should allow removing validation rules', () => {
      const removed = validator.removeValidationRule('valid_duration');
      expect(removed).toBe(true);

      const powerUp = new PowerUp(PowerUpType.MultiBall, { x: 0, y: 0 });
      powerUp.duration = -1000;

      const result = validator.validatePowerUp(powerUp, mockContext);
      
      // Should not warn about negative duration anymore
      expect(result.warnings.some(w => w.includes('duration'))).toBe(false);
    });

    test('should list all validation rules', () => {
      const rules = validator.listValidationRules();
      
      expect(rules).toContain('max_active_limit');
      expect(rules).toContain('valid_type');
      expect(rules).toContain('valid_duration');
      expect(rules).toContain('valid_position');
    });
  });

  describe('Batch Validation', () => {
    test('should validate multiple power-ups', () => {
      const powerUps = [
        new PowerUp(PowerUpType.MultiBall, { x: 0, y: 0 }),
        new PowerUp(PowerUpType.Shield, { x: 10, y: 10 }),
        new PowerUp(PowerUpType.PaddleSize, { x: 20, y: 20 })
      ];

      const result = validator.validateBatch(powerUps, mockContext);

      expect(result.overallValid).toBe(true);
      expect(result.individualResults.size).toBe(3);
      expect(result.batchErrors).toHaveLength(0);
    });

    test('should detect batch-level errors', () => {
      mockContext.gameConfig.allowStacking = false;

      const powerUps = [
        new PowerUp(PowerUpType.MultiBall, { x: 0, y: 0 }),
        new PowerUp(PowerUpType.MultiBall, { x: 10, y: 10 }) // Duplicate type
      ];

      const result = validator.validateBatch(powerUps, mockContext);

      expect(result.overallValid).toBe(false);
      expect(result.batchErrors).toHaveLength(1);
      expect(result.batchErrors[0]).toContain('Duplicate power-up types');
    });
  });

  describe('Auto-Fix Functionality', () => {
    test('should auto-fix negative duration', () => {
      const powerUp = new PowerUp(PowerUpType.MultiBall, { x: 0, y: 0 });
      powerUp.duration = -1000;
      powerUp.remainingTime = 500;

      const result = validator.autoFixPowerUp(powerUp, mockContext);

      expect(result.fixed).toBe(true);
      expect(result.modifications).toContain('Fixed duration: -1000 -> 0');
      expect(result.fixedPowerUp.duration).toBe(0);
      expect(result.fixedPowerUp.remainingTime).toBe(0); // Should be clamped
    });

    test('should auto-fix negative position', () => {
      const powerUp = new PowerUp(PowerUpType.MultiBall, { x: -10, y: -5 });

      const result = validator.autoFixPowerUp(powerUp, mockContext);

      expect(result.fixed).toBe(true);
      expect(result.modifications).toContain('Fixed position: (-10, -5) -> (0, 0)');
      expect(result.fixedPowerUp.position).toEqual({ x: 0, y: 0 });
    });

    test('should auto-fix remaining time inconsistency', () => {
      const powerUp = new PowerUp(PowerUpType.MultiBall, { x: 0, y: 0 });
      powerUp.duration = 3000;
      powerUp.remainingTime = 5000;

      const result = validator.autoFixPowerUp(powerUp, mockContext);

      expect(result.fixed).toBe(true);
      expect(result.modifications).toContain('Fixed remaining time: 5000 -> 3000');
      expect(result.fixedPowerUp.remainingTime).toBe(3000);
    });

    test('should not fix when no auto-fix available', () => {
      const powerUp = new PowerUp('invalid' as PowerUpType, { x: 0, y: 0 });

      const result = validator.autoFixPowerUp(powerUp, mockContext);

      expect(result.fixed).toBe(false);
      expect(result.modifications).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle validation rule exceptions', () => {
      const faultyRule: ValidationRule = {
        name: 'faulty_rule',
        severity: 'error',
        validate: () => {
          throw new Error('Validation error');
        }
      };

      validator.addValidationRule(faultyRule);

      const powerUp = new PowerUp(PowerUpType.MultiBall, { x: 0, y: 0 });
      const result = validator.validatePowerUp(powerUp, mockContext);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Validation rule faulty_rule threw an error: Error: Validation error');
    });

    test('should continue validation after rule exception', () => {
      const faultyRule: ValidationRule = {
        name: 'faulty_rule',
        severity: 'error',
        validate: () => {
          throw new Error('Validation error');
        }
      };

      validator.addValidationRule(faultyRule);

      const powerUp = new PowerUp(PowerUpType.MultiBall, { x: 0, y: 0 });
      powerUp.duration = -1000; // This should still be caught by other rules

      const result = validator.validatePowerUp(powerUp, mockContext);

      expect(result.errors.length).toBeGreaterThan(1); // Should have both errors
    });
  });
});