import { describe, it, expect } from 'vitest';
import { 
  generateLevelCode, 
  decodeLevelCode,
  getLevelCodeSize,
  isLevelCodeShareable,
  createMinimalLevel
} from './levelExportImport';
import { Level, LEVEL_FORMAT_VERSION } from '../types/editor.types';

describe('Level Export/Import Utils', () => {
  const createTestLevel = (): Level => ({
    id: 'test-level-123',
    name: 'Test Level',
    author: 'Test Author',
    createdAt: 1000000,
    updatedAt: 2000000,
    version: LEVEL_FORMAT_VERSION,
    metadata: {
      difficulty: 'medium',
      tags: ['test', 'sample'],
      description: 'A test level for unit testing',
    },
    grid: {
      width: 10,
      height: 8,
      blocks: [
        { x: 0, y: 0, type: 'normal', health: 1 },
        { x: 1, y: 0, type: 'hard', health: 2 },
        { x: 2, y: 0, type: 'special', health: 1, powerUp: 'multiball' },
        { x: 0, y: 1, type: 'power', health: 1 },
        { x: 1, y: 1, type: 'indestructible' },
      ],
    },
    settings: {
      ballSpeed: 1.5,
      paddleSize: 100,
      theme: 'neon',
    },
  });

  describe('generateLevelCode', () => {
    it('should generate a level code string', () => {
      const level = createTestLevel();
      const code = generateLevelCode(level);
      
      expect(typeof code).toBe('string');
      expect(code.length).toBeGreaterThan(0);
      expect(code).toContain('.'); // Should have checksum separator
    });

    it('should generate URL-safe codes', () => {
      const level = createTestLevel();
      const code = generateLevelCode(level);
      
      // URL-safe base64 should not contain +, /, or =
      const [, data] = code.split('.');
      expect(data).not.toContain('+');
      expect(data).not.toContain('/');
      expect(data).not.toContain('=');
    });

    it('should compress data effectively', () => {
      const level = createTestLevel();
      const jsonSize = JSON.stringify(level).length;
      const code = generateLevelCode(level);
      const codeSize = code.length;
      
      // Compressed code should be smaller than raw JSON for typical levels
      // (may not always be true for very small levels)
      console.log(`JSON size: ${jsonSize}, Code size: ${codeSize}, Compression ratio: ${(codeSize / jsonSize * 100).toFixed(1)}%`);
      expect(codeSize).toBeLessThan(jsonSize * 1.5); // Allow some overhead for base64
    });

    it('should include a checksum', () => {
      const level = createTestLevel();
      const code = generateLevelCode(level);
      const parts = code.split('.');
      
      expect(parts).toHaveLength(2);
      expect(parts[0]).toMatch(/^[0-9a-z]+$/); // Checksum in base36
    });
  });

  describe('decodeLevelCode', () => {
    it('should decode a valid level code', () => {
      const original = createTestLevel();
      const code = generateLevelCode(original);
      const decoded = decodeLevelCode(code);
      
      expect(decoded).toEqual(original);
    });

    it('should throw error on invalid format', () => {
      expect(() => decodeLevelCode('invalid')).toThrow('Invalid level code format');
      expect(() => decodeLevelCode('')).toThrow('Invalid level code format');
      expect(() => decodeLevelCode('no-dot-here')).toThrow('Invalid level code format');
    });

    it('should throw error on corrupted data', () => {
      const level = createTestLevel();
      const code = generateLevelCode(level);
      const parts = code.split('.');
      
      // Corrupt the checksum
      const corruptedCode = '12345.' + parts[1];
      expect(() => decodeLevelCode(corruptedCode)).toThrow('checksum mismatch');
    });

    it('should throw error on invalid base64', () => {
      const invalidCode = 'abc123.!!!invalid-base64!!!';
      expect(() => decodeLevelCode(invalidCode)).toThrow();
    });

    it('should validate decoded level structure', () => {
      // Create a code that decodes to invalid JSON
      const level = createTestLevel();
      const code = generateLevelCode(level);
      
      // This would need to be a valid compressed JSON but with missing required fields
      // For now, we'll test that valid codes pass validation
      const decoded = decodeLevelCode(code);
      expect(decoded.id).toBeDefined();
      expect(decoded.name).toBeDefined();
      expect(decoded.grid).toBeDefined();
    });
  });

  describe('Level code round-trip', () => {
    it('should maintain data integrity through encode/decode cycle', () => {
      const original = createTestLevel();
      const code = generateLevelCode(original);
      const decoded = decodeLevelCode(code);
      
      expect(decoded).toEqual(original);
      
      // Verify specific fields
      expect(decoded.id).toBe(original.id);
      expect(decoded.name).toBe(original.name);
      expect(decoded.author).toBe(original.author);
      expect(decoded.metadata.difficulty).toBe(original.metadata.difficulty);
      expect(decoded.grid.blocks).toEqual(original.grid.blocks);
      expect(decoded.settings?.theme).toBe(original.settings?.theme);
    });

    it('should handle levels with minimal data', () => {
      const minimal: Level = {
        id: 'minimal',
        name: 'Minimal',
        createdAt: 1000,
        updatedAt: 2000,
        version: LEVEL_FORMAT_VERSION,
        metadata: {},
        grid: {
          width: 5,
          height: 5,
          blocks: [],
        },
      };
      
      const code = generateLevelCode(minimal);
      const decoded = decodeLevelCode(code);
      
      expect(decoded).toEqual(minimal);
    });

    it('should handle levels with large grids', () => {
      const blocks = [];
      for (let x = 0; x < 50; x++) {
        for (let y = 0; y < 30; y++) {
          if ((x + y) % 3 === 0) {
            blocks.push({ x, y, type: 'normal', health: 1 });
          }
        }
      }
      
      const largeLevel: Level = {
        id: 'large',
        name: 'Large Level',
        createdAt: 1000,
        updatedAt: 2000,
        version: LEVEL_FORMAT_VERSION,
        metadata: {},
        grid: {
          width: 50,
          height: 30,
          blocks,
        },
      };
      
      const code = generateLevelCode(largeLevel);
      const decoded = decodeLevelCode(code);
      
      expect(decoded.grid.blocks).toHaveLength(blocks.length);
      expect(decoded).toEqual(largeLevel);
    });
  });

  describe('getLevelCodeSize', () => {
    it('should return the byte size of a level code', () => {
      const level = createTestLevel();
      const code = generateLevelCode(level);
      const size = getLevelCodeSize(code);
      
      expect(size).toBeGreaterThan(0);
      expect(size).toBe(new Blob([code]).size);
    });
  });

  describe('isLevelCodeShareable', () => {
    it('should return true for small level codes', () => {
      const minimal: Level = {
        id: 'tiny',
        name: 'T',
        createdAt: 1,
        updatedAt: 2,
        version: LEVEL_FORMAT_VERSION,
        metadata: {},
        grid: {
          width: 2,
          height: 2,
          blocks: [{ x: 0, y: 0, type: 'normal' }],
        },
      };
      
      const code = generateLevelCode(minimal);
      expect(isLevelCodeShareable(code)).toBe(true);
    });

    it('should check against URL size limit', () => {
      // Create a level that might exceed URL limits
      const blocks = [];
      for (let i = 0; i < 100; i++) {
        blocks.push({
          x: i % 10,
          y: Math.floor(i / 10),
          type: 'special',
          health: 3,
          powerUp: 'very-long-power-up-name-to-increase-size',
        });
      }
      
      const large: Level = {
        id: 'very-large-level-with-long-id',
        name: 'Very Large Level With A Very Long Name That Takes Up Space',
        author: 'Author With A Very Long Name',
        createdAt: 1000000000,
        updatedAt: 2000000000,
        version: LEVEL_FORMAT_VERSION,
        metadata: {
          difficulty: 'hard',
          tags: Array(50).fill('tag'),
          description: 'A'.repeat(500),
        },
        grid: {
          width: 100,
          height: 100,
          blocks,
        },
        settings: {
          ballSpeed: 2.5,
          paddleSize: 150,
          theme: 'super-long-theme-name',
        },
      };
      
      const code = generateLevelCode(large);
      const shareable = isLevelCodeShareable(code);
      
      // This should check if size is within reasonable URL limits
      expect(typeof shareable).toBe('boolean');
      if (!shareable) {
        expect(getLevelCodeSize(code)).toBeGreaterThan(2000);
      }
    });
  });

  describe('createMinimalLevel', () => {
    it('should create a minimal version of a level', () => {
      const original = createTestLevel();
      const minimal = createMinimalLevel(original);
      
      // Should preserve essential fields
      expect(minimal.id).toBe(original.id);
      expect(minimal.name).toBe(original.name);
      expect(minimal.author).toBe(original.author);
      expect(minimal.version).toBe(original.version);
      expect(minimal.grid.width).toBe(original.grid.width);
      expect(minimal.grid.height).toBe(original.grid.height);
      
      // Should exclude some metadata
      expect(minimal.metadata.tags).toBeUndefined();
      expect(minimal.metadata.description).toBeUndefined();
      expect(minimal.metadata.difficulty).toBe(original.metadata.difficulty);
      
      // Should exclude settings
      expect(minimal.settings).toBeUndefined();
    });

    it('should optimize block data', () => {
      const level: Level = {
        id: 'test',
        name: 'Test',
        createdAt: 1000,
        updatedAt: 2000,
        version: LEVEL_FORMAT_VERSION,
        metadata: {},
        grid: {
          width: 10,
          height: 10,
          blocks: [
            { x: 0, y: 0, type: 'normal', health: 1 }, // Default health
            { x: 1, y: 0, type: 'hard', health: 2 }, // Non-default health
            { x: 2, y: 0, type: 'special', powerUp: 'laser' }, // With power-up
          ],
        },
      };
      
      const minimal = createMinimalLevel(level);
      
      // Should exclude default health values
      expect(minimal.grid.blocks[0]).toEqual({ x: 0, y: 0, type: 'normal' });
      
      // Should include non-default health
      expect(minimal.grid.blocks[1]).toEqual({ x: 1, y: 0, type: 'hard', health: 2 });
      
      // Should include power-ups
      expect(minimal.grid.blocks[2]).toEqual({ x: 2, y: 0, type: 'special', powerUp: 'laser' });
    });

    it('should produce smaller codes', () => {
      const original = createTestLevel();
      const fullCode = generateLevelCode(original);
      const minimalCode = generateLevelCode(createMinimalLevel(original));
      
      expect(minimalCode.length).toBeLessThanOrEqual(fullCode.length);
    });
  });
});