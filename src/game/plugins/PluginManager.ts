/**
 * Plugin Manager Implementation for Power-Up Foundation
 * Story 4.1, Task 2: Plugin-based power-up addition system
 * Manages plugin registration, lifecycle, and execution with performance monitoring
 */

// Plugin interface that all plugins must implement
export interface Plugin {
  readonly name: string;
  readonly version: string;
  readonly description?: string;
  readonly dependencies?: string[];
  
  // Lifecycle methods
  init(): Promise<void> | void;
  destroy(): Promise<void> | void;
  
  // Optional performance metadata
  getExecutionTime?(): number;
  getMemoryUsage?(): number;
}

// Plugin execution context for sandboxing
export interface PluginContext<TGameState = unknown> {
  readonly gameState: TGameState;
  readonly deltaTime: number;
  readonly currentTime: number;
  readonly performance: {
    startTime: number;
    maxExecutionTime: number; // 2ms budget
  };
}

// Plugin status tracking
export enum PluginStatus {
  Registered = 'registered',
  Initializing = 'initializing',
  Active = 'active',
  Error = 'error',
  Destroyed = 'destroyed'
}

// Plugin metadata for management
export interface PluginMetadata {
  plugin: Plugin;
  status: PluginStatus;
  initTime: number;
  lastExecutionTime: number;
  totalExecutionTime: number;
  errorCount: number;
  lastError?: Error;
}

// Plugin execution result
export interface PluginExecutionResult {
  success: boolean;
  executionTime: number;
  error?: Error;
  exceeded_budget?: boolean;
}

/**
 * PluginManager Class
 * Central registration and lifecycle management for all plugins
 * Implements performance monitoring and execution time budgets
 */
export class PluginManager {
  private plugins: Map<string, PluginMetadata> = new Map();
  private initializationOrder: string[] = [];
  private performanceMonitoring: boolean = true;
  private maxExecutionTimePerFrame: number = 2; // 2ms budget per frame
  private executionTimeout: number = 5000; // 5 second timeout for init/destroy

  constructor(config?: { 
    performanceMonitoring?: boolean;
    maxExecutionTimePerFrame?: number;
    executionTimeout?: number;
  }) {
    if (config) {
      this.performanceMonitoring = config.performanceMonitoring ?? true;
      this.maxExecutionTimePerFrame = config.maxExecutionTimePerFrame ?? 2;
      this.executionTimeout = config.executionTimeout ?? 5000;
    }
  }

  /**
   * Register a plugin with validation and dependency checking
   */
  public async register(plugin: Plugin): Promise<boolean> {
    try {
      // Validate plugin interface
      if (!this.validatePlugin(plugin)) {
        throw new Error(`Plugin ${plugin.name} failed validation`);
      }

      // Check for duplicate registration
      if (this.plugins.has(plugin.name)) {
        throw new Error(`Plugin ${plugin.name} is already registered`);
      }

      // Check dependencies
      if (plugin.dependencies) {
        const missingDeps = plugin.dependencies.filter(dep => !this.plugins.has(dep));
        if (missingDeps.length > 0) {
          throw new Error(`Plugin ${plugin.name} missing dependencies: ${missingDeps.join(', ')}`);
        }
      }

      // Create metadata
      const metadata: PluginMetadata = {
        plugin,
        status: PluginStatus.Registered,
        initTime: 0,
        lastExecutionTime: 0,
        totalExecutionTime: 0,
        errorCount: 0
      };

      this.plugins.set(plugin.name, metadata);
      this.initializationOrder.push(plugin.name);

      console.log(`Plugin ${plugin.name} v${plugin.version} registered successfully`);
      return true;

    } catch (error) {
      console.error(`Failed to register plugin ${plugin.name}:`, error);
      return false;
    }
  }

  /**
   * Initialize a specific plugin with timeout and error handling
   */
  public async initializePlugin(pluginName: string): Promise<boolean> {
    const metadata = this.plugins.get(pluginName);
    if (!metadata) {
      console.error(`Plugin ${pluginName} not found`);
      return false;
    }

    try {
      metadata.status = PluginStatus.Initializing;
      const startTime = performance.now();

      // Initialize with timeout
      await this.executeWithTimeout(
        metadata.plugin.init(),
        this.executionTimeout,
        `Plugin ${pluginName} initialization timeout`
      );

      metadata.initTime = performance.now() - startTime;
      metadata.status = PluginStatus.Active;

      console.log(`Plugin ${pluginName} initialized in ${metadata.initTime.toFixed(2)}ms`);
      return true;

    } catch (error) {
      metadata.status = PluginStatus.Error;
      metadata.lastError = error as Error;
      metadata.errorCount++;
      console.error(`Failed to initialize plugin ${pluginName}:`, error);
      return false;
    }
  }

  /**
   * Initialize all registered plugins in dependency order
   */
  public async initializeAll(): Promise<void> {
    const sortedPlugins = this.sortPluginsByDependencies();
    const results: { name: string; success: boolean }[] = [];

    for (const pluginName of sortedPlugins) {
      const success = await this.initializePlugin(pluginName);
      results.push({ name: pluginName, success });
    }

    const failedPlugins = results.filter(r => !r.success);
    if (failedPlugins.length > 0) {
      console.warn(`Failed to initialize plugins: ${failedPlugins.map(p => p.name).join(', ')}`);
    }

    console.log(`Plugin initialization complete: ${results.length - failedPlugins.length}/${results.length} successful`);
  }

  /**
   * Execute plugin method with performance monitoring and time budget
   */
  public executePlugin(
    pluginName: string, 
    method: keyof Plugin, 
    context?: PluginContext
  ): PluginExecutionResult {
    const metadata = this.plugins.get(pluginName);
    if (!metadata || metadata.status !== PluginStatus.Active) {
      return {
        success: false,
        executionTime: 0,
        error: new Error(`Plugin ${pluginName} not active`)
      };
    }

    const startTime = performance.now();

    try {
      const pluginMethod = metadata.plugin[method];
      if (typeof pluginMethod !== 'function') {
        return {
          success: false,
          executionTime: 0,
          error: new Error(`Method ${String(method)} not found on plugin ${pluginName}`),
        };
      }

      if (context) {
        context.performance.startTime = startTime;
        context.performance.maxExecutionTime = this.maxExecutionTimePerFrame;
      }

      const executionArgs: unknown[] = context ? [context] : [];
      const result = pluginMethod.apply(metadata.plugin, executionArgs);
      const executionTime = performance.now() - startTime;

      // Check time budget
      const exceededBudget = executionTime > this.maxExecutionTimePerFrame;
      if (exceededBudget && this.performanceMonitoring) {
        console.warn(`Plugin ${pluginName} exceeded time budget: ${executionTime.toFixed(2)}ms > ${this.maxExecutionTimePerFrame}ms`);
      }

      // Update metadata
      metadata.lastExecutionTime = executionTime;
      metadata.totalExecutionTime += executionTime;

      return {
        success: true,
        executionTime,
        exceeded_budget: exceededBudget
      };

    } catch (error) {
      const executionTime = performance.now() - startTime;
      metadata.errorCount++;
      metadata.lastError = error as Error;

      return {
        success: false,
        executionTime,
        error: error as Error
      };
    }
  }

  /**
   * Destroy a specific plugin
   */
  public async destroyPlugin(pluginName: string): Promise<boolean> {
    const metadata = this.plugins.get(pluginName);
    if (!metadata) {
      return false;
    }

    try {
      await this.executeWithTimeout(
        metadata.plugin.destroy(),
        this.executionTimeout,
        `Plugin ${pluginName} destruction timeout`
      );

      metadata.status = PluginStatus.Destroyed;
      console.log(`Plugin ${pluginName} destroyed successfully`);
      return true;

    } catch (error) {
      metadata.status = PluginStatus.Error;
      metadata.lastError = error as Error;
      metadata.errorCount++;
      console.error(`Failed to destroy plugin ${pluginName}:`, error);
      return false;
    }
  }

  /**
   * Destroy all plugins in reverse dependency order
   */
  public async destroyAll(): Promise<void> {
    const sortedPlugins = this.sortPluginsByDependencies().reverse();
    
    for (const pluginName of sortedPlugins) {
      if (this.plugins.get(pluginName)?.status === PluginStatus.Active) {
        await this.destroyPlugin(pluginName);
      }
    }

    console.log('All plugins destroyed');
  }

  /**
   * Get plugin by name
   */
  public getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name)?.plugin;
  }

  /**
   * Check if plugin exists and is active
   */
  public hasPlugin(name: string): boolean {
    const metadata = this.plugins.get(name);
    return metadata?.status === PluginStatus.Active;
  }

  /**
   * Get all registered plugin names
   */
  public getPluginNames(): string[] {
    return Array.from(this.plugins.keys());
  }

  /**
   * Get plugin metadata for monitoring
   */
  public getPluginMetadata(name: string): PluginMetadata | undefined {
    return this.plugins.get(name);
  }

  /**
   * Get performance statistics
   */
  public getPerformanceStats(): {
    totalPlugins: number;
    activePlugins: number;
    averageExecutionTime: number;
    totalExecutionTime: number;
    pluginsExceedingBudget: string[];
  } {
    const metadataArray = Array.from(this.plugins.values());
    const activePlugins = metadataArray.filter(m => m.status === PluginStatus.Active);
    
    const totalExecutionTime = metadataArray.reduce((sum, m) => sum + m.totalExecutionTime, 0);
    const averageExecutionTime = activePlugins.length > 0 
      ? totalExecutionTime / activePlugins.length 
      : 0;

    const pluginsExceedingBudget = metadataArray
      .filter(m => m.lastExecutionTime > this.maxExecutionTimePerFrame)
      .map(m => m.plugin.name);

    return {
      totalPlugins: this.plugins.size,
      activePlugins: activePlugins.length,
      averageExecutionTime,
      totalExecutionTime,
      pluginsExceedingBudget
    };
  }

  /**
   * Validate plugin interface compliance
   */
  private validatePlugin(plugin: Plugin): boolean {
    const requiredMethods = ['name', 'version', 'init', 'destroy'];
    
    for (const method of requiredMethods) {
      if (!(method in plugin)) {
        console.error(`Plugin missing required property: ${method}`);
        return false;
      }
    }

    if (typeof plugin.init !== 'function' || typeof plugin.destroy !== 'function') {
      console.error('Plugin init and destroy must be functions');
      return false;
    }

    if (typeof plugin.name !== 'string' || typeof plugin.version !== 'string') {
      console.error('Plugin name and version must be strings');
      return false;
    }

    return true;
  }

  /**
   * Sort plugins by dependency order
   */
  private sortPluginsByDependencies(): string[] {
    const sorted: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (pluginName: string): void => {
      if (visited.has(pluginName)) return;
      if (visiting.has(pluginName)) {
        throw new Error(`Circular dependency detected involving ${pluginName}`);
      }

      visiting.add(pluginName);
      
      const plugin = this.plugins.get(pluginName)?.plugin;
      if (plugin?.dependencies) {
        for (const dep of plugin.dependencies) {
          visit(dep);
        }
      }

      visiting.delete(pluginName);
      visited.add(pluginName);
      sorted.push(pluginName);
    };

    for (const pluginName of this.plugins.keys()) {
      visit(pluginName);
    }

    return sorted;
  }

  /**
   * Execute with timeout wrapper
   */
  private async executeWithTimeout(
    promise: Promise<T> | T,
    timeoutMs: number,
    timeoutMessage: string
  ): Promise<T> {
    if (!(promise instanceof Promise)) {
      return promise;
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(timeoutMessage));
      }, timeoutMs);

      promise
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timeout));
    });
  }
}
