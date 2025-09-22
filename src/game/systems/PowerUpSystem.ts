/**
 * PowerUp System Implementation for Effect Management
 * Story 4.1, Task 3: Effect stacking management and duration tracking system
 * Manages active power-up effects with conflict resolution and cleanup
 */
import { PowerUpType, PowerUpMetadata } from '../entities/PowerUp';
import { PluginManager } from '../plugins/PluginManager';
import {
  PowerUpPlugin,
  PowerUpPluginContext,
  EffectResult,
  PowerUpEffectData,
  GameEntitiesSnapshot,
  PowerUpSystemState,
} from '../plugins/PowerUpPlugin';
import { MemoryManager } from './MemoryManager';
import { EventBus } from '../core/EventBus';

// Time provider interface for testability
export interface TimeProvider {
  now(): number;
}

// Default time provider using Date.now()
export class DefaultTimeProvider implements TimeProvider {
  now(): number {
    return Date.now();
  }
}

// Active effect tracking
export interface ActiveEffect {
  id: string;
  powerUpType: PowerUpType;
  plugin: PowerUpPlugin;
  startTime: number;
  duration: number;
  priority: number;
  stackable: boolean;
  conflictsWith: PowerUpType[];
  metadata: PowerUpMetadata;
  effectData: PowerUpEffectData;
}

// Effect stacking rules
export enum StackingRule {
  Replace = 'replace',     // New effect replaces old
  Extend = 'extend',       // Extend duration of existing effect
  Stack = 'stack',         // Allow multiple instances
  Reject = 'reject'        // Reject new effect
}

// Effect conflict resolution strategy
export interface ConflictResolution {
  action: 'replace' | 'reject' | 'merge' | 'prioritize';
  keepExisting: boolean;
  applyNew: boolean;
  reason: string;
}

// System configuration
export interface PowerUpSystemConfig {
  maxActiveEffects: number;
  performanceMonitoring: boolean;
  autoCleanup: boolean;
  cleanupInterval: number; // milliseconds
  defaultStackingRule: StackingRule;
  enableMemoryManagement: boolean;
  memoryManagerConfig?: unknown;
}

/**
 * PowerUpSystem Class
 * Central system for managing power-up effects, stacking, and conflicts
 */
export class PowerUpSystem {
  private activeEffects: Map<string, ActiveEffect> = new Map();
  private effectsByType: Map<PowerUpType, Set<string>> = new Map();
  private pluginManager: PluginManager;
  private config: PowerUpSystemConfig;
  private cleanupTimer?: NodeJS.Timeout;
  private gameState: PowerUpSystemState | null = null;
  private timeProvider: TimeProvider;
  private memoryManager?: MemoryManager;

  // Performance tracking
  private totalEffectsProcessed: number = 0;
  private effectsApplied: number = 0;
  private effectsRejected: number = 0;
  private conflictsResolved: number = 0;

  constructor(pluginManager: PluginManager, config?: Partial<PowerUpSystemConfig>, timeProvider?: TimeProvider, eventBus?: EventBus) {
    this.pluginManager = pluginManager;
    this.timeProvider = timeProvider || new DefaultTimeProvider();
    this.config = {
      maxActiveEffects: 8,
      performanceMonitoring: true,
      autoCleanup: true,
      cleanupInterval: 1000, // 1 second
      defaultStackingRule: StackingRule.Replace,
      enableMemoryManagement: true,
      ...config
    };

    // Initialize memory manager if enabled
    if (this.config.enableMemoryManagement && eventBus) {
      this.memoryManager = new MemoryManager(eventBus, this.config.memoryManagerConfig);
    }

    // Initialize effect type tracking
    Object.values(PowerUpType).forEach(type => {
      this.effectsByType.set(type, new Set());
    });

    // Start automatic cleanup if enabled
    if (this.config.autoCleanup) {
      this.startCleanupTimer();
    }
  }

  /**
   * Apply power-up effect with conflict resolution and stacking
   */
  public async applyEffect(
    powerUpType: PowerUpType,
    powerUpId: string,
    gameState: PowerUpSystemState,
    effectData?: PowerUpEffectData
  ): Promise<EffectResult> {
    this.totalEffectsProcessed++;
    this.gameState = gameState;

    try {
      // Get plugin for this power-up type
      const plugin = this.getPluginForType(powerUpType);
      if (!plugin) {
        return {
          success: false,
          modified: false,
          error: new Error(`No plugin found for power-up type: ${powerUpType}`)
        };
      }

      // Check for conflicts and resolve
      const conflictResolution = this.resolveConflicts(powerUpType, plugin);
      if (!conflictResolution.applyNew) {
        this.effectsRejected++;
        return {
          success: false,
          modified: false,
          error: new Error(`Effect rejected: ${conflictResolution.reason}`)
        };
      }

      // Handle existing effects if replacement needed
      if (conflictResolution.action === 'replace' && !conflictResolution.keepExisting) {
        await this.removeConflictingEffects(powerUpType, plugin.effect.conflictsWith || []);
      }

      // Check stacking rules
      const stackingResult = this.checkStackingRules(powerUpType, plugin);
      if (!stackingResult.allowed) {
        this.effectsRejected++;
        return {
          success: false,
          modified: false,
          error: new Error(`Stacking not allowed: ${stackingResult.reason}`)
        };
      }

      // Create effect context
      const context = this.createPluginContext(powerUpId, powerUpType, effectData);

      // Apply the effect through plugin
      const result = plugin.applyEffect(context);
      if (!result.success) {
        this.effectsRejected++;
        return result;
      }

      // Create active effect tracking
      const activeEffect: ActiveEffect = {
        id: powerUpId,
        powerUpType,
        plugin,
        startTime: this.timeProvider.now(),
        duration: plugin.getMetadata().duration,
        priority: plugin.effect.priority,
        stackable: plugin.effect.stackable,
        conflictsWith: plugin.effect.conflictsWith || [],
        metadata: plugin.getMetadata(),
        effectData: effectData ?? {}
      };

      // Register the active effect
      this.activeEffects.set(powerUpId, activeEffect);
      this.effectsByType.get(powerUpType)?.add(powerUpId);
      this.effectsApplied++;

      console.log(`Applied power-up effect: ${powerUpType} (${powerUpId})`);
      return {
        success: true,
        modified: true,
        rollback: () => this.removeEffect(powerUpId)
      };

    } catch (error) {
      this.effectsRejected++;
      return {
        success: false,
        modified: false,
        error: error as Error
      };
    }
  }

  /**
   * Remove specific power-up effect
   */
  public async removeEffect(effectId: string): Promise<EffectResult> {
    const activeEffect = this.activeEffects.get(effectId);
    if (!activeEffect) {
      return {
        success: false,
        modified: false,
        error: new Error(`Effect ${effectId} not found`)
      };
    }

    try {
      // Create context for removal
      const context = this.createPluginContext(
        effectId,
        activeEffect.powerUpType,
        activeEffect.effectData
      );

      // Remove effect through plugin
      const result = activeEffect.plugin.removeEffect(context);

      // Clean up tracking
      this.activeEffects.delete(effectId);
      this.effectsByType.get(activeEffect.powerUpType)?.delete(effectId);

      console.log(`Removed power-up effect: ${activeEffect.powerUpType} (${effectId})`);
      return {
        success: true,
        modified: result.modified
      };

    } catch (error) {
      return {
        success: false,
        modified: false,
        error: error as Error
      };
    }
  }

  /**
   * Update all active effects (called each frame)
   */
  public update(deltaTime: number, gameState: PowerUpSystemState): void {
    this.gameState = gameState;
    const currentTime = this.timeProvider.now();
    const expiredEffects: string[] = [];

    // Update all active effects
    for (const [effectId, activeEffect] of this.activeEffects) {
      // Check for expiration
      const timeElapsed = currentTime - activeEffect.startTime;
      if (timeElapsed >= activeEffect.duration) {
        expiredEffects.push(effectId);
        continue;
      }

      // Update effect through plugin
      try {
        const context = this.createPluginContext(
          effectId,
          activeEffect.powerUpType,
          activeEffect.effectData
        );
        
        const result = activeEffect.plugin.updateEffect(context);
        if (!result.success && result.error) {
          console.warn(`Effect update failed for ${effectId}:`, result.error);
        }
      } catch (error) {
        console.error(`Error updating effect ${effectId}:`, error);
        expiredEffects.push(effectId);
      }
    }

    // Remove expired effects
    for (const effectId of expiredEffects) {
      this.removeEffect(effectId);
    }
  }

  /**
   * Get all active effects
   */
  public getActiveEffects(): ActiveEffect[] {
    return Array.from(this.activeEffects.values());
  }

  /**
   * Get active effects by type
   */
  public getActiveEffectsByType(powerUpType: PowerUpType): ActiveEffect[] {
    const effectIds = this.effectsByType.get(powerUpType) || new Set();
    return Array.from(effectIds)
      .map(id => this.activeEffects.get(id))
      .filter((effect): effect is ActiveEffect => effect !== undefined);
  }

  /**
   * Check if specific effect type is active
   */
  public hasActiveEffect(powerUpType: PowerUpType): boolean {
    const effectIds = this.effectsByType.get(powerUpType) || new Set();
    return effectIds.size > 0;
  }

  /**
   * Get remaining time for effect
   */
  public getRemainingTime(effectId: string): number {
    const activeEffect = this.activeEffects.get(effectId);
    if (!activeEffect) {
      return 0;
    }

    const timeElapsed = this.timeProvider.now() - activeEffect.startTime;
    return Math.max(0, activeEffect.duration - timeElapsed);
  }

  /**
   * Clear all active effects
   */
  public async clearAllEffects(): Promise<void> {
    const effectIds = Array.from(this.activeEffects.keys());
    
    for (const effectId of effectIds) {
      await this.removeEffect(effectId);
    }

    console.log('All power-up effects cleared');
  }

  /**
   * Get system performance statistics
   */
  public getPerformanceStats(): {
    totalEffectsProcessed: number;
    effectsApplied: number;
    effectsRejected: number;
    conflictsResolved: number;
    activeEffectsCount: number;
    rejectionRate: number;
  } {
    return {
      totalEffectsProcessed: this.totalEffectsProcessed,
      effectsApplied: this.effectsApplied,
      effectsRejected: this.effectsRejected,
      conflictsResolved: this.conflictsResolved,
      activeEffectsCount: this.activeEffects.size,
      rejectionRate: this.totalEffectsProcessed > 0 
        ? this.effectsRejected / this.totalEffectsProcessed 
        : 0
    };
  }

  /**
   * Get memory manager instance
   */
  public getMemoryManager(): MemoryManager | undefined {
    return this.memoryManager;
  }

  /**
   * Get memory statistics if memory manager is enabled
   */
  public getMemoryStats(): Record<string, unknown> | null {
    return (this.memoryManager?.getStats() as Record<string, unknown> | undefined) ?? null;
  }

  /**
   * Force memory optimization
   */
  public optimizeMemory(): void {
    if (this.memoryManager) {
      this.memoryManager.forceFullGC();
    }
  }

  /**
   * Create power-up with memory pooling
   */
  public createPooledPowerUp(powerUpType: PowerUpType, position?: { x: number; y: number }): unknown {
    if (this.memoryManager) {
      const powerUpPool = this.memoryManager.getPowerUpPool();
      return powerUpPool.acquire(powerUpType, position);
    }
    return null;
  }

  /**
   * Release power-up back to pool
   */
  public releasePooledPowerUp(powerUp: unknown): void {
    if (this.memoryManager && powerUp) {
      const powerUpPool = this.memoryManager.getPowerUpPool();
      powerUpPool.release(powerUp);
    }
  }

  /**
   * Shutdown system and cleanup
   */
  public async shutdown(): Promise<void> {
    // Stop cleanup timer
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    // Clear all effects
    await this.clearAllEffects();

    console.log('PowerUpSystem shutdown complete');
  }

  // Private helper methods

  private getPluginForType(powerUpType: PowerUpType): PowerUpPlugin | undefined {
    // Look for plugin by type - in real implementation, this would map types to plugin names
    const pluginNames = this.pluginManager.getPluginNames();
    
    for (const name of pluginNames) {
      const plugin = this.pluginManager.getPlugin(name);
      if (plugin && 'powerUpType' in plugin && plugin.powerUpType === powerUpType) {
        return plugin as PowerUpPlugin;
      }
    }

    return undefined;
  }

  private resolveConflicts(powerUpType: PowerUpType, plugin: PowerUpPlugin): ConflictResolution {
    const conflictsWith = plugin.effect.conflictsWith || [];
    
    // Check for active conflicting effects
    const conflicts = conflictsWith.filter(type => this.hasActiveEffect(type));
    
    if (conflicts.length === 0) {
      return {
        action: 'replace',
        keepExisting: true,
        applyNew: true,
        reason: 'No conflicts detected'
      };
    }

    this.conflictsResolved++;

    // Priority-based resolution
    const existingEffects = conflicts.flatMap(type => this.getActiveEffectsByType(type));
    const highestExistingPriority = Math.max(...existingEffects.map(e => e.priority));

    if (plugin.effect.priority > highestExistingPriority) {
      return {
        action: 'replace',
        keepExisting: false,
        applyNew: true,
        reason: `Higher priority (${plugin.effect.priority} > ${highestExistingPriority})`
      };
    } else {
      return {
        action: 'reject',
        keepExisting: true,
        applyNew: false,
        reason: `Lower priority (${plugin.effect.priority} <= ${highestExistingPriority})`
      };
    }
  }

  private checkStackingRules(powerUpType: PowerUpType, plugin: PowerUpPlugin): { allowed: boolean; reason: string } {
    const existingEffects = this.getActiveEffectsByType(powerUpType);
    
    if (existingEffects.length === 0) {
      return { allowed: true, reason: 'No existing effects of this type' };
    }

    if (plugin.effect.stackable) {
      if (this.activeEffects.size >= this.config.maxActiveEffects) {
        return { allowed: false, reason: 'Maximum active effects limit reached' };
      }
      return { allowed: true, reason: 'Stackable effect' };
    } else {
      return { allowed: false, reason: 'Effect type is not stackable' };
    }
  }

  private async removeConflictingEffects(powerUpType: PowerUpType, conflictsWith: PowerUpType[]): Promise<void> {
    const toRemove: string[] = [];
    
    for (const conflictingType of conflictsWith) {
      const conflictingEffects = this.getActiveEffectsByType(conflictingType);
      toRemove.push(...conflictingEffects.map(e => e.id));
    }

    for (const effectId of toRemove) {
      await this.removeEffect(effectId);
    }
  }

  private createPluginContext(
    powerUpId: string,
    powerUpType: PowerUpType,
    effectData: PowerUpEffectData | undefined
  ): PowerUpPluginContext {
    const snapshot: PowerUpSystemState = this.gameState ?? {};
    const gameEntities: GameEntitiesSnapshot = {
      balls: Array.isArray(snapshot.balls) ? snapshot.balls : [],
      paddle: snapshot.paddle ?? null,
      blocks: Array.isArray(snapshot.blocks) ? snapshot.blocks : [],
      powerUps: Array.isArray(snapshot.powerUps) ? snapshot.powerUps : [],
    };

    const effectPayload: PowerUpEffectData = effectData ? { ...effectData } : {};

    return {
      gameState: snapshot,
      deltaTime: 16, // Approximate 60 FPS
      currentTime: this.timeProvider.now(),
      performance: {
        startTime: performance.now(),
        maxExecutionTime: 2, // 2ms budget
      },
      powerUpType,
      powerUpId,
      effectData: effectPayload,
      gameEntities,
    };
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredEffects();
    }, this.config.cleanupInterval);
  }

  private cleanupExpiredEffects(): void {
    const currentTime = this.timeProvider.now();
    const expiredEffects: string[] = [];

    for (const [effectId, activeEffect] of this.activeEffects) {
      const timeElapsed = currentTime - activeEffect.startTime;
      if (timeElapsed >= activeEffect.duration) {
        expiredEffects.push(effectId);
      }
    }

    // Remove expired effects
    for (const effectId of expiredEffects) {
      this.removeEffect(effectId);
    }

    if (expiredEffects.length > 0) {
      console.log(`Cleaned up ${expiredEffects.length} expired power-up effects`);
    }
  }
}
