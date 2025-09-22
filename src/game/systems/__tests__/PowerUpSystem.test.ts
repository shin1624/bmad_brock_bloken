/**
 * PowerUpSystem Integration Tests
 * Story 4.1, Task 5: Integration tests for effect management system
 * Tests effect stacking, conflict resolution, and React-Canvas bridge
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PowerUpSystem, TimeProvider } from '../PowerUpSystem';
import { PluginManager } from '../../plugins/PluginManager';
import { PowerUpPlugin, PowerUpPluginContext, EffectResult } from '../../plugins/PowerUpPlugin';
import { PowerUpType } from '../../entities/PowerUp';

// Mock time provider for testing
class MockTimeProvider implements TimeProvider {
  private currentTime = 0;

  now(): number {
    return this.currentTime;
  }

  setTime(time: number): void {
    this.currentTime = time;
  }

  advance(ms: number): void {
    this.currentTime += ms;
  }
}

// Mock PowerUp Plugin for testing
class MockPowerUpPlugin extends PowerUpPlugin {
  public applyEffectCalled = false;
  public removeEffectCalled = false;
  public updateEffectCalled = false;
  public conflictHandled = false;
  public shouldFailApply = false;
  public shouldFailRemove = false;
  public executionTime = 0;

  constructor(type: PowerUpType, priority: number = 5, stackable: boolean = false, conflicts: PowerUpType[] = []) {
    const effect = {
      id: `${type}_effect`,
      priority,
      stackable,
      conflictsWith: conflicts,
      apply: () => {},
      remove: () => {}
    };
    
    super(`${type}_plugin`, '1.0.0', type, effect);
  }

  protected async onInit(): Promise<void> {
    // Mock initialization
  }

  protected async onDestroy(): Promise<void> {
    // Mock destruction
  }

  protected onApplyEffect(context: PowerUpPluginContext): EffectResult {
    this.applyEffectCalled = true;
    
    if (this.shouldFailApply) {
      return {
        success: false,
        modified: false,
        error: new Error('Apply effect failed')
      };
    }
    
    return {
      success: true,
      modified: true,
      rollback: () => this.onRemoveEffect(context)
    };
  }

  protected onRemoveEffect(context: PowerUpPluginContext): EffectResult {
    this.removeEffectCalled = true;
    
    if (this.shouldFailRemove) {
      return {
        success: false,
        modified: false,
        error: new Error('Remove effect failed')
      };
    }
    
    return {
      success: true,
      modified: true
    };
  }

  protected onUpdateEffect(context: PowerUpPluginContext): EffectResult {
    this.updateEffectCalled = true;
    
    return {
      success: true,
      modified: false
    };
  }

  protected onHandleConflict(conflictingType: PowerUpType, context: PowerUpPluginContext): EffectResult {
    this.conflictHandled = true;
    
    return {
      success: true,
      modified: true
    };
  }

  protected getIcon(): string {
    return '🧪';
  }

  protected getColor(): string {
    return '#ff0000';
  }

  protected getRarity(): 'common' | 'rare' | 'epic' {
    return 'common';
  }

  protected getDuration(): number {
    return 10000; // 10 seconds
  }

  public getExecutionTime(): number {
    return this.executionTime;
  }
}

describe('PowerUpSystem Integration', () => {
  let powerUpSystem: PowerUpSystem;
  let pluginManager: PluginManager;
  let mockGameState: unknown;
  let mockTimeProvider: MockTimeProvider;

  beforeEach(async () => {
    pluginManager = new PluginManager();
    mockTimeProvider = new MockTimeProvider();
    powerUpSystem = new PowerUpSystem(pluginManager, undefined, mockTimeProvider);
    
    mockGameState = {
      balls: [],
      paddle: { x: 100, y: 500, width: 80, height: 10 },
      blocks: [],
      powerUps: []
    };
    
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Effect Application', () => {
    it('should apply effect successfully with plugin', async () => {
      const plugin = new MockPowerUpPlugin(PowerUpType.MultiBall);
      await pluginManager.register(plugin);
      await pluginManager.initializePlugin(plugin.name);
      
      const result = await powerUpSystem.applyEffect(
        PowerUpType.MultiBall,
        'test-powerup-1',
        mockGameState
      );
      
      expect(result.success).toBe(true);
      expect(result.modified).toBe(true);
      expect(plugin.applyEffectCalled).toBe(true);
      expect(powerUpSystem.getActiveEffects()).toHaveLength(1);
    });

    it('should reject effect when no plugin found', async () => {
      const result = await powerUpSystem.applyEffect(
        PowerUpType.MultiBall,
        'test-powerup-1',
        mockGameState
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(powerUpSystem.getActiveEffects()).toHaveLength(0);
    });

    it('should handle plugin apply effect failure', async () => {
      const plugin = new MockPowerUpPlugin(PowerUpType.MultiBall);
      plugin.shouldFailApply = true;
      
      await pluginManager.register(plugin);
      await pluginManager.initializePlugin(plugin.name);
      
      const result = await powerUpSystem.applyEffect(
        PowerUpType.MultiBall,
        'test-powerup-1',
        mockGameState
      );
      
      expect(result.success).toBe(false);
      expect(powerUpSystem.getActiveEffects()).toHaveLength(0);
    });
  });

  describe('Effect Stacking Management', () => {
    it('should allow stacking when plugin is stackable', async () => {
      const plugin = new MockPowerUpPlugin(PowerUpType.MultiBall, 5, true); // stackable
      await pluginManager.register(plugin);
      await pluginManager.initializePlugin(plugin.name);
      
      // Apply first effect
      await powerUpSystem.applyEffect(PowerUpType.MultiBall, 'powerup-1', mockGameState);
      
      // Apply second effect of same type
      const result = await powerUpSystem.applyEffect(PowerUpType.MultiBall, 'powerup-2', mockGameState);
      
      expect(result.success).toBe(true);
      expect(powerUpSystem.getActiveEffects()).toHaveLength(2);
    });

    it('should reject stacking when plugin is not stackable', async () => {
      const plugin = new MockPowerUpPlugin(PowerUpType.PaddleSize, 5, false); // not stackable
      await pluginManager.register(plugin);
      await pluginManager.initializePlugin(plugin.name);
      
      // Apply first effect
      await powerUpSystem.applyEffect(PowerUpType.PaddleSize, 'powerup-1', mockGameState);
      
      // Try to apply second effect of same type
      const result = await powerUpSystem.applyEffect(PowerUpType.PaddleSize, 'powerup-2', mockGameState);
      
      expect(result.success).toBe(false);
      expect(powerUpSystem.getActiveEffects()).toHaveLength(1);
    });

    it('should respect maximum active effects limit', async () => {
      const systemWithLimit = new PowerUpSystem(pluginManager, { maxActiveEffects: 2 }, mockTimeProvider);
      
      const plugin1 = new MockPowerUpPlugin(PowerUpType.MultiBall, 5, true);
      const plugin2 = new MockPowerUpPlugin(PowerUpType.BallSpeed, 5, true);
      const plugin3 = new MockPowerUpPlugin(PowerUpType.PaddleSize, 5, true);
      
      await pluginManager.register(plugin1);
      await pluginManager.register(plugin2);
      await pluginManager.register(plugin3);
      await pluginManager.initializeAll();
      
      // Apply effects up to limit
      await systemWithLimit.applyEffect(PowerUpType.MultiBall, 'powerup-1', mockGameState);
      await systemWithLimit.applyEffect(PowerUpType.BallSpeed, 'powerup-2', mockGameState);
      
      // Try to exceed limit
      const result = await systemWithLimit.applyEffect(PowerUpType.PaddleSize, 'powerup-3', mockGameState);
      
      expect(result.success).toBe(false);
      expect(systemWithLimit.getActiveEffects()).toHaveLength(2);
    });
  });

  describe('Conflict Resolution', () => {
    it('should replace lower priority effect with higher priority', async () => {
      const lowPriorityPlugin = new MockPowerUpPlugin(PowerUpType.BallSpeed, 3, false, [PowerUpType.Magnet]);
      const highPriorityPlugin = new MockPowerUpPlugin(PowerUpType.Magnet, 7, false, [PowerUpType.BallSpeed]);
      
      await pluginManager.register(lowPriorityPlugin);
      await pluginManager.register(highPriorityPlugin);
      await pluginManager.initializeAll();
      
      // Apply low priority effect
      await powerUpSystem.applyEffect(PowerUpType.BallSpeed, 'powerup-1', mockGameState);
      expect(powerUpSystem.getActiveEffects()).toHaveLength(1);
      
      // Apply conflicting high priority effect
      const result = await powerUpSystem.applyEffect(PowerUpType.Magnet, 'powerup-2', mockGameState);
      
      expect(result.success).toBe(true);
      expect(powerUpSystem.getActiveEffects()).toHaveLength(1);
      expect(powerUpSystem.hasActiveEffect(PowerUpType.Magnet)).toBe(true);
      expect(powerUpSystem.hasActiveEffect(PowerUpType.BallSpeed)).toBe(false);
    });

    it('should reject lower priority effect when higher priority exists', async () => {
      const lowPriorityPlugin = new MockPowerUpPlugin(PowerUpType.BallSpeed, 3, false, [PowerUpType.Magnet]);
      const highPriorityPlugin = new MockPowerUpPlugin(PowerUpType.Magnet, 7, false, [PowerUpType.BallSpeed]);
      
      await pluginManager.register(lowPriorityPlugin);
      await pluginManager.register(highPriorityPlugin);
      await pluginManager.initializeAll();
      
      // Apply high priority effect first
      await powerUpSystem.applyEffect(PowerUpType.Magnet, 'powerup-1', mockGameState);
      
      // Try to apply conflicting low priority effect
      const result = await powerUpSystem.applyEffect(PowerUpType.BallSpeed, 'powerup-2', mockGameState);
      
      expect(result.success).toBe(false);
      expect(powerUpSystem.getActiveEffects()).toHaveLength(1);
      expect(powerUpSystem.hasActiveEffect(PowerUpType.Magnet)).toBe(true);
    });
  });

  describe('Duration Management', () => {
    it('should update active effects and track remaining time', async () => {
      const plugin = new MockPowerUpPlugin(PowerUpType.MultiBall);
      await pluginManager.register(plugin);
      await pluginManager.initializePlugin(plugin.name);
      
      // Set initial time
      mockTimeProvider.setTime(1000);
      await powerUpSystem.applyEffect(PowerUpType.MultiBall, 'powerup-1', mockGameState);
      
      const initialTime = powerUpSystem.getRemainingTime('powerup-1');
      expect(initialTime).toBeGreaterThan(0);
      
      // Advance time by 1 second
      mockTimeProvider.advance(1000);
      powerUpSystem.update(1000, mockGameState);
      
      const remainingTime = powerUpSystem.getRemainingTime('powerup-1');
      expect(remainingTime).toBeLessThan(initialTime);
      expect(plugin.updateEffectCalled).toBe(true);
    });

    it('should automatically remove expired effects', async () => {
      const plugin = new MockPowerUpPlugin(PowerUpType.MultiBall);
      await pluginManager.register(plugin);
      await pluginManager.initializePlugin(plugin.name);
      
      // Set initial time
      mockTimeProvider.setTime(0);
      await powerUpSystem.applyEffect(PowerUpType.MultiBall, 'powerup-1', mockGameState);
      expect(powerUpSystem.getActiveEffects()).toHaveLength(1);
      
      // Advance time beyond effect duration (default 10 seconds)
      mockTimeProvider.advance(15000); // 15 seconds
      powerUpSystem.update(15000, mockGameState);
      
      expect(powerUpSystem.getActiveEffects()).toHaveLength(0);
      expect(plugin.removeEffectCalled).toBe(true);
    });

    it('should handle manual effect removal', async () => {
      const plugin = new MockPowerUpPlugin(PowerUpType.MultiBall);
      await pluginManager.register(plugin);
      await pluginManager.initializePlugin(plugin.name);
      
      await powerUpSystem.applyEffect(PowerUpType.MultiBall, 'powerup-1', mockGameState);
      
      const result = await powerUpSystem.removeEffect('powerup-1');
      
      expect(result.success).toBe(true);
      expect(powerUpSystem.getActiveEffects()).toHaveLength(0);
      expect(plugin.removeEffectCalled).toBe(true);
    });
  });

  describe('Performance Monitoring', () => {
    it('should track performance statistics', async () => {
      const plugin = new MockPowerUpPlugin(PowerUpType.MultiBall);
      await pluginManager.register(plugin);
      await pluginManager.initializePlugin(plugin.name);
      
      // Apply several effects
      await powerUpSystem.applyEffect(PowerUpType.MultiBall, 'powerup-1', mockGameState);
      await powerUpSystem.applyEffect(PowerUpType.MultiBall, 'powerup-2', mockGameState);
      
      const stats = powerUpSystem.getPerformanceStats();
      
      expect(stats.totalEffectsProcessed).toBe(2);
      expect(stats.effectsApplied).toBeGreaterThan(0);
      expect(stats.activeEffectsCount).toBeGreaterThan(0);
      expect(stats.rejectionRate).toBeGreaterThanOrEqual(0);
    });

    it('should track rejection statistics', async () => {
      const plugin = new MockPowerUpPlugin(PowerUpType.MultiBall, 5, false); // not stackable
      await pluginManager.register(plugin);
      await pluginManager.initializePlugin(plugin.name);
      
      // Apply first effect
      await powerUpSystem.applyEffect(PowerUpType.MultiBall, 'powerup-1', mockGameState);
      
      // Try to apply conflicting effect (should be rejected)
      await powerUpSystem.applyEffect(PowerUpType.MultiBall, 'powerup-2', mockGameState);
      
      const stats = powerUpSystem.getPerformanceStats();
      
      expect(stats.totalEffectsProcessed).toBe(2);
      expect(stats.effectsRejected).toBe(1);
      expect(stats.rejectionRate).toBe(0.5);
    });
  });

  describe('System Lifecycle', () => {
    it('should clear all effects on shutdown', async () => {
      const plugin = new MockPowerUpPlugin(PowerUpType.MultiBall);
      await pluginManager.register(plugin);
      await pluginManager.initializePlugin(plugin.name);
      
      // Apply multiple effects
      await powerUpSystem.applyEffect(PowerUpType.MultiBall, 'powerup-1', mockGameState);
      await powerUpSystem.applyEffect(PowerUpType.MultiBall, 'powerup-2', mockGameState);
      
      expect(powerUpSystem.getActiveEffects()).toHaveLength(2);
      
      await powerUpSystem.shutdown();
      
      expect(powerUpSystem.getActiveEffects()).toHaveLength(0);
    });

    it('should handle auto-cleanup when enabled', async () => {
      const systemWithCleanup = new PowerUpSystem(pluginManager, { 
        autoCleanup: true,
        cleanupInterval: 100
      }, mockTimeProvider);
      
      const plugin = new MockPowerUpPlugin(PowerUpType.MultiBall);
      await pluginManager.register(plugin);
      await pluginManager.initializePlugin(plugin.name);
      
      await systemWithCleanup.applyEffect(PowerUpType.MultiBall, 'powerup-1', mockGameState);
      
      // Fast-forward past effect duration
      vi.advanceTimersByTime(15000);
      
      // Wait for cleanup interval
      vi.advanceTimersByTime(200);
      
      expect(systemWithCleanup.getActiveEffects()).toHaveLength(0);
    });
  });

  describe('React-Canvas Bridge Integration', () => {
    it('should provide correct active effects for UI', async () => {
      const plugin = new MockPowerUpPlugin(PowerUpType.MultiBall);
      await pluginManager.register(plugin);
      await pluginManager.initializePlugin(plugin.name);
      
      await powerUpSystem.applyEffect(PowerUpType.MultiBall, 'powerup-1', mockGameState);
      
      const activeEffects = powerUpSystem.getActiveEffects();
      const effect = activeEffects[0];
      
      expect(effect.id).toBe('powerup-1');
      expect(effect.powerUpType).toBe(PowerUpType.MultiBall);
      expect(effect.metadata).toBeDefined();
      expect(effect.duration).toBeGreaterThan(0);
    });

    it('should support filtering effects by type', async () => {
      const plugin1 = new MockPowerUpPlugin(PowerUpType.MultiBall);
      const plugin2 = new MockPowerUpPlugin(PowerUpType.BallSpeed);
      
      await pluginManager.register(plugin1);
      await pluginManager.register(plugin2);
      await pluginManager.initializeAll();
      
      await powerUpSystem.applyEffect(PowerUpType.MultiBall, 'powerup-1', mockGameState);
      await powerUpSystem.applyEffect(PowerUpType.BallSpeed, 'powerup-2', mockGameState);
      
      const multiBallEffects = powerUpSystem.getActiveEffectsByType(PowerUpType.MultiBall);
      const ballSpeedEffects = powerUpSystem.getActiveEffectsByType(PowerUpType.BallSpeed);
      
      expect(multiBallEffects).toHaveLength(1);
      expect(ballSpeedEffects).toHaveLength(1);
      expect(multiBallEffects[0].powerUpType).toBe(PowerUpType.MultiBall);
      expect(ballSpeedEffects[0].powerUpType).toBe(PowerUpType.BallSpeed);
    });
  });

  describe('Error Recovery', () => {
    it('should handle plugin errors gracefully during update', async () => {
      const plugin = new MockPowerUpPlugin(PowerUpType.MultiBall);
      await pluginManager.register(plugin);
      await pluginManager.initializePlugin(plugin.name);
      
      await powerUpSystem.applyEffect(PowerUpType.MultiBall, 'powerup-1', mockGameState);
      
      // Make plugin throw error during update
      plugin.onUpdateEffect = () => {
        throw new Error('Update failed');
      };
      
      expect(() => {
        powerUpSystem.update(1000, mockGameState);
      }).not.toThrow();
      
      // Effect should be removed due to error
      expect(powerUpSystem.getActiveEffects()).toHaveLength(0);
    });

    it('should continue processing other effects when one fails', async () => {
      const plugin1 = new MockPowerUpPlugin(PowerUpType.MultiBall);
      const plugin2 = new MockPowerUpPlugin(PowerUpType.BallSpeed);
      
      await pluginManager.register(plugin1);
      await pluginManager.register(plugin2);
      await pluginManager.initializeAll();
      
      await powerUpSystem.applyEffect(PowerUpType.MultiBall, 'powerup-1', mockGameState);
      await powerUpSystem.applyEffect(PowerUpType.BallSpeed, 'powerup-2', mockGameState);
      
      // Make one plugin fail
      plugin1.onUpdateEffect = () => {
        throw new Error('Update failed');
      };
      
      powerUpSystem.update(1000, mockGameState);
      
      // One effect removed, one still active
      expect(powerUpSystem.hasActiveEffect(PowerUpType.BallSpeed)).toBe(true);
      expect(plugin2.updateEffectCalled).toBe(true);
    });
  });
});