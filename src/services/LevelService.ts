import { SerializedBlockData, Level, LEVEL_FORMAT_VERSION } from "../types/editor.types";
import { generateLevelCode, decodeLevelCode, isLevelCodeShareable, createMinimalLevel } from "../utils/levelExportImport";

export interface LevelSummary {
  id: string;
  name: string;
  rows: number;
  cols: number;
  updatedAt: number;
}

export interface LevelRecord extends LevelSummary {
  cellSize: number;
  createdAt: number;
  blocks: SerializedBlockData[];
}

export interface SaveLevelPayload {
  id?: string;
  name: string;
  rows: number;
  cols: number;
  cellSize: number;
  blocks: SerializedBlockData[];
}

const STORAGE_KEY = "bmad.levels.v1";

const safeJsonParse = <T>(value: string | null): T[] => {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed as T[];
    }
    return [];
  } catch {
    return [];
  }
};

const readAll = (): LevelRecord[] => {
  if (typeof window === "undefined" || !window.localStorage) {
    return [];
  }

  return safeJsonParse<LevelRecord>(window.localStorage.getItem(STORAGE_KEY));
};

const writeAll = (levels: LevelRecord[]): void => {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(levels));
};

const generateId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `lvl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
};

export const LevelService = {
  exportToJSON(level: LevelRecord | Level): string {
    const exportData: Level = {
      id: level.id,
      name: level.name,
      author: 'author' in level ? level.author : undefined,
      createdAt: 'createdAt' in level ? level.createdAt : Date.now(),
      updatedAt: 'updatedAt' in level ? level.updatedAt : Date.now(),
      version: LEVEL_FORMAT_VERSION,
      metadata: 'metadata' in level ? level.metadata : {
        difficulty: undefined,
        tags: [],
        description: undefined,
      },
      grid: {
        width: 'cols' in level ? level.cols : level.grid.width,
        height: 'rows' in level ? level.rows : level.grid.height,
        blocks: 'blocks' in level ? level.blocks.map(block => ({
          x: block.x,
          y: block.y,
          type: block.type,
          health: block.durability,
          powerUp: block.powerUp,
        })) : level.grid.blocks,
      },
      settings: 'settings' in level ? level.settings : undefined,
    };

    return JSON.stringify(exportData, null, 2);
  },

  importFromJSON(json: string): Level {
    let data: unknown;
    
    try {
      data = JSON.parse(json);
    } catch (error) {
      throw new Error('Invalid JSON format');
    }

    if (!data || typeof data !== 'object') {
      throw new Error('Invalid level data structure');
    }

    const level = data as Record<string, unknown>;

    // Validate required fields
    if (typeof level.id !== 'string' || !level.id) {
      throw new Error('Missing or invalid level ID');
    }

    if (typeof level.name !== 'string' || !level.name) {
      throw new Error('Missing or invalid level name');
    }

    if (typeof level.version !== 'string') {
      throw new Error('Missing or invalid version');
    }

    // Check version compatibility
    const majorVersion = level.version.split('.')[0];
    const currentMajorVersion = LEVEL_FORMAT_VERSION.split('.')[0];
    if (majorVersion !== currentMajorVersion) {
      throw new Error(`Incompatible version: ${level.version} (expected ${LEVEL_FORMAT_VERSION})`);
    }

    if (!level.grid || typeof level.grid !== 'object') {
      throw new Error('Missing or invalid grid data');
    }

    const grid = level.grid as Record<string, unknown>;

    if (typeof grid.width !== 'number' || typeof grid.height !== 'number') {
      throw new Error('Invalid grid dimensions');
    }

    if (!Array.isArray(grid.blocks)) {
      throw new Error('Invalid blocks array');
    }

    // Validate blocks
    for (const block of grid.blocks) {
      if (!block || typeof block !== 'object') {
        throw new Error('Invalid block data');
      }
      const b = block as Record<string, unknown>;
      if (typeof b.x !== 'number' || typeof b.y !== 'number' || typeof b.type !== 'string') {
        throw new Error('Invalid block properties');
      }
    }

    return {
      id: level.id as string,
      name: level.name as string,
      author: typeof level.author === 'string' ? level.author : undefined,
      createdAt: typeof level.createdAt === 'number' ? level.createdAt : Date.now(),
      updatedAt: typeof level.updatedAt === 'number' ? level.updatedAt : Date.now(),
      version: level.version as string,
      metadata: level.metadata && typeof level.metadata === 'object' 
        ? level.metadata as Level['metadata']
        : { difficulty: undefined, tags: [], description: undefined },
      grid: {
        width: grid.width as number,
        height: grid.height as number,
        blocks: grid.blocks as Level['grid']['blocks'],
      },
      settings: level.settings && typeof level.settings === 'object'
        ? level.settings as Level['settings']
        : undefined,
    };
  },

  listLevels(): LevelSummary[] {
    return readAll()
      .map(({ id, name, rows, cols, updatedAt }) => ({
        id,
        name,
        rows,
        cols,
        updatedAt,
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  },

  loadLevel(id: string): LevelRecord | undefined {
    return readAll().find((level) => level.id === id);
  },

  saveLevel(payload: SaveLevelPayload): LevelRecord {
    const levels = readAll();
    const now = Date.now();
    const trimmedName = payload.name.trim() || "Untitled Level";

    const normalizedBlocks = payload.blocks.map((block) => ({
      type: block.type,
      x: Math.trunc(block.x),
      y: Math.trunc(block.y),
      durability: block.durability,
      points: block.points,
      powerUp: block.powerUp,
      color: block.color,
      rotation: block.rotation,
      metadata: block.metadata ? { ...block.metadata } : undefined,
    }));

    if (payload.id) {
      const existingIndex = levels.findIndex((level) => level.id === payload.id);

      if (existingIndex >= 0) {
        const existing = levels[existingIndex];
        const updated: LevelRecord = {
          ...existing,
          name: trimmedName,
          rows: payload.rows,
          cols: payload.cols,
          cellSize: payload.cellSize,
          blocks: normalizedBlocks,
          updatedAt: now,
        };
        levels[existingIndex] = updated;
        writeAll(levels);
        return updated;
      }
    }

    const created: LevelRecord = {
      id: generateId(),
      name: trimmedName,
      rows: payload.rows,
      cols: payload.cols,
      cellSize: payload.cellSize,
      blocks: normalizedBlocks,
      createdAt: now,
      updatedAt: now,
    };

    levels.push(created);
    writeAll(levels);

    return created;
  },

  deleteLevel(id: string): void {
    const levels = readAll();
    const next = levels.filter((level) => level.id !== id);
    writeAll(next);
  },

  clearAll(): void {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }

    window.localStorage.removeItem(STORAGE_KEY);
  },

  generateLevelCode(level: LevelRecord | Level): string {
    // Convert LevelRecord to Level format if necessary
    const levelData: Level = 'blocks' in level && 'rows' in level ? {
      id: level.id,
      name: level.name,
      author: undefined,
      createdAt: level.createdAt,
      updatedAt: level.updatedAt,
      version: LEVEL_FORMAT_VERSION,
      metadata: {
        difficulty: undefined,
        tags: [],
        description: undefined,
      },
      grid: {
        width: level.cols,
        height: level.rows,
        blocks: level.blocks.map(block => ({
          x: block.x,
          y: block.y,
          type: block.type,
          health: block.durability,
          powerUp: block.powerUp,
        })),
      },
      settings: undefined,
    } : level;

    // Create minimal version if the full code would be too large
    const fullCode = generateLevelCode(levelData);
    if (isLevelCodeShareable(fullCode)) {
      return fullCode;
    }

    // Try minimal version
    const minimalLevel = createMinimalLevel(levelData);
    const minimalCode = generateLevelCode(minimalLevel);
    
    if (!isLevelCodeShareable(minimalCode)) {
      console.warn('Level code exceeds safe URL size limit even in minimal form');
    }
    
    return minimalCode;
  },

  decodeLevelCode(code: string): Level {
    return decodeLevelCode(code);
  },
};

export type LevelServiceType = typeof LevelService;
