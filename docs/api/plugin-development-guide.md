# Power-Up Plugin Development Guide

**Story 4.1 API Documentation**  
Version 1.0.0  
Last Updated: 2025-01-17

## Overview

This guide provides comprehensive documentation for developing custom power-up plugins using the Power-Up Foundation system. The plugin architecture allows for extensible, stackable power-up effects with automatic conflict resolution and performance monitoring.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Plugin Architecture](#plugin-architecture)
3. [Creating Custom Plugins](#creating-custom-plugins)
4. [Effect Management](#effect-management)
5. [Performance Guidelines](#performance-guidelines)
6. [Testing Plugins](#testing-plugins)
7. [Examples](#examples)
8. [API Reference](#api-reference)

## Getting Started

### Prerequisites

- TypeScript 5.4+
- Node.js 18+
- Understanding of Entity-Component-System (ECS) patterns
- Familiarity with React for UI integration

### Core Concepts

The power-up system consists of three main components:

1. **PowerUp Entity** - Visual game objects that can be collected
2. **Plugin System** - Extensible effect implementations
3. **Effect Management** - Handles stacking, conflicts, and duration

```typescript
import { PowerUpPlugin, PowerUpType } from '../game/plugins/PowerUpPlugin';
import { PluginManager } from '../game/plugins/PluginManager';
import { PowerUpSystem } from '../game/systems/PowerUpSystem';
```

## Plugin Architecture

### Plugin Interface

All plugins must implement the `Plugin` interface:

```typescript
interface Plugin {
  readonly name: string;
  readonly version: string;
  readonly description?: string;
  readonly dependencies?: string[];
  
  init(): Promise<void> | void;
  destroy(): Promise<void> | void;
}
```

### PowerUpPlugin Base Class

Extend `PowerUpPlugin` for power-up specific functionality:

```typescript
abstract class PowerUpPlugin implements Plugin {
  // Core properties
  public readonly name: string;
  public readonly version: string;
  public readonly powerUpType: PowerUpType;
  public readonly effect: PowerUpEffect;
  
  // Abstract methods to implement
  protected abstract onInit(): Promise<void> | void;
  protected abstract onDestroy(): Promise<void> | void;
  protected abstract onApplyEffect(context: PowerUpPluginContext): EffectResult;
  protected abstract onRemoveEffect(context: PowerUpPluginContext): EffectResult;
  protected abstract onUpdateEffect(context: PowerUpPluginContext): EffectResult;
  protected abstract onHandleConflict(conflictingType: PowerUpType, context: PowerUpPluginContext): EffectResult;
  protected abstract getIcon(): string;
  protected abstract getColor(): string;
  protected abstract getRarity(): 'common' | 'rare' | 'epic';
  protected abstract getDuration(): number;
}
```

## Creating Custom Plugins

### Basic Plugin Structure

```typescript
import { PowerUpPlugin, PowerUpPluginContext, EffectResult } from '../game/plugins/PowerUpPlugin';
import { PowerUpType } from '../game/entities/PowerUp';

export class MyCustomPowerUpPlugin extends PowerUpPlugin {
  constructor() {
    const effect = {
      id: 'my_custom_effect',
      priority: 5,
      stackable: false,
      conflictsWith: [], // Optional: specify conflicting power-ups
      apply: () => {}, // Placeholder, actual logic in onApplyEffect
      remove: () => {} // Placeholder, actual logic in onRemoveEffect
    };
    
    super(
      'my-custom-plugin',
      '1.0.0',
      PowerUpType.CustomType, // You may need to extend PowerUpType enum
      effect,
      'Description of my custom power-up'
    );
  }

  protected async onInit(): Promise<void> {
    console.log('Custom plugin initialized');
    // Initialize any resources, event listeners, etc.
  }

  protected async onDestroy(): Promise<void> {
    console.log('Custom plugin destroyed');
    // Clean up resources
  }

  protected onApplyEffect(context: PowerUpPluginContext): EffectResult {
    try {
      // Apply your custom effect to the game state
      const { gameEntities, gameState } = context;
      
      // Example: Modify paddle size
      if (gameEntities.paddle) {
        gameEntities.paddle.width *= 1.5;
      }
      
      return {
        success: true,
        modified: true,
        rollback: () => this.onRemoveEffect(context)
      };
    } catch (error) {
      return {
        success: false,
        modified: false,
        error: error as Error
      };
    }
  }

  protected onRemoveEffect(context: PowerUpPluginContext): EffectResult {
    try {
      // Remove your custom effect
      const { gameEntities } = context;
      
      if (gameEntities.paddle) {
        gameEntities.paddle.width /= 1.5;
      }
      
      return {
        success: true,
        modified: true
      };
    } catch (error) {
      return {
        success: false,
        modified: false,
        error: error as Error
      };
    }
  }

  protected onUpdateEffect(context: PowerUpPluginContext): EffectResult {
    // Called every frame while effect is active
    // Use for continuous effects or animations
    
    return {
      success: true,
      modified: false // Usually false unless state changes
    };
  }

  protected onHandleConflict(
    conflictingType: PowerUpType, 
    context: PowerUpPluginContext
  ): EffectResult {
    // Handle conflicts with other power-ups
    // Default behavior: allow higher priority to win
    
    return {
      success: true,
      modified: false
    };
  }

  protected getIcon(): string {
    return '🎮'; // Emoji or Unicode character
  }

  protected getColor(): string {
    return '#ff6b6b'; // Hex color code
  }

  protected getRarity(): 'common' | 'rare' | 'epic' {
    return 'common';
  }

  protected getDuration(): number {
    return 15000; // Duration in milliseconds
  }
}
```

### Registration and Usage

```typescript
// Register plugin with manager
const pluginManager = new PluginManager();
const powerUpSystem = new PowerUpSystem(pluginManager);

const customPlugin = new MyCustomPowerUpPlugin();

async function setupPlugin() {
  // Register plugin
  const registered = await pluginManager.register(customPlugin);
  if (!registered) {
    throw new Error('Failed to register plugin');
  }
  
  // Initialize plugin
  const initialized = await pluginManager.initializePlugin(customPlugin.name);
  if (!initialized) {
    throw new Error('Failed to initialize plugin');
  }
  
  console.log('Plugin ready for use');
}
```

## Effect Management

### Effect Priority System

Effects are resolved based on priority (higher number = higher priority):

```typescript
const effect = {
  id: 'high_priority_effect',
  priority: 10, // Higher priority
  stackable: false,
  conflictsWith: [PowerUpType.LowerPriorityType],
  apply: () => {},
  remove: () => {}
};
```

### Stacking Rules

```typescript
// Stackable effect - multiple instances allowed
const stackableEffect = {
  id: 'stackable_effect',
  priority: 5,
  stackable: true, // Allow multiple instances
  apply: () => {},
  remove: () => {}
};

// Non-stackable effect - only one instance
const singleEffect = {
  id: 'single_effect',
  priority: 7,
  stackable: false, // Only one instance allowed
  apply: () => {},
  remove: () => {}
};
```

### Conflict Resolution

```typescript
// Define conflicts in effect configuration
const ballSpeedEffect = {
  id: 'ball_speed_effect',
  priority: 5,
  stackable: false,
  conflictsWith: [PowerUpType.Magnet], // Cannot coexist with Magnet
  apply: () => {},
  remove: () => {}
};
```

## Performance Guidelines

### Execution Time Budget

Plugins must respect a 2ms execution budget per frame:

```typescript
protected onUpdateEffect(context: PowerUpPluginContext): EffectResult {
  const startTime = performance.now();
  
  // Your effect logic here
  
  const executionTime = performance.now() - startTime;
  if (executionTime > context.performance.maxExecutionTime) {
    this.log('Execution time exceeded budget', 'warn');
  }
  
  return { success: true, modified: false };
}
```

### Memory Management

```typescript
protected onApplyEffect(context: PowerUpPluginContext): EffectResult {
  // Create snapshot for rollback
  const originalState = this.createSnapshot(context.gameState);
  
  try {
    // Apply effect
    this.modifyGameState(context.gameState);
    
    return {
      success: true,
      modified: true,
      rollback: () => this.restoreSnapshot(originalState)
    };
  } catch (error) {
    // Clean up on error
    this.restoreSnapshot(originalState);
    return { success: false, modified: false, error };
  }
}
```

### Best Practices

1. **Minimize Update Logic**: Keep `onUpdateEffect` lightweight
2. **Use Caching**: Cache expensive calculations
3. **Batch Operations**: Group related state changes
4. **Cleanup Resources**: Always clean up in `onDestroy`

```typescript
class OptimizedPlugin extends PowerUpPlugin {
  private cachedValue?: number;
  private intervalId?: NodeJS.Timeout;
  
  protected async onInit(): Promise<void> {
    // Setup with cleanup tracking
    this.intervalId = setInterval(() => {
      this.updateCache();
    }, 1000);
  }
  
  protected async onDestroy(): Promise<void> {
    // Clean up resources
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.cachedValue = undefined;
  }
  
  private updateCache(): void {
    // Expensive calculation cached
    this.cachedValue = this.calculateExpensiveValue();
  }
}
```

## Testing Plugins

### Unit Testing

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { MyCustomPowerUpPlugin } from './MyCustomPowerUpPlugin';

describe('MyCustomPowerUpPlugin', () => {
  let plugin: MyCustomPowerUpPlugin;
  let mockContext: PowerUpPluginContext;

  beforeEach(() => {
    plugin = new MyCustomPowerUpPlugin();
    mockContext = {
      gameState: {},
      deltaTime: 16,
      currentTime: Date.now(),
      performance: { startTime: performance.now(), maxExecutionTime: 2 },
      powerUpType: PowerUpType.CustomType,
      powerUpId: 'test-id',
      effectData: {},
      gameEntities: {
        balls: [],
        paddle: { width: 80 },
        blocks: [],
        powerUps: []
      }
    };
  });

  it('should apply effect successfully', () => {
    const result = plugin.applyEffect(mockContext);
    
    expect(result.success).toBe(true);
    expect(result.modified).toBe(true);
    expect(mockContext.gameEntities.paddle.width).toBe(120); // 80 * 1.5
  });

  it('should remove effect correctly', () => {
    plugin.applyEffect(mockContext);
    const result = plugin.removeEffect(mockContext);
    
    expect(result.success).toBe(true);
    expect(mockContext.gameEntities.paddle.width).toBe(80); // Restored
  });
});
```

### Integration Testing

```typescript
describe('Plugin Integration', () => {
  it('should integrate with PowerUpSystem', async () => {
    const pluginManager = new PluginManager();
    const powerUpSystem = new PowerUpSystem(pluginManager);
    const plugin = new MyCustomPowerUpPlugin();
    
    await pluginManager.register(plugin);
    await pluginManager.initializePlugin(plugin.name);
    
    const result = await powerUpSystem.applyEffect(
      PowerUpType.CustomType,
      'test-powerup',
      mockGameState
    );
    
    expect(result.success).toBe(true);
    expect(powerUpSystem.hasActiveEffect(PowerUpType.CustomType)).toBe(true);
  });
});
```

## Examples

### Example 1: Speed Boost Plugin

```typescript
export class SpeedBoostPlugin extends PowerUpPlugin {
  private originalSpeed?: number;
  
  constructor() {
    super(
      'speed-boost-plugin',
      '1.0.0',
      PowerUpType.BallSpeed,
      {
        id: 'speed_boost_effect',
        priority: 6,
        stackable: false,
        conflictsWith: [PowerUpType.Magnet],
        apply: () => {},
        remove: () => {}
      },
      'Increases ball speed temporarily'
    );
  }

  protected onApplyEffect(context: PowerUpPluginContext): EffectResult {
    const balls = context.gameEntities.balls;
    
    if (balls.length > 0) {
      this.originalSpeed = balls[0].speed;
      balls[0].speed *= 1.5; // Increase speed by 50%
    }
    
    return { success: true, modified: true };
  }

  protected onRemoveEffect(context: PowerUpPluginContext): EffectResult {
    const balls = context.gameEntities.balls;
    
    if (balls.length > 0 && this.originalSpeed) {
      balls[0].speed = this.originalSpeed;
    }
    
    return { success: true, modified: true };
  }

  // ... other required methods
}
```

### Example 2: Multi-Ball Plugin

```typescript
export class MultiBallPlugin extends PowerUpPlugin {
  constructor() {
    super(
      'multi-ball-plugin',
      '1.0.0',
      PowerUpType.MultiBall,
      {
        id: 'multi_ball_effect',
        priority: 8,
        stackable: true, // Allow multiple activations
        apply: () => {},
        remove: () => {}
      },
      'Spawns additional balls'
    );
  }

  protected onApplyEffect(context: PowerUpPluginContext): EffectResult {
    const { gameEntities } = context;
    
    if (gameEntities.balls.length > 0) {
      const originalBall = gameEntities.balls[0];
      
      // Create two additional balls
      for (let i = 0; i < 2; i++) {
        const newBall = this.createBallCopy(originalBall);
        newBall.velocity.x *= (i % 2 === 0 ? -1 : 1); // Alternate directions
        gameEntities.balls.push(newBall);
      }
    }
    
    return { success: true, modified: true };
  }

  private createBallCopy(originalBall: any): any {
    return {
      ...originalBall,
      id: `ball-${Date.now()}-${Math.random()}`,
      position: { ...originalBall.position },
      velocity: { ...originalBall.velocity }
    };
  }

  // ... other required methods
}
```

## API Reference

### Core Interfaces

#### PowerUpPluginContext
```typescript
interface PowerUpPluginContext {
  readonly gameState: any;
  readonly deltaTime: number;
  readonly currentTime: number;
  readonly performance: {
    startTime: number;
    maxExecutionTime: number;
  };
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
```

#### EffectResult
```typescript
interface EffectResult {
  success: boolean;
  modified: boolean;
  rollback?: () => void;
  error?: Error;
}
```

#### PowerUpEffect
```typescript
interface PowerUpEffect {
  id: string;
  priority: number;
  stackable: boolean;
  conflictsWith?: PowerUpType[];
  apply: (gameState: any) => void;
  remove: (gameState: any) => void;
}
```

### Plugin Manager Methods

#### register(plugin: Plugin): Promise<boolean>
Registers a plugin with validation and dependency checking.

#### initializePlugin(pluginName: string): Promise<boolean>
Initializes a specific plugin with timeout handling.

#### executePlugin(pluginName: string, method: keyof Plugin, context?: PluginContext): PluginExecutionResult
Executes a plugin method with performance monitoring.

#### getPerformanceStats(): PerformanceStats
Returns performance statistics for all registered plugins.

### PowerUp System Methods

#### applyEffect(powerUpType: PowerUpType, powerUpId: string, gameState: any, effectData?: any): Promise<EffectResult>
Applies a power-up effect with conflict resolution.

#### removeEffect(effectId: string): Promise<EffectResult>
Removes a specific active effect.

#### getActiveEffects(): ActiveEffect[]
Returns all currently active effects.

#### hasActiveEffect(powerUpType: PowerUpType): boolean
Checks if a specific power-up type is currently active.

## Troubleshooting

### Common Issues

1. **Plugin Registration Fails**
   - Check that all required methods are implemented
   - Verify plugin name is unique
   - Ensure dependencies are satisfied

2. **Effect Not Applied**
   - Check plugin initialization status
   - Verify effect context is valid
   - Review conflict resolution rules

3. **Performance Issues**
   - Monitor execution time in development
   - Use performance profiling tools
   - Optimize update loops

4. **Memory Leaks**
   - Ensure proper cleanup in `onDestroy`
   - Remove event listeners
   - Clear timers and intervals

### Debug Tools

```typescript
// Enable debug mode for detailed logging
const powerUpSystem = new PowerUpSystem(pluginManager, {
  performanceMonitoring: true,
  debugMode: true
});

// Get performance statistics
const stats = pluginManager.getPerformanceStats();
console.log('Performance Stats:', stats);

// Monitor plugin execution
const result = pluginManager.executePlugin('my-plugin', 'someMethod');
if (result.exceeded_budget) {
  console.warn('Plugin exceeded time budget:', result.executionTime);
}
```

## Contributing

To contribute new plugins or improvements:

1. Follow the plugin development guidelines
2. Include comprehensive tests
3. Document any new APIs
4. Ensure performance requirements are met
5. Submit pull request with examples

## Support

For questions or issues:
- Check the examples in this guide
- Review existing plugin implementations
- Consult the test files for usage patterns
- File issues in the project repository

---

**End of Plugin Development Guide**  
For additional information, see the main project documentation and source code comments.