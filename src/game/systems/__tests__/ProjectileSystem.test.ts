/**
 * Unit tests for ProjectileSystem
 * Story 4.3b - Phase 2 Advanced Power-ups
 * Target: 90% code coverage, 25 test cases
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProjectileSystem, ProjectileSystemConfig, ProjectileSystemContext } from '../ProjectileSystem';
import { Projectile, ProjectileType, ProjectileConfig } from '../../entities/Projectile';
import { Block } from '../../entities/Block';
import { BlockType } from '../../../types/game.types';
import { ProjectilePool } from '../../utils/ProjectilePool';
import { EventBus } from '../../core/EventBus';
import { createMockContext2D, type MockCanvasContext } from '../../../__tests__/mocks/CanvasMockFactory';

describe('ProjectileSystem', () => {
  let system: ProjectileSystem;
  let context: ProjectileSystemContext;
  let mockBlocks: Block[];
  let mockEventBus: EventBus;
  let mockContext: MockCanvasContext;

  beforeEach(() => {
    // Reset ProjectilePool singleton before each test
    ProjectilePool.resetInstance();

    // Create mock blocks
    mockBlocks = [
      new Block(BlockType.Normal, 0, 0, { x: 100, y: 50 }),
      new Block(BlockType.Normal, 0, 1, { x: 200, y: 50 }),
      new Block(BlockType.Hard, 1, 0, { x: 100, y: 100 }),
    ];

    // Create mock EventBus
    mockEventBus = new EventBus();

    // Create system context
    context = {
      canvasWidth: 800,
      canvasHeight: 600,
      blocks: mockBlocks,
      eventBus: mockEventBus,
    };

    // Create mock canvas context
    mockContext = createMockContext2D();

    // Create system
    system = new ProjectileSystem(context);
  });

  afterEach(() => {
    system.destroy();
    ProjectilePool.resetInstance();
  });

  describe('Constructor', () => {
    it('should create system with default config', () => {
      expect(system).toBeInstanceOf(ProjectileSystem);

      const stats = system.getStats();
      expect(stats.activeCount).toBe(0);
    });

    it('should create system with custom config', () => {
      const customConfig: Partial<ProjectileSystemConfig> = {
        maxActiveProjectiles: 10,
        poolSize: 10,
        enableDebugMode: true,
      };

      const customSystem = new ProjectileSystem(context, customConfig);
      expect(customSystem).toBeInstanceOf(ProjectileSystem);

      customSystem.destroy();
    });

    it('should initialize ProjectilePool singleton', () => {
      const stats = system.getStats();
      expect(stats.poolStats).toBeDefined();
      expect(stats.poolStats.maxSize).toBe(20); // Default pool size
    });
  });

  describe('spawn()', () => {
    it('should spawn projectile successfully', () => {
      const config: ProjectileConfig = {
        type: ProjectileType.LASER,
        position: { x: 400, y: 500 },
        velocity: { x: 0, y: -500 },
        damage: 1,
        size: { width: 4, height: 12 },
        color: '#FF0000',
      };

      const projectile = system.spawn(config);

      expect(projectile).not.toBeNull();
      expect(projectile!.active).toBe(true);
      expect(projectile!.position.x).toBe(400);
      expect(projectile!.position.y).toBe(500);

      const stats = system.getStats();
      expect(stats.activeCount).toBe(1);
    });

    it('should return null when max projectiles reached', () => {
      const config: ProjectileConfig = {
        type: ProjectileType.LASER,
        position: { x: 400, y: 500 },
        velocity: { x: 0, y: -500 },
        damage: 1,
        size: { width: 4, height: 12 },
        color: '#FF0000',
      };

      // Spawn max projectiles (default 20)
      const projectiles: Projectile[] = [];
      for (let i = 0; i < 20; i++) {
        const proj = system.spawn(config);
        if (proj) projectiles.push(proj);
      }

      expect(projectiles.length).toBe(20);

      // 21st spawn should fail
      const extraProj = system.spawn(config);
      expect(extraProj).toBeNull();
    });

    it('should return null when pool is exhausted', () => {
      const config: ProjectileConfig = {
        type: ProjectileType.LASER,
        position: { x: 400, y: 500 },
        velocity: { x: 0, y: -500 },
        damage: 1,
        size: { width: 4, height: 12 },
        color: '#FF0000',
      };

      // Spawn all 20 projectiles from pool
      for (let i = 0; i < 20; i++) {
        system.spawn(config);
      }

      // Pool should be exhausted
      const stats = system.getStats();
      expect(stats.poolStats.poolSize).toBe(0);
    });

    it('should emit projectile:spawned event', () => {
      const spawnHandler = vi.fn();
      mockEventBus.on('projectile:spawned', spawnHandler);

      const config: ProjectileConfig = {
        type: ProjectileType.LASER,
        position: { x: 400, y: 500 },
        velocity: { x: 0, y: -500 },
        damage: 1,
        size: { width: 4, height: 12 },
        color: '#FF0000',
      };

      system.spawn(config);

      expect(spawnHandler).toHaveBeenCalledTimes(1);
      expect(spawnHandler).toHaveBeenCalledWith({
        type: ProjectileType.LASER,
        position: { x: 400, y: 500 },
      });
    });

    it('should work without EventBus', () => {
      const noEventBusContext: ProjectileSystemContext = {
        canvasWidth: 800,
        canvasHeight: 600,
        blocks: mockBlocks,
      };

      const noEventBusSystem = new ProjectileSystem(noEventBusContext);

      const config: ProjectileConfig = {
        type: ProjectileType.LASER,
        position: { x: 400, y: 500 },
        velocity: { x: 0, y: -500 },
        damage: 1,
        size: { width: 4, height: 12 },
        color: '#FF0000',
      };

      const projectile = noEventBusSystem.spawn(config);
      expect(projectile).not.toBeNull();

      noEventBusSystem.destroy();
    });
  });

  describe('update()', () => {
    it('should update projectile positions', () => {
      const config: ProjectileConfig = {
        type: ProjectileType.LASER,
        position: { x: 400, y: 500 },
        velocity: { x: 0, y: -500 },
        damage: 1,
        size: { width: 4, height: 12 },
        color: '#FF0000',
      };

      const projectile = system.spawn(config);
      expect(projectile).not.toBeNull();

      const initialY = projectile!.position.y;

      system.update(16); // ~60 FPS

      // Expected: y = 500 + (-500) * 0.016 = 492
      expect(projectile!.position.y).toBeCloseTo(492, 0);
      expect(projectile!.position.y).toBeLessThan(initialY);
    });

    it('should not update inactive projectiles', () => {
      const config: ProjectileConfig = {
        type: ProjectileType.LASER,
        position: { x: 400, y: 500 },
        velocity: { x: 0, y: -500 },
        damage: 1,
        size: { width: 4, height: 12 },
        color: '#FF0000',
      };

      const projectile = system.spawn(config);
      projectile!.active = false;

      const initialY = projectile!.position.y;

      system.update(16);

      expect(projectile!.position.y).toBe(initialY); // No change
    });

    it('should trigger periodic cleanup', () => {
      const config: ProjectileConfig = {
        type: ProjectileType.LASER,
        position: { x: 400, y: -100 }, // Off-screen
        velocity: { x: 0, y: -500 },
        damage: 1,
        size: { width: 4, height: 12 },
        color: '#FF0000',
      };

      system.spawn(config);
      expect(system.getStats().activeCount).toBe(1);

      // Advance time to trigger cleanup (>1000ms)
      vi.useFakeTimers();
      vi.advanceTimersByTime(1100);

      system.update(16);

      // Off-screen projectile should be cleaned up
      expect(system.getStats().activeCount).toBe(0);

      vi.useRealTimers();
    });
  });

  describe('Collision Detection', () => {
    it('should detect collision with block', () => {
      const hitHandler = vi.fn();
      mockEventBus.on('projectile:hit', hitHandler);

      // Spawn projectile that will hit first block
      const config: ProjectileConfig = {
        type: ProjectileType.LASER,
        position: { x: 120, y: 60 }, // Inside first block bounds
        velocity: { x: 0, y: -500 },
        damage: 1,
        size: { width: 4, height: 12 },
        color: '#FF0000',
      };

      system.spawn(config);
      system.update(16);

      // Collision should have occurred
      expect(hitHandler).toHaveBeenCalledTimes(1);
    });

    it('should destroy Normal block on hit', () => {
      const block = mockBlocks[0]; // Normal block, 1 HP
      expect(block.isDestroyed).toBe(false);
      expect(block.currentHitPoints).toBe(1);

      const config: ProjectileConfig = {
        type: ProjectileType.LASER,
        position: { x: 120, y: 60 },
        velocity: { x: 0, y: -500 },
        damage: 1,
        size: { width: 4, height: 12 },
        color: '#FF0000',
      };

      system.spawn(config);
      system.update(16);

      expect(block.isDestroyed).toBe(true);
      expect(block.active).toBe(false);
      expect(block.currentHitPoints).toBe(0);
    });

    it('should damage Hard block but not destroy on first hit', () => {
      const block = mockBlocks[2]; // Hard block, 2 HP
      expect(block.isDestroyed).toBe(false);
      expect(block.currentHitPoints).toBe(2);

      const config: ProjectileConfig = {
        type: ProjectileType.LASER,
        position: { x: 120, y: 110 },
        velocity: { x: 0, y: -500 },
        damage: 1,
        size: { width: 4, height: 12 },
        color: '#FF0000',
      };

      system.spawn(config);
      system.update(16);

      expect(block.isDestroyed).toBe(false);
      expect(block.currentHitPoints).toBe(1);
    });

    it('should destroy Hard block on second hit', () => {
      const block = mockBlocks[2]; // Hard block, 2 HP

      const config: ProjectileConfig = {
        type: ProjectileType.LASER,
        position: { x: 120, y: 110 },
        velocity: { x: 0, y: -500 },
        damage: 1,
        size: { width: 4, height: 12 },
        color: '#FF0000',
      };

      // First hit
      system.spawn(config);
      system.update(16);
      expect(block.currentHitPoints).toBe(1);

      // Second hit
      system.spawn(config);
      system.update(16);
      expect(block.isDestroyed).toBe(true);
      expect(block.currentHitPoints).toBe(0);
    });

    it('should deactivate projectile after collision', () => {
      const config: ProjectileConfig = {
        type: ProjectileType.LASER,
        position: { x: 120, y: 60 },
        velocity: { x: 0, y: -500 },
        damage: 1,
        size: { width: 4, height: 12 },
        color: '#FF0000',
      };

      const projectile = system.spawn(config);
      expect(projectile!.active).toBe(true);

      system.update(16);

      expect(projectile!.active).toBe(false);
    });

    it('should not collide with destroyed blocks', () => {
      const block = mockBlocks[0];
      block.isDestroyed = true;
      block.active = false;

      const hitHandler = vi.fn();
      mockEventBus.on('projectile:hit', hitHandler);

      const config: ProjectileConfig = {
        type: ProjectileType.LASER,
        position: { x: 120, y: 60 },
        velocity: { x: 0, y: -500 },
        damage: 1,
        size: { width: 4, height: 12 },
        color: '#FF0000',
      };

      system.spawn(config);
      system.update(16);

      expect(hitHandler).not.toHaveBeenCalled();
    });

    it('should emit projectile:hit event with collision data', () => {
      const hitHandler = vi.fn();
      mockEventBus.on('projectile:hit', hitHandler);

      const config: ProjectileConfig = {
        type: ProjectileType.LASER,
        position: { x: 120, y: 60 },
        velocity: { x: 0, y: -500 },
        damage: 1,
        size: { width: 4, height: 12 },
        color: '#FF0000',
      };

      const projectile = system.spawn(config);
      system.update(16);

      expect(hitHandler).toHaveBeenCalledTimes(1);

      const eventData = hitHandler.mock.calls[0][0];
      expect(eventData.projectile.id).toBe(projectile!.id);
      expect(eventData.projectile.type).toBe(ProjectileType.LASER);
      expect(eventData.block.type).toBe(BlockType.Normal);
      expect(eventData.block.destroyed).toBe(true);
    });
  });

  describe('cleanup()', () => {
    it('should remove off-screen projectiles', () => {
      const config: ProjectileConfig = {
        type: ProjectileType.LASER,
        position: { x: 400, y: -100 }, // Above screen
        velocity: { x: 0, y: -500 },
        damage: 1,
        size: { width: 4, height: 12 },
        color: '#FF0000',
      };

      system.spawn(config);
      expect(system.getStats().activeCount).toBe(1);

      // Trigger cleanup
      vi.useFakeTimers();
      vi.advanceTimersByTime(1100);
      system.update(16);
      vi.useRealTimers();

      expect(system.getStats().activeCount).toBe(0);
    });

    it('should remove inactive projectiles', () => {
      const config: ProjectileConfig = {
        type: ProjectileType.LASER,
        position: { x: 400, y: 300 },
        velocity: { x: 0, y: -500 },
        damage: 1,
        size: { width: 4, height: 12 },
        color: '#FF0000',
      };

      const projectile = system.spawn(config);
      projectile!.active = false;

      expect(system.getStats().activeCount).toBe(1);

      // Trigger cleanup
      vi.useFakeTimers();
      vi.advanceTimersByTime(1100);
      system.update(16);
      vi.useRealTimers();

      expect(system.getStats().activeCount).toBe(0);
    });

    it('should release projectiles back to pool on cleanup', () => {
      const config: ProjectileConfig = {
        type: ProjectileType.LASER,
        position: { x: 400, y: -100 },
        velocity: { x: 0, y: -500 },
        damage: 1,
        size: { width: 4, height: 12 },
        color: '#FF0000',
      };

      system.spawn(config);

      const statsBeforeCleanup = system.getStats();
      const poolSizeBefore = statsBeforeCleanup.poolStats.poolSize;

      // Trigger cleanup
      vi.useFakeTimers();
      vi.advanceTimersByTime(1100);
      system.update(16);
      vi.useRealTimers();

      const statsAfterCleanup = system.getStats();
      const poolSizeAfter = statsAfterCleanup.poolStats.poolSize;

      expect(poolSizeAfter).toBeGreaterThan(poolSizeBefore);
    });

    it('should keep active on-screen projectiles', () => {
      const config: ProjectileConfig = {
        type: ProjectileType.LASER,
        position: { x: 400, y: 300 }, // On-screen
        velocity: { x: 0, y: -500 },
        damage: 1,
        size: { width: 4, height: 12 },
        color: '#FF0000',
      };

      system.spawn(config);
      expect(system.getStats().activeCount).toBe(1);

      // Trigger cleanup
      vi.useFakeTimers();
      vi.advanceTimersByTime(1100);
      system.update(16);
      vi.useRealTimers();

      // Should still be active
      expect(system.getStats().activeCount).toBe(1);
    });
  });

  describe('render()', () => {
    it('should render all active projectiles', () => {
      const config: ProjectileConfig = {
        type: ProjectileType.LASER,
        position: { x: 400, y: 300 },
        velocity: { x: 0, y: -500 },
        damage: 1,
        size: { width: 4, height: 12 },
        color: '#FF0000',
      };

      system.spawn(config);
      system.spawn(config);

      system.render(mockContext);

      // fillRect should be called for each projectile
      expect(mockContext.fillRect).toHaveBeenCalled();
    });

    it('should not render inactive projectiles', () => {
      const config: ProjectileConfig = {
        type: ProjectileType.LASER,
        position: { x: 400, y: 300 },
        velocity: { x: 0, y: -500 },
        damage: 1,
        size: { width: 4, height: 12 },
        color: '#FF0000',
      };

      const projectile = system.spawn(config);
      projectile!.active = false;

      mockContext.fillRect.mockClear();
      system.render(mockContext);

      expect(mockContext.fillRect).not.toHaveBeenCalled();
    });
  });

  describe('clear()', () => {
    it('should remove all projectiles', () => {
      const config: ProjectileConfig = {
        type: ProjectileType.LASER,
        position: { x: 400, y: 300 },
        velocity: { x: 0, y: -500 },
        damage: 1,
        size: { width: 4, height: 12 },
        color: '#FF0000',
      };

      system.spawn(config);
      system.spawn(config);
      expect(system.getStats().activeCount).toBe(2);

      system.clear();

      expect(system.getStats().activeCount).toBe(0);
    });

    it('should release all projectiles to pool', () => {
      const config: ProjectileConfig = {
        type: ProjectileType.LASER,
        position: { x: 400, y: 300 },
        velocity: { x: 0, y: -500 },
        damage: 1,
        size: { width: 4, height: 12 },
        color: '#FF0000',
      };

      system.spawn(config);
      system.spawn(config);

      const statsBeforeClear = system.getStats();
      const poolSizeBefore = statsBeforeClear.poolStats.poolSize;

      system.clear();

      const statsAfterClear = system.getStats();
      const poolSizeAfter = statsAfterClear.poolStats.poolSize;

      expect(poolSizeAfter).toBe(poolSizeBefore + 2);
    });
  });

  describe('updateContext()', () => {
    it('should update canvas dimensions', () => {
      system.updateContext({
        canvasWidth: 1024,
        canvasHeight: 768,
      });

      // Spawn off-screen projectile with new dimensions
      const config: ProjectileConfig = {
        type: ProjectileType.LASER,
        position: { x: 900, y: 300 }, // Would be on-screen with 1024 width
        velocity: { x: 0, y: -500 },
        damage: 1,
        size: { width: 4, height: 12 },
        color: '#FF0000',
      };

      const projectile = system.spawn(config);
      expect(projectile).not.toBeNull();
    });

    it('should update blocks reference', () => {
      const newBlocks = [
        new Block(BlockType.Normal, 0, 0, { x: 300, y: 50 }),
      ];

      system.updateContext({
        blocks: newBlocks,
      });

      // Collision should now work with new blocks only
      const config: ProjectileConfig = {
        type: ProjectileType.LASER,
        position: { x: 320, y: 60 },
        velocity: { x: 0, y: -500 },
        damage: 1,
        size: { width: 4, height: 12 },
        color: '#FF0000',
      };

      const hitHandler = vi.fn();
      mockEventBus.on('projectile:hit', hitHandler);

      system.spawn(config);
      system.update(16);

      expect(hitHandler).toHaveBeenCalledTimes(1);
    });

    it('should update event bus', () => {
      const newEventBus = new EventBus();
      const newHandler = vi.fn();
      newEventBus.on('projectile:spawned', newHandler);

      system.updateContext({
        eventBus: newEventBus,
      });

      const config: ProjectileConfig = {
        type: ProjectileType.LASER,
        position: { x: 400, y: 300 },
        velocity: { x: 0, y: -500 },
        damage: 1,
        size: { width: 4, height: 12 },
        color: '#FF0000',
      };

      system.spawn(config);

      expect(newHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('getStats()', () => {
    it('should return correct active count', () => {
      const config: ProjectileConfig = {
        type: ProjectileType.LASER,
        position: { x: 400, y: 300 },
        velocity: { x: 0, y: -500 },
        damage: 1,
        size: { width: 4, height: 12 },
        color: '#FF0000',
      };

      expect(system.getStats().activeCount).toBe(0);

      system.spawn(config);
      expect(system.getStats().activeCount).toBe(1);

      system.spawn(config);
      expect(system.getStats().activeCount).toBe(2);
    });

    it('should return pool stats', () => {
      const stats = system.getStats();

      expect(stats.poolStats).toBeDefined();
      expect(stats.poolStats.maxSize).toBe(20);
      expect(stats.poolStats.poolSize).toBeLessThanOrEqual(20);
    });
  });

  describe('destroy()', () => {
    it('should clear all projectiles', () => {
      const config: ProjectileConfig = {
        type: ProjectileType.LASER,
        position: { x: 400, y: 300 },
        velocity: { x: 0, y: -500 },
        damage: 1,
        size: { width: 4, height: 12 },
        color: '#FF0000',
      };

      system.spawn(config);
      expect(system.getStats().activeCount).toBe(1);

      system.destroy();

      expect(system.getStats().activeCount).toBe(0);
    });
  });
});
