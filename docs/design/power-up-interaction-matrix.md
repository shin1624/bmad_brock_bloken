# Power-Up Interaction Matrix

**Document Version**: v1.0  
**Created**: 2025-01-29  
**Author**: SM Bob  
**Purpose**: Define all power-up interactions and conflict resolution rules

## Overview

This document defines how all power-ups in the game interact with each other, including priority rules, stacking behavior, and edge case handling. This matrix is the authoritative source for power-up interaction behavior.

## Power-Up Categories

### Basic Power-Ups (Story 4.2)
1. **Multi-ball** - Spawns additional balls
2. **Paddle Size** - Modifies paddle width
3. **Ball Speed** - Modifies ball velocity

### Advanced Power-Ups Phase 1 (Story 4.3a)
4. **Shield** - One-time ball miss protection
5. **Pierce Ball** - Ball passes through blocks
6. **Magnet Paddle** - Ball sticks to paddle

### Advanced Power-Ups Phase 2 (Story 4.3b)
7. **Slow Motion** - Reduces game time (except paddle)
8. **Laser Gun** - Shoots projectiles from paddle

## Priority System

When conflicts arise, this priority order determines which effect takes precedence:

1. **Shield** (Highest - defensive critical)
2. **Slow Motion** (Time manipulation)
3. **Magnet Paddle** (Ball control)
4. **Laser Gun** (Additional offense)
5. **Pierce Ball** (Ball modification)
6. **Multi-ball** (Ball multiplication)
7. **Ball Speed** (Speed modification)
8. **Paddle Size** (Lowest - paddle modification)

## Complete Interaction Matrix

### Legend
- ✅ Compatible - Both work without conflict
- ⚠️ Partial - Limited interaction, see notes
- ❌ Conflict - Special handling required
- 🔄 Modified - One affects the other's behavior

| Power-Up 1 | Power-Up 2 | Status | Interaction Behavior |
|------------|------------|--------|---------------------|
| **Multi-ball** | Paddle Size | ✅ | Both work independently |
| **Multi-ball** | Ball Speed | ✅ | All balls get speed modifier |
| **Multi-ball** | Shield | ✅ | Shield protects from any ball miss |
| **Multi-ball** | Pierce Ball | ✅ | All balls become piercing |
| **Multi-ball** | Magnet | ⚠️ | Only first ball can attach |
| **Multi-ball** | Slow Motion | ⚠️ | All balls slow down (HIGH RISK) |
| **Multi-ball** | Laser | ✅ | Laser works independently |
| **Paddle Size** | Ball Speed | ✅ | No interaction |
| **Paddle Size** | Shield | ✅ | No interaction |
| **Paddle Size** | Pierce Ball | ✅ | No interaction |
| **Paddle Size** | Magnet | ✅ | Larger catch area for magnet |
| **Paddle Size** | Slow Motion | ✅ | Paddle size unchanged by time |
| **Paddle Size** | Laser | ✅ | Lasers fire from paddle edges |
| **Ball Speed** | Shield | ✅ | Shield works at any speed |
| **Ball Speed** | Pierce Ball | ✅ | Fast piercing ball |
| **Ball Speed** | Magnet | 🔄 | Release maintains modified speed |
| **Ball Speed** | Slow Motion | 🔄 | Speed modified then slowed |
| **Ball Speed** | Laser | ✅ | No interaction |
| **Shield** | Pierce Ball | ✅ | Both work independently |
| **Shield** | Magnet | ✅ | Shield active while controlling |
| **Shield** | Slow Motion | ✅ | Shield timing unaffected |
| **Shield** | Laser | ✅ | Can shoot with shield active |
| **Pierce Ball** | Magnet | ✅ | Pierces after release |
| **Pierce Ball** | Slow Motion | 🔄 | Pierce duration in real-time |
| **Pierce Ball** | Laser | ✅ | No interaction |
| **Magnet** | Slow Motion | 🔄 | Release timing preserved |
| **Magnet** | Laser | ✅ | Can fire while holding ball |
| **Slow Motion** | Laser | 🔄 | Fire rate in game-time |

## Edge Cases and Special Rules

### Concurrent Activation
When multiple power-ups are collected in the same frame:
1. Apply in priority order
2. Queue visual effects with 100ms delay
3. Stack durations independently

### Expiration Handling
When power-ups expire:
1. Remove effects in reverse priority order
2. Ensure clean state restoration
3. Trigger expiration warning at 2 seconds remaining

### Multiple Instance Rules

**Stack Behavior:**
- **Shield**: No stacking (single use)
- **Multi-ball**: Adds balls up to max 5
- **Paddle Size**: Takes larger size
- **Ball Speed**: Takes faster speed
- **Pierce Ball**: Resets duration
- **Magnet**: Resets to active
- **Slow Motion**: Extends duration
- **Laser**: Extends duration

### Performance Thresholds

| Active Power-Ups | Required FPS | Action if Below |
|-----------------|--------------|-----------------|
| Any 2 | 60 FPS | None |
| Any 3 | 55 FPS | Reduce particle effects |
| Any 4 | 50 FPS | Reduce visual quality |
| All 5+ | 45 FPS | Emergency quality reduction |

## Implementation Notes

### State Management
Each power-up maintains independent state in GameState:
```typescript
interface PowerUpStates {
  // Basic
  multiBallCount: number;
  paddleSizeMultiplier: number;
  ballSpeedMultiplier: number;
  
  // Advanced Phase 1
  shieldActive: boolean;
  pierceActive: boolean;
  pierceBlocksRemaining: number;
  magnetActive: boolean;
  ballAttached: boolean;
  
  // Advanced Phase 2
  timeScale: number;
  laserActive: boolean;
}
```

### Conflict Resolution Function
```typescript
function resolvePowerUpConflict(powerUpA: PowerUpType, powerUpB: PowerUpType): PowerUpType {
  const priority = {
    [PowerUpType.SHIELD]: 1,
    [PowerUpType.SLOW_MOTION]: 2,
    [PowerUpType.MAGNET]: 3,
    [PowerUpType.LASER]: 4,
    [PowerUpType.PIERCE]: 5,
    [PowerUpType.MULTI_BALL]: 6,
    [PowerUpType.BALL_SPEED]: 7,
    [PowerUpType.PADDLE_SIZE]: 8
  };
  
  return priority[powerUpA] < priority[powerUpB] ? powerUpA : powerUpB;
}
```

## Testing Requirements

### Critical Combinations (Must Test)
1. Multi-ball + Slow Motion
2. Laser + Multi-ball  
3. All 5 advanced active
4. Shield + Any offensive power-up
5. Rapid collection (5+ in 2 seconds)

### Performance Tests
1. Baseline: No power-ups
2. Phase 1: All 3 Phase 1 power-ups
3. Phase 2: Both Phase 2 power-ups
4. Maximum: All 8 power-ups active
5. Stress: Rapid switching between power-ups

## Revision History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| v1.0 | 2025-01-29 | Initial matrix creation | SM Bob |

---

**Note**: This document is authoritative for power-up interactions. Any deviation from these rules requires approval and documentation update.