# Phase 2 Power-ups Integration Guide

**Document Type**: Integration Guide  
**Status**: Implementation Reference  
**Created**: 2025-10-17  
**Related Story**: 4.3b - Advanced Power-ups Phase 2  

## Overview

This guide explains how to integrate ProjectileSystem and timeScale functionality with the game engine for Story 4.3b Phase 2 power-ups (Slow Motion and Laser Gun).

## Architecture Context

This project uses a **React + Canvas hybrid architecture** where:
- **GameLoop**: Pure timing engine (not containing game logic)
- **useGameEngine**: React hook that provides update/render callbacks
- **Game Components**: Implement actual game logic via callbacks

ProjectileSystem and timeScale must be integrated through **useGameEngine callbacks**, not directly in GameLoop.

## Integration Steps

### 1. GameState Initialization ✅ COMPLETED

**File**: `src/game/core/GameState.ts`

```typescript
constructor(initialState?: Partial<GameState>) {
  this.initialState = {
    // ... existing fields ...
    // Phase 2 power-up states - Story 4.3b
    timeScale: 1.0,        // Default normal speed
    laserActive: false,    // Laser gun inactive by default
    ...initialState,
  };
  this.state = { ...this.initialState };
}
```

✅ **Status**: Completed - Default values set

---

### 2. Create Game Component with ProjectileSystem

**Recommended File**: `src/components/game/AdvancedGame.tsx` (new file)

```typescript
import React, { useRef, useCallback, useEffect } from 'react';
import { useGameEngine } from '../../hooks/useGameEngine';
import { ProjectileSystem } from '../../game/systems/ProjectileSystem';
import { Ball } from '../../game/entities/Ball';
import { Block } from '../../game/entities/Block';
import { Paddle } from '../../game/entities/Paddle';
import { PowerUpSystem } from '../../game/systems/PowerUpSystem';

export const AdvancedGame: React.FC = () => {
  // Refs for game systems
  const projectileSystemRef = useRef<ProjectileSystem | null>(null);
  const ballsRef = useRef<Ball[]>([]);
  const blocksRef = useRef<Block[]>([]);
  const paddleRef = useRef<Paddle | null>(null);
  const powerUpSystemRef = useRef<PowerUpSystem | null>(null);

  // Initialize game engine
  const gameEngine = useGameEngine({
    initialGameState: {
      score: 0,
      level: 1,
      lives: 3,
      gameStatus: 'idle',
      balls: [],
      blocks: [],
      powerUps: [],
      combo: 0,
      highScore: 0,
      shieldActive: false,
      pierceActive: false,
      pierceBlocksRemaining: 0,
      magnetActive: false,
      ballAttached: false,
      timeScale: 1.0,
      laserActive: false,
    },
  });

  // Initialize ProjectileSystem on mount
  useEffect(() => {
    if (!gameEngine.canvas) return;

    projectileSystemRef.current = new ProjectileSystem(
      {
        canvasWidth: gameEngine.canvas.width,
        canvasHeight: gameEngine.canvas.height,
        blocks: blocksRef.current,
        eventBus: undefined, // Add EventBus if needed
      },
      {
        maxActiveProjectiles: 20,
        poolSize: 20,
        enableDebugMode: false,
      }
    );

    // Initialize other game entities
    // paddleRef.current = new Paddle(...);
    // ballsRef.current = [new Ball(...)];
    // blocksRef.current = createBlocks(...);
    // powerUpSystemRef.current = new PowerUpSystem(...);

    return () => {
      // Cleanup
      projectileSystemRef.current?.clear();
    };
  }, [gameEngine.canvas]);

  // Game update callback
  useEffect(() => {
    const updateCallback = (context: UpdateContext<GameState>) => {
      const { deltaTime, gameState, updateGameState } = context;

      // Apply timeScale to deltaTime for affected entities
      const scaledDeltaTime = deltaTime * gameState.timeScale;
      const paddleDeltaTime = deltaTime; // Paddle always uses real deltaTime

      // Update paddle (NOT affected by timeScale)
      if (paddleRef.current) {
        paddleRef.current.update(paddleDeltaTime);
      }

      // Update balls (affected by timeScale)
      ballsRef.current.forEach(ball => {
        if (ball.active) {
          ball.update(scaledDeltaTime);
        }
      });

      // Update blocks (affected by timeScale - for animations)
      blocksRef.current.forEach(block => {
        if (block.isActive && !block.isDestroyed) {
          block.update(scaledDeltaTime);
        }
      });

      // Update power-up system
      if (powerUpSystemRef.current) {
        powerUpSystemRef.current.update(scaledDeltaTime);
      }

      // Update ProjectileSystem (uses real deltaTime for consistent fire rate)
      if (gameState.laserActive && projectileSystemRef.current) {
        projectileSystemRef.current.update(deltaTime);
      }

      // Collision detection, game logic, etc.
      // ...
    };

    return gameEngine.onUpdate(updateCallback);
  }, [gameEngine]);

  // Game render callback
  useEffect(() => {
    const renderCallback = (context: RenderContext) => {
      const { canvas, context: ctx } = context;

      // Clear canvas
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Render blocks
      blocksRef.current.forEach(block => {
        if (block.isActive && !block.isDestroyed) {
          block.render(ctx);
        }
      });

      // Render paddle
      if (paddleRef.current) {
        paddleRef.current.render(ctx);
      }

      // Render balls
      ballsRef.current.forEach(ball => {
        if (ball.active) {
          ball.render(ctx);
        }
      });

      // Render projectiles (after balls, before particles)
      if (projectileSystemRef.current) {
        projectileSystemRef.current.render(ctx);
      }

      // Render power-ups, particles, UI, etc.
      // ...
    };

    return gameEngine.onRender(renderCallback);
  }, [gameEngine]);

  return (
    <div>
      <canvas
        ref={(canvas) => {
          if (canvas && gameEngine.context) {
            gameEngine.handleCanvasReady(canvas, gameEngine.context);
          }
        }}
        width={800}
        height={600}
      />
      {/* HUD, controls, etc. */}
    </div>
  );
};
```

---

### 3. PowerUpPluginContext Extension

**File**: `src/game/plugins/PowerUpPlugin.ts` ✅ COMPLETED

```typescript
export interface PowerUpPluginContext extends PluginContext<PowerUpSystemState> {
  readonly powerUpType: PowerUpType;
  readonly powerUpId: string;
  readonly effectData: PowerUpEffectData;
  readonly gameEntities: GameEntitiesSnapshot;
  // Story 4.3b - Phase 2 Advanced Power-ups
  readonly projectileSystem?: unknown;  // ✅ Already added
  readonly audioSystem?: unknown;       // ✅ Already added
}
```

---

### 4. Pass ProjectileSystem to PowerUpSystem

When initializing PowerUpSystem, pass ProjectileSystem as context:

```typescript
// In your game component initialization
const powerUpSystem = new PowerUpSystem(
  gameStateManager,
  eventBus,
  {
    // ... other context ...
    projectileSystem: projectileSystemRef.current,
    audioSystem: audioService,
  }
);
```

This allows LaserGunPowerUp to access ProjectileSystem via `context.projectileSystem`.

---

### 5. Time Scale Application Rules

**Entities Affected by timeScale:**
- ✅ **Ball**: Use `scaledDeltaTime = deltaTime * gameState.timeScale`
- ✅ **Block**: Use `scaledDeltaTime` (for destruction animations)
- ✅ **Particle**: Use `scaledDeltaTime` (for particle effects)
- ✅ **PowerUp**: Use `scaledDeltaTime` (for falling animation)

**Entities NOT Affected by timeScale:**
- ❌ **Paddle**: Use `paddleDeltaTime = deltaTime` (always normal speed)
- ❌ **ProjectileSystem**: Use `deltaTime` (laser fire rate in real-time)
- ❌ **UI**: Always uses real time

**Example:**
```typescript
const scaledDeltaTime = deltaTime * gameState.timeScale;

// Ball affected by time scale
ball.update(scaledDeltaTime);

// Paddle NOT affected
paddle.update(deltaTime);

// Projectile system uses real time
projectileSystem.update(deltaTime);
```

---

## Power-Up Integration Examples

### SlowMotionPowerUp ✅ IMPLEMENTED

**File**: `src/game/plugins/powerups/SlowMotionPowerUp.ts`

```typescript
protected onApplyEffect(context: PowerUpPluginContext): EffectResult {
  if (context.gameState) {
    context.gameState.timeScale = SlowMotionPowerUp.TIME_SCALE; // 0.5
  }
  return { success: true, modified: true };
}

protected onRemoveEffect(context: PowerUpPluginContext): EffectResult {
  if (context.gameState) {
    context.gameState.timeScale = 1.0; // Restore normal speed
  }
  return { success: true, modified: true };
}
```

### LaserGunPowerUp ✅ IMPLEMENTED

**File**: `src/game/plugins/powerups/LaserGunPowerUp.ts`

```typescript
public onUpdate(context: PowerUpPluginContext, _deltaTime: number): void {
  if (!this.isActive) return;
  
  const now = Date.now();
  if (now - this.lastFireTime >= LaserGunPowerUp.FIRE_RATE) {
    this.fireLaser(context);
    this.lastFireTime = now;
  }
}

private fireLaser(context: PowerUpPluginContext): void {
  const paddle = context.gameEntities?.paddle;
  const projectileSystem = context.projectileSystem as ProjectileSystem;
  
  if (!paddle || !projectileSystem) return;

  // Fire from both paddle edges
  projectileSystem.spawn({
    type: ProjectileType.LASER,
    position: { x: paddle.position.x - paddle.size.width / 2, y: paddle.position.y },
    velocity: { x: 0, y: -500 },
    damage: 1,
    size: { width: 4, height: 12 },
    color: '#FF0000',
    glowColor: '#FF4444',
  });

  projectileSystem.spawn({
    type: ProjectileType.LASER,
    position: { x: paddle.position.x + paddle.size.width / 2, y: paddle.position.y },
    velocity: { x: 0, y: -500 },
    damage: 1,
    size: { width: 4, height: 12 },
    color: '#FF0000',
    glowColor: '#FF4444',
  });
}
```

---

## Implementation Status

### Completed ✅
- [x] Projectile entity implementation
- [x] ProjectilePool with object pooling
- [x] ProjectileSystem with collision detection
- [x] SlowMotionPowerUp implementation
- [x] LaserGunPowerUp implementation
- [x] PowerUpRegistry registration
- [x] GameState initialization with default values
- [x] PowerUpPluginContext extension
- [x] Type definitions updated
- [x] HUD PowerUpStatus enum updated
- [x] PowerUpEffects color mappings

### Pending 🔄
- [ ] Create game component using useGameEngine pattern
- [ ] Integrate ProjectileSystem into game loop
- [ ] Apply timeScale to entities correctly
- [ ] Pass ProjectileSystem to PowerUpSystem context
- [ ] Unit tests (90% coverage target)
- [ ] Integration tests (high-risk combinations)
- [ ] Performance benchmarks (AC12: 55 FPS @ 3, AC13: 50 FPS @ 5)
- [ ] Memory validation (<250MB)

---

## Testing Integration

### Unit Tests

**Test Structure:**
```
src/game/plugins/powerups/__tests__/
├── SlowMotionPowerUp.test.ts
├── LaserGunPowerUp.test.ts
src/game/systems/__tests__/
├── ProjectileSystem.test.ts
src/game/entities/__tests__/
├── Projectile.test.ts
src/game/utils/__tests__/
└── ProjectilePool.test.ts
```

### Integration Tests

**High Priority Combinations (Story 4.3b AC10):**
1. Slow Motion + Multi-ball (HIGH RISK)
2. Laser + Multi-ball (HIGH RISK)
3. Slow Motion + Laser
4. All 5 advanced power-ups active

---

## Performance Considerations

### AC12: 55 FPS with 3 Power-ups
**Test Scenario:**
- SlowMotion + Laser + Shield active
- 5 balls in play
- 20 blocks remaining
- 10 active projectiles

**Expected Result**: ≥55 FPS (95% of time)

### AC13: 50 FPS with 5 Power-ups
**Test Scenario:**
- All 5 advanced power-ups active (Shield, Pierce, Magnet, SlowMotion, Laser)
- 5 balls in play
- 20 blocks remaining
- 15 active projectiles

**Expected Result**: ≥50 FPS (95% of time)

### Memory Budget
- **Total System Memory**: <250MB during gameplay
- **ProjectileSystem**: <10KB (negligible)
- **Power-up Effects**: <50KB

---

## Next Steps

1. **Create AdvancedGame Component** - Implement game component using this guide
2. **Write Unit Tests** - Test each component in isolation
3. **Integration Testing** - Test high-risk power-up combinations
4. **Performance Benchmarking** - Validate AC12 and AC13
5. **Code Review** - Review against Story 4.3b DoD

---

## References

- **Story Document**: `docs/stories/4.3b.advanced-powerups-phase2.md`
- **Design Document**: `docs/design/projectile-system-design.md`
- **useGameEngine Hook**: `src/hooks/useGameEngine.ts`
- **PowerUpPlugin Base**: `src/game/plugins/PowerUpPlugin.ts`
- **GameState Types**: `src/types/game.types.ts`

---

## Questions & Support

For questions about this integration:
1. Check Story 4.3b acceptance criteria
2. Review ProjectileSystem design document
3. Examine existing power-up implementations (Phase 1)
4. Consult useGameEngine hook documentation
