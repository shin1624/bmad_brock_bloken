import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { LevelService } from "../LevelService";
import type {
  LevelRecord,
  SaveLevelPayload,
  Level,
} from "../../types/editor.types";

describe("LevelService - Enhanced Test Suite", () => {
  let originalLocalStorage: Storage;
  let mockLocalStorage: { [key: string]: string };

  beforeEach(() => {
    vi.useFakeTimers();
    // Mock localStorage
    originalLocalStorage = global.localStorage;
    mockLocalStorage = {};

    global.localStorage = {
      getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        mockLocalStorage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockLocalStorage[key];
      }),
      clear: vi.fn(() => {
        mockLocalStorage = {};
      }),
      length: 0,
      key: vi.fn(() => null),
    } as Storage;

    // Mock crypto.randomUUID
    Object.defineProperty(global, "crypto", {
      value: {
        randomUUID: vi.fn(() => `uuid-${Date.now()}-${Math.random()}`),
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    global.localStorage = originalLocalStorage;
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("Storage Operations", () => {
    it("should handle empty localStorage gracefully", () => {
      const levels = LevelService.listLevels();
      expect(levels).toEqual([]);
    });

    it("should handle corrupted localStorage data", () => {
      mockLocalStorage["bmad.levels.v1"] = "invalid json {]";
      const levels = LevelService.listLevels();
      expect(levels).toEqual([]);
    });

    it("should handle non-array data in localStorage", () => {
      mockLocalStorage["bmad.levels.v1"] = '{"not": "an array"}';
      const levels = LevelService.listLevels();
      expect(levels).toEqual([]);
    });

    it("should handle missing window object", () => {
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;

      const levels = LevelService.listLevels();
      expect(levels).toEqual([]);

      global.window = originalWindow;
    });

    it("should handle missing localStorage object", () => {
      const originalLocalStorage = global.localStorage;
      // @ts-ignore
      delete global.localStorage;

      const levels = LevelService.listLevels();
      expect(levels).toEqual([]);

      global.localStorage = originalLocalStorage;
    });
  });

  describe("Level CRUD Operations", () => {
    describe("saveLevel", () => {
      it("should create a new level with generated ID", () => {
        const payload: SaveLevelPayload = {
          name: "Test Level",
          rows: 10,
          cols: 15,
          cellSize: 32,
          blocks: [
            {
              type: "normal",
              x: 1,
              y: 2,
              durability: 1,
              points: 10,
              powerUp: undefined,
              color: "#ff0000",
              rotation: 0,
            },
          ],
        };

        const saved = LevelService.saveLevel(payload);

        expect(saved.id).toBeDefined();
        expect(saved.name).toBe("Test Level");
        expect(saved.rows).toBe(10);
        expect(saved.cols).toBe(15);
        expect(saved.cellSize).toBe(32);
        expect(saved.blocks).toHaveLength(1);
        expect(saved.createdAt).toBeDefined();
        expect(saved.updatedAt).toBeDefined();
      });

      it("should update an existing level", () => {
        const initial: SaveLevelPayload = {
          name: "Initial Level",
          rows: 10,
          cols: 15,
          cellSize: 32,
          blocks: [],
        };

        const created = LevelService.saveLevel(initial);
        const createdAt = created.createdAt;

        // Wait to ensure different timestamp
        vi.advanceTimersByTime(100);

        const update: SaveLevelPayload = {
          id: created.id,
          name: "Updated Level",
          rows: 20,
          cols: 25,
          cellSize: 64,
          blocks: [
            {
              type: "steel",
              x: 5,
              y: 5,
              durability: 3,
              points: 50,
            },
          ],
        };

        const updated = LevelService.saveLevel(update);

        expect(updated.id).toBe(created.id);
        expect(updated.name).toBe("Updated Level");
        expect(updated.rows).toBe(20);
        expect(updated.cols).toBe(25);
        expect(updated.createdAt).toBe(createdAt);
        expect(updated.updatedAt).toBeGreaterThan(createdAt);
        expect(updated.blocks).toHaveLength(1);
      });

      it("should trim whitespace from level names", () => {
        const payload: SaveLevelPayload = {
          name: "  Trimmed Level  ",
          rows: 10,
          cols: 10,
          cellSize: 32,
          blocks: [],
        };

        const saved = LevelService.saveLevel(payload);
        expect(saved.name).toBe("Trimmed Level");
      });

      it("should use default name for empty names", () => {
        const payload: SaveLevelPayload = {
          name: "   ",
          rows: 10,
          cols: 10,
          cellSize: 32,
          blocks: [],
        };

        const saved = LevelService.saveLevel(payload);
        expect(saved.name).toBe("Untitled Level");
      });

      it("should normalize block coordinates to integers", () => {
        const payload: SaveLevelPayload = {
          name: "Float Coords",
          rows: 10,
          cols: 10,
          cellSize: 32,
          blocks: [
            {
              type: "normal",
              x: 1.7,
              y: 2.3,
              durability: 1,
              points: 10,
            },
          ],
        };

        const saved = LevelService.saveLevel(payload);
        expect(saved.blocks[0].x).toBe(1);
        expect(saved.blocks[0].y).toBe(2);
      });

      it("should preserve block metadata", () => {
        const payload: SaveLevelPayload = {
          name: "Metadata Test",
          rows: 10,
          cols: 10,
          cellSize: 32,
          blocks: [
            {
              type: "special",
              x: 5,
              y: 5,
              durability: 2,
              points: 30,
              powerUp: "multiball",
              metadata: {
                custom: "data",
                flag: true,
              },
            },
          ],
        };

        const saved = LevelService.saveLevel(payload);
        expect(saved.blocks[0].metadata).toEqual({
          custom: "data",
          flag: true,
        });
      });
    });

    describe("loadLevel", () => {
      it("should load an existing level by ID", () => {
        const saved = LevelService.saveLevel({
          name: "Load Test",
          rows: 10,
          cols: 10,
          cellSize: 32,
          blocks: [],
        });

        const loaded = LevelService.loadLevel(saved.id);
        expect(loaded).toEqual(saved);
      });

      it("should return undefined for non-existent ID", () => {
        const loaded = LevelService.loadLevel("non-existent-id");
        expect(loaded).toBeUndefined();
      });
    });

    describe("listLevels", () => {
      it("should return levels sorted by updatedAt (newest first)", () => {
        const level1 = LevelService.saveLevel({
          name: "Level 1",
          rows: 10,
          cols: 10,
          cellSize: 32,
          blocks: [],
        });

        vi.advanceTimersByTime(100);

        const level2 = LevelService.saveLevel({
          name: "Level 2",
          rows: 10,
          cols: 10,
          cellSize: 32,
          blocks: [],
        });

        vi.advanceTimersByTime(100);

        const level3 = LevelService.saveLevel({
          name: "Level 3",
          rows: 10,
          cols: 10,
          cellSize: 32,
          blocks: [],
        });

        const list = LevelService.listLevels();

        expect(list).toHaveLength(3);
        expect(list[0].name).toBe("Level 3");
        expect(list[1].name).toBe("Level 2");
        expect(list[2].name).toBe("Level 1");
      });

      it("should return summary data only", () => {
        LevelService.saveLevel({
          name: "Summary Test",
          rows: 20,
          cols: 30,
          cellSize: 32,
          blocks: [
            { type: "normal", x: 1, y: 1, durability: 1, points: 10 },
            { type: "steel", x: 2, y: 2, durability: 3, points: 30 },
          ],
        });

        const list = LevelService.listLevels();
        const summary = list[0];

        expect(summary).toHaveProperty("id");
        expect(summary).toHaveProperty("name");
        expect(summary).toHaveProperty("rows");
        expect(summary).toHaveProperty("cols");
        expect(summary).toHaveProperty("updatedAt");
        expect(summary).not.toHaveProperty("blocks");
        expect(summary).not.toHaveProperty("cellSize");
        expect(summary).not.toHaveProperty("createdAt");
      });
    });

    describe("deleteLevel", () => {
      it("should delete an existing level", () => {
        const level1 = LevelService.saveLevel({
          name: "Delete Me",
          rows: 10,
          cols: 10,
          cellSize: 32,
          blocks: [],
        });

        const level2 = LevelService.saveLevel({
          name: "Keep Me",
          rows: 10,
          cols: 10,
          cellSize: 32,
          blocks: [],
        });

        LevelService.deleteLevel(level1.id);

        const list = LevelService.listLevels();
        expect(list).toHaveLength(1);
        expect(list[0].name).toBe("Keep Me");

        const loaded = LevelService.loadLevel(level1.id);
        expect(loaded).toBeUndefined();
      });

      it("should handle deleting non-existent level", () => {
        LevelService.saveLevel({
          name: "Existing",
          rows: 10,
          cols: 10,
          cellSize: 32,
          blocks: [],
        });

        LevelService.deleteLevel("non-existent-id");

        const list = LevelService.listLevels();
        expect(list).toHaveLength(1);
      });
    });

    describe("clearAll", () => {
      it("should remove all levels from storage", () => {
        LevelService.saveLevel({
          name: "Level 1",
          rows: 10,
          cols: 10,
          cellSize: 32,
          blocks: [],
        });

        LevelService.saveLevel({
          name: "Level 2",
          rows: 10,
          cols: 10,
          cellSize: 32,
          blocks: [],
        });

        LevelService.clearAll();

        const list = LevelService.listLevels();
        expect(list).toHaveLength(0);
        expect(global.localStorage.removeItem).toHaveBeenCalledWith(
          "bmad.levels.v1",
        );
      });

      it("should handle missing window gracefully", () => {
        const originalWindow = global.window;
        // @ts-ignore
        delete global.window;

        expect(() => LevelService.clearAll()).not.toThrow();

        global.window = originalWindow;
      });
    });
  });

  describe("Import/Export Operations", () => {
    describe("exportToJSON", () => {
      it("should export LevelRecord to JSON string", () => {
        const record: LevelRecord = {
          id: "test-id",
          name: "Export Test",
          rows: 10,
          cols: 15,
          cellSize: 32,
          createdAt: 1000,
          updatedAt: 2000,
          blocks: [
            {
              type: "normal",
              x: 1,
              y: 2,
              durability: 1,
              points: 10,
              powerUp: "speedup",
              color: "#ff0000",
              rotation: 0,
            },
          ],
        };

        const json = LevelService.exportToJSON(record);
        const parsed = JSON.parse(json);

        expect(parsed.id).toBe("test-id");
        expect(parsed.name).toBe("Export Test");
        expect(parsed.grid.width).toBe(15);
        expect(parsed.grid.height).toBe(10);
        expect(parsed.grid.blocks).toHaveLength(1);
        expect(parsed.grid.blocks[0]).toEqual({
          x: 1,
          y: 2,
          type: "normal",
          health: 1,
          powerUp: "speedup",
        });
        expect(parsed.version).toBeDefined();
        expect(parsed.metadata).toBeDefined();
      });

      it("should export Level format directly", () => {
        const level: Level = {
          id: "level-id",
          name: "Direct Export",
          author: "Test Author",
          createdAt: 1000,
          updatedAt: 2000,
          version: "1.0.0",
          metadata: {
            difficulty: "hard",
            tags: ["custom", "test"],
            description: "Test level",
          },
          grid: {
            width: 20,
            height: 15,
            blocks: [
              {
                x: 5,
                y: 5,
                type: "steel",
                health: 3,
                powerUp: "multiball",
              },
            ],
          },
          settings: {
            ballSpeed: 5,
            paddleWidth: 100,
          },
        };

        const json = LevelService.exportToJSON(level);
        const parsed = JSON.parse(json);

        expect(parsed).toEqual(level);
      });
    });

    describe("importFromJSON", () => {
      it("should import valid JSON to Level format", () => {
        const json = JSON.stringify({
          id: "import-test",
          name: "Import Test",
          author: "Test Author",
          createdAt: 1000,
          updatedAt: 2000,
          version: "1.0.0",
          metadata: {
            difficulty: "medium",
            tags: ["test"],
            description: "Test import",
          },
          grid: {
            width: 15,
            height: 10,
            blocks: [
              {
                x: 3,
                y: 4,
                type: "normal",
                health: 1,
                powerUp: null,
              },
            ],
          },
          settings: {
            ballSpeed: 3,
          },
        });

        const level = LevelService.importFromJSON(json);

        expect(level.id).toBe("import-test");
        expect(level.name).toBe("Import Test");
        expect(level.author).toBe("Test Author");
        expect(level.grid.width).toBe(15);
        expect(level.grid.height).toBe(10);
        expect(level.grid.blocks).toHaveLength(1);
      });

      it("should throw error for invalid JSON", () => {
        expect(() => LevelService.importFromJSON("not valid json")).toThrow(
          "Invalid JSON format",
        );
      });

      it("should throw error for non-object data", () => {
        expect(() => LevelService.importFromJSON("null")).toThrow(
          "Invalid level data structure",
        );
        expect(() => LevelService.importFromJSON('"string"')).toThrow(
          "Invalid level data structure",
        );
        expect(() => LevelService.importFromJSON("123")).toThrow(
          "Invalid level data structure",
        );
      });

      it("should throw error for missing required fields", () => {
        expect(() =>
          LevelService.importFromJSON(
            JSON.stringify({
              name: "Test",
              version: "1.0.0",
              grid: { width: 10, height: 10, blocks: [] },
            }),
          ),
        ).toThrow("Missing or invalid level ID");

        expect(() =>
          LevelService.importFromJSON(
            JSON.stringify({
              id: "test",
              version: "1.0.0",
              grid: { width: 10, height: 10, blocks: [] },
            }),
          ),
        ).toThrow("Missing or invalid level name");

        expect(() =>
          LevelService.importFromJSON(
            JSON.stringify({
              id: "test",
              name: "Test",
              grid: { width: 10, height: 10, blocks: [] },
            }),
          ),
        ).toThrow("Missing or invalid version");
      });

      it("should throw error for incompatible version", () => {
        expect(() =>
          LevelService.importFromJSON(
            JSON.stringify({
              id: "test",
              name: "Test",
              version: "2.0.0", // Assuming current version is 1.x.x
              grid: { width: 10, height: 10, blocks: [] },
            }),
          ),
        ).toThrow(/Incompatible version/);
      });

      it("should throw error for invalid grid data", () => {
        expect(() =>
          LevelService.importFromJSON(
            JSON.stringify({
              id: "test",
              name: "Test",
              version: "1.0.0",
              // Missing grid
            }),
          ),
        ).toThrow("Missing or invalid grid data");

        expect(() =>
          LevelService.importFromJSON(
            JSON.stringify({
              id: "test",
              name: "Test",
              version: "1.0.0",
              grid: "not an object",
            }),
          ),
        ).toThrow("Missing or invalid grid data");
      });

      it("should throw error for invalid grid dimensions", () => {
        expect(() =>
          LevelService.importFromJSON(
            JSON.stringify({
              id: "test",
              name: "Test",
              version: "1.0.0",
              grid: {
                width: "ten",
                height: 10,
                blocks: [],
              },
            }),
          ),
        ).toThrow("Invalid grid dimensions");
      });

      it("should throw error for invalid blocks array", () => {
        expect(() =>
          LevelService.importFromJSON(
            JSON.stringify({
              id: "test",
              name: "Test",
              version: "1.0.0",
              grid: {
                width: 10,
                height: 10,
                blocks: "not an array",
              },
            }),
          ),
        ).toThrow("Invalid blocks array");
      });

      it("should throw error for invalid block data", () => {
        expect(() =>
          LevelService.importFromJSON(
            JSON.stringify({
              id: "test",
              name: "Test",
              version: "1.0.0",
              grid: {
                width: 10,
                height: 10,
                blocks: [null],
              },
            }),
          ),
        ).toThrow("Invalid block data");

        expect(() =>
          LevelService.importFromJSON(
            JSON.stringify({
              id: "test",
              name: "Test",
              version: "1.0.0",
              grid: {
                width: 10,
                height: 10,
                blocks: [{ x: "five", y: 5, type: "normal" }],
              },
            }),
          ),
        ).toThrow("Invalid block properties");
      });

      it("should provide defaults for optional fields", () => {
        const json = JSON.stringify({
          id: "minimal",
          name: "Minimal Level",
          version: "1.0.0",
          grid: {
            width: 10,
            height: 10,
            blocks: [],
          },
        });

        const level = LevelService.importFromJSON(json);

        expect(level.author).toBeUndefined();
        expect(level.createdAt).toBeDefined();
        expect(level.updatedAt).toBeDefined();
        expect(level.metadata).toEqual({
          difficulty: undefined,
          tags: [],
          description: undefined,
        });
        expect(level.settings).toBeUndefined();
      });
    });

    describe("Level Code Operations", () => {
      it("should generate level code from LevelRecord", () => {
        const record: LevelRecord = {
          id: "code-test",
          name: "Code Test",
          rows: 5,
          cols: 5,
          cellSize: 32,
          createdAt: 1000,
          updatedAt: 2000,
          blocks: [
            {
              type: "normal",
              x: 1,
              y: 1,
              durability: 1,
              points: 10,
            },
          ],
        };

        const code = LevelService.generateLevelCode(record);

        expect(code).toBeTruthy();
        expect(typeof code).toBe("string");
      });

      it("should generate level code from Level format", () => {
        const level: Level = {
          id: "level-code",
          name: "Level Code",
          version: "1.0.0",
          grid: {
            width: 5,
            height: 5,
            blocks: [
              {
                x: 2,
                y: 2,
                type: "steel",
                health: 3,
              },
            ],
          },
        };

        const code = LevelService.generateLevelCode(level);

        expect(code).toBeTruthy();
        expect(typeof code).toBe("string");
      });

      it("should decode level code back to Level", () => {
        const original: Level = {
          id: "decode-test",
          name: "Decode Test",
          version: "1.0.0",
          grid: {
            width: 3,
            height: 3,
            blocks: [
              {
                x: 1,
                y: 1,
                type: "normal",
                health: 1,
              },
            ],
          },
        };

        const code = LevelService.generateLevelCode(original);
        const decoded = LevelService.decodeLevelCode(code);

        expect(decoded.id).toBe(original.id);
        expect(decoded.name).toBe(original.name);
        expect(decoded.grid.width).toBe(original.grid.width);
        expect(decoded.grid.height).toBe(original.grid.height);
        expect(decoded.grid.blocks).toHaveLength(1);
      });

      it("should handle large levels by creating minimal version", () => {
        const largeLevel: LevelRecord = {
          id: "large-level",
          name: "Large Level",
          rows: 100,
          cols: 100,
          cellSize: 32,
          createdAt: 1000,
          updatedAt: 2000,
          blocks: Array.from({ length: 1000 }, (_, i) => ({
            type: "normal",
            x: i % 100,
            y: Math.floor(i / 100),
            durability: 1,
            points: 10,
          })),
        };

        const consoleSpy = vi
          .spyOn(console, "warn")
          .mockImplementation(() => {});
        const code = LevelService.generateLevelCode(largeLevel);

        expect(code).toBeTruthy();
        // Check if warning was potentially logged for large level
        // (depending on implementation of isLevelCodeShareable)

        consoleSpy.mockRestore();
      });
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle concurrent saves correctly", () => {
      const level1 = LevelService.saveLevel({
        name: "Concurrent 1",
        rows: 10,
        cols: 10,
        cellSize: 32,
        blocks: [],
      });

      const level2 = LevelService.saveLevel({
        name: "Concurrent 2",
        rows: 10,
        cols: 10,
        cellSize: 32,
        blocks: [],
      });

      const list = LevelService.listLevels();
      expect(list).toHaveLength(2);
      expect(list.find((l) => l.id === level1.id)).toBeDefined();
      expect(list.find((l) => l.id === level2.id)).toBeDefined();
    });

    it("should handle update of recently deleted level", () => {
      const level = LevelService.saveLevel({
        name: "To Delete",
        rows: 10,
        cols: 10,
        cellSize: 32,
        blocks: [],
      });

      LevelService.deleteLevel(level.id);

      const updateResult = LevelService.saveLevel({
        id: level.id,
        name: "Updated After Delete",
        rows: 15,
        cols: 15,
        cellSize: 32,
        blocks: [],
      });

      // Should create a new level since the ID doesn't exist
      expect(updateResult.id).not.toBe(level.id);
      expect(updateResult.name).toBe("Updated After Delete");
    });

    it("should handle ID generation without crypto.randomUUID", () => {
      // Remove crypto.randomUUID
      const originalCrypto = global.crypto;
      global.crypto = {} as any;

      const level = LevelService.saveLevel({
        name: "Fallback ID",
        rows: 10,
        cols: 10,
        cellSize: 32,
        blocks: [],
      });

      expect(level.id).toMatch(/^lvl_[a-z0-9]+_[a-z0-9]+$/);

      global.crypto = originalCrypto;
    });

    it("should handle very long level names", () => {
      const longName = "A".repeat(1000);
      const level = LevelService.saveLevel({
        name: longName,
        rows: 10,
        cols: 10,
        cellSize: 32,
        blocks: [],
      });

      expect(level.name).toBe(longName);
    });

    it("should handle special characters in level names", () => {
      const specialName = "🎮 Level <1> & \"2\" '3' \\4/ 日本語";
      const level = LevelService.saveLevel({
        name: specialName,
        rows: 10,
        cols: 10,
        cellSize: 32,
        blocks: [],
      });

      expect(level.name).toBe(specialName);

      const loaded = LevelService.loadLevel(level.id);
      expect(loaded?.name).toBe(specialName);
    });

    it("should handle blocks with all optional properties", () => {
      const level = LevelService.saveLevel({
        name: "Full Block",
        rows: 10,
        cols: 10,
        cellSize: 32,
        blocks: [
          {
            type: "special",
            x: 5,
            y: 5,
            durability: 5,
            points: 100,
            powerUp: "megaball",
            color: "#00ff00",
            rotation: 45,
            metadata: {
              isSpecial: true,
              triggerId: "trigger-1",
              animation: "pulse",
            },
          },
        ],
      });

      const loaded = LevelService.loadLevel(level.id);
      expect(loaded?.blocks[0]).toMatchObject({
        type: "special",
        x: 5,
        y: 5,
        durability: 5,
        points: 100,
        powerUp: "megaball",
        color: "#00ff00",
        rotation: 45,
        metadata: {
          isSpecial: true,
          triggerId: "trigger-1",
          animation: "pulse",
        },
      });
    });

    it("should handle blocks with minimal properties", () => {
      const level = LevelService.saveLevel({
        name: "Minimal Block",
        rows: 10,
        cols: 10,
        cellSize: 32,
        blocks: [
          {
            type: "normal",
            x: 1,
            y: 1,
            durability: 1,
            points: 10,
          },
        ],
      });

      const loaded = LevelService.loadLevel(level.id);
      expect(loaded?.blocks[0]).toMatchObject({
        type: "normal",
        x: 1,
        y: 1,
        durability: 1,
        points: 10,
      });
    });

    it("should handle empty blocks array", () => {
      const level = LevelService.saveLevel({
        name: "Empty Level",
        rows: 10,
        cols: 10,
        cellSize: 32,
        blocks: [],
      });

      expect(level.blocks).toEqual([]);

      const loaded = LevelService.loadLevel(level.id);
      expect(loaded?.blocks).toEqual([]);
    });

    it("should handle maximum grid size", () => {
      const level = LevelService.saveLevel({
        name: "Max Grid",
        rows: 1000,
        cols: 1000,
        cellSize: 1,
        blocks: [],
      });

      expect(level.rows).toBe(1000);
      expect(level.cols).toBe(1000);
      expect(level.cellSize).toBe(1);
    });
  });

  describe("Performance Tests", () => {
    it("should handle saving many levels efficiently", () => {
      const startTime = performance.now();

      for (let i = 0; i < 100; i++) {
        LevelService.saveLevel({
          name: `Perf Test ${i}`,
          rows: 10,
          cols: 10,
          cellSize: 32,
          blocks: [],
        });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
      expect(LevelService.listLevels()).toHaveLength(100);
    });

    it("should handle large block arrays efficiently", () => {
      const blocks = Array.from({ length: 500 }, (_, i) => ({
        type: "normal" as const,
        x: i % 50,
        y: Math.floor(i / 50),
        durability: 1,
        points: 10,
      }));

      const startTime = performance.now();

      const level = LevelService.saveLevel({
        name: "Large Blocks",
        rows: 10,
        cols: 50,
        cellSize: 32,
        blocks,
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // Should complete quickly
      expect(level.blocks).toHaveLength(500);
    });

    it("should list levels efficiently with many records", () => {
      // Create many levels
      for (let i = 0; i < 50; i++) {
        LevelService.saveLevel({
          name: `List Test ${i}`,
          rows: 10,
          cols: 10,
          cellSize: 32,
          blocks: [],
        });
      }

      const startTime = performance.now();
      const list = LevelService.listLevels();
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(50); // Should be very fast
      expect(list).toHaveLength(50);
    });
  });
});
