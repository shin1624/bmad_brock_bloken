/**
 * PowerUp Plugin Registry Implementation
 * Story 4.2, Task 4: Centralized registration system for all power-up plugins
 */
import { PluginManager } from '../PluginManager';
import { PowerUpSystem } from '../../systems/PowerUpSystem';
import { MultiBallPowerUp } from './MultiBallPowerUp';
import { PaddleSizePowerUp, PaddleSizeVariant } from './PaddleSizePowerUp';
import { BallSpeedPowerUp, BallSpeedVariant } from './BallSpeedPowerUp';
import { PowerUpType } from '../../entities/PowerUp';

/**
 * PowerUpRegistry Class
 * Manages registration and initialization of all power-up plugins
 */
export class PowerUpRegistry {
  private pluginManager: PluginManager;
  private powerUpSystem: PowerUpSystem;
  private registeredPlugins: Map<string, any> = new Map();

  constructor(pluginManager: PluginManager, powerUpSystem: PowerUpSystem) {
    this.pluginManager = pluginManager;
    this.powerUpSystem = powerUpSystem;
  }

  /**
   * Register all available power-up plugins
   */
  public async registerAllPowerUps(): Promise<void> {
    try {
      // Register MultiBall power-up
      const multiBallPlugin = new MultiBallPowerUp();
      await this.registerPlugin('multiball', multiBallPlugin);

      // Register PaddleSize power-ups (both variants)
      const largePaddlePlugin = PaddleSizePowerUp.createLarge();
      const smallPaddlePlugin = PaddleSizePowerUp.createSmall();
      await this.registerPlugin('paddle_large', largePaddlePlugin);
      await this.registerPlugin('paddle_small', smallPaddlePlugin);

      // Register BallSpeed power-ups (both variants)
      const fastBallPlugin = BallSpeedPowerUp.createFast();
      const slowBallPlugin = BallSpeedPowerUp.createSlow();
      await this.registerPlugin('ball_fast', fastBallPlugin);
      await this.registerPlugin('ball_slow', slowBallPlugin);

      console.log(`PowerUpRegistry: Successfully registered ${this.registeredPlugins.size} power-up plugins`);

    } catch (error) {
      console.error('PowerUpRegistry: Failed to register power-up plugins:', error);
      throw error;
    }
  }

  /**
   * Register a single power-up plugin
   */
  private async registerPlugin(id: string, plugin: any): Promise<void> {
    try {
      // Register with PluginManager
      await this.pluginManager.register(plugin);

      // Store in local registry
      this.registeredPlugins.set(id, plugin);

      console.log(`PowerUpRegistry: Registered plugin '${id}' (${plugin.name})`);

    } catch (error) {
      console.error(`PowerUpRegistry: Failed to register plugin '${id}':`, error);
      throw error;
    }
  }

  /**
   * Get a registered plugin by ID
   */
  public getPlugin(id: string): any | null {
    return this.registeredPlugins.get(id) || null;
  }

  /**
   * Get all registered plugin IDs
   */
  public getRegisteredPluginIds(): string[] {
    return Array.from(this.registeredPlugins.keys());
  }

  /**
   * Get plugin by power-up type
   */
  public getPluginByType(type: PowerUpType, variant?: string): any | null {
    switch (type) {
      case PowerUpType.MultiBall:
        return this.getPlugin('multiball');
      
      case PowerUpType.PaddleSize:
        if (variant === 'large') return this.getPlugin('paddle_large');
        if (variant === 'small') return this.getPlugin('paddle_small');
        // Default to large if no variant specified
        return this.getPlugin('paddle_large');
      
      case PowerUpType.BallSpeed:
        if (variant === 'fast') return this.getPlugin('ball_fast');
        if (variant === 'slow') return this.getPlugin('ball_slow');
        // Default to fast if no variant specified
        return this.getPlugin('ball_fast');
      
      default:
        return null;
    }
  }

  /**
   * Unregister all plugins
   */
  public async unregisterAll(): Promise<void> {
    try {
      for (const [id, plugin] of this.registeredPlugins) {
        await this.pluginManager.unregister(plugin.name);
        console.log(`PowerUpRegistry: Unregistered plugin '${id}'`);
      }

      this.registeredPlugins.clear();
      console.log('PowerUpRegistry: All plugins unregistered');

    } catch (error) {
      console.error('PowerUpRegistry: Error during unregistration:', error);
      throw error;
    }
  }

  /**
   * Get registry status and metrics
   */
  public getStatus(): {
    totalRegistered: number;
    pluginIds: string[];
    pluginTypes: { [type: string]: string[] };
  } {
    const pluginTypes: { [type: string]: string[] } = {
      [PowerUpType.MultiBall]: ['multiball'],
      [PowerUpType.PaddleSize]: ['paddle_large', 'paddle_small'],
      [PowerUpType.BallSpeed]: ['ball_fast', 'ball_slow']
    };

    return {
      totalRegistered: this.registeredPlugins.size,
      pluginIds: this.getRegisteredPluginIds(),
      pluginTypes
    };
  }

  /**
   * Factory method to create registry with all plugins
   */
  public static async createWithAllPlugins(
    pluginManager: PluginManager, 
    powerUpSystem: PowerUpSystem
  ): Promise<PowerUpRegistry> {
    const registry = new PowerUpRegistry(pluginManager, powerUpSystem);
    await registry.registerAllPowerUps();
    return registry;
  }
}