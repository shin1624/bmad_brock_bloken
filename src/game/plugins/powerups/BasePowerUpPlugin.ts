/**
 * Enhanced Base Power-Up Plugin Class
 * Refactoring Phase 2: Simplified plugin architecture with common utilities
 */
import {
  PowerUpPlugin,
  PowerUpPluginContext,
  EffectResult,
} from "../PowerUpPlugin";
import { PowerUpType, PowerUpEffect } from "../../entities/PowerUp";

/**
 * Enhanced Base Class for Power-Up Plugins
 * Provides common validation, performance measurement, and error handling
 */
export abstract class BasePowerUpPlugin extends PowerUpPlugin {
  private static readonly MAX_EXECUTION_TIME = 16; // 16ms budget per frame
  private static readonly PERFORMANCE_THRESHOLD = 10; // 10ms warning threshold

  constructor(
    name: string,
    version: string,
    powerUpType: PowerUpType,
    effect: PowerUpEffect,
    description?: string,
    dependencies?: string[],
  ) {
    super(name, version, powerUpType, effect, description, dependencies);
  }

  /**
   * Validates context before effect application
   */
  protected validateContext(context: PowerUpPluginContext): boolean {
    if (!context) {
      this.log("Invalid context: null or undefined", "error");
      return false;
    }

    if (!context.gameEntities) {
      this.log("Invalid context: missing gameEntities", "error");
      return false;
    }

    if (!Array.isArray(context.gameEntities.balls)) {
      this.log("Invalid context: balls is not an array", "error");
      return false;
    }

    if (!context.performance) {
      this.log("Invalid context: missing performance data", "warn");
    }

    return true;
  }

  /**
   * Measures performance of operations
   */
  protected measurePerformance<T>(operation: () => T): T {
    const startTime = performance.now();

    try {
      const result = operation();
      const duration = performance.now() - startTime;

      if (duration > BasePowerUpPlugin.PERFORMANCE_THRESHOLD) {
        this.log(
          `Performance warning: operation took ${duration.toFixed(2)}ms`,
          "warn",
        );
      }

      if (duration > BasePowerUpPlugin.MAX_EXECUTION_TIME) {
        this.log(
          `Performance critical: operation exceeded frame budget (${duration.toFixed(2)}ms)`,
          "error",
        );
      }

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.log(
        `Operation failed after ${duration.toFixed(2)}ms: ${error}`,
        "error",
      );
      throw error;
    }
  }

  /**
   * Safe effect application with validation and performance monitoring
   */
  public applyEffect(context: PowerUpPluginContext): EffectResult {
    if (!this.validateContext(context)) {
      return {
        success: false,
        modified: false,
        error: new Error(`Context validation failed for ${this.name}`),
      };
    }

    return this.measurePerformance(() => {
      try {
        return this.onApplyEffect(context);
      } catch (error) {
        this.log(`Effect application failed: ${error}`, "error");
        return {
          success: false,
          modified: false,
          error: error as Error,
        };
      }
    });
  }

  /**
   * Safe effect removal with performance monitoring
   */
  public removeEffect(context: PowerUpPluginContext): EffectResult {
    if (!this.validateContext(context)) {
      return {
        success: false,
        modified: false,
        error: new Error(`Context validation failed for ${this.name}`),
      };
    }

    return this.measurePerformance(() => {
      try {
        return this.onRemoveEffect(context);
      } catch (error) {
        this.log(`Effect removal failed: ${error}`, "error");
        return {
          success: false,
          modified: false,
          error: error as Error,
        };
      }
    });
  }

  /**
   * Enhanced logging with plugin identification
   */
  protected log(
    message: string,
    level: "info" | "warn" | "error" = "info",
  ): void {
    const prefix = `[${this.name}]`;
    switch (level) {
      case "error":
        console.error(prefix, message);
        break;
      case "warn":
        console.warn(prefix, message);
        break;
      default:
        console.log(prefix, message);
        break;
    }
  }

  /**
   * Get plugin metadata for debugging and monitoring
   */
  public getMetadata(): {
    type: PowerUpType;
    rarity: string;
    duration: number;
    icon: string;
    color: string;
  } {
    return {
      type: this.powerUpType,
      rarity: this.getRarity(),
      duration: this.getDuration(),
      icon: this.getIcon(),
      color: this.getColor(),
    };
  }

  /**
   * Abstract methods to be implemented by specific power-ups
   */
  protected abstract onApplyEffect(context: PowerUpPluginContext): EffectResult;
  protected abstract onRemoveEffect(
    context: PowerUpPluginContext,
  ): EffectResult;
  protected abstract getRarity(): string;
  protected abstract getDuration(): number;
  protected abstract getIcon(): string;
  protected abstract getColor(): string;

  /**
   * Default implementations for lifecycle methods
   */
  protected async onInit(): Promise<void> {
    this.log(`${this.powerUpType} plugin initialized`);
  }

  protected async onDestroy(): Promise<void> {
    this.log(`${this.powerUpType} plugin destroyed`);
  }
}
