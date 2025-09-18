/**
 * PowerUp Spawner System Implementation
 * Story 4.2, Task 4: Power-up drop logic from destroyed blocks
 */
import { PowerUp, PowerUpType, PowerUpMetadata } from '../entities/PowerUp';
import { Block } from '../entities/Block';
import { Vector2D } from '../../types/game.types';

// Spawn configuration for power-ups
export interface PowerUpSpawnConfig {
  baseSpawnChance: number; // 0-1 probability
  spawnChanceByBlockType: { [blockType: string]: number };
  spawnChanceByLevel: { [level: number]: number };
  maxActivePowerUps: number;
  despawnTime: number; // milliseconds
  verticalSpeed: number; // pixels per second
}

// Spawn result information
export interface SpawnResult {
  spawned: boolean;
  powerUp?: PowerUp;
  reason?: string;
  spawnChance: number;
}

/**
 * PowerUpSpawner Class
 * Handles power-up drops from destroyed blocks with configurable spawn rates
 */
export class PowerUpSpawner {
  private config: PowerUpSpawnConfig;
  private activePowerUps: PowerUp[] = [];
  private spawnHistory: Array<{ time: number; type: PowerUpType; position: Vector2D }> = [];
  private random: () => number;

  // Power-up type weights for random selection
  private static readonly TYPE_WEIGHTS: { [type in PowerUpType]: number } = {
    [PowerUpType.MultiBall]: 15,     // Rare
    [PowerUpType.PaddleSize]: 35,    // Common
    [PowerUpType.BallSpeed]: 35,     // Common
    [PowerUpType.Penetration]: 10,   // Epic
    [PowerUpType.Magnet]: 15         // Rare
  };

  constructor(config?: Partial<PowerUpSpawnConfig>, randomFunction?: () => number) {
    this.config = {
      baseSpawnChance: 0.15, // 15% base chance
      spawnChanceByBlockType: {
        'normal': 0.15,
        'strong': 0.25,
        'special': 0.40
      },
      spawnChanceByLevel: {
        1: 0.10,
        2: 0.15,
        3: 0.20,
        4: 0.25,
        5: 0.30
      },
      maxActivePowerUps: 3,
      despawnTime: 10000, // 10 seconds
      verticalSpeed: 60,  // 60 px/s downward
      ...config
    };

    this.random = randomFunction || Math.random;
  }

  /**
   * Attempt to spawn a power-up from a destroyed block
   */
  public trySpawnPowerUp(
    destroyedBlock: Block,
    currentLevel: number = 1,
    gameState?: any
  ): SpawnResult {
    try {
      // Check if we're at max capacity
      if (this.activePowerUps.length >= this.config.maxActivePowerUps) {
        return {
          spawned: false,
          reason: 'Maximum active power-ups reached',
          spawnChance: 0
        };
      }

      // Calculate spawn chance
      const spawnChance = this.calculateSpawnChance(destroyedBlock, currentLevel);

      // Random roll
      const roll = this.random();
      if (roll > spawnChance) {
        return {
          spawned: false,
          reason: `Random roll failed (${(roll * 100).toFixed(1)}% > ${(spawnChance * 100).toFixed(1)}%)`,
          spawnChance
        };
      }

      // Select power-up type
      const powerUpType = this.selectRandomPowerUpType();

      // Create power-up at block position
      const position: Vector2D = {
        x: destroyedBlock.position.x + (destroyedBlock.size?.x || 0) / 2,
        y: destroyedBlock.position.y
      };

      const powerUp = this.createPowerUp(powerUpType, position);

      // Add to active list
      this.activePowerUps.push(powerUp);

      // Record spawn history
      this.spawnHistory.push({
        time: Date.now(),
        type: powerUpType,
        position: { ...position }
      });

      // Cleanup old history (keep last 50 spawns)
      if (this.spawnHistory.length > 50) {
        this.spawnHistory = this.spawnHistory.slice(-50);
      }

      return {
        spawned: true,
        powerUp,
        spawnChance
      };

    } catch (error) {
      console.error('PowerUpSpawner: Error spawning power-up:', error);
      return {
        spawned: false,
        reason: `Error: ${error.message}`,
        spawnChance: 0
      };
    }
  }

  /**
   * Update active power-ups (movement, cleanup)
   */
  public update(deltaTime: number, screenHeight: number): void {
    for (let i = this.activePowerUps.length - 1; i >= 0; i--) {
      const powerUp = this.activePowerUps[i];

      // Update power-up
      powerUp.update(deltaTime);

      // Check for despawn conditions
      if (powerUp.shouldDespawn(screenHeight) || !powerUp.active) {
        this.activePowerUps.splice(i, 1);
        console.log(`PowerUpSpawner: Removed despawned power-up (${powerUp.type})`);
      }
    }
  }

  /**
   * Check for collision with paddle
   */
  public checkPaddleCollisions(paddleBounds: { x: number; y: number; width: number; height: number }): PowerUp[] {
    const collectedPowerUps: PowerUp[] = [];

    for (let i = this.activePowerUps.length - 1; i >= 0; i--) {
      const powerUp = this.activePowerUps[i];
      const powerUpBounds = powerUp.getBounds();

      // Simple AABB collision detection
      if (this.checkAABBCollision(powerUpBounds, paddleBounds)) {
        powerUp.collect();
        collectedPowerUps.push(powerUp);
        this.activePowerUps.splice(i, 1);
        console.log(`PowerUpSpawner: Power-up collected (${powerUp.type})`);
      }
    }

    return collectedPowerUps;
  }

  /**
   * Get all active power-ups for rendering
   */
  public getActivePowerUps(): PowerUp[] {
    return [...this.activePowerUps];
  }

  /**
   * Clear all active power-ups
   */
  public clearAll(): void {
    this.activePowerUps.forEach(powerUp => powerUp.destroy());
    this.activePowerUps.length = 0;
    console.log('PowerUpSpawner: Cleared all active power-ups');
  }

  /**
   * Get spawner statistics
   */
  public getStats(): {
    activePowerUps: number;
    totalSpawned: number;
    spawnsByType: { [type: string]: number };
    recentSpawns: Array<{ time: number; type: PowerUpType; position: Vector2D }>;
  } {
    const spawnsByType: { [type: string]: number } = {};
    
    for (const spawn of this.spawnHistory) {
      spawnsByType[spawn.type] = (spawnsByType[spawn.type] || 0) + 1;
    }

    return {
      activePowerUps: this.activePowerUps.length,
      totalSpawned: this.spawnHistory.length,
      spawnsByType,
      recentSpawns: this.spawnHistory.slice(-10) // Last 10 spawns
    };
  }

  /**
   * Calculate spawn chance based on block and level
   */
  private calculateSpawnChance(block: Block, level: number): number {
    let chance = this.config.baseSpawnChance;

    // Apply block type modifier
    const blockType = (block as any).type || 'normal';
    if (this.config.spawnChanceByBlockType[blockType]) {
      chance = this.config.spawnChanceByBlockType[blockType];
    }

    // Apply level modifier
    if (this.config.spawnChanceByLevel[level]) {
      chance *= this.config.spawnChanceByLevel[level] / this.config.baseSpawnChance;
    }

    // Clamp to valid range
    return Math.max(0, Math.min(1, chance));
  }

  /**
   * Select random power-up type based on weights
   */
  private selectRandomPowerUpType(): PowerUpType {
    const totalWeight = Object.values(PowerUpSpawner.TYPE_WEIGHTS).reduce((sum, weight) => sum + weight, 0);
    let randomValue = this.random() * totalWeight;

    for (const [type, weight] of Object.entries(PowerUpSpawner.TYPE_WEIGHTS)) {
      randomValue -= weight;
      if (randomValue <= 0) {
        return type as PowerUpType;
      }
    }

    // Fallback to MultiBall
    return PowerUpType.MultiBall;
  }

  /**
   * Create power-up instance
   */
  private createPowerUp(type: PowerUpType, position: Vector2D): PowerUp {
    const config = {
      speed: this.config.verticalSpeed,
      despawnTime: this.config.despawnTime
    };

    return PowerUp.create(type, position, config);
  }

  /**
   * Check AABB collision between two rectangles
   */
  private checkAABBCollision(
    rect1: { x: number; y: number; width: number; height: number },
    rect2: { x: number; y: number; width: number; height: number }
  ): boolean {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.y + rect1.height > rect2.y
    );
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<PowerUpSpawnConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('PowerUpSpawner: Configuration updated');
  }
}