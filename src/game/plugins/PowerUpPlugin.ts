/**
 * PowerUp Plugin Base Class Implementation
 * Story 4.1, Task 2: Base power-up plugin class for extensible power-up system
 * Provides foundation for all power-up effect implementations
 */
import { Plugin, PluginContext } from './PluginManager';
import { PowerUpType, PowerUpEffect, PowerUpMetadata } from '../entities/PowerUp';

// PowerUp plugin specific context
export interface PowerUpPluginContext extends PluginContext {
  readonly powerUpType: PowerUpType;
  readonly powerUpId: string;
  readonly effectData: any;
  readonly gameEntities: {
    balls: any[];
    paddle: any;
    blocks: any[];
    powerUps: any[];
  };
}

// Effect lifecycle events
export enum EffectEvent {
  Activate = 'activate',
  Update = 'update', 
  Deactivate = 'deactivate',
  Conflict = 'conflict',
  Stack = 'stack'
}

// Effect execution result
export interface EffectResult {
  success: boolean;
  modified: boolean;
  rollback?: () => void;
  error?: Error;
}

/**
 * PowerUpPlugin Abstract Base Class
 * All power-up plugins must extend this class and implement effect methods
 */
export abstract class PowerUpPlugin implements Plugin {
  public readonly name: string;
  public readonly version: string;
  public readonly description: string;
  public readonly powerUpType: PowerUpType;
  public readonly effect: PowerUpEffect;
  public readonly dependencies?: string[];

  private executionStartTime: number = 0;
  private totalExecutionTime: number = 0;
  private activations: number = 0;
  private isInitialized: boolean = false;

  constructor(
    name: string,
    version: string,
    powerUpType: PowerUpType,
    effect: PowerUpEffect,
    description?: string,
    dependencies?: string[]
  ) {
    this.name = name;
    this.version = version;
    this.description = description || `${powerUpType} power-up plugin`;
    this.powerUpType = powerUpType;
    this.effect = effect;
    this.dependencies = dependencies;
  }

  /**
   * Initialize plugin - called once during registration
   */
  public async init(): Promise<void> {
    try {
      await this.onInit();
      this.isInitialized = true;
      console.log(`PowerUp plugin ${this.name} initialized`);
    } catch (error) {
      console.error(`Failed to initialize PowerUp plugin ${this.name}:`, error);
      throw error;
    }
  }

  /**
   * Destroy plugin - called during shutdown
   */
  public async destroy(): Promise<void> {
    try {
      await this.onDestroy();
      this.isInitialized = false;
      console.log(`PowerUp plugin ${this.name} destroyed`);
    } catch (error) {
      console.error(`Failed to destroy PowerUp plugin ${this.name}:`, error);
      throw error;
    }
  }

  /**
   * Apply power-up effect to game state
   */
  public applyEffect(context: PowerUpPluginContext): EffectResult {
    if (!this.isInitialized) {
      return {
        success: false,
        modified: false,
        error: new Error(`Plugin ${this.name} not initialized`)
      };
    }

    this.executionStartTime = performance.now();

    try {
      // Validate effect can be applied
      const validation = this.validateEffect(context);
      if (!validation.success) {
        return validation;
      }

      // Apply effect with rollback support
      const result = this.onApplyEffect(context);
      
      if (result.success) {
        this.activations++;
        this.recordExecutionTime();
      }

      return result;

    } catch (error) {
      this.recordExecutionTime();
      return {
        success: false,
        modified: false,
        error: error as Error
      };
    }
  }

  /**
   * Remove power-up effect from game state
   */
  public removeEffect(context: PowerUpPluginContext): EffectResult {
    if (!this.isInitialized) {
      return {
        success: false,
        modified: false,
        error: new Error(`Plugin ${this.name} not initialized`)
      };
    }

    this.executionStartTime = performance.now();

    try {
      const result = this.onRemoveEffect(context);
      this.recordExecutionTime();
      return result;

    } catch (error) {
      this.recordExecutionTime();
      return {
        success: false,
        modified: false,
        error: error as Error
      };
    }
  }

  /**
   * Update active effect (called each frame while active)
   */
  public updateEffect(context: PowerUpPluginContext): EffectResult {
    if (!this.isInitialized) {
      return {
        success: false,
        modified: false,
        error: new Error(`Plugin ${this.name} not initialized`)
      };
    }

    this.executionStartTime = performance.now();

    try {
      const result = this.onUpdateEffect(context);
      this.recordExecutionTime();
      return result;

    } catch (error) {
      this.recordExecutionTime();
      return {
        success: false,
        modified: false,
        error: error as Error
      };
    }
  }

  /**
   * Handle effect conflicts with other power-ups
   */
  public handleConflict(
    conflictingType: PowerUpType, 
    context: PowerUpPluginContext
  ): EffectResult {
    this.executionStartTime = performance.now();

    try {
      const result = this.onHandleConflict(conflictingType, context);
      this.recordExecutionTime();
      return result;

    } catch (error) {
      this.recordExecutionTime();
      return {
        success: false,
        modified: false,
        error: error as Error
      };
    }
  }

  /**
   * Get plugin execution time
   */
  public getExecutionTime(): number {
    return this.totalExecutionTime;
  }

  /**
   * Get plugin performance metrics
   */
  public getPerformanceMetrics(): {
    totalExecutionTime: number;
    averageExecutionTime: number;
    activations: number;
    isInitialized: boolean;
  } {
    return {
      totalExecutionTime: this.totalExecutionTime,
      averageExecutionTime: this.activations > 0 ? this.totalExecutionTime / this.activations : 0,
      activations: this.activations,
      isInitialized: this.isInitialized
    };
  }

  /**
   * Get power-up metadata
   */
  public getMetadata(): PowerUpMetadata {
    return {
      type: this.powerUpType,
      name: this.name,
      description: this.description,
      icon: this.getIcon(),
      color: this.getColor(),
      rarity: this.getRarity(),
      duration: this.getDuration(),
      effect: this.effect
    };
  }

  // Abstract methods to be implemented by concrete plugins

  /**
   * Plugin-specific initialization logic
   */
  protected abstract onInit(): Promise<void> | void;

  /**
   * Plugin-specific destruction logic
   */
  protected abstract onDestroy(): Promise<void> | void;

  /**
   * Apply the power-up effect to game state
   */
  protected abstract onApplyEffect(context: PowerUpPluginContext): EffectResult;

  /**
   * Remove the power-up effect from game state
   */
  protected abstract onRemoveEffect(context: PowerUpPluginContext): EffectResult;

  /**
   * Update the active effect (called each frame)
   */
  protected abstract onUpdateEffect(context: PowerUpPluginContext): EffectResult;

  /**
   * Handle conflicts with other power-ups
   */
  protected abstract onHandleConflict(
    conflictingType: PowerUpType, 
    context: PowerUpPluginContext
  ): EffectResult;

  /**
   * Get power-up icon representation
   */
  protected abstract getIcon(): string;

  /**
   * Get power-up color
   */
  protected abstract getColor(): string;

  /**
   * Get power-up rarity
   */
  protected abstract getRarity(): 'common' | 'rare' | 'epic';

  /**
   * Get power-up duration in milliseconds
   */
  protected abstract getDuration(): number;

  // Helper methods

  /**
   * Validate if effect can be applied
   */
  protected validateEffect(context: PowerUpPluginContext): EffectResult {
    // Check time budget
    if (context.performance && context.performance.maxExecutionTime) {
      const elapsed = performance.now() - context.performance.startTime;
      if (elapsed > context.performance.maxExecutionTime) {
        return {
          success: false,
          modified: false,
          error: new Error(`Time budget exceeded: ${elapsed}ms`)
        };
      }
    }

    // Check for conflicts
    if (this.effect.conflictsWith) {
      // This would check active power-ups in the actual game state
      // For now, we assume no conflicts during validation
    }

    return { success: true, modified: false };
  }

  /**
   * Record execution time for performance monitoring
   */
  private recordExecutionTime(): void {
    const elapsed = performance.now() - this.executionStartTime;
    this.totalExecutionTime += elapsed;
  }

  /**
   * Create safe game state snapshot for rollback
   */
  protected createSnapshot(gameState: any): any {
    // Deep clone the relevant game state for rollback
    return JSON.parse(JSON.stringify(gameState));
  }

  /**
   * Create rollback function for effect removal
   */
  protected createRollback(originalState: any): () => void {
    return () => {
      // Restore game state from snapshot
      // Implementation depends on game state structure
      console.log(`Rolling back effect for ${this.name}`);
    };
  }

  /**
   * Log plugin activity for debugging
   */
  protected log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] PowerUpPlugin(${this.name}): ${message}`;
    
    switch (level) {
      case 'warn':
        console.warn(logMessage);
        break;
      case 'error':
        console.error(logMessage);
        break;
      default:
        console.log(logMessage);
    }
  }
}