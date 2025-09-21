import { PowerUp, PowerUpType } from '../entities/PowerUp';
import { PowerUpConflictResolver, ConflictResolution } from './PowerUpConflictResolver';

export enum GameState {
  MENU = 'menu',
  PLAYING = 'playing',
  PAUSED = 'paused',
  GAME_OVER = 'game_over',
  LEVEL_COMPLETE = 'level_complete',
  LOADING = 'loading'
}

export interface PowerUpPersistence {
  type: PowerUpType;
  variant?: string;
  duration: number;
  remainingTime: number;
  activatedAt: number;
  metadata?: Record<string, unknown>;
}

export interface StateTransitionRule {
  fromState: GameState;
  toState: GameState;
  powerUpAction: 'preserve' | 'pause' | 'clear' | 'transfer';
  preserveTypes?: PowerUpType[];
}

export class PowerUpStateManager {
  private activePowerUps: Map<string, PowerUp> = new Map();
  private pausedPowerUps: Map<string, PowerUpPersistence> = new Map();
  private conflictResolver: PowerUpConflictResolver;
  private currentState: GameState = GameState.MENU;
  private stateTransitionRules: Map<string, StateTransitionRule> = new Map();

  constructor(conflictResolver?: PowerUpConflictResolver) {
    this.conflictResolver = conflictResolver || new PowerUpConflictResolver();
    this.initializeStateTransitionRules();
  }

  private initializeStateTransitionRules(): void {
    // Playing to Paused - pause all power-ups
    this.addStateTransitionRule({
      fromState: GameState.PLAYING,
      toState: GameState.PAUSED,
      powerUpAction: 'pause'
    });

    // Paused to Playing - restore all power-ups
    this.addStateTransitionRule({
      fromState: GameState.PAUSED,
      toState: GameState.PLAYING,
      powerUpAction: 'preserve'
    });

    // Playing to Game Over - clear all power-ups
    this.addStateTransitionRule({
      fromState: GameState.PLAYING,
      toState: GameState.GAME_OVER,
      powerUpAction: 'clear'
    });

    // Playing to Level Complete - preserve score multipliers and extra lives only
    this.addStateTransitionRule({
      fromState: GameState.PLAYING,
      toState: GameState.LEVEL_COMPLETE,
      powerUpAction: 'transfer',
      preserveTypes: [PowerUpType.ScoreMultiplier, PowerUpType.ExtraLife]
    });

    // Level Complete to Playing - restore preserved power-ups
    this.addStateTransitionRule({
      fromState: GameState.LEVEL_COMPLETE,
      toState: GameState.PLAYING,
      powerUpAction: 'preserve'
    });

    // Any state to Menu - clear all power-ups
    Object.values(GameState).forEach(fromState => {
      if (fromState !== GameState.MENU) {
        this.addStateTransitionRule({
          fromState: fromState as GameState,
          toState: GameState.MENU,
          powerUpAction: 'clear'
        });
      }
    });
  }

  public addPowerUp(powerUp: PowerUp): ConflictResolution {
    if (this.currentState !== GameState.PLAYING) {
      return {
        action: 'rejected',
        removedPowerUps: [],
        message: 'Power-ups can only be added during gameplay'
      };
    }

    // Check for conflicts
    const activePowerUpsList = Array.from(this.activePowerUps.values());
    const resolution = this.conflictResolver.resolveConflict(powerUp, activePowerUpsList);

    if (resolution.action === 'rejected') {
      return resolution;
    }

    // Remove conflicting power-ups
    resolution.removedPowerUps.forEach(removedPowerUp => {
      this.removePowerUp(removedPowerUp.id);
    });

    // Add new power-up
    this.activePowerUps.set(powerUp.id, powerUp);

    return resolution;
  }

  public removePowerUp(powerUpId: string): boolean {
    return this.activePowerUps.delete(powerUpId);
  }

  public getPowerUp(powerUpId: string): PowerUp | undefined {
    return this.activePowerUps.get(powerUpId);
  }

  public getActivePowerUps(): PowerUp[] {
    return Array.from(this.activePowerUps.values());
  }

  public getPowerUpsByType(type: PowerUpType): PowerUp[] {
    return this.getActivePowerUps().filter(powerUp => powerUp.type === type);
  }

  public hasPowerUpType(type: PowerUpType): boolean {
    return this.getPowerUpsByType(type).length > 0;
  }

  public getStackCount(type: PowerUpType): number {
    return this.getPowerUpsByType(type).length;
  }

  public updatePowerUps(deltaTime: number): PowerUp[] {
    if (this.currentState === GameState.PAUSED) {
      return []; // Don't update when paused
    }

    const expiredPowerUps: PowerUp[] = [];

    this.activePowerUps.forEach((powerUp, id) => {
      if (powerUp.duration > 0) {
        powerUp.remainingTime -= deltaTime;
        if (powerUp.remainingTime <= 0) {
          expiredPowerUps.push(powerUp);
          this.activePowerUps.delete(id);
        }
      }
    });

    return expiredPowerUps;
  }

  public handleStateTransition(fromState: GameState, toState: GameState): void {
    const ruleKey = `${fromState}->${toState}`;
    const rule = this.stateTransitionRules.get(ruleKey) ||
                this.stateTransitionRules.get(`${fromState}->*`) ||
                this.stateTransitionRules.get(`*->${toState}`);

    if (rule) {
      this.applyStateTransitionRule(rule);
    }

    this.currentState = toState;
  }

  private applyStateTransitionRule(rule: StateTransitionRule): void {
    switch (rule.powerUpAction) {
      case 'preserve':
        // If coming from paused state, restore paused power-ups
        if (rule.fromState === GameState.PAUSED) {
          this.restorePausedPowerUps();
        }
        break;

      case 'pause':
        this.pauseAllPowerUps();
        break;

      case 'clear':
        this.clearAllPowerUps();
        break;

      case 'transfer':
        this.transferPowerUps(rule.preserveTypes || []);
        break;
    }
  }

  private pauseAllPowerUps(): void {
    const currentTime = Date.now();
    
    this.activePowerUps.forEach((powerUp, id) => {
      const persistence: PowerUpPersistence = {
        type: powerUp.type,
        variant: powerUp.variant,
        duration: powerUp.duration,
        remainingTime: powerUp.remainingTime,
        activatedAt: powerUp.activatedAt,
        metadata: powerUp.metadata
      };
      
      this.pausedPowerUps.set(id, persistence);
    });

    this.activePowerUps.clear();
  }

  private restorePausedPowerUps(): void {
    this.pausedPowerUps.forEach((persistence, id) => {
      const powerUp = new PowerUp(
        persistence.type,
        { x: 0, y: 0 }, // Position doesn't matter for restored power-ups
        persistence.variant
      );
      
      powerUp.id = id;
      powerUp.duration = persistence.duration;
      powerUp.remainingTime = persistence.remainingTime;
      powerUp.activatedAt = persistence.activatedAt;
      powerUp.metadata = persistence.metadata;
      
      this.activePowerUps.set(id, powerUp);
    });

    this.pausedPowerUps.clear();
  }

  private clearAllPowerUps(): void {
    this.activePowerUps.clear();
    this.pausedPowerUps.clear();
  }

  private transferPowerUps(preserveTypes: PowerUpType[]): void {
    const preservedPowerUps = new Map<string, PowerUp>();

    this.activePowerUps.forEach((powerUp, id) => {
      if (preserveTypes.includes(powerUp.type)) {
        preservedPowerUps.set(id, powerUp);
      }
    });

    this.activePowerUps.clear();
    this.pausedPowerUps.clear();
    
    // Restore preserved power-ups
    preservedPowerUps.forEach((powerUp, id) => {
      this.activePowerUps.set(id, powerUp);
    });
  }

  public addStateTransitionRule(rule: StateTransitionRule): void {
    const key = `${rule.fromState}->${rule.toState}`;
    this.stateTransitionRules.set(key, rule);
  }

  public getCurrentState(): GameState {
    return this.currentState;
  }

  public validateConfiguration(): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    // Validate active power-ups configuration
    const validation = this.conflictResolver.validatePowerUpConfiguration(
      this.getActivePowerUps()
    );
    
    if (!validation.isValid) {
      validation.conflicts.forEach(conflict => {
        errors.push(
          `Type ${conflict.type} has ${conflict.count} instances, max allowed: ${conflict.maxAllowed}`
        );
      });
    }

    // Validate state consistency
    if (this.currentState === GameState.PAUSED && this.pausedPowerUps.size === 0) {
      errors.push('Game is paused but no power-ups are in paused state');
    }

    if (this.currentState !== GameState.PAUSED && this.pausedPowerUps.size > 0) {
      errors.push('Power-ups are in paused state but game is not paused');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Emergency recovery methods
  public emergencyReset(): void {
    this.activePowerUps.clear();
    this.pausedPowerUps.clear();
    this.currentState = GameState.MENU;
  }

  public emergencyDeactivatePowerUp(powerUpId: string): boolean {
    const removed = this.activePowerUps.delete(powerUpId);
    if (!removed) {
      this.pausedPowerUps.delete(powerUpId);
    }
    return removed;
  }

  public emergencyDeactivateType(type: PowerUpType): number {
    let count = 0;
    
    // Remove from active power-ups
    this.activePowerUps.forEach((powerUp, id) => {
      if (powerUp.type === type) {
        this.activePowerUps.delete(id);
        count++;
      }
    });

    // Remove from paused power-ups
    this.pausedPowerUps.forEach((persistence, id) => {
      if (persistence.type === type) {
        this.pausedPowerUps.delete(id);
        count++;
      }
    });

    return count;
  }
}
