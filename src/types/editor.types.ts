/**
 * Editor Type Definitions
 */

export enum BlockType {
  NORMAL = "normal",
  HARD = "hard",
  SPECIAL = "special",
  POWER = "power",
  INDESTRUCTIBLE = "indestructible",
}

export type BlockTypeValue = `${BlockType}`;

export enum BlockCategory {
  CORE = "core",
  DEFENSIVE = "defensive",
  SPECIAL = "special",
  POWER = "power",
}

export type BlockCategoryValue = `${BlockCategory}`;

export interface BlockVisualMetadata {
  color: string;
  accentColor: string;
  borderColor: string;
  glowColor?: string;
  pattern?: "solid" | "diagonal" | "radial";
}

export interface BlockDefinition {
  type: BlockTypeValue;
  name: string;
  category: BlockCategoryValue;
  description: string;
  durability: number;
  points: number;
  effects: string[];
  visual: BlockVisualMetadata;
}

export interface BlockCategoryDescriptor {
  id: BlockCategoryValue;
  label: string;
  description: string;
  order: number;
}

export interface BlockPaletteGroup {
  category: BlockCategoryDescriptor;
  blocks: BlockDefinition[];
}

export enum EditorTool {
  SELECT = "select",
  PLACE = "place",
  ERASE = "erase",
  FILL = "fill",
  MOVE = "move",
}

export type EditorToolValue = `${EditorTool}`;

export interface GridCell {
  row: number;
  col: number;
}

export interface GridPosition {
  x: number;
  y: number;
}

export interface SelectionBounds {
  start: GridCell;
  end: GridCell;
}

export interface ClipboardEntry {
  rowOffset: number;
  colOffset: number;
  block: BlockData;
}

export interface BlockData {
  type: BlockTypeValue;
  x: number;
  y: number;
  durability?: number;
  points?: number;
  powerUp?: string;
  color?: string;
  rotation?: 0 | 90 | 180 | 270;
  metadata?: Record<string, unknown>;
}

export interface SerializedBlockData {
  type: BlockTypeValue;
  x: number;
  y: number;
  durability?: number;
  points?: number;
  powerUp?: string;
  color?: string;
  rotation?: 0 | 90 | 180 | 270;
  metadata?: Record<string, unknown>;
}

export interface DragItem {
  type: "block";
  blockType: BlockTypeValue;
  fromPalette?: boolean;
  fromGrid?: GridPosition;
}

export interface EditorHistoryEntry {
  action: "place" | "remove";
  row: number;
  col: number;
  previous: BlockData | null;
  next: BlockData | null;
  timestamp: number;
}

export interface EditorRecentAction {
  action: "place" | "remove";
  row: number;
  col: number;
  timestamp: number;
}

export interface EditorDimensions {
  rows: number;
  cols: number;
  cellSize: number;
}

export interface EditorConfig {
  maxGridWidth: number;
  maxGridHeight: number;
  cellSize: number;
  maxHistorySize: number;
  autoSaveInterval: number;
  virtualScrollBuffer: number;
}

export interface EditorState {
  grid: (BlockData | null)[][];
  dimensions: EditorDimensions;
  selectedTool: EditorToolValue;
  selectedBlockType: BlockTypeValue;
  hoveredCell: GridCell | null;
  focusedCell: GridCell | null;
  selectedCells: GridCell[];
  selectionAnchor: GridCell | null;
  clipboard: ClipboardEntry[];
  history: EditorHistoryEntry[];
  historyIndex: number;
  isDirty: boolean;
  previewMode: boolean;
  previewPlaying: boolean;
  recentAction: EditorRecentAction | null;
}

export interface LoadLevelPayload {
  rows: number;
  cols: number;
  cellSize?: number;
  blocks: SerializedBlockData[];
}

export interface EditorActions {
  setDimensions: (dimensions: Partial<EditorDimensions>) => void;
  setSelectedTool: (tool: EditorToolValue) => void;
  setSelectedBlockType: (type: BlockTypeValue) => void;
  setHoveredCell: (cell: GridCell | null) => void;
  setFocusedCell: (cell: GridCell | null) => void;
  setSelectionAnchor: (cell: GridCell | null) => void;
  selectSingleCell: (cell: GridCell) => void;
  selectRegion: (start: GridCell, end: GridCell) => void;
  clearSelection: () => void;
  copySelection: () => void;
  pasteSelection: (target?: GridCell) => void;
  removeSelection: () => void;
  placeBlock: (row: number, col: number, type?: BlockTypeValue) => void;
  removeBlock: (row: number, col: number) => void;
  clearGrid: () => void;
  undo: () => void;
  redo: () => void;
  resetEditor: () => void;
  togglePreviewMode: () => void;
  setPreviewMode: (enabled: boolean) => void;
  startPreview: () => void;
  stopPreview: () => void;
  loadLevel: (payload: LoadLevelPayload) => void;
}

export interface EditorStore extends EditorState, EditorActions {}

export const DEFAULT_EDITOR_ROWS = 20;
export const DEFAULT_EDITOR_COLS = 20;
export const DEFAULT_EDITOR_CELL_SIZE = 32;

export const DEFAULT_EDITOR_CONFIG: EditorConfig = {
  maxGridWidth: 100,
  maxGridHeight: 100,
  cellSize: DEFAULT_EDITOR_CELL_SIZE,
  maxHistorySize: 50,
  autoSaveInterval: 30_000,
  virtualScrollBuffer: 5,
};
