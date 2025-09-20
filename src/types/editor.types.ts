/**
 * Editor Type Definitions
 */

export enum BlockType {
  NORMAL = 'normal',
  HARD = 'hard',
  SPECIAL = 'special',
  POWER_UP = 'power_up',
  INDESTRUCTIBLE = 'indestructible',
}

export interface BlockData {
  type: BlockType;
  x: number;
  y: number;
  durability?: number;
  points?: number;
  powerUp?: string;
  color?: string;
}

export enum EditorTool {
  SELECT = 'select',
  PLACE = 'place',
  ERASE = 'erase',
  FILL = 'fill',
  MOVE = 'move',
}

export interface EditorAction {
  type: 'PLACE_BLOCK' | 'REMOVE_BLOCK' | 'MOVE_BLOCK' | 'FILL_AREA' | 'CLEAR_ALL';
  timestamp: number;
  previousState?: BlockData[][];
  newState: BlockData[][];
  affectedCells?: Array<{ x: number; y: number }>;
}

export interface EditorState {
  grid: (BlockData | null)[][];
  gridWidth: number;
  gridHeight: number;
  selectedTool: EditorTool;
  selectedBlockType: BlockType;
  history: EditorAction[];
  historyIndex: number;
  isDirty: boolean;
  previewMode: boolean;
  viewport: {
    x: number;
    y: number;
    width: number;
    height: number;
    scale: number;
  };
}

export interface DragItem {
  type: 'block';
  blockType: BlockType;
  fromPalette?: boolean;
  fromGrid?: { x: number; y: number };
}

export interface GridPosition {
  x: number;
  y: number;
}

export interface EditorConfig {
  maxGridWidth: number;
  maxGridHeight: number;
  cellSize: number;
  maxHistorySize: number;
  autoSaveInterval: number;
  virtualScrollBuffer: number;
}

export const DEFAULT_EDITOR_CONFIG: EditorConfig = {
  maxGridWidth: 100,
  maxGridHeight: 100,
  cellSize: 32,
  maxHistorySize: 50,
  autoSaveInterval: 30000, // 30 seconds
  virtualScrollBuffer: 5, // Extra rows/cols to render outside viewport
};
