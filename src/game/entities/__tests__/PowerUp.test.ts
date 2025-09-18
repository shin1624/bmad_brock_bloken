/**
 * PowerUp Entity Unit Tests
 * Story 4.1, Task 5: Comprehensive unit test suite for PowerUp entity
 * Coverage target: >90% for PowerUp entity behavior
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PowerUp, PowerUpType, PowerUpConfig } from '../PowerUp';
import { Vector2D } from '../../../types/game.types';

describe('PowerUp Entity', () => {
  let mockCanvas: HTMLCanvasElement;
  let mockContext: CanvasRenderingContext2D;

  beforeEach(() => {
    // Mock canvas and context
    mockCanvas = document.createElement('canvas');
    mockContext = {
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn()
      })),
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      roundRect: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn(() => ({ width: 10 }))
    } as any;

    // Reset time for consistent testing
    vi.useFakeTimers();
  });

  describe('PowerUp Creation', () => {
    it('should create PowerUp with valid initial state', () => {
      const powerUp = new PowerUp(PowerUpType.MultiBall, PowerUp.getMetadata(PowerUpType.MultiBall));
      
      expect(powerUp.id).toBeDefined();
      expect(powerUp.type).toBe(PowerUpType.MultiBall);
      expect(powerUp.active).toBe(true);
      expect(powerUp.collected).toBe(false);
      expect(powerUp.position).toEqual({ x: 0, y: 0 });
      expect(powerUp.velocity).toEqual({ x: 0, y: 50 });
      expect(powerUp.timeAlive).toBe(0);
      expect(powerUp.animationPhase).toBe(0);
    });

    it('should create PowerUp with custom position', () => {
      const position: Vector2D = { x: 100, y: 200 };
      const powerUp = new PowerUp(
        PowerUpType.PaddleSize, 
        PowerUp.getMetadata(PowerUpType.PaddleSize),
        position
      );
      
      expect(powerUp.position).toEqual(position);
    });

    it('should create PowerUp with custom config', () => {
      const config: Partial<PowerUpConfig> = {
        size: { width: 32, height: 32 },
        speed: 75,
        despawnTime: 15000
      };
      
      const powerUp = new PowerUp(
        PowerUpType.BallSpeed,
        PowerUp.getMetadata(PowerUpType.BallSpeed),
        undefined,
        config
      );
      
      expect(powerUp.config.size).toEqual(config.size);
      expect(powerUp.config.speed).toBe(config.speed);
      expect(powerUp.config.despawnTime).toBe(config.despawnTime);
      expect(powerUp.velocity.y).toBe(75);
    });

    it('should create PowerUp using factory method', () => {
      const position: Vector2D = { x: 50, y: 100 };
      const powerUp = PowerUp.create(PowerUpType.Penetration, position);
      
      expect(powerUp.type).toBe(PowerUpType.Penetration);
      expect(powerUp.position).toEqual(position);
      expect(powerUp.metadata).toEqual(PowerUp.getMetadata(PowerUpType.Penetration));
    });
  });

  describe('PowerUp Movement and Physics', () => {
    it('should update position based on velocity', () => {
      const powerUp = new PowerUp(PowerUpType.MultiBall, PowerUp.getMetadata(PowerUpType.MultiBall));
      const deltaTime = 1000; // 1 second
      
      powerUp.update(deltaTime);
      
      expect(powerUp.position.x).toBe(0); // No horizontal movement
      expect(powerUp.position.y).toBe(50); // Moved down by speed (50 px/s)
      expect(powerUp.timeAlive).toBe(deltaTime);
    });

    it('should update animation phase correctly', () => {
      const powerUp = new PowerUp(PowerUpType.MultiBall, PowerUp.getMetadata(PowerUpType.MultiBall));
      const deltaTime = 500; // 0.5 seconds
      
      powerUp.update(deltaTime);
      
      // Animation speed is 2 cycles per second, so 0.5s = 1 cycle = 2π radians
      const expectedPhase = 2 * (deltaTime / 1000) * Math.PI;
      expect(powerUp.animationPhase).toBeCloseTo(expectedPhase, 5);
    });

    it('should wrap animation phase at 2π', () => {
      const powerUp = new PowerUp(PowerUpType.MultiBall, PowerUp.getMetadata(PowerUpType.MultiBall));
      const deltaTime = 1000; // 1 second = 2 full cycles
      
      powerUp.update(deltaTime);
      
      // Should be wrapped back to 0
      expect(powerUp.animationPhase).toBeCloseTo(0, 5);
    });

    it('should not update when inactive', () => {
      const powerUp = new PowerUp(PowerUpType.MultiBall, PowerUp.getMetadata(PowerUpType.MultiBall));
      powerUp.active = false;
      const initialPosition = { ...powerUp.position };
      
      powerUp.update(1000);
      
      expect(powerUp.position).toEqual(initialPosition);
      expect(powerUp.timeAlive).toBe(0);
    });

    it('should not update when collected', () => {
      const powerUp = new PowerUp(PowerUpType.MultiBall, PowerUp.getMetadata(PowerUpType.MultiBall));
      powerUp.collected = true;
      const initialPosition = { ...powerUp.position };
      
      powerUp.update(1000);
      
      expect(powerUp.position).toEqual(initialPosition);
      expect(powerUp.timeAlive).toBe(0);
    });
  });

  describe('PowerUp Collision Detection', () => {
    it('should return correct bounds', () => {
      const powerUp = new PowerUp(PowerUpType.MultiBall, PowerUp.getMetadata(PowerUpType.MultiBall));
      powerUp.position = { x: 100, y: 200 };
      
      const bounds = powerUp.getBounds();
      
      expect(bounds).toEqual({
        x: 100,
        y: 200,
        width: 24, // Default size
        height: 24
      });
    });

    it('should return bounds with custom size', () => {
      const config: Partial<PowerUpConfig> = {
        size: { width: 32, height: 32 }
      };
      
      const powerUp = new PowerUp(
        PowerUpType.MultiBall,
        PowerUp.getMetadata(PowerUpType.MultiBall),
        { x: 50, y: 75 },
        config
      );
      
      const bounds = powerUp.getBounds();
      
      expect(bounds).toEqual({
        x: 50,
        y: 75,
        width: 32,
        height: 32
      });
    });
  });

  describe('PowerUp Lifecycle', () => {
    it('should auto-despawn after configured time', () => {
      const config: Partial<PowerUpConfig> = {
        despawnTime: 5000 // 5 seconds
      };
      
      const powerUp = new PowerUp(
        PowerUpType.MultiBall,
        PowerUp.getMetadata(PowerUpType.MultiBall),
        undefined,
        config
      );
      
      // Update for 6 seconds
      powerUp.update(6000);
      
      expect(powerUp.active).toBe(false);
    });

    it('should collect powerup correctly', () => {
      const powerUp = new PowerUp(PowerUpType.MultiBall, PowerUp.getMetadata(PowerUpType.MultiBall));
      
      powerUp.collect();
      
      expect(powerUp.collected).toBe(true);
      expect(powerUp.active).toBe(false);
    });

    it('should check despawn conditions correctly', () => {
      const powerUp = new PowerUp(PowerUpType.MultiBall, PowerUp.getMetadata(PowerUpType.MultiBall));
      const screenHeight = 600;
      
      // Test position-based despawn
      powerUp.position.y = screenHeight + 10;
      expect(powerUp.shouldDespawn(screenHeight)).toBe(true);
      
      // Test time-based despawn
      powerUp.position.y = 100;
      powerUp.timeAlive = powerUp.config.despawnTime + 1000;
      expect(powerUp.shouldDespawn(screenHeight)).toBe(true);
      
      // Test no despawn
      powerUp.position.y = 100;
      powerUp.timeAlive = 1000;
      expect(powerUp.shouldDespawn(screenHeight)).toBe(false);
    });

    it('should calculate remaining time correctly', () => {
      const powerUp = new PowerUp(PowerUpType.MultiBall, PowerUp.getMetadata(PowerUpType.MultiBall));
      powerUp.timeAlive = 3000; // 3 seconds alive
      
      const remaining = powerUp.getRemainingTime();
      const expected = powerUp.config.despawnTime - 3000;
      
      expect(remaining).toBe(expected);
    });

    it('should return 0 for remaining time when expired', () => {
      const powerUp = new PowerUp(PowerUpType.MultiBall, PowerUp.getMetadata(PowerUpType.MultiBall));
      powerUp.timeAlive = powerUp.config.despawnTime + 1000;
      
      const remaining = powerUp.getRemainingTime();
      
      expect(remaining).toBe(0);
    });
  });

  describe('PowerUp Rendering', () => {
    it('should not render when inactive', () => {
      const powerUp = new PowerUp(PowerUpType.MultiBall, PowerUp.getMetadata(PowerUpType.MultiBall));
      powerUp.active = false;
      
      powerUp.render(mockContext);
      
      expect(mockContext.save).not.toHaveBeenCalled();
    });

    it('should not render when collected', () => {
      const powerUp = new PowerUp(PowerUpType.MultiBall, PowerUp.getMetadata(PowerUpType.MultiBall));
      powerUp.collected = true;
      
      powerUp.render(mockContext);
      
      expect(mockContext.save).not.toHaveBeenCalled();
    });

    it('should render with correct transformations', () => {
      const powerUp = new PowerUp(PowerUpType.MultiBall, PowerUp.getMetadata(PowerUpType.MultiBall));
      powerUp.position = { x: 100, y: 200 };
      powerUp.animationPhase = Math.PI / 2; // 90 degrees
      
      powerUp.render(mockContext);
      
      expect(mockContext.save).toHaveBeenCalled();
      expect(mockContext.restore).toHaveBeenCalled();
      expect(mockContext.translate).toHaveBeenCalled();
      expect(mockContext.scale).toHaveBeenCalled();
    });
  });

  describe('PowerUp Animation', () => {
    it('should calculate animation progress correctly', () => {
      const powerUp = new PowerUp(PowerUpType.MultiBall, PowerUp.getMetadata(PowerUpType.MultiBall));
      powerUp.animationPhase = Math.PI; // Half way through cycle
      
      const progress = powerUp.getAnimationProgress();
      
      expect(progress).toBeCloseTo(0.5, 2);
    });

    it('should handle full animation cycle', () => {
      const powerUp = new PowerUp(PowerUpType.MultiBall, PowerUp.getMetadata(PowerUpType.MultiBall));
      powerUp.animationPhase = Math.PI * 2; // Full cycle
      
      const progress = powerUp.getAnimationProgress();
      
      expect(progress).toBeCloseTo(1, 2);
    });
  });

  describe('PowerUp Metadata', () => {
    it('should return correct metadata for all power-up types', () => {
      const types = Object.values(PowerUpType);
      
      types.forEach(type => {
        const metadata = PowerUp.getMetadata(type);
        
        expect(metadata.type).toBe(type);
        expect(metadata.name).toBeDefined();
        expect(metadata.description).toBeDefined();
        expect(metadata.icon).toBeDefined();
        expect(metadata.color).toBeDefined();
        expect(metadata.rarity).toMatch(/^(common|rare|epic)$/);
        expect(metadata.duration).toBeGreaterThan(0);
        expect(metadata.effect).toBeDefined();
      });
    });

    it('should have unique effects for each power-up type', () => {
      const types = Object.values(PowerUpType);
      const effectIds = types.map(type => PowerUp.getMetadata(type).effect.id);
      const uniqueIds = new Set(effectIds);
      
      expect(uniqueIds.size).toBe(types.length);
    });

    it('should have correct conflict relationships', () => {
      const ballSpeedMeta = PowerUp.getMetadata(PowerUpType.BallSpeed);
      const magnetMeta = PowerUp.getMetadata(PowerUpType.Magnet);
      
      expect(ballSpeedMeta.effect.conflictsWith).toContain(PowerUpType.Magnet);
      expect(magnetMeta.effect.conflictsWith).toContain(PowerUpType.BallSpeed);
    });
  });

  describe('PowerUp Performance', () => {
    it('should handle multiple updates efficiently', () => {
      const powerUp = new PowerUp(PowerUpType.MultiBall, PowerUp.getMetadata(PowerUpType.MultiBall));
      const startTime = performance.now();
      
      // Simulate 60 FPS for 1 second
      for (let i = 0; i < 60; i++) {
        powerUp.update(16.67); // ~60 FPS
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete in reasonable time (less than 10ms for 60 updates)
      expect(duration).toBeLessThan(10);
    });

    it('should maintain consistent animation timing', () => {
      const powerUp = new PowerUp(PowerUpType.MultiBall, PowerUp.getMetadata(PowerUpType.MultiBall));
      const updates: number[] = [];
      
      // Record animation phases over multiple updates
      for (let i = 0; i < 10; i++) {
        powerUp.update(100); // 0.1 second increments
        updates.push(powerUp.animationPhase);
      }
      
      // Check that animation progresses consistently
      for (let i = 1; i < updates.length; i++) {
        const diff = updates[i] - updates[i - 1];
        const expectedDiff = 2 * 0.1 * Math.PI; // 2 cycles/second * 0.1s * 2π
        expect(Math.abs(diff - expectedDiff)).toBeLessThan(0.01);
      }
    });
  });
});