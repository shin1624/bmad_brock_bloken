import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LevelService } from './LevelService';
import { LEVEL_FORMAT_VERSION } from '../types/editor.types';

describe('LevelService JSON Operations', () => {
  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('exportToJSON', () => {
    it('should export a LevelRecord to JSON format', () => {
      const levelRecord = {
        id: 'test-123',
        name: 'Test Level',
        rows: 10,
        cols: 15,
        cellSize: 32,
        blocks: [
          { type: 'normal' as const, x: 0, y: 0, durability: 1, points: 10 },
          { type: 'hard' as const, x: 1, y: 1, durability: 2, points: 20 },
        ],
        createdAt: 1000000,
        updatedAt: 2000000,
      };

      const json = LevelService.exportToJSON(levelRecord);
      const parsed = JSON.parse(json);

      expect(parsed.id).toBe('test-123');
      expect(parsed.name).toBe('Test Level');
      expect(parsed.version).toBe(LEVEL_FORMAT_VERSION);
      expect(parsed.grid.width).toBe(15);
      expect(parsed.grid.height).toBe(10);
      expect(parsed.grid.blocks).toHaveLength(2);
      expect(parsed.grid.blocks[0]).toEqual({
        x: 0,
        y: 0,
        type: 'normal',
        health: 1,
      });
      expect(parsed.grid.blocks[1]).toEqual({
        x: 1,
        y: 1,
        type: 'hard',
        health: 2,
      });
      expect(parsed.createdAt).toBe(1000000);
      expect(parsed.updatedAt).toBe(2000000);
    });

    it('should export a Level to JSON format', () => {
      const level = {
        id: 'level-456',
        name: 'Custom Level',
        author: 'Test Author',
        createdAt: 3000000,
        updatedAt: 4000000,
        version: LEVEL_FORMAT_VERSION,
        metadata: {
          difficulty: 'medium' as const,
          tags: ['puzzle', 'challenging'],
          description: 'A custom test level',
        },
        grid: {
          width: 20,
          height: 30,
          blocks: [
            { x: 5, y: 10, type: 'special', health: 3, powerUp: 'multiball' },
          ],
        },
        settings: {
          ballSpeed: 1.5,
          paddleSize: 100,
          theme: 'neon',
        },
      };

      const json = LevelService.exportToJSON(level);
      const parsed = JSON.parse(json);

      expect(parsed.id).toBe('level-456');
      expect(parsed.name).toBe('Custom Level');
      expect(parsed.author).toBe('Test Author');
      expect(parsed.version).toBe(LEVEL_FORMAT_VERSION);
      expect(parsed.metadata.difficulty).toBe('medium');
      expect(parsed.metadata.tags).toEqual(['puzzle', 'challenging']);
      expect(parsed.metadata.description).toBe('A custom test level');
      expect(parsed.grid.width).toBe(20);
      expect(parsed.grid.height).toBe(30);
      expect(parsed.grid.blocks[0].powerUp).toBe('multiball');
      expect(parsed.settings?.ballSpeed).toBe(1.5);
      expect(parsed.settings?.paddleSize).toBe(100);
      expect(parsed.settings?.theme).toBe('neon');
    });

    it('should format JSON with proper indentation', () => {
      const level = {
        id: 'test',
        name: 'Test',
        createdAt: 1000,
        updatedAt: 2000,
        version: LEVEL_FORMAT_VERSION,
        metadata: {},
        grid: { width: 1, height: 1, blocks: [] },
      };

      const json = LevelService.exportToJSON(level);
      
      // Check for 2-space indentation
      expect(json).toContain('  "id": "test"');
      expect(json).toContain('  "grid": {');
    });
  });

  describe('importFromJSON', () => {
    it('should import a valid JSON level', () => {
      const json = JSON.stringify({
        id: 'import-test',
        name: 'Imported Level',
        author: 'Importer',
        createdAt: 5000000,
        updatedAt: 6000000,
        version: LEVEL_FORMAT_VERSION,
        metadata: {
          difficulty: 'hard',
          tags: ['imported'],
          description: 'Test import',
        },
        grid: {
          width: 25,
          height: 35,
          blocks: [
            { x: 2, y: 3, type: 'power', health: 1, powerUp: 'laser' },
          ],
        },
        settings: {
          ballSpeed: 2,
          paddleSize: 80,
          theme: 'retro',
        },
      });

      const level = LevelService.importFromJSON(json);

      expect(level.id).toBe('import-test');
      expect(level.name).toBe('Imported Level');
      expect(level.author).toBe('Importer');
      expect(level.version).toBe(LEVEL_FORMAT_VERSION);
      expect(level.metadata.difficulty).toBe('hard');
      expect(level.metadata.tags).toEqual(['imported']);
      expect(level.grid.width).toBe(25);
      expect(level.grid.height).toBe(35);
      expect(level.grid.blocks).toHaveLength(1);
      expect(level.settings?.theme).toBe('retro');
    });

    it('should handle missing optional fields', () => {
      const json = JSON.stringify({
        id: 'minimal',
        name: 'Minimal Level',
        version: LEVEL_FORMAT_VERSION,
        grid: {
          width: 10,
          height: 10,
          blocks: [],
        },
      });

      const level = LevelService.importFromJSON(json);

      expect(level.id).toBe('minimal');
      expect(level.name).toBe('Minimal Level');
      expect(level.author).toBeUndefined();
      expect(level.metadata.difficulty).toBeUndefined();
      expect(level.metadata.tags).toEqual([]);
      expect(level.settings).toBeUndefined();
    });

    it('should throw error on invalid JSON', () => {
      expect(() => {
        LevelService.importFromJSON('not a json');
      }).toThrow('Invalid JSON format');
    });

    it('should throw error on missing required fields', () => {
      expect(() => {
        LevelService.importFromJSON('{}');
      }).toThrow('Missing or invalid level ID');

      expect(() => {
        LevelService.importFromJSON('{"id": "test"}');
      }).toThrow('Missing or invalid level name');

      expect(() => {
        LevelService.importFromJSON('{"id": "test", "name": "Test"}');
      }).toThrow('Missing or invalid version');

      expect(() => {
        LevelService.importFromJSON(JSON.stringify({
          id: 'test',
          name: 'Test',
          version: LEVEL_FORMAT_VERSION,
        }));
      }).toThrow('Missing or invalid grid data');
    });

    it('should throw error on incompatible version', () => {
      const json = JSON.stringify({
        id: 'test',
        name: 'Test',
        version: '2.0.0', // Different major version
        grid: { width: 10, height: 10, blocks: [] },
      });

      expect(() => {
        LevelService.importFromJSON(json);
      }).toThrow('Incompatible version');
    });

    it('should throw error on invalid block data', () => {
      const json = JSON.stringify({
        id: 'test',
        name: 'Test',
        version: LEVEL_FORMAT_VERSION,
        grid: {
          width: 10,
          height: 10,
          blocks: [
            { x: 0 }, // Missing y and type
          ],
        },
      });

      expect(() => {
        LevelService.importFromJSON(json);
      }).toThrow('Invalid block properties');
    });

    it('should handle version compatibility for minor/patch versions', () => {
      const json = JSON.stringify({
        id: 'test',
        name: 'Test',
        version: '1.0.1', // Same major, different patch
        grid: { width: 10, height: 10, blocks: [] },
      });

      const level = LevelService.importFromJSON(json);
      expect(level.version).toBe('1.0.1');
    });
  });

  describe('JSON round-trip', () => {
    it('should maintain data integrity through export and import', () => {
      const original = {
        id: 'round-trip',
        name: 'Round Trip Test',
        author: 'Tester',
        createdAt: 7000000,
        updatedAt: 8000000,
        version: LEVEL_FORMAT_VERSION,
        metadata: {
          difficulty: 'easy' as const,
          tags: ['test', 'round-trip'],
          description: 'Testing round trip',
        },
        grid: {
          width: 50,
          height: 40,
          blocks: [
            { x: 10, y: 20, type: 'normal', health: 1 },
            { x: 15, y: 25, type: 'hard', health: 2, powerUp: 'sticky' },
          ],
        },
        settings: {
          ballSpeed: 1.2,
          paddleSize: 90,
          theme: 'classic',
        },
      };

      const json = LevelService.exportToJSON(original);
      const imported = LevelService.importFromJSON(json);

      expect(imported).toEqual(original);
    });
  });
});