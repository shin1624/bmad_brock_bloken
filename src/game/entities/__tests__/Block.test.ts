/**
 * Unit tests for Block entity
 * Tests block types, hit points, destruction, and visual feedback
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { Block } from '../Block';
import { BlockType } from '../../../types/game.types';

describe('Block Entity', () => {
  let block: Block;
  const testPosition = { x: 100, y: 200 };
  const testRow = 2;
  const testColumn = 5;

  describe('Block Creation', () => {
    it('should create normal block with correct properties', () => {
      block = new Block(BlockType.Normal, testRow, testColumn, testPosition);

      expect(block.type).toBe(BlockType.Normal);
      expect(block.maxHitPoints).toBe(1);
      expect(block.currentHitPoints).toBe(1);
      expect(block.scoreValue).toBe(100);
      expect(block.width).toBe(75);
      expect(block.height).toBe(25);
      expect(block.color).toBe('#3B82F6');
      expect(block.gridRow).toBe(testRow);
      expect(block.gridColumn).toBe(testColumn);
      expect(block.isDestroyed).toBe(false);
      expect(block.active).toBe(true);
      expect(block.position).toEqual(testPosition);
      expect(block.velocity).toEqual({ x: 0, y: 0 });
    });

    it('should create hard block with correct properties', () => {
      block = new Block(BlockType.Hard, testRow, testColumn, testPosition);

      expect(block.type).toBe(BlockType.Hard);
      expect(block.maxHitPoints).toBe(2);
      expect(block.currentHitPoints).toBe(2);
      expect(block.scoreValue).toBe(200);
      expect(block.color).toBe('#EF4444');
      expect(block.isDestroyed).toBe(false);
    });

    it('should create indestructible block with correct properties', () => {
      block = new Block(BlockType.Indestructible, testRow, testColumn, testPosition);

      expect(block.type).toBe(BlockType.Indestructible);
      expect(block.maxHitPoints).toBe(Infinity);
      expect(block.currentHitPoints).toBe(Infinity);
      expect(block.scoreValue).toBe(0);
      expect(block.color).toBe('#6B7280');
      expect(block.isDestroyed).toBe(false);
    });

    it('should have unique ID for each block', () => {
      const block1 = new Block(BlockType.Normal, 0, 0, { x: 0, y: 0 });
      const block2 = new Block(BlockType.Normal, 0, 1, { x: 0, y: 0 });

      expect(block1.id).not.toBe(block2.id);
      expect(block1.id.length).toBeGreaterThan(0);
      expect(block2.id.length).toBeGreaterThan(0);
    });
  });

  describe('Block Hit System', () => {
    describe('Normal Block', () => {
      beforeEach(() => {
        block = new Block(BlockType.Normal, testRow, testColumn, testPosition);
      });

      it('should destroy normal block on first hit', () => {
        const result = block.hit();

        expect(result.destroyed).toBe(true);
        expect(result.score).toBe(100);
        expect(block.currentHitPoints).toBe(0);
        expect(block.isDestroyed).toBe(true);
        expect(block.active).toBe(false);
      });

      it('should not affect already destroyed block', () => {
        block.hit(); // First hit destroys it
        const result = block.hit(); // Second hit should do nothing

        expect(result.destroyed).toBe(false);
        expect(result.score).toBe(0);
        expect(block.currentHitPoints).toBe(0);
        expect(block.isDestroyed).toBe(true);
      });
    });

    describe('Hard Block', () => {
      beforeEach(() => {
        block = new Block(BlockType.Hard, testRow, testColumn, testPosition);
      });

      it('should not destroy hard block on first hit', () => {
        const result = block.hit();

        expect(result.destroyed).toBe(false);
        expect(result.score).toBe(0);
        expect(block.currentHitPoints).toBe(1);
        expect(block.isDestroyed).toBe(false);
        expect(block.active).toBe(true);
      });

      it('should destroy hard block on second hit', () => {
        block.hit(); // First hit
        const result = block.hit(); // Second hit

        expect(result.destroyed).toBe(true);
        expect(result.score).toBe(200);
        expect(block.currentHitPoints).toBe(0);
        expect(block.isDestroyed).toBe(true);
        expect(block.active).toBe(false);
      });

      it('should track hit points correctly', () => {
        expect(block.currentHitPoints).toBe(2);
        
        block.hit();
        expect(block.currentHitPoints).toBe(1);
        
        block.hit();
        expect(block.currentHitPoints).toBe(0);
      });
    });

    describe('Indestructible Block', () => {
      beforeEach(() => {
        block = new Block(BlockType.Indestructible, testRow, testColumn, testPosition);
      });

      it('should never destroy indestructible block', () => {
        const result1 = block.hit();
        const result2 = block.hit();
        const result3 = block.hit();

        expect(result1.destroyed).toBe(false);
        expect(result1.score).toBe(0);
        expect(result2.destroyed).toBe(false);
        expect(result2.score).toBe(0);
        expect(result3.destroyed).toBe(false);
        expect(result3.score).toBe(0);
        
        expect(block.currentHitPoints).toBe(Infinity);
        expect(block.isDestroyed).toBe(false);
        expect(block.active).toBe(true);
      });
    });
  });

  describe('Block Bounds', () => {
    beforeEach(() => {
      block = new Block(BlockType.Normal, testRow, testColumn, testPosition);
    });

    it('should return correct bounds for collision detection', () => {
      const bounds = block.getBounds();

      expect(bounds.x).toBe(testPosition.x);
      expect(bounds.y).toBe(testPosition.y);
      expect(bounds.width).toBe(75);
      expect(bounds.height).toBe(25);
    });

    it('should update bounds when position changes', () => {
      const newPosition = { x: 300, y: 400 };
      block.position = newPosition;
      
      const bounds = block.getBounds();
      expect(bounds.x).toBe(newPosition.x);
      expect(bounds.y).toBe(newPosition.y);
    });
  });

  describe('Block State Management', () => {
    beforeEach(() => {
      block = new Block(BlockType.Hard, testRow, testColumn, testPosition);
    });

    it('should return correct state object', () => {
      const state = block.getState();

      expect(state.id).toBe(block.id);
      expect(state.type).toBe(BlockType.Hard);
      expect(state.currentHitPoints).toBe(2);
      expect(state.maxHitPoints).toBe(2);
      expect(state.isDestroyed).toBe(false);
      expect(state.position).toEqual(testPosition);
      expect(state.gridRow).toBe(testRow);
      expect(state.gridColumn).toBe(testColumn);
    });

    it('should reflect state changes after hit', () => {
      block.hit(); // Damage the block
      const state = block.getState();

      expect(state.currentHitPoints).toBe(1);
      expect(state.isDestroyed).toBe(false);
    });

    it('should reflect destroyed state', () => {
      block.hit(); // First hit
      block.hit(); // Second hit - destroy
      const state = block.getState();

      expect(state.currentHitPoints).toBe(0);
      expect(state.isDestroyed).toBe(true);
    });
  });

  describe('Block Update Method', () => {
    beforeEach(() => {
      block = new Block(BlockType.Normal, testRow, testColumn, testPosition);
    });

    it('should handle update calls without errors', () => {
      // Blocks are static, so update shouldn't change anything
      const originalPosition = { ...block.position };
      const originalVelocity = { ...block.velocity };

      block.update(0.016); // 16ms delta time

      expect(block.position).toEqual(originalPosition);
      expect(block.velocity).toEqual(originalVelocity);
    });
  });

  describe('Block Configuration', () => {
    it('should have correct configuration for all block types', () => {
      const configs = Block.CONFIGURATIONS;

      expect(configs[BlockType.Normal]).toEqual({
        type: BlockType.Normal,
        maxHitPoints: 1,
        scoreValue: 100,
        color: '#3B82F6',
        width: 75,
        height: 25
      });

      expect(configs[BlockType.Hard]).toEqual({
        type: BlockType.Hard,
        maxHitPoints: 2,
        scoreValue: 200,
        color: '#EF4444',
        width: 75,
        height: 25
      });

      expect(configs[BlockType.Indestructible]).toEqual({
        type: BlockType.Indestructible,
        maxHitPoints: Infinity,
        scoreValue: 0,
        color: '#6B7280',
        width: 75,
        height: 25
      });
    });

    it('should use configuration values in block creation', () => {
      const normalBlock = new Block(BlockType.Normal, 0, 0, { x: 0, y: 0 });
      const config = Block.CONFIGURATIONS[BlockType.Normal];

      expect(normalBlock.maxHitPoints).toBe(config.maxHitPoints);
      expect(normalBlock.scoreValue).toBe(config.scoreValue);
      expect(normalBlock.color).toBe(config.color);
      expect(normalBlock.width).toBe(config.width);
      expect(normalBlock.height).toBe(config.height);
    });
  });

  describe('Block Rendering', () => {
    let mockCanvas: HTMLCanvasElement;
    let mockContext: CanvasRenderingContext2D;

    beforeEach(() => {
      mockCanvas = document.createElement('canvas');
      mockContext = mockCanvas.getContext('2d')!;
      
      // Mock context methods
      mockContext.fillRect = vi.fn();
      mockContext.strokeRect = vi.fn();
      mockContext.fillText = vi.fn();
      mockContext.save = vi.fn();
      mockContext.restore = vi.fn();
      
      block = new Block(BlockType.Normal, testRow, testColumn, testPosition);
    });

    it('should not render destroyed blocks', () => {
      block.hit(); // Destroy the block
      block.render(mockContext);

      expect(mockContext.fillRect).not.toHaveBeenCalled();
      expect(mockContext.strokeRect).not.toHaveBeenCalled();
    });

    it('should render active blocks', () => {
      block.render(mockContext);

      expect(mockContext.fillRect).toHaveBeenCalledWith(
        testPosition.x,
        testPosition.y,
        75,
        25
      );
      expect(mockContext.strokeRect).toHaveBeenCalledWith(
        testPosition.x,
        testPosition.y,
        75,
        25
      );
    });

    it('should render hit point indicator for hard blocks', () => {
      const hardBlock = new Block(BlockType.Hard, testRow, testColumn, testPosition);
      hardBlock.render(mockContext);

      expect(mockContext.fillText).toHaveBeenCalledWith(
        '2',
        testPosition.x + 37.5, // center X
        testPosition.y + 12.5   // center Y
      );
    });

    it('should update hit point indicator after damage', () => {
      const hardBlock = new Block(BlockType.Hard, testRow, testColumn, testPosition);
      hardBlock.hit(); // Reduce to 1 HP
      hardBlock.render(mockContext);

      expect(mockContext.fillText).toHaveBeenCalledWith('1', expect.any(Number), expect.any(Number));
    });
  });
});