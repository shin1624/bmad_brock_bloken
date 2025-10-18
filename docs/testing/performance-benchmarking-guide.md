# Performance Benchmarking Guide

**Created**: 2025-10-16  
**Story**: 4.3b - Advanced Power-ups Phase 2  
**Purpose**: BLOCKER #3 Resolution - Performance Benchmark Environment

## Overview

This guide explains how to use the performance benchmarking system to validate Story 4.3b acceptance criteria (AC12, AC13).

## Quick Start

### 1. Import the Benchmark System

```typescript
import { gamePerformanceMonitor } from '@/game/utils/GamePerformanceMonitor';
import { PerformanceBenchmark, STORY_4_3B_SCENARIOS } from '@/game/utils/PerformanceBenchmark';
```

### 2. Create Benchmark Instance

```typescript
const benchmark = new PerformanceBenchmark(gamePerformanceMonitor);
```

### 3. Run Benchmarks

```typescript
// Setup callback: Configure game state for scenario
const setupCallback = async (scenario) => {
  // Activate power-ups
  for (let i = 0; i < scenario.powerUpCount; i++) {
    await activatePowerUp(powerUpTypes[i]);
  }
  
  // Spawn balls
  for (let i = 0; i < scenario.ballCount; i++) {
    spawnBall();
  }
  
  // Create blocks
  createBlocks(scenario.blockCount);
};

// Teardown callback: Clean up after scenario
const teardownCallback = async () => {
  deactivateAllPowerUps();
  clearBalls();
  clearBlocks();
};

// Run all scenarios
const reports = await benchmark.runAll(setupCallback, teardownCallback);
```

## Benchmark Scenarios

### Story 4.3b Scenarios

#### AC12: 3 Power-ups Active (55 FPS Target)
```typescript
{
  name: 'AC12: 3 Power-ups Active',
  powerUpCount: 3,
  ballCount: 2,
  blockCount: 50,
  particleCount: 100,
  projectileCount: 10,
  targetFPS: 55,
  maxMemoryMB: 250,
  durationMs: 10000
}
```

#### AC13: 5 Power-ups Active (50 FPS Target)
```typescript
{
  name: 'AC13: 5 Power-ups Active',
  powerUpCount: 5,
  ballCount: 3,
  blockCount: 50,
  particleCount: 150,
  projectileCount: 15,
  targetFPS: 50,
  maxMemoryMB: 250,
  durationMs: 10000
}
```

## Integration with Game

### GameLoop Integration

```typescript
import { gamePerformanceMonitor } from '@/game/utils/GamePerformanceMonitor';

class GameLoop {
  private performanceMonitor = gamePerformanceMonitor;

  constructor() {
    // Set game state provider
    this.performanceMonitor.setGameStateProvider(() => ({
      activePowerUps: this.powerUpSystem.getActiveCount(),
      activeParticles: this.particleSystem.getActiveCount(),
      activeBalls: this.balls.filter(b => b.active).length,
      activeBlocks: this.blocks.filter(b => b.isActive).length,
      activeProjectiles: this.projectileSystem?.getStats().activeCount || 0,
    }));
  }

  start() {
    // Start monitoring
    this.performanceMonitor.start(
      (metrics) => {
        // Optional: Log metrics
        console.log(`FPS: ${metrics.fps}, Memory: ${metrics.memoryUsage}MB`);
      },
      (warning) => {
        // Optional: Handle warnings
        console.warn(warning);
      }
    );
  }

  update(deltaTime: number) {
    const updateStart = performance.now();
    
    // ... game update logic ...
    
    const updateEnd = performance.now();
    this.performanceMonitor.recordUpdateTime(updateEnd - updateStart);
  }

  render(ctx: CanvasRenderingContext2D) {
    const renderStart = performance.now();
    
    // ... render logic ...
    
    const renderEnd = performance.now();
    this.performanceMonitor.recordRenderTime(renderEnd - renderStart);
  }
}
```

### Manual Benchmark Execution

```typescript
// Start a benchmark manually
gamePerformanceMonitor.startBenchmark(10000); // 10 seconds
gamePerformanceMonitor.start();

// ... run game with specific scenario ...

// Stop and get results
gamePerformanceMonitor.stop();
const result = gamePerformanceMonitor.stopBenchmark();

console.log('Benchmark Results:', result);
console.log(`Average FPS: ${result.averageFPS}`);
console.log(`Passed: ${result.passed}`);
```

## Console Output Example

```
═══════════════════════════════════════════════
   STORY 4.3B PERFORMANCE BENCHMARK SUITE
═══════════════════════════════════════════════

🔬 Running Benchmark: AC12: 3 Power-ups Active
   55 FPS with any 3 power-ups active simultaneously
   Duration: 10s

   Results:
   ├─ Status: ✅ PASS
   ├─ Average FPS: 57.3 (target: 55)
   ├─ Min FPS: 54.1
   ├─ Max FPS: 60.0
   ├─ Memory: 182MB (max: 250MB)
   ├─ Frame Time: 17.45ms
   ├─ Render Time: 8.32ms
   ├─ Update Time: 5.67ms
   ├─ Dropped Frames: 12
   └─ Entities: 3PU, 2B, 100P

🔬 Running Benchmark: AC13: 5 Power-ups Active
   50 FPS with all 5 advanced power-ups active
   Duration: 10s

   Results:
   ├─ Status: ✅ PASS
   ├─ Average FPS: 52.1 (target: 50)
   ├─ Min FPS: 48.7
   ├─ Max FPS: 55.2
   ├─ Memory: 218MB (max: 250MB)
   ├─ Frame Time: 19.19ms
   ├─ Render Time: 9.81ms
   ├─ Update Time: 6.43ms
   ├─ Dropped Frames: 45
   └─ Entities: 5PU, 3B, 150P

═══════════════════════════════════════════════
   BENCHMARK SUMMARY
═══════════════════════════════════════════════

   Total Scenarios: 4
   ✅ Passed: 4
   ❌ Failed: 0
   Success Rate: 100.0%

   Scenario Results:
   1. ✅ Baseline: No Power-ups - 60.0/60 FPS
   2. ✅ AC12: 3 Power-ups Active - 57.3/55 FPS
   3. ✅ AC13: 5 Power-ups Active - 52.1/50 FPS
   4. ✅ Stress Test: Maximum Load - 47.2/45 FPS

   Story 4.3b Acceptance Criteria:
   AC12 (3 Power-ups): ✅ MET - 57.3 FPS
   AC13 (5 Power-ups): ✅ MET - 52.1 FPS

   Overall Story 4.3b Compliance: ✅ READY FOR APPROVAL

═══════════════════════════════════════════════
```

## Test Integration Example

### Vitest Test

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { gamePerformanceMonitor } from '@/game/utils/GamePerformanceMonitor';
import { PerformanceBenchmark, STORY_4_3B_SCENARIOS } from '@/game/utils/PerformanceBenchmark';

describe('Story 4.3b Performance Tests', () => {
  let benchmark: PerformanceBenchmark;
  let gameInstance: GameEngine;

  beforeEach(() => {
    benchmark = new PerformanceBenchmark(gamePerformanceMonitor);
    gameInstance = new GameEngine();
  });

  afterEach(() => {
    gameInstance.destroy();
  });

  it('AC12: Should maintain 55 FPS with 3 power-ups', async () => {
    const scenario = STORY_4_3B_SCENARIOS.find(s => s.name.includes('AC12'));
    
    const report = await benchmark.runScenario(
      scenario!,
      async (s) => {
        // Setup 3 power-ups
        await gameInstance.activatePowerUp('shield');
        await gameInstance.activatePowerUp('pierce');
        await gameInstance.activatePowerUp('magnet');
        
        // Spawn entities
        gameInstance.spawnBalls(s.ballCount);
        gameInstance.createBlocks(s.blockCount);
      },
      async () => {
        gameInstance.reset();
      }
    );

    expect(report.passed).toBe(true);
    expect(report.result.averageFPS).toBeGreaterThanOrEqual(55);
    expect(report.result.metrics.memoryUsage).toBeLessThanOrEqual(250);
  });

  it('AC13: Should maintain 50 FPS with 5 power-ups', async () => {
    const scenario = STORY_4_3B_SCENARIOS.find(s => s.name.includes('AC13'));
    
    const report = await benchmark.runScenario(
      scenario!,
      async (s) => {
        // Setup 5 power-ups
        await gameInstance.activatePowerUp('shield');
        await gameInstance.activatePowerUp('pierce');
        await gameInstance.activatePowerUp('magnet');
        await gameInstance.activatePowerUp('slowMotion');
        await gameInstance.activatePowerUp('laser');
        
        // Spawn entities
        gameInstance.spawnBalls(s.ballCount);
        gameInstance.createBlocks(s.blockCount);
      },
      async () => {
        gameInstance.reset();
      }
    );

    expect(report.passed).toBe(true);
    expect(report.result.averageFPS).toBeGreaterThanOrEqual(50);
    expect(report.result.metrics.memoryUsage).toBeLessThanOrEqual(250);
  });
});
```

## Custom Scenarios

### Creating Custom Scenarios

```typescript
const customScenario = {
  name: 'Custom: Laser Heavy',
  description: 'Test laser gun with many projectiles',
  powerUpCount: 1, // Only laser
  ballCount: 1,
  blockCount: 100,
  particleCount: 50,
  projectileCount: 20,
  targetFPS: 55,
  maxMemoryMB: 250,
  durationMs: 8000,
};

const customBenchmark = new PerformanceBenchmark(
  gamePerformanceMonitor,
  [customScenario]
);

const reports = await customBenchmark.runAll(setupCallback, teardownCallback);
```

## Quick Benchmark Mode

For rapid iteration during development:

```typescript
// Run shorter benchmarks (3 seconds each)
const reports = await benchmark.runQuick(setupCallback, teardownCallback);
```

## Metrics Explained

### Core Metrics

- **FPS**: Frames per second (target: 50-60)
- **Frame Time**: Milliseconds per frame (target: <20ms)
- **Memory Usage**: JavaScript heap size in MB (target: <250MB)
- **Render Time**: Time spent rendering (target: <10ms)
- **Update Time**: Time spent updating game state (target: <6ms)
- **Dropped Frames**: Frames that missed the 60 FPS target

### Game Metrics

- **activePowerUps**: Number of active power-up effects
- **activeParticles**: Number of active particle effects
- **activeBalls**: Number of active balls
- **activeBlocks**: Number of active blocks
- **activeProjectiles**: Number of active laser projectiles

## Troubleshooting

### Low FPS

1. **Check Update Time**: If >6ms, optimize game logic
2. **Check Render Time**: If >10ms, optimize rendering
3. **Reduce Particle Count**: Lower particle quality settings
4. **Profile with Chrome DevTools**: Identify bottlenecks

### High Memory Usage

1. **Check Object Pools**: Ensure pools are releasing objects
2. **Monitor Particle System**: Check for memory leaks
3. **Profile with Memory Snapshots**: Find retained objects
4. **Reduce Active Entities**: Implement culling or limits

### Benchmark Failures

1. **Verify Scenario Setup**: Ensure entities are spawned correctly
2. **Check System State**: Verify all systems are initialized
3. **Run Individual Tests**: Isolate failing scenarios
4. **Use Quick Mode**: Faster iteration for debugging

## Best Practices

1. **Run Before PR**: Always benchmark before submitting PRs
2. **Track Over Time**: Keep historical benchmark data
3. **Test on Target Hardware**: Test on minimum spec machines
4. **Use Consistent Conditions**: Close other apps, disable extensions
5. **Multiple Runs**: Average results across 3+ runs for accuracy

## Story 4.3b Acceptance Criteria

### AC12: 3 Power-ups (55 FPS)
✅ **Scenario**: 3 power-ups, 2 balls, 50 blocks, 100 particles, 10 projectiles  
✅ **Target**: 55+ FPS average, <250MB memory  
✅ **Duration**: 10 seconds

### AC13: 5 Power-ups (50 FPS)
✅ **Scenario**: 5 power-ups, 3 balls, 50 blocks, 150 particles, 15 projectiles  
✅ **Target**: 50+ FPS average, <250MB memory  
✅ **Duration**: 10 seconds

---

**Next Steps**:
1. Integrate monitor into GameLoop
2. Run baseline benchmarks
3. Optimize if needed
4. Document results in Story 4.3b
