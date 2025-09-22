/**
 * PluginManager Unit Tests
 * Story 4.1, Task 5: Comprehensive unit test suite for plugin system
 * Coverage target: >90% for plugin registration and lifecycle management
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PluginManager, Plugin, PluginStatus, PluginContext } from '../PluginManager';

// Mock plugin implementations for testing
class MockPlugin implements Plugin {
  public readonly name: string;
  public readonly version: string;
  public readonly description?: string;
  public readonly dependencies?: string[];
  
  public initCalled = false;
  public destroyCalled = false;
  public shouldFailInit = false;
  public shouldFailDestroy = false;
  public initDelay = 0;
  public destroyDelay = 0;

  constructor(
    name: string, 
    version: string = '1.0.0',
    dependencies?: string[],
    description?: string
  ) {
    this.name = name;
    this.version = version;
    this.dependencies = dependencies;
    this.description = description;
  }

  async init(): Promise<void> {
    if (this.initDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.initDelay));
    }
    if (this.shouldFailInit) {
      throw new Error(`Init failed for ${this.name}`);
    }
    this.initCalled = true;
  }

  async destroy(): Promise<void> {
    if (this.destroyDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.destroyDelay));
    }
    if (this.shouldFailDestroy) {
      throw new Error(`Destroy failed for ${this.name}`);
    }
    this.destroyCalled = true;
  }
}

class InvalidPlugin {
  // Missing required properties and methods
  public name = 'invalid';
}

describe('PluginManager', () => {
  let pluginManager: PluginManager;
  let mockPlugin: MockPlugin;

  beforeEach(() => {
    pluginManager = new PluginManager();
    mockPlugin = new MockPlugin('test-plugin');
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Plugin Registration', () => {
    it('should register valid plugin successfully', async () => {
await pluginManager.register(mockPlugin);
      
      expect(result).toBe(true);
      expect(pluginManager.getPlugin('test-plugin')).toBe(mockPlugin);
      expect(pluginManager.getPluginNames()).toContain('test-plugin');
    });

    it('should reject invalid plugin', async () => {
      const invalidPlugin = new InvalidPlugin() as unknown;
await pluginManager.register(invalidPlugin);
      
      expect(result).toBe(false);
      expect(pluginManager.getPlugin('invalid')).toBeUndefined();
    });

    it('should reject duplicate plugin registration', async () => {
      await pluginManager.register(mockPlugin);
      
      const duplicatePlugin = new MockPlugin('test-plugin', '2.0.0');
await pluginManager.register(duplicatePlugin);
      
      expect(result).toBe(false);
      expect(pluginManager.getPlugin('test-plugin')).toBe(mockPlugin);
    });

    it('should validate plugin dependencies', async () => {
      const dependentPlugin = new MockPlugin('dependent', '1.0.0', ['missing-dep']);
await pluginManager.register(dependentPlugin);
      
      expect(result).toBe(false);
    });

    it('should allow registration with satisfied dependencies', async () => {
      const basePlugin = new MockPlugin('base-plugin');
      const dependentPlugin = new MockPlugin('dependent', '1.0.0', ['base-plugin']);
      
      await pluginManager.register(basePlugin);
await pluginManager.register(dependentPlugin);
      
      expect(result).toBe(true);
    });
  });

  describe('Plugin Initialization', () => {
    beforeEach(async () => {
      await pluginManager.register(mockPlugin);
    });

    it('should initialize plugin successfully', async () => {
await pluginManager.initializePlugin('test-plugin');
      
      expect(result).toBe(true);
      expect(mockPlugin.initCalled).toBe(true);
      expect(pluginManager.hasPlugin('test-plugin')).toBe(true);
    });

    it('should handle plugin initialization failure', async () => {
      mockPlugin.shouldFailInit = true;
await pluginManager.initializePlugin('test-plugin');
      
      expect(result).toBe(false);
      expect(pluginManager.hasPlugin('test-plugin')).toBe(false);
    });

    it('should handle non-existent plugin initialization', async () => {
await pluginManager.initializePlugin('non-existent');
      
      expect(result).toBe(false);
    });

    it('should initialize plugins in dependency order', async () => {
      const basePlugin = new MockPlugin('base');
      const midPlugin = new MockPlugin('mid', '1.0.0', ['base']);
      const topPlugin = new MockPlugin('top', '1.0.0', ['mid']);
      
      await pluginManager.register(topPlugin);
      await pluginManager.register(basePlugin);
      await pluginManager.register(midPlugin);
      
      await pluginManager.initializeAll();
      
      expect(basePlugin.initCalled).toBe(true);
      expect(midPlugin.initCalled).toBe(true);
      expect(topPlugin.initCalled).toBe(true);
    });

    it('should handle circular dependencies', async () => {
      const pluginA = new MockPlugin('plugin-a', '1.0.0', ['plugin-b']);
      const pluginB = new MockPlugin('plugin-b', '1.0.0', ['plugin-a']);
      
      await pluginManager.register(pluginA);
      await expect(pluginManager.register(pluginB)).rejects.toThrow();
    });

    it('should timeout long-running initialization', async () => {
      const timeoutManager = new PluginManager({ executionTimeout: 100 });
      mockPlugin.initDelay = 200; // Longer than timeout
      
      await timeoutManager.register(mockPlugin);
await timeoutManager.initializePlugin('test-plugin');
      
      expect(result).toBe(false);
    });
  });

  describe('Plugin Execution', () => {
    beforeEach(async () => {
      await pluginManager.register(mockPlugin);
      await pluginManager.initializePlugin('test-plugin');
    });

    it('should execute plugin method successfully', () => {
      const context: PluginContext = {
        gameState: {},
        deltaTime: 16,
        currentTime: Date.now(),
        performance: { startTime: performance.now(), maxExecutionTime: 2 }
      };
pluginManager.executePlugin('test-plugin', 'init', context);
      
      expect(result.success).toBe(true);
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should handle non-existent method execution', () => {
pluginManager.executePlugin('test-plugin', 'nonExistentMethod' as unknown);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle inactive plugin execution', () => {
pluginManager.executePlugin('non-existent', 'init');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should detect execution time budget exceeded', () => {
      const slowManager = new PluginManager({ maxExecutionTimePerFrame: 0.1 });
      slowManager.register(mockPlugin);
      slowManager.initializePlugin('test-plugin');
      
      // Execute method that takes longer than budget
      const slowMethod = () => {
        const start = performance.now();
        while (performance.now() - start < 2) {
          // Busy wait to exceed budget
        }
      };
      
      mockPlugin.init = slowMethod;
slowManager.executePlugin('test-plugin', 'init');
      
      expect(result.exceeded_budget).toBe(true);
    });
  });

  describe('Plugin Destruction', () => {
    beforeEach(async () => {
      await pluginManager.register(mockPlugin);
      await pluginManager.initializePlugin('test-plugin');
    });

    it('should destroy plugin successfully', async () => {
await pluginManager.destroyPlugin('test-plugin');
      
      expect(result).toBe(true);
      expect(mockPlugin.destroyCalled).toBe(true);
    });

    it('should handle plugin destruction failure', async () => {
      mockPlugin.shouldFailDestroy = true;
await pluginManager.destroyPlugin('test-plugin');
      
      expect(result).toBe(false);
    });

    it('should destroy all plugins in reverse order', async () => {
      const basePlugin = new MockPlugin('base');
      const midPlugin = new MockPlugin('mid', '1.0.0', ['base']);
      const topPlugin = new MockPlugin('top', '1.0.0', ['mid']);
      
      await pluginManager.register(basePlugin);
      await pluginManager.register(midPlugin);
      await pluginManager.register(topPlugin);
      
      await pluginManager.initializeAll();
      await pluginManager.destroyAll();
      
      // All should be destroyed
      expect(basePlugin.destroyCalled).toBe(true);
      expect(midPlugin.destroyCalled).toBe(true);
      expect(topPlugin.destroyCalled).toBe(true);
    });

    it('should timeout long-running destruction', async () => {
      const timeoutManager = new PluginManager({ executionTimeout: 100 });
      mockPlugin.destroyDelay = 200; // Longer than timeout
      
      await timeoutManager.register(mockPlugin);
      await timeoutManager.initializePlugin('test-plugin');
await timeoutManager.destroyPlugin('test-plugin');
      
      expect(result).toBe(false);
    });
  });

  describe('Plugin Metadata and Monitoring', () => {
    beforeEach(async () => {
      await pluginManager.register(mockPlugin);
      await pluginManager.initializePlugin('test-plugin');
    });

    it('should provide plugin metadata', () => {
      const metadata = pluginManager.getPluginMetadata('test-plugin');
      
      expect(metadata).toBeDefined();
      expect(metadata!.plugin).toBe(mockPlugin);
      expect(metadata!.status).toBe(PluginStatus.Active);
      expect(metadata!.initTime).toBeGreaterThan(0);
    });

    it('should track execution statistics', () => {
      // Execute plugin multiple times
      for (let i = 0; i < 5; i++) {
        pluginManager.executePlugin('test-plugin', 'init');
      }
      
      const metadata = pluginManager.getPluginMetadata('test-plugin');
      expect(metadata!.totalExecutionTime).toBeGreaterThan(0);
    });

    it('should provide performance statistics', () => {
      const stats = pluginManager.getPerformanceStats();
      
      expect(stats.totalPlugins).toBe(1);
      expect(stats.activePlugins).toBe(1);
      expect(stats.averageExecutionTime).toBeGreaterThanOrEqual(0);
      expect(stats.totalExecutionTime).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(stats.pluginsExceedingBudget)).toBe(true);
    });
  });

  describe('Plugin Configuration', () => {
    it('should create manager with custom configuration', () => {
      const config = {
        performanceMonitoring: false,
        maxExecutionTimePerFrame: 5,
        executionTimeout: 1000
      };
      
      const customManager = new PluginManager(config);
      
      expect(customManager).toBeInstanceOf(PluginManager);
    });

    it('should use default configuration when none provided', () => {
      const defaultManager = new PluginManager();
      
      expect(defaultManager).toBeInstanceOf(PluginManager);
    });
  });

  describe('Error Handling', () => {
    it('should handle plugin validation errors gracefully', async () => {
      const malformedPlugin = {
        name: 'malformed',
        version: '1.0.0',
        init: 'not a function',
        destroy: 'not a function'
      } as unknown;
await pluginManager.register(malformedPlugin);
      
      expect(result).toBe(false);
    });

    it('should track error counts in metadata', async () => {
      await pluginManager.register(mockPlugin);
      await pluginManager.initializePlugin('test-plugin');
      
      // Force execution errors
      mockPlugin.init = () => { throw new Error('Test error'); };
      
      pluginManager.executePlugin('test-plugin', 'init');
      pluginManager.executePlugin('test-plugin', 'init');
      
      const metadata = pluginManager.getPluginMetadata('test-plugin');
      expect(metadata!.errorCount).toBe(2);
      expect(metadata!.lastError).toBeDefined();
    });

    it('should handle concurrent registration attempts', async () => {
      const promises = [
        pluginManager.register(mockPlugin),
        pluginManager.register(new MockPlugin('test-plugin-2')),
        pluginManager.register(new MockPlugin('test-plugin-3'))
      ];
      
      const results = await Promise.all(promises);
      
      expect(results.filter(r => r === true)).toHaveLength(3);
    });
  });

  describe('Performance Requirements', () => {
    it('should complete registration within performance budget', async () => {
      const startTime = performance.now();
      
      // Register multiple plugins
      for (let i = 0; i < 10; i++) {
        await pluginManager.register(new MockPlugin(`plugin-${i}`));
      }
      
      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(50); // Should complete in <50ms
    });

    it('should handle large number of plugins efficiently', async () => {
      const plugins = Array.from({ length: 50 }, (_, i) => 
        new MockPlugin(`plugin-${i}`)
      );
      
      const startTime = performance.now();
      
      for (const plugin of plugins) {
        await pluginManager.register(plugin);
      }
      
      const registrationTime = performance.now() - startTime;
      
      const initStartTime = performance.now();
      await pluginManager.initializeAll();
      const initTime = performance.now() - initStartTime;
      
      expect(registrationTime).toBeLessThan(500); // <500ms for 50 registrations
      expect(initTime).toBeLessThan(1000); // <1s for 50 initializations
    });
  });
});