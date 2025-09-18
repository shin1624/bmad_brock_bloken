/**
 * Unit Tests for PowerUpSpawner System
 * Story 4.2, Task 4: Test power-up spawning and collection functionality
 */
import { PowerUpSpawner, PowerUpSpawnConfig, SpawnResult } from '../PowerUpSpawner';
import { Block } from '../../entities/Block';
import { PowerUpType } from '../../entities/PowerUp';

// Mock Block class for testing
class MockBlock {
  public position = { x: 100, y: 100 };
  public size = { x: 40, y: 20 };
  public active = false;
  public type = 'normal';
}

describe('PowerUpSpawner', () => {
  let spawner: PowerUpSpawner;
  let mockBlock: MockBlock;
  let mockRandom: jest.Mock;

  beforeEach(() => {
    mockRandom = jest.fn();
    mockBlock = new MockBlock();
    
    // Default config for testing
    const config: Partial<PowerUpSpawnConfig> = {
      baseSpawnChance: 0.5,
      maxActivePowerUps: 3,
      despawnTime: 5000,
      verticalSpeed: 100
    };

    spawner = new PowerUpSpawner(config, mockRandom);
  });

  describe('Power-Up Spawning', () => {
    it('should spawn power-up when random roll succeeds', () => {
      mockRandom.mockReturnValue(0.3); // Below 50% spawn chance

      const result = spawner.trySpawnPowerUp(mockBlock as any);

      expect(result.spawned).toBe(true);
      expect(result.powerUp).toBeDefined();
      expect(result.spawnChance).toBe(0.5);
    });

    it('should not spawn power-up when random roll fails', () => {
      mockRandom.mockReturnValue(0.7); // Above 50% spawn chance

      const result = spawner.trySpawnPowerUp(mockBlock as any);

      expect(result.spawned).toBe(false);
      expect(result.powerUp).toBeUndefined();
      expect(result.reason).toContain('Random roll failed');
    });

    it('should not spawn when at maximum capacity', () => {
      mockRandom.mockReturnValue(0.1); // Always succeed

      // Fill to capacity
      spawner.trySpawnPowerUp(mockBlock as any);
      spawner.trySpawnPowerUp(mockBlock as any);
      spawner.trySpawnPowerUp(mockBlock as any);

      // Try to spawn one more
      const result = spawner.trySpawnPowerUp(mockBlock as any);

      expect(result.spawned).toBe(false);
      expect(result.reason).toContain('Maximum active power-ups reached');
    });

    it('should position power-up at block center', () => {
      mockRandom.mockReturnValue(0.1);
      
      const result = spawner.trySpawnPowerUp(mockBlock as any);

      expect(result.spawned).toBe(true);
      expect(result.powerUp?.position.x).toBe(120); // 100 + 40/2
      expect(result.powerUp?.position.y).toBe(100);
    });

    it('should handle different block types with different spawn chances', () => {
      const config = {
        spawnChanceByBlockType: {
          'normal': 0.1,
          'strong': 0.3,
          'special': 0.8
        }
      };
      spawner = new PowerUpSpawner(config, mockRandom);

      mockRandom.mockReturnValue(0.5);

      // Normal block (10% chance) - should fail
      mockBlock.type = 'normal';
      let result = spawner.trySpawnPowerUp(mockBlock as any);
      expect(result.spawned).toBe(false);

      // Special block (80% chance) - should succeed
      mockBlock.type = 'special';
      result = spawner.trySpawnPowerUp(mockBlock as any);
      expect(result.spawned).toBe(true);
    });

    it('should apply level modifiers to spawn chance', () => {
      const config = {
        baseSpawnChance: 0.2,
        spawnChanceByLevel: {
          1: 0.1,  // 50% of base
          5: 0.4   // 200% of base
        }
      };
      spawner = new PowerUpSpawner(config, mockRandom);

      mockRandom.mockReturnValue(0.15);

      // Level 1 (reduced chance) - should fail
      let result = spawner.trySpawnPowerUp(mockBlock as any, 1);
      expect(result.spawned).toBe(false);

      // Level 5 (increased chance) - should succeed
      result = spawner.trySpawnPowerUp(mockBlock as any, 5);
      expect(result.spawned).toBe(true);
    });
  });

  describe('Power-Up Updates', () => {
    beforeEach(() => {
      mockRandom.mockReturnValue(0.1); // Always spawn
    });

    it('should update power-up positions', () => {
      const result = spawner.trySpawnPowerUp(mockBlock as any);
      const initialY = result.powerUp?.position.y || 0;

      spawner.update(1000, 800); // 1 second

      const activePowerUps = spawner.getActivePowerUps();
      expect(activePowerUps[0].position.y).toBeGreaterThan(initialY);
    });

    it('should remove power-ups that fall off screen', () => {
      spawner.trySpawnPowerUp(mockBlock as any);
      
      // Move power-up off screen
      const powerUp = spawner.getActivePowerUps()[0];
      powerUp.position.y = 1000;

      spawner.update(1000, 800); // Screen height = 800

      expect(spawner.getActivePowerUps()).toHaveLength(0);
    });

    it('should remove power-ups that expire', () => {
      spawner.trySpawnPowerUp(mockBlock as any);
      
      // Simulate time passing
      const powerUp = spawner.getActivePowerUps()[0];
      powerUp.timeAlive = 10000; // Exceed despawn time

      spawner.update(1000, 800);

      expect(spawner.getActivePowerUps()).toHaveLength(0);
    });
  });

  describe('Paddle Collision Detection', () => {
    beforeEach(() => {
      mockRandom.mockReturnValue(0.1); // Always spawn
    });

    it('should detect collision with paddle', () => {
      const result = spawner.trySpawnPowerUp(mockBlock as any);
      const powerUp = result.powerUp!;
      
      // Position power-up to collide with paddle
      powerUp.position.x = 100;
      powerUp.position.y = 200;

      const paddleBounds = { x: 95, y: 195, width: 80, height: 16 };
      const collected = spawner.checkPaddleCollisions(paddleBounds);

      expect(collected).toHaveLength(1);
      expect(collected[0]).toBe(powerUp);
      expect(spawner.getActivePowerUps()).toHaveLength(0);
    });

    it('should not detect collision when objects do not overlap', () => {
      const result = spawner.trySpawnPowerUp(mockBlock as any);
      const powerUp = result.powerUp!;
      
      // Position power-up away from paddle
      powerUp.position.x = 500;
      powerUp.position.y = 500;

      const paddleBounds = { x: 100, y: 200, width: 80, height: 16 };
      const collected = spawner.checkPaddleCollisions(paddleBounds);

      expect(collected).toHaveLength(0);
      expect(spawner.getActivePowerUps()).toHaveLength(1);
    });

    it('should handle multiple power-ups colliding simultaneously', () => {
      // Spawn multiple power-ups
      spawner.trySpawnPowerUp(mockBlock as any);
      spawner.trySpawnPowerUp(mockBlock as any);

      const powerUps = spawner.getActivePowerUps();
      
      // Position both to collide
      powerUps.forEach(powerUp => {
        powerUp.position.x = 100;
        powerUp.position.y = 200;
      });

      const paddleBounds = { x: 95, y: 195, width: 80, height: 16 };
      const collected = spawner.checkPaddleCollisions(paddleBounds);

      expect(collected).toHaveLength(2);
      expect(spawner.getActivePowerUps()).toHaveLength(0);
    });
  });

  describe('Statistics and Management', () => {
    beforeEach(() => {
      mockRandom.mockReturnValue(0.1); // Always spawn
    });

    it('should track spawn statistics', () => {
      spawner.trySpawnPowerUp(mockBlock as any);
      spawner.trySpawnPowerUp(mockBlock as any);

      const stats = spawner.getStats();

      expect(stats.activePowerUps).toBe(2);
      expect(stats.totalSpawned).toBe(2);
      expect(stats.recentSpawns).toHaveLength(2);
    });

    it('should track spawns by type', () => {
      // Use fixed random to control power-up type selection
      const fixedRandom = jest.fn()
        .mockReturnValueOnce(0.1)  // For spawn roll
        .mockReturnValueOnce(0.05) // For type selection (should select first type)
        .mockReturnValueOnce(0.1)  // For spawn roll
        .mockReturnValueOnce(0.9); // For type selection (should select last type)

      spawner = new PowerUpSpawner(undefined, fixedRandom);

      spawner.trySpawnPowerUp(mockBlock as any);
      spawner.trySpawnPowerUp(mockBlock as any);

      const stats = spawner.getStats();
      expect(Object.keys(stats.spawnsByType).length).toBeGreaterThan(0);
    });

    it('should clear all power-ups', () => {
      spawner.trySpawnPowerUp(mockBlock as any);
      spawner.trySpawnPowerUp(mockBlock as any);

      expect(spawner.getActivePowerUps()).toHaveLength(2);

      spawner.clearAll();

      expect(spawner.getActivePowerUps()).toHaveLength(0);
    });

    it('should update configuration', () => {
      const newConfig = { maxActivePowerUps: 5, baseSpawnChance: 0.8 };
      
      spawner.updateConfig(newConfig);

      // Test that new config is applied (spawn more than original max)
      for (let i = 0; i < 5; i++) {
        spawner.trySpawnPowerUp(mockBlock as any);
      }

      expect(spawner.getActivePowerUps()).toHaveLength(5);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully during spawn', () => {
      // Create a block that will cause an error
      const badBlock = null;

      const result = spawner.trySpawnPowerUp(badBlock as any);

      expect(result.spawned).toBe(false);
      expect(result.reason).toContain('Error:');
    });

    it('should handle invalid spawn configuration', () => {
      const config = {
        baseSpawnChance: -1, // Invalid
        maxActivePowerUps: 0  // Invalid
      };

      expect(() => {
        new PowerUpSpawner(config);
      }).not.toThrow(); // Should handle gracefully
    });
  });

  describe('Power-Up Type Selection', () => {
    it('should select different power-up types', () => {
      const types = new Set<PowerUpType>();
      
      // Spawn many power-ups to get variety
      for (let i = 0; i < 50; i++) {
        mockRandom.mockReturnValue(0.1); // Always spawn
        const result = spawner.trySpawnPowerUp(mockBlock as any);
        if (result.powerUp) {
          types.add(result.powerUp.type);
        }
        spawner.clearAll(); // Clear for next spawn
      }

      // Should have multiple types
      expect(types.size).toBeGreaterThan(1);
    });
  });
});