import { SerializedBlockData } from "../types/editor.types";

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
};

export type LevelServiceType = typeof LevelService;
