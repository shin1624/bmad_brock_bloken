import { PowerUp, PowerUpType } from '../entities/PowerUp';

export interface ConflictRule {
  conflictingTypes: PowerUpType[];
  resolutionStrategy: 'stack' | 'override' | 'reject' | 'priority';
  priority?: number;
  maxStack?: number;
}

export interface ConflictResolution {
  action: 'applied' | 'overridden' | 'rejected' | 'stacked';
  removedPowerUps: PowerUp[];
  message?: string;
}

export class PowerUpConflictResolver {
  private conflictRules: Map<PowerUpType, ConflictRule> = new Map();

  constructor() {
    this.initializeDefaultRules();
  }

  private initializeDefaultRules(): void {
    // Paddle size conflicts - can't be both large and small
    this.conflictRules.set(PowerUpType.PaddleSize, {
      conflictingTypes: [PowerUpType.PaddleSize],
      resolutionStrategy: 'override',
      priority: 1
    });

    // Ball speed conflicts - can't be both fast and slow
    this.conflictRules.set(PowerUpType.BallSpeed, {
      conflictingTypes: [PowerUpType.BallSpeed],
      resolutionStrategy: 'override',
      priority: 1
    });

    // Multi-ball can stack up to 3
    this.conflictRules.set(PowerUpType.MultiBall, {
      conflictingTypes: [PowerUpType.MultiBall],
      resolutionStrategy: 'stack',
      maxStack: 3
    });

    // Extra life can stack up to 5
    this.conflictRules.set(PowerUpType.ExtraLife, {
      conflictingTypes: [PowerUpType.ExtraLife],
      resolutionStrategy: 'stack',
      maxStack: 5
    });

    // Score multiplier can stack up to 10x
    this.conflictRules.set(PowerUpType.ScoreMultiplier, {
      conflictingTypes: [PowerUpType.ScoreMultiplier],
      resolutionStrategy: 'stack',
      maxStack: 10
    });

    // Shield is unique, reject duplicates
    this.conflictRules.set(PowerUpType.Shield, {
      conflictingTypes: [PowerUpType.Shield],
      resolutionStrategy: 'reject'
    });
  }

  public resolveConflict(
    newPowerUp: PowerUp,
    activePowerUps: PowerUp[]
  ): ConflictResolution {
    const rule = this.conflictRules.get(newPowerUp.type);
    if (!rule) {
      // No conflicts, apply directly
      return {
        action: 'applied',
        removedPowerUps: []
      };
    }

    const conflictingPowerUps = activePowerUps.filter(powerUp =>
      rule.conflictingTypes.includes(powerUp.type)
    );

    if (conflictingPowerUps.length === 0) {
      return {
        action: 'applied',
        removedPowerUps: []
      };
    }

    switch (rule.resolutionStrategy) {
      case 'override':
        return this.handleOverride(newPowerUp, conflictingPowerUps);

      case 'stack':
        return this.handleStack(newPowerUp, conflictingPowerUps, rule.maxStack || 1);

      case 'reject':
        return this.handleReject(newPowerUp, conflictingPowerUps);

      case 'priority':
        return this.handlePriority(newPowerUp, conflictingPowerUps, rule.priority || 0);

      default:
        return {
          action: 'applied',
          removedPowerUps: []
        };
    }
  }

  private handleOverride(
    newPowerUp: PowerUp,
    conflictingPowerUps: PowerUp[]
  ): ConflictResolution {
    // Remove all conflicting power-ups and apply the new one
    return {
      action: 'overridden',
      removedPowerUps: conflictingPowerUps,
      message: `${newPowerUp.type} override previous effects`
    };
  }

  private handleStack(
    newPowerUp: PowerUp,
    conflictingPowerUps: PowerUp[],
    maxStack: number
  ): ConflictResolution {
    if (conflictingPowerUps.length >= maxStack) {
      // Remove oldest power-up to make room for new one
      const oldest = conflictingPowerUps.reduce((oldest, current) =>
        current.activatedAt < oldest.activatedAt ? current : oldest
      );

      return {
        action: 'stacked',
        removedPowerUps: [oldest],
        message: `${newPowerUp.type} stacked (${conflictingPowerUps.length}/${maxStack})`
      };
    } else {
      return {
        action: 'stacked',
        removedPowerUps: [],
        message: `${newPowerUp.type} stacked (${conflictingPowerUps.length + 1}/${maxStack})`
      };
    }
  }

  private handleReject(
    newPowerUp: PowerUp,
    _conflictingPowerUps: PowerUp[]
  ): ConflictResolution {
    return {
      action: 'rejected',
      removedPowerUps: [],
      message: `${newPowerUp.type} rejected - already active`
    };
  }

  private handlePriority(
    newPowerUp: PowerUp,
    conflictingPowerUps: PowerUp[],
    newPriority: number
  ): ConflictResolution {
    const lowerPriorityPowerUps = conflictingPowerUps.filter(powerUp => {
      const rule = this.conflictRules.get(powerUp.type);
      return !rule || (rule.priority || 0) < newPriority;
    });

    if (lowerPriorityPowerUps.length > 0) {
      return {
        action: 'applied',
        removedPowerUps: lowerPriorityPowerUps,
        message: `${newPowerUp.type} applied with priority ${newPriority}`
      };
    } else {
      return {
        action: 'rejected',
        removedPowerUps: [],
        message: `${newPowerUp.type} rejected - lower priority`
      };
    }
  }

  public addConflictRule(type: PowerUpType, rule: ConflictRule): void {
    this.conflictRules.set(type, rule);
  }

  public removeConflictRule(type: PowerUpType): boolean {
    return this.conflictRules.delete(type);
  }

  public getConflictRule(type: PowerUpType): ConflictRule | undefined {
    return this.conflictRules.get(type);
  }

  public validatePowerUpConfiguration(activePowerUps: PowerUp[]): {
    isValid: boolean;
    conflicts: Array<{
      type: PowerUpType;
      count: number;
      maxAllowed: number;
    }>;
  } {
    const typeCount = new Map<PowerUpType, number>();
    const conflicts: Array<{ type: PowerUpType; count: number; maxAllowed: number }> = [];

    // Count active power-ups by type
    activePowerUps.forEach(powerUp => {
      const count = typeCount.get(powerUp.type) || 0;
      typeCount.set(powerUp.type, count + 1);
    });

    // Check for rule violations
    typeCount.forEach((count, type) => {
      const rule = this.conflictRules.get(type);
      if (rule && rule.maxStack && count > rule.maxStack) {
        conflicts.push({
          type,
          count,
          maxAllowed: rule.maxStack
        });
      }
    });

    return {
      isValid: conflicts.length === 0,
      conflicts
    };
  }
}