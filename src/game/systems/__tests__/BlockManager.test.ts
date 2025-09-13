/**
 * Unit tests for BlockManager system
 * Tests grid layout, block creation, level loading, and combo system
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BlockManager, LevelDefinition } from '../BlockManager';
import { BlockType } from '../../../types/game.types';
import { EventBus } from '../../core/EventBus';

// Mock the Block class
vi.mock('../../entities/Block', () => {
  return {
    Block: vi.fn().mockImplementation((type, row, column, position) => {
      const block = {
        id: `block-${row}-${column}`,
        type,
        gridRow: row,
        gridColumn: column,
        position,
        isDestroyed: false,
        active: true,
        currentHitPoints: type === BlockType.Hard ? 2 : type === BlockType.Indestructible ? Infinity : 1,
        maxHitPoints: type === BlockType.Hard ? 2 : type === BlockType.Indestructible ? Infinity : 1,
        scoreValue: type === BlockType.Hard ? 200 : type === BlockType.Normal ? 100 : 0,
        update: vi.fn(),
        render: vi.fn(),
        getBounds: vi.fn(() => ({
          x: position.x,
          y: position.y,
          width: 75,
          height: 25
        })),
        getState: vi.fn(() => ({
          id: `block-${row}-${column}`,
          type,
          currentHitPoints: block.currentHitPoints,
          maxHitPoints: block.maxHitPoints,
          isDestroyed: block.isDestroyed,
          position,
          gridRow: row,
          gridColumn: column,
          active: block.active,
          scoreValue: block.scoreValue
        }))
      };
      
      block.hit = vi.fn().mockImplementation(() => {
        if (block.type === BlockType.Indestructible) {
          return { destroyed: false, score: 0 };
        }
        block.currentHitPoints--;
        if (block.currentHitPoints <= 0) {
          block.isDestroyed = true;
          block.active = false;
          return { destroyed: true, score: block.scoreValue };
        }
        return { destroyed: false, score: 0 };
      });
      
      return block;
    })
  };
});

describe('BlockManager System', () => {
  let blockManager: BlockManager;
  let eventBus: EventBus;
  let mockEventEmit: ReturnType<typeof vi.fn>;
  let mockEventOn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockEventEmit = vi.fn();
    mockEventOn = vi.fn();
    eventBus = {
      emit: mockEventEmit,
      on: mockEventOn,
      off: vi.fn()
    } as unknown as EventBus;

    blockManager = new BlockManager(eventBus);
  });

  describe('Initialization', () => {
    it('should initialize with default grid layout', () => {
      const gridLayout = blockManager.getGridLayout();

      expect(gridLayout.columns).toBe(10);
      expect(gridLayout.rows).toBe(8);
      expect(gridLayout.cellWidth).toBe(75);
      expect(gridLayout.cellHeight).toBe(25);
      expect(gridLayout.spacing).toBe(5);
      expect(gridLayout.offsetX).toBe(50);
      expect(gridLayout.offsetY).toBe(100);
    });

    it('should start with no blocks', () => {
      expect(blockManager.getBlocks()).toHaveLength(0);
      expect(blockManager.getRemainingDestructibleBlocks()).toBe(0);
    });

    it('should setup event listeners', () => {
      expect(mockEventOn).toHaveBeenCalledWith('ball:blockCollision', expect.any(Function));
    });
  });

  describe('Grid Position Calculation', () => {
    it('should calculate correct block positions', () => {
      const block = blockManager.createBlock(BlockType.Normal, 0, 0);
      expect(block.position.x).toBe(50); // offsetX
      expect(block.position.y).toBe(100); // offsetY
    });

    it('should calculate positions with spacing', () => {
      const block1 = blockManager.createBlock(BlockType.Normal, 0, 0);
      const block2 = blockManager.createBlock(BlockType.Normal, 0, 1);
      const block3 = blockManager.createBlock(BlockType.Normal, 1, 0);

      expect(block2.position.x).toBe(50 + 75 + 5); // offsetX + cellWidth + spacing
      expect(block3.position.y).toBe(100 + 25 + 5); // offsetY + cellHeight + spacing
    });

    it('should handle grid boundaries correctly', () => {
      // Valid positions
      expect(() => blockManager.createBlock(BlockType.Normal, 0, 0)).not.toThrow();
      expect(() => blockManager.createBlock(BlockType.Normal, 7, 9)).not.toThrow();

      // Invalid positions
      expect(() => blockManager.createBlock(BlockType.Normal, -1, 0)).toThrow('Invalid grid position');
      expect(() => blockManager.createBlock(BlockType.Normal, 8, 0)).toThrow('Invalid grid position');
      expect(() => blockManager.createBlock(BlockType.Normal, 0, -1)).toThrow('Invalid grid position');
      expect(() => blockManager.createBlock(BlockType.Normal, 0, 10)).toThrow('Invalid grid position');
    });
  });

  describe('Block Creation', () => {
    it('should create block with correct properties', () => {
      const block = blockManager.createBlock(BlockType.Normal, 2, 3);

      expect(block.type).toBe(BlockType.Normal);
      expect(block.gridRow).toBe(2);
      expect(block.gridColumn).toBe(3);
      expect(block.active).toBe(true);
    });

    it('should emit block created event', () => {
      blockManager.createBlock(BlockType.Hard, 1, 5);

      expect(mockEventEmit).toHaveBeenCalledWith('block:created', expect.objectContaining({
        type: BlockType.Hard,
        gridRow: 1,
        gridColumn: 5,
        position: expect.any(Object)
      }));
    });

    it('should track created blocks', () => {
      expect(blockManager.getBlocks()).toHaveLength(0);

      blockManager.createBlock(BlockType.Normal, 0, 0);
      blockManager.createBlock(BlockType.Hard, 1, 1);

      expect(blockManager.getBlocks()).toHaveLength(2);
    });
  });

  describe('Level Loading', () => {
    const testLevel: LevelDefinition = {
      name: 'Test Level',
      blocks: [
        { row: 0, column: 0, type: BlockType.Normal },
        { row: 0, column: 1, type: BlockType.Hard },
        { row: 1, column: 0, type: BlockType.Indestructible }
      ]
    };

    it('should load level from definition', () => {
      blockManager.loadLevel(testLevel);

      const blocks = blockManager.getBlocks();
      expect(blocks).toHaveLength(3);
      expect(blocks[0].type).toBe(BlockType.Normal);
      expect(blocks[1].type).toBe(BlockType.Hard);
      expect(blocks[2].type).toBe(BlockType.Indestructible);
    });

    it('should emit level loaded event', () => {
      blockManager.loadLevel(testLevel);

      expect(mockEventEmit).toHaveBeenCalledWith('level:loaded', {
        levelName: 'Test Level',
        blockCount: 3
      });
    });

    it('should clear existing blocks when loading new level', () => {
      blockManager.createBlock(BlockType.Normal, 0, 0);
      expect(blockManager.getBlocks()).toHaveLength(1);

      blockManager.loadLevel(testLevel);
      expect(blockManager.getBlocks()).toHaveLength(3); // New level blocks
    });

    it('should load default level correctly', () => {
      blockManager.loadDefaultLevel();

      const blocks = blockManager.getBlocks();
      expect(blocks.length).toBeGreaterThan(0);
      
      // Check pattern: indestructible on top, then hard, then normal
      const topRowBlocks = blocks.filter(block => block.gridRow === 0);
      expect(topRowBlocks.every(block => block.type === BlockType.Indestructible)).toBe(true);
    });
  });

  describe('Block Hit Handling', () => {
    beforeEach(() => {
      blockManager.createBlock(BlockType.Normal, 0, 0);
      blockManager.createBlock(BlockType.Hard, 0, 1);
      blockManager.createBlock(BlockType.Indestructible, 0, 2);
    });

    it('should handle normal block destruction', () => {
      const blocks = blockManager.getBlocks();
      const normalBlock = blocks.find(b => b.type === BlockType.Normal)!;
      
      const result = blockManager.handleBlockHit(normalBlock.id);

      expect(result.destroyed).toBe(true);
      expect(result.score).toBeGreaterThan(0);
      expect(result.combo).toBe(1);
    });

    it('should handle hard block hits', () => {
      const blocks = blockManager.getBlocks();
      const hardBlock = blocks.find(b => b.type === BlockType.Hard)!;
      
      // First hit - damage but don't destroy
      const result1 = blockManager.handleBlockHit(hardBlock.id);
      expect(result1.destroyed).toBe(false);
      expect(result1.score).toBe(0);

      // Second hit - destroy
      const result2 = blockManager.handleBlockHit(hardBlock.id);
      expect(result2.destroyed).toBe(true);
      expect(result2.score).toBeGreaterThan(0);
    });

    it('should handle indestructible blocks', () => {
      const blocks = blockManager.getBlocks();
      const indestructibleBlock = blocks.find(b => b.type === BlockType.Indestructible)!;
      
      const result = blockManager.handleBlockHit(indestructibleBlock.id);

      expect(result.destroyed).toBe(false);
      expect(result.score).toBe(0);
      expect(result.combo).toBe(0);
    });

    it('should not process invalid block IDs', () => {
      const result = blockManager.handleBlockHit('invalid-id');

      expect(result.destroyed).toBe(false);
      expect(result.score).toBe(0);
      expect(result.combo).toBe(0);
    });

    it('should not process already destroyed blocks', () => {
      const blocks = blockManager.getBlocks();
      const normalBlock = blocks.find(b => b.type === BlockType.Normal)!;
      
      // Destroy the block
      blockManager.handleBlockHit(normalBlock.id);
      
      // Try to hit again
      const result = blockManager.handleBlockHit(normalBlock.id);
      expect(result.destroyed).toBe(false);
      expect(result.score).toBe(0);
    });
  });

  describe('Combo System', () => {
    beforeEach(() => {
      // Create multiple destructible blocks
      blockManager.createBlock(BlockType.Normal, 0, 0);
      blockManager.createBlock(BlockType.Normal, 0, 1);
      blockManager.createBlock(BlockType.Normal, 0, 2);
    });

    it('should increment combo on consecutive hits', () => {
      const blocks = blockManager.getBlocks();

      const result1 = blockManager.handleBlockHit(blocks[0].id);
      expect(result1.combo).toBe(1);

      const result2 = blockManager.handleBlockHit(blocks[1].id);
      expect(result2.combo).toBe(2);

      const result3 = blockManager.handleBlockHit(blocks[2].id);
      expect(result3.combo).toBe(3);
    });

    it('should calculate combo bonus score', () => {
      const blocks = blockManager.getBlocks();

      const result1 = blockManager.handleBlockHit(blocks[0].id);
      const baseScore = result1.score;

      const result2 = blockManager.handleBlockHit(blocks[1].id);
      expect(result2.score).toBeGreaterThan(baseScore); // Should have combo bonus
    });

    it('should reset combo after timeout', () => {
      const blocks = blockManager.getBlocks();
      
      blockManager.handleBlockHit(blocks[0].id);
      expect(blockManager.getCombo()).toBe(1);

      // Simulate time passing
      blockManager.update(3000); // 3 seconds (> combo reset time)
      
      expect(blockManager.getCombo()).toBe(0);
    });

    it('should reset combo timer on each hit', () => {
      const blocks = blockManager.getBlocks();
      
      blockManager.handleBlockHit(blocks[0].id);
      blockManager.update(0.5); // 0.5 second (less than combo reset time)
      expect(blockManager.getCombo()).toBe(1);

      blockManager.handleBlockHit(blocks[1].id);
      blockManager.update(0.5); // Another 0.5 second, combo timer should reset after hit
      expect(blockManager.getCombo()).toBe(2);
    });
  });

  describe('Level Completion', () => {
    it('should detect level completion', () => {
      // Create level with only destructible blocks
      const level: LevelDefinition = {
        name: 'Simple Level',
        blocks: [
          { row: 0, column: 0, type: BlockType.Normal },
          { row: 0, column: 1, type: BlockType.Normal }
        ]
      };
      
      blockManager.loadLevel(level);
      const blocks = blockManager.getBlocks();

      // Destroy first block
      blockManager.handleBlockHit(blocks[0].id);
      expect(mockEventEmit).not.toHaveBeenCalledWith('level:cleared', expect.any(Object));

      // Destroy second block - should trigger level cleared
      blockManager.handleBlockHit(blocks[1].id);
      expect(mockEventEmit).toHaveBeenCalledWith('level:cleared', expect.objectContaining({
        totalScore: expect.any(Number),
        finalCombo: expect.any(Number)
      }));
    });

    it('should not complete level with indestructible blocks remaining', () => {
      const level: LevelDefinition = {
        name: 'Mixed Level',
        blocks: [
          { row: 0, column: 0, type: BlockType.Normal },
          { row: 0, column: 1, type: BlockType.Indestructible }
        ]
      };
      
      blockManager.loadLevel(level);
      const blocks = blockManager.getBlocks();
      const normalBlock = blocks.find(b => b.type === BlockType.Normal)!;

      blockManager.handleBlockHit(normalBlock.id);
      
      // Should trigger level cleared because only destructible blocks matter
      expect(mockEventEmit).toHaveBeenCalledWith('level:cleared', expect.any(Object));
    });
  });

  describe('Block Queries', () => {
    beforeEach(() => {
      blockManager.createBlock(BlockType.Normal, 0, 0);
      blockManager.createBlock(BlockType.Hard, 1, 1);
      blockManager.createBlock(BlockType.Indestructible, 2, 2);
    });

    it('should find block at specific grid position', () => {
      const block = blockManager.getBlockAt(1, 1);

      expect(block).toBeDefined();
      expect(block!.type).toBe(BlockType.Hard);
      expect(block!.gridRow).toBe(1);
      expect(block!.gridColumn).toBe(1);
    });

    it('should return undefined for empty grid position', () => {
      const block = blockManager.getBlockAt(5, 5);
      expect(block).toBeUndefined();
    });

    it('should count remaining destructible blocks correctly', () => {
      expect(blockManager.getRemainingDestructibleBlocks()).toBe(2); // Normal + Hard

      const blocks = blockManager.getBlocks();
      const normalBlock = blocks.find(b => b.type === BlockType.Normal)!;
      blockManager.handleBlockHit(normalBlock.id);

      expect(blockManager.getRemainingDestructibleBlocks()).toBe(1); // Hard only
    });

    it('should get all active blocks', () => {
      const blocks = blockManager.getBlocks();
      expect(blocks).toHaveLength(3);
      expect(blocks.every(b => b.active)).toBe(true);
    });

    it('should get block states for game state management', () => {
      const blockStates = blockManager.getBlockStates();
      
      expect(blockStates).toHaveLength(3);
      expect(blockStates[0]).toMatchObject({
        id: expect.any(String),
        type: expect.any(String),
        currentHitPoints: expect.any(Number),
        maxHitPoints: expect.any(Number),
        isDestroyed: false,
        position: expect.any(Object),
        gridRow: expect.any(Number),
        gridColumn: expect.any(Number)
      });
    });
  });

  describe('System Update and Rendering', () => {
    beforeEach(() => {
      blockManager.createBlock(BlockType.Normal, 0, 0);
      blockManager.createBlock(BlockType.Hard, 0, 1);
    });

    it('should update all blocks', () => {
      const blocks = blockManager.getBlocks();
      const deltaTime = 0.016;

      blockManager.update(deltaTime);

      blocks.forEach(block => {
        expect(block.update).toHaveBeenCalledWith(deltaTime);
      });
    });

    it('should render all active blocks', () => {
      const mockCanvas = document.createElement('canvas');
      const mockContext = mockCanvas.getContext('2d')!;
      const blocks = blockManager.getBlocks();

      blockManager.render(mockContext);

      blocks.forEach(block => {
        expect(block.render).toHaveBeenCalledWith(mockContext);
      });
    });

    it('should not render destroyed blocks', () => {
      const blocks = blockManager.getBlocks();
      const normalBlock = blocks.find(b => b.type === BlockType.Normal)!;
      
      // Destroy the block
      blockManager.handleBlockHit(normalBlock.id);
      normalBlock.active = false;
      normalBlock.isDestroyed = true;

      const mockCanvas = document.createElement('canvas');
      const mockContext = mockCanvas.getContext('2d')!;

      blockManager.render(mockContext);

      // Normal block should not be rendered, but hard block should be
      expect(normalBlock.render).not.toHaveBeenCalled();
    });
  });

  describe('Grid Layout Management', () => {
    it('should allow grid layout updates', () => {
      const newLayout = {
        offsetX: 100,
        offsetY: 150,
        spacing: 10
      };

      blockManager.setGridLayout(newLayout);
      const updatedLayout = blockManager.getGridLayout();

      expect(updatedLayout.offsetX).toBe(100);
      expect(updatedLayout.offsetY).toBe(150);
      expect(updatedLayout.spacing).toBe(10);
      // Other properties should remain unchanged
      expect(updatedLayout.columns).toBe(10);
      expect(updatedLayout.rows).toBe(8);
    });

    it('should use updated grid layout for new blocks', () => {
      blockManager.setGridLayout({ offsetX: 200, offsetY: 300 });
      
      const block = blockManager.createBlock(BlockType.Normal, 0, 0);
      expect(block.position.x).toBe(200);
      expect(block.position.y).toBe(300);
    });
  });

  describe('Cleanup', () => {
    it('should clear all blocks', () => {
      blockManager.createBlock(BlockType.Normal, 0, 0);
      blockManager.createBlock(BlockType.Hard, 0, 1);
      expect(blockManager.getBlocks()).toHaveLength(2);

      blockManager.clearAllBlocks();
      
      expect(blockManager.getBlocks()).toHaveLength(0);
      expect(blockManager.getCombo()).toBe(0);
      expect(mockEventEmit).toHaveBeenCalledWith('block:removed', expect.any(Object));
    });
  });
});