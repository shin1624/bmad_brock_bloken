import { describe, it, expect, beforeAll } from 'vitest';
import {
  validateLevel,
  validateBlockType,
  getValidBlockTypes,
  getValidPowerUps,
  quickValidateLevel,
} from './levelValidation';
import { LEVEL_FORMAT_VERSION } from '../types/editor.types';

// Mock DOMPurify for Node environment
beforeAll(() => {
  // @ts-ignore
  global.window = {};
});

describe('Level Validation', () => {
  const createValidLevel = () => ({
    id: 'test-123',
    name: 'Test Level',
    author: 'Author',
    createdAt: 1000000,
    updatedAt: 2000000,
    version: LEVEL_FORMAT_VERSION,
    metadata: {
      difficulty: 'medium',
      tags: ['test'],
      description: 'A test level',
    },
    grid: {
      width: 10,
      height: 10,
      blocks: [
        { x: 0, y: 0, type: 'normal', health: 1 },
        { x: 1, y: 1, type: 'hard', health: 2 },
        { x: 2, y: 2, type: 'special', powerUp: 'multiball' },
      ],
    },
    settings: {
      ballSpeed: 1.5,
      paddleSize: 100,
      theme: 'neon',
    },
  });

  describe('validateLevel', () => {
    it('should validate a correct level', () => {
      const level = createValidLevel();
      const result = validateLevel(level);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toMatchObject(level);
      }
    });

    it('should reject level without required fields', () => {
      const result = validateLevel({});
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors.some(e => e.field === 'id')).toBe(true);
      }
    });

    it('should reject level with invalid ID', () => {
      const level = createValidLevel();
      level.id = '';
      
      const result = validateLevel(level);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some(e => e.field === 'id')).toBe(true);
      }
    });

    it('should reject level with invalid block type', () => {
      const level = createValidLevel();
      level.grid.blocks[0].type = 'invalid_type';
      
      const result = validateLevel(level);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some(e => e.message.includes('Invalid block type'))).toBe(true);
      }
    });

    it('should reject level with invalid power-up', () => {
      const level = createValidLevel();
      // @ts-ignore
      level.grid.blocks[2].powerUp = 'invalid_powerup';
      
      const result = validateLevel(level);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some(e => e.message.includes('Invalid power-up'))).toBe(true);
      }
    });

    it('should reject level with out-of-bounds blocks', () => {
      const level = createValidLevel();
      level.grid.blocks.push({ x: 10, y: 5, type: 'normal' }); // x is out of bounds
      
      const result = validateLevel(level);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some(e => e.message.includes('out of bounds'))).toBe(true);
      }
    });

    it('should reject level with negative block positions', () => {
      const level = createValidLevel();
      level.grid.blocks.push({ x: -1, y: 5, type: 'normal' });
      
      const result = validateLevel(level);
      expect(result.success).toBe(false);
    });

    it('should reject level with duplicate blocks', () => {
      const level = createValidLevel();
      level.grid.blocks.push({ x: 0, y: 0, type: 'hard' }); // Duplicate position
      
      const result = validateLevel(level);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some(e => e.message.includes('Duplicate block'))).toBe(true);
      }
    });

    it('should reject level with no blocks', () => {
      const level = createValidLevel();
      level.grid.blocks = [];
      
      const result = validateLevel(level);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some(e => e.message.includes('at least one block'))).toBe(true);
      }
    });

    it('should reject level with too many blocks', () => {
      const level = createValidLevel();
      level.grid.width = 2;
      level.grid.height = 2;
      // Add 5 blocks to a 2x2 grid (max should be 4)
      level.grid.blocks = [
        { x: 0, y: 0, type: 'normal' },
        { x: 0, y: 1, type: 'normal' },
        { x: 1, y: 0, type: 'normal' },
        { x: 1, y: 1, type: 'normal' },
        { x: 0, y: 0, type: 'hard' }, // This makes it too many
      ];
      
      const result = validateLevel(level);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some(e => e.message.includes('Too many blocks'))).toBe(true);
      }
    });

    it('should reject incompatible version', () => {
      const level = createValidLevel();
      level.version = '2.0.0'; // Different major version
      
      const result = validateLevel(level);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some(e => e.message.includes('Incompatible version'))).toBe(true);
      }
    });

    it('should accept compatible minor version', () => {
      const level = createValidLevel();
      level.version = '1.0.1'; // Same major, different patch
      
      const result = validateLevel(level);
      expect(result.success).toBe(true);
    });

    it('should reject grid dimensions outside bounds', () => {
      const level = createValidLevel();
      level.grid.width = 101; // Max is 100
      
      const result = validateLevel(level);
      expect(result.success).toBe(false);
    });

    it('should reject grid dimensions too small', () => {
      const level = createValidLevel();
      level.grid.width = 4; // Min is 5
      
      const result = validateLevel(level);
      expect(result.success).toBe(false);
    });

    it('should validate optional fields', () => {
      const level = createValidLevel();
      delete level.author;
      delete level.metadata.difficulty;
      delete level.settings;
      
      const result = validateLevel(level);
      expect(result.success).toBe(true);
    });

    it('should reject invalid difficulty', () => {
      const level = createValidLevel();
      // @ts-ignore
      level.metadata.difficulty = 'extreme';
      
      const result = validateLevel(level);
      expect(result.success).toBe(false);
    });

    it('should reject invalid ball speed', () => {
      const level = createValidLevel();
      level.settings!.ballSpeed = 10; // Max is 5
      
      const result = validateLevel(level);
      expect(result.success).toBe(false);
    });

    it('should reject invalid paddle size', () => {
      const level = createValidLevel();
      level.settings!.paddleSize = 300; // Max is 200
      
      const result = validateLevel(level);
      expect(result.success).toBe(false);
    });

    it('should sanitize XSS attempts in text fields', () => {
      const level = createValidLevel();
      level.name = '<script>alert("XSS")</script>Test Level';
      level.author = '<img src=x onerror="alert(1)">Author';
      level.metadata.description = '<div onclick="evil()">Description</div>';
      
      const result = validateLevel(level);
      expect(result.success).toBe(true);
      if (result.success) {
        // Should strip all HTML tags
        expect(result.data.name).toBe('Test Level');
        expect(result.data.author).toBe('Author');
        expect(result.data.metadata.description).toBe('Description');
      }
    });

    it('should sanitize tags array', () => {
      const level = createValidLevel();
      level.metadata.tags = ['<script>evil</script>tag1', 'normal-tag'];
      
      const result = validateLevel(level);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.metadata.tags).toEqual(['tag1', 'normal-tag']);
      }
    });

    it('should handle long text fields', () => {
      const level = createValidLevel();
      level.name = 'a'.repeat(101); // Max is 100
      
      const result = validateLevel(level);
      expect(result.success).toBe(false);
    });

    it('should handle long description', () => {
      const level = createValidLevel();
      level.metadata.description = 'a'.repeat(501); // Max is 500
      
      const result = validateLevel(level);
      expect(result.success).toBe(false);
    });
  });

  describe('validateBlockType', () => {
    it('should validate correct block types', () => {
      expect(validateBlockType('normal')).toBe(true);
      expect(validateBlockType('hard')).toBe(true);
      expect(validateBlockType('special')).toBe(true);
      expect(validateBlockType('power')).toBe(true);
      expect(validateBlockType('indestructible')).toBe(true);
    });

    it('should reject invalid block types', () => {
      expect(validateBlockType('invalid')).toBe(false);
      expect(validateBlockType('')).toBe(false);
      expect(validateBlockType('NORMAL')).toBe(false); // Case sensitive
    });
  });

  describe('getValidBlockTypes', () => {
    it('should return list of valid block types', () => {
      const types = getValidBlockTypes();
      expect(types).toContain('normal');
      expect(types).toContain('hard');
      expect(types).toContain('special');
      expect(types.length).toBeGreaterThan(0);
    });
  });

  describe('getValidPowerUps', () => {
    it('should return list of valid power-ups', () => {
      const powerUps = getValidPowerUps();
      expect(powerUps).toContain('multiball');
      expect(powerUps).toContain('laser');
      expect(powerUps).toContain('sticky');
      expect(powerUps.length).toBeGreaterThan(0);
    });
  });

  describe('quickValidateLevel', () => {
    it('should quickly validate correct level', () => {
      const level = createValidLevel();
      expect(quickValidateLevel(level)).toBe(true);
    });

    it('should reject null or undefined', () => {
      expect(quickValidateLevel(null)).toBe(false);
      expect(quickValidateLevel(undefined)).toBe(false);
    });

    it('should reject non-object', () => {
      expect(quickValidateLevel('string')).toBe(false);
      expect(quickValidateLevel(123)).toBe(false);
    });

    it('should reject missing essential fields', () => {
      expect(quickValidateLevel({})).toBe(false);
      expect(quickValidateLevel({ id: 'test' })).toBe(false);
      expect(quickValidateLevel({ id: 'test', name: 'Test' })).toBe(false);
    });

    it('should reject invalid grid structure', () => {
      const level = {
        id: 'test',
        name: 'Test',
        grid: {},
      };
      expect(quickValidateLevel(level)).toBe(false);
    });

    it('should reject extreme dimensions', () => {
      const level = {
        id: 'test',
        name: 'Test',
        grid: {
          width: 10000,
          height: 10000,
          blocks: [],
        },
      };
      expect(quickValidateLevel(level)).toBe(false);
    });

    it('should accept minimal valid level', () => {
      const level = {
        id: 'test',
        name: 'Test',
        grid: {
          width: 10,
          height: 10,
          blocks: [],
        },
      };
      expect(quickValidateLevel(level)).toBe(true);
    });
  });
});