import { PowerUp, PowerUpType } from '../entities/PowerUp';

export interface ValidationRule {
  name: string;
  validate: (powerUp: PowerUp, context: ValidationContext) => ValidationResult;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationContext {
  activePowerUps: PowerUp[];
  gameState: string;
  playerState: {
    lives: number;
    score: number;
    level: number;
  };
  gameConfig: {
    maxPowerUpsActive: number;
    allowStacking: boolean;
    debugMode: boolean;
  };
}

export interface ValidationResult {
  isValid: boolean;
  message?: string;
  suggestedAction?: 'allow' | 'deny' | 'modify' | 'warn';
  metadata?: Record<string, unknown>;
}

export class PowerUpValidator {
  private validationRules: Map<string, ValidationRule> = new Map();

  constructor() {
    this.initializeDefaultRules();
  }

  private initializeDefaultRules(): void {
    // Rule 1: Check maximum active power-ups limit
    this.addValidationRule({
      name: 'max_active_limit',
      severity: 'error',
      validate: (powerUp: PowerUp, context: ValidationContext): ValidationResult => {
        if (context.activePowerUps.length >= context.gameConfig.maxPowerUpsActive) {
          return {
            isValid: false,
            message: `Maximum power-ups limit reached (${context.gameConfig.maxPowerUpsActive})`,
            suggestedAction: 'deny'
          };
        }
        return { isValid: true };
      }
    });

    // Rule 2: Validate power-up type exists
    this.addValidationRule({
      name: 'valid_type',
      severity: 'error',
      validate: (powerUp: PowerUp, context: ValidationContext): ValidationResult => {
        if (!Object.values(PowerUpType).includes(powerUp.type)) {
          return {
            isValid: false,
            message: `Invalid power-up type: ${powerUp.type}`,
            suggestedAction: 'deny'
          };
        }
        return { isValid: true };
      }
    });

    // Rule 3: Check duration validity
    this.addValidationRule({
      name: 'valid_duration',
      severity: 'warning',
      validate: (powerUp: PowerUp, context: ValidationContext): ValidationResult => {
        if (powerUp.duration < 0) {
          return {
            isValid: false,
            message: 'Power-up duration cannot be negative',
            suggestedAction: 'modify',
            metadata: { suggestedDuration: 0 }
          };
        }
        
        if (powerUp.duration > 300000) { // 5 minutes
          return {
            isValid: false,
            message: 'Power-up duration exceeds maximum allowed (5 minutes)',
            suggestedAction: 'warn',
            metadata: { maxDuration: 300000 }
          };
        }
        
        return { isValid: true };
      }
    });

    // Rule 4: Validate position bounds
    this.addValidationRule({
      name: 'valid_position',
      severity: 'warning',
      validate: (powerUp: PowerUp, context: ValidationContext): ValidationResult => {
        if (powerUp.position.x < 0 || powerUp.position.y < 0) {
          return {
            isValid: false,
            message: 'Power-up position cannot have negative coordinates',
            suggestedAction: 'modify',
            metadata: { 
              suggestedPosition: { 
                x: Math.max(0, powerUp.position.x), 
                y: Math.max(0, powerUp.position.y) 
              }
            }
          };
        }
        return { isValid: true };
      }
    });

    // Rule 5: Check remaining time consistency
    this.addValidationRule({
      name: 'remaining_time_consistency',
      severity: 'error',
      validate: (powerUp: PowerUp, context: ValidationContext): ValidationResult => {
        if (powerUp.remainingTime > powerUp.duration) {
          return {
            isValid: false,
            message: 'Remaining time cannot exceed total duration',
            suggestedAction: 'modify',
            metadata: { suggestedRemainingTime: powerUp.duration }
          };
        }
        return { isValid: true };
      }
    });

    // Rule 6: Validate stacking configuration
    this.addValidationRule({
      name: 'stacking_validation',
      severity: 'warning',
      validate: (powerUp: PowerUp, context: ValidationContext): ValidationResult => {
        if (!context.gameConfig.allowStacking) {
          const existingOfSameType = context.activePowerUps.filter(
            p => p.type === powerUp.type
          );
          
          if (existingOfSameType.length > 0) {
            return {
              isValid: false,
              message: 'Stacking is disabled for this game configuration',
              suggestedAction: 'deny'
            };
          }
        }
        return { isValid: true };
      }
    });

    // Rule 7: Life-based power-up validation
    this.addValidationRule({
      name: 'life_based_validation',
      severity: 'info',
      validate: (powerUp: PowerUp, context: ValidationContext): ValidationResult => {
        if (powerUp.type === PowerUpType.ExtraLife && context.playerState.lives >= 10) {
          return {
            isValid: false,
            message: 'Maximum lives limit reached',
            suggestedAction: 'warn'
          };
        }
        return { isValid: true };
      }
    });

    // Rule 8: Score multiplier sanity check
    this.addValidationRule({
      name: 'score_multiplier_sanity',
      severity: 'warning',
      validate: (powerUp: PowerUp, context: ValidationContext): ValidationResult => {
        if (powerUp.type === PowerUpType.ScoreMultiplier) {
          const currentMultipliers = context.activePowerUps.filter(
            p => p.type === PowerUpType.ScoreMultiplier
          );
          
          const totalMultiplier = currentMultipliers.length + 1;
          if (totalMultiplier > 20) {
            return {
              isValid: false,
              message: 'Score multiplier would exceed reasonable limits (20x)',
              suggestedAction: 'warn'
            };
          }
        }
        return { isValid: true };
      }
    });
  }

  public validatePowerUp(
    powerUp: PowerUp, 
    context: ValidationContext
  ): {
    isValid: boolean;
    results: Array<ValidationResult & { ruleName: string; severity: string }>;
    errors: string[];
    warnings: string[];
  } {
    const results: Array<ValidationResult & { ruleName: string; severity: string }> = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    this.validationRules.forEach((rule, ruleName) => {
      try {
        const result = rule.validate(powerUp, context);
        const resultWithMeta = {
          ...result,
          ruleName,
          severity: rule.severity
        };
        
        results.push(resultWithMeta);

        if (!result.isValid) {
          if (rule.severity === 'error') {
            errors.push(result.message || `Validation failed for rule: ${ruleName}`);
          } else if (rule.severity === 'warning') {
            warnings.push(result.message || `Warning from rule: ${ruleName}`);
          }
        }
      } catch (error) {
        const errorMessage = `Validation rule ${ruleName} threw an error: ${error}`;
        errors.push(errorMessage);
        results.push({
          isValid: false,
          message: errorMessage,
          ruleName,
          severity: 'error'
        });
      }
    });

    return {
      isValid: errors.length === 0,
      results,
      errors,
      warnings
    };
  }

  public addValidationRule(rule: ValidationRule): void {
    this.validationRules.set(rule.name, rule);
  }

  public removeValidationRule(ruleName: string): boolean {
    return this.validationRules.delete(ruleName);
  }

  public getValidationRule(ruleName: string): ValidationRule | undefined {
    return this.validationRules.get(ruleName);
  }

  public listValidationRules(): string[] {
    return Array.from(this.validationRules.keys());
  }

  // Batch validation for multiple power-ups
  public validateBatch(
    powerUps: PowerUp[],
    context: ValidationContext
  ): {
    overallValid: boolean;
    individualResults: Map<string, ReturnType<typeof this.validatePowerUp>>;
    batchErrors: string[];
  } {
    const individualResults = new Map<string, ReturnType<typeof this.validatePowerUp>>();
    const batchErrors: string[] = [];
    let overallValid = true;

    powerUps.forEach(powerUp => {
      const result = this.validatePowerUp(powerUp, context);
      individualResults.set(powerUp.id, result);
      
      if (!result.isValid) {
        overallValid = false;
      }
    });

    // Additional batch-level validations
    const uniqueTypes = new Set(powerUps.map(p => p.type));
    if (uniqueTypes.size !== powerUps.length && !context.gameConfig.allowStacking) {
      batchErrors.push('Duplicate power-up types found when stacking is disabled');
      overallValid = false;
    }

    return {
      overallValid: overallValid && batchErrors.length === 0,
      individualResults,
      batchErrors
    };
  }

  // Auto-fix functionality for certain validation failures
  public autoFixPowerUp(
    powerUp: PowerUp,
    context: ValidationContext
  ): { fixed: boolean; modifications: string[]; fixedPowerUp: PowerUp } {
    const validation = this.validatePowerUp(powerUp, context);
    const modifications: string[] = [];
    const fixedPowerUp = { ...powerUp };
    let fixed = false;

    validation.results.forEach(result => {
      if (!result.isValid && result.suggestedAction === 'modify' && result.metadata) {
        switch (result.ruleName) {
          case 'valid_duration':
            if (result.metadata.suggestedDuration !== undefined) {
              fixedPowerUp.duration = result.metadata.suggestedDuration;
              fixedPowerUp.remainingTime = Math.min(
                fixedPowerUp.remainingTime,
                fixedPowerUp.duration
              );
              modifications.push(`Fixed duration: ${powerUp.duration} -> ${fixedPowerUp.duration}`);
              fixed = true;
            }
            break;

          case 'valid_position':
            if (result.metadata.suggestedPosition) {
              fixedPowerUp.position = result.metadata.suggestedPosition;
              modifications.push(
                `Fixed position: (${powerUp.position.x}, ${powerUp.position.y}) -> ` +
                `(${fixedPowerUp.position.x}, ${fixedPowerUp.position.y})`
              );
              fixed = true;
            }
            break;

          case 'remaining_time_consistency':
            if (result.metadata.suggestedRemainingTime !== undefined) {
              fixedPowerUp.remainingTime = result.metadata.suggestedRemainingTime;
              modifications.push(
                `Fixed remaining time: ${powerUp.remainingTime} -> ${fixedPowerUp.remainingTime}`
              );
              fixed = true;
            }
            break;
        }
      }
    });

    return {
      fixed,
      modifications,
      fixedPowerUp: Object.assign(Object.create(Object.getPrototypeOf(powerUp)), fixedPowerUp)
    };
  }
}
