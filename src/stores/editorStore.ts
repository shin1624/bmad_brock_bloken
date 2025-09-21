import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import {
  BlockData,
  BlockType,
  BlockTypeValue,
  ClipboardEntry,
  DEFAULT_EDITOR_CELL_SIZE,
  DEFAULT_EDITOR_COLS,
  DEFAULT_EDITOR_ROWS,
  EditorActions,
  EditorDimensions,
  EditorHistoryEntry,
  EditorRecentAction,
  EditorState,
  EditorStore,
  EditorTool,
  EditorToolValue,
  GridCell,
  LoadLevelPayload,
  SerializedBlockData,
} from "../types/editor.types";

const clampIndex = (value: number, size: number): number => {
  if (value < 0) {
    return 0;
  }

  if (value >= size) {
    return size - 1;
  }

  return value;
};

const isWithinGrid = (
  row: number,
  col: number,
  rows: number,
  cols: number,
): boolean => row >= 0 && col >= 0 && row < rows && col < cols;

export const createEmptyGrid = (
  rows: number,
  cols: number,
): (BlockData | null)[][] =>
  Array.from({ length: rows }, () => Array.from({ length: cols }, () => null));

const createHistoryEntry = (
  action: EditorHistoryEntry["action"],
  row: number,
  col: number,
  previous: BlockData | null,
  next: BlockData | null,
): EditorHistoryEntry => ({
  action,
  row,
  col,
  previous,
  next,
  timestamp: Date.now(),
});

const ensureDimensions = (
  dimensions: Partial<EditorDimensions>,
): EditorDimensions => ({
  rows: dimensions.rows ?? DEFAULT_EDITOR_ROWS,
  cols: dimensions.cols ?? DEFAULT_EDITOR_COLS,
  cellSize: dimensions.cellSize ?? DEFAULT_EDITOR_CELL_SIZE,
});

export const createInitialEditorState = (): EditorState => ({
  grid: createEmptyGrid(DEFAULT_EDITOR_ROWS, DEFAULT_EDITOR_COLS),
  dimensions: {
    rows: DEFAULT_EDITOR_ROWS,
    cols: DEFAULT_EDITOR_COLS,
    cellSize: DEFAULT_EDITOR_CELL_SIZE,
  },
  selectedTool: EditorTool.SELECT,
  selectedBlockType: BlockType.NORMAL,
  hoveredCell: null,
  focusedCell: null,
  selectedCells: [],
  selectionAnchor: null,
  clipboard: [],
  history: [],
  historyIndex: -1,
  isDirty: false,
  previewMode: false,
  previewPlaying: false,
  recentAction: null,
});

const recordHistory = (state: EditorState, entry: EditorHistoryEntry): void => {
  if (state.historyIndex < state.history.length - 1) {
    state.history = state.history.slice(0, state.historyIndex + 1);
  }

  state.history.push(entry);
  state.historyIndex = state.history.length - 1;
};

const applyHistoryEntry = (
  grid: (BlockData | null)[][],
  entry: EditorHistoryEntry,
  direction: "undo" | "redo",
): void => {
  const { row, col } = entry;
  const target = direction === "undo" ? entry.previous : entry.next;
  grid[row][col] = target;
};

const validateBlockType = (type?: BlockTypeValue): BlockTypeValue => {
  const allowed: BlockTypeValue[] = [
    BlockType.NORMAL,
    BlockType.HARD,
    BlockType.SPECIAL,
    BlockType.POWER,
  ];

  if (type && allowed.includes(type)) {
    return type;
  }

  return BlockType.NORMAL;
};

const cloneBlockData = (block: BlockData, x: number, y: number): BlockData => ({
  type: block.type,
  x,
  y,
  durability: block.durability,
  points: block.points,
  powerUp: block.powerUp,
  color: block.color,
  rotation: block.rotation,
  metadata: block.metadata ? { ...block.metadata } : undefined,
});

const sanitizeCell = (
  cell: GridCell,
  rows: number,
  cols: number,
): GridCell => ({
  row: clampIndex(cell.row, rows),
  col: clampIndex(cell.col, cols),
});

const getBlockAt = (
  grid: (BlockData | null)[][],
  row: number,
  col: number,
): BlockData | null => grid[row]?.[col] ?? null;

const removeCellFromSelection = (
  state: EditorState,
  row: number,
  col: number,
): void => {
  state.selectedCells = state.selectedCells.filter(
    (cell) => cell.row !== row || cell.col !== col,
  );

  if (
    state.selectionAnchor &&
    state.selectionAnchor.row === row &&
    state.selectionAnchor.col === col
  ) {
    state.selectionAnchor = state.selectedCells.at(0) ?? null;
  }
};

const pruneSelection = (state: EditorState): void => {
  state.selectedCells = state.selectedCells.filter((cell) =>
    Boolean(getBlockAt(state.grid, cell.row, cell.col)),
  );

  if (
    state.selectionAnchor &&
    !getBlockAt(state.grid, state.selectionAnchor.row, state.selectionAnchor.col)
  ) {
    state.selectionAnchor = state.selectedCells.at(0) ?? null;
  }
};

const updateRecentAction = (
  state: EditorState,
  action: EditorRecentAction,
): void => {
  state.recentAction = action;
};

const baseStore = (
  set: (updater: (state: EditorStore) => void) => void,
): EditorStore => ({
  ...createInitialEditorState(),

  setDimensions: (dimensions) =>
    set((state) => {
      const next = ensureDimensions(dimensions);
      const rows = Math.max(1, next.rows);
      const cols = Math.max(1, next.cols);
      const resizedGrid = createEmptyGrid(rows, cols);

      for (let r = 0; r < Math.min(rows, state.dimensions.rows); r += 1) {
        for (let c = 0; c < Math.min(cols, state.dimensions.cols); c += 1) {
          const cell = state.grid[r][c];

          if (cell) {
            resizedGrid[r][c] = {
              ...cell,
              x: c,
              y: r,
            };
          } else {
            resizedGrid[r][c] = null;
          }
        }
      }

      state.grid = resizedGrid;
      state.dimensions = {
        rows,
        cols,
        cellSize: Math.max(8, next.cellSize),
      };
      state.history = [];
      state.historyIndex = -1;
      state.isDirty = false;
      state.selectedCells = [];
      state.selectionAnchor = null;
      state.clipboard = [];
      state.recentAction = null;
      state.previewPlaying = false;
    }),

  setSelectedTool: (tool) =>
    set((state) => {
      const allowed: EditorToolValue[] = [
        EditorTool.SELECT,
        EditorTool.PLACE,
        EditorTool.ERASE,
        EditorTool.FILL,
      ];

      state.selectedTool = allowed.includes(tool)
        ? tool
        : EditorTool.SELECT;
    }),

  setPreviewMode: (enabled) =>
    set((state) => {
      state.previewMode = enabled;
      if (!enabled) {
        state.previewPlaying = false;
      }
    }),

  togglePreviewMode: () =>
    set((state) => {
      state.previewMode = !state.previewMode;
      if (!state.previewMode) {
        state.previewPlaying = false;
      }
    }),

  startPreview: () =>
    set((state) => {
      if (!state.previewMode) {
        return;
      }

      state.previewPlaying = true;
    }),

  stopPreview: () =>
    set((state) => {
      state.previewPlaying = false;
    }),

  setSelectedBlockType: (type) =>
    set((state) => {
      state.selectedBlockType = validateBlockType(type);
    }),

  setHoveredCell: (cell) =>
    set((state) => {
      if (!cell) {
        state.hoveredCell = null;
        return;
      }

      const row = clampIndex(cell.row, state.dimensions.rows);
      const col = clampIndex(cell.col, state.dimensions.cols);
      state.hoveredCell = { row, col };
    }),

  setFocusedCell: (cell) =>
    set((state) => {
      if (!cell) {
        state.focusedCell = null;
        return;
      }

      const row = clampIndex(cell.row, state.dimensions.rows);
      const col = clampIndex(cell.col, state.dimensions.cols);
      state.focusedCell = { row, col };
    }),

  setSelectionAnchor: (cell) =>
    set((state) => {
      if (!cell) {
        state.selectionAnchor = null;
        return;
      }

      if (
        !isWithinGrid(
          cell.row,
          cell.col,
          state.dimensions.rows,
          state.dimensions.cols,
        )
      ) {
        state.selectionAnchor = null;
        return;
      }

      state.selectionAnchor = sanitizeCell(
        cell,
        state.dimensions.rows,
        state.dimensions.cols,
      );
    }),

  selectSingleCell: (cell) =>
    set((state) => {
      if (
        !isWithinGrid(
          cell.row,
          cell.col,
          state.dimensions.rows,
          state.dimensions.cols,
        )
      ) {
        state.selectedCells = [];
        state.selectionAnchor = null;
        return;
      }

      const sanitized = sanitizeCell(
        cell,
        state.dimensions.rows,
        state.dimensions.cols,
      );
      const block = getBlockAt(state.grid, sanitized.row, sanitized.col);

      if (!block) {
        state.selectedCells = [];
        state.selectionAnchor = sanitized;
        return;
      }

      state.selectedCells = [sanitized];
      state.selectionAnchor = sanitized;
      state.focusedCell = sanitized;
    }),

  selectRegion: (start, end) =>
    set((state) => {
      const anchor = sanitizeCell(
        start,
        state.dimensions.rows,
        state.dimensions.cols,
      );
      const target = sanitizeCell(
        end,
        state.dimensions.rows,
        state.dimensions.cols,
      );

      const minRow = Math.min(anchor.row, target.row);
      const maxRow = Math.max(anchor.row, target.row);
      const minCol = Math.min(anchor.col, target.col);
      const maxCol = Math.max(anchor.col, target.col);

      const cells: GridCell[] = [];

      for (let row = minRow; row <= maxRow; row += 1) {
        for (let col = minCol; col <= maxCol; col += 1) {
          if (getBlockAt(state.grid, row, col)) {
            cells.push({ row, col });
          }
        }
      }

      state.selectedCells = cells;
      state.selectionAnchor = anchor;

      if (cells.length > 0) {
        state.focusedCell = cells[0];
      }
    }),

  clearSelection: () =>
    set((state) => {
      state.selectedCells = [];
      state.selectionAnchor = null;
    }),

  copySelection: () =>
    set((state) => {
      if (state.selectedCells.length === 0) {
        state.clipboard = [];
        return;
      }

      const blocks = state.selectedCells
        .map((cell) => {
          const block = getBlockAt(state.grid, cell.row, cell.col);
          if (!block) {
            return null;
          }
          return {
            cell,
            block,
          };
        })
        .filter(Boolean) as Array<{ cell: GridCell; block: BlockData }>;

      if (blocks.length === 0) {
        state.clipboard = [];
        return;
      }

      const minRow = Math.min(...blocks.map((entry) => entry.cell.row));
      const minCol = Math.min(...blocks.map((entry) => entry.cell.col));

      state.clipboard = blocks.map((entry) => ({
        rowOffset: entry.cell.row - minRow,
        colOffset: entry.cell.col - minCol,
        block: cloneBlockData(entry.block, 0, 0),
      }));
    }),

  pasteSelection: (target) =>
    set((state) => {
      if (state.clipboard.length === 0) {
        return;
      }

      const { rows, cols } = state.dimensions;
      const fallbackTarget =
        state.hoveredCell ??
        state.selectionAnchor ??
        state.focusedCell ?? {
          row: 0,
          col: 0,
        };

      const origin = sanitizeCell(
        target ?? fallbackTarget,
        rows,
        cols,
      );

      const placements: GridCell[] = [];
      let didChange = false;

      state.clipboard.forEach((entry: ClipboardEntry) => {
        const row = origin.row + entry.rowOffset;
        const col = origin.col + entry.colOffset;

        if (!isWithinGrid(row, col, rows, cols)) {
          return;
        }

        const previous = state.grid[row][col];
        const nextBlock = cloneBlockData(entry.block, col, row);
        state.grid[row][col] = nextBlock;
        recordHistory(state, createHistoryEntry("place", row, col, previous, nextBlock));
        placements.push({ row, col });
        didChange = true;
      });

      if (!didChange) {
        return;
      }

      state.isDirty = true;
      state.selectedCells = placements;
      state.selectionAnchor = placements.at(0) ?? origin;
      state.focusedCell = placements.at(0) ?? state.focusedCell;
    }),

  removeSelection: () =>
    set((state) => {
      if (state.selectedCells.length === 0) {
        return;
      }

      const { rows, cols } = state.dimensions;
      let removed = false;
      let lastRemoved: GridCell | null = null;

      state.selectedCells.forEach((cell) => {
        const { row, col } = cell;

        if (!isWithinGrid(row, col, rows, cols)) {
          return;
        }

        const previous = state.grid[row][col];

        if (!previous) {
          return;
        }

        state.grid[row][col] = null;
        recordHistory(state, createHistoryEntry("remove", row, col, previous, null));
        removed = true;
        lastRemoved = { row, col };
      });

      if (removed && lastRemoved) {
        state.isDirty = true;
        updateRecentAction(state, {
          action: "remove",
          row: lastRemoved.row,
          col: lastRemoved.col,
          timestamp: Date.now(),
        });
      }

      state.selectedCells = [];
      state.selectionAnchor = null;
    }),

  loadLevel: ({ rows, cols, cellSize, blocks }: LoadLevelPayload) =>
    set((state) => {
      const safeRows = Math.max(1, Math.floor(rows));
      const safeCols = Math.max(1, Math.floor(cols));
      const safeCellSize = Math.max(8, Math.floor(cellSize ?? state.dimensions.cellSize));
      const nextGrid = createEmptyGrid(safeRows, safeCols);

      blocks.forEach((block: SerializedBlockData) => {
        const row = Math.trunc(block.y);
        const col = Math.trunc(block.x);

        if (!Number.isFinite(row) || !Number.isFinite(col)) {
          return;
        }

        if (!isWithinGrid(row, col, safeRows, safeCols)) {
          return;
        }

        nextGrid[row][col] = {
          type: validateBlockType(block.type),
          x: col,
          y: row,
          durability: block.durability,
          points: block.points,
          powerUp: block.powerUp,
          color: block.color,
          rotation: block.rotation ?? 0,
          metadata: block.metadata ? { ...block.metadata } : undefined,
        };
      });

      state.grid = nextGrid;
      state.dimensions = {
        rows: safeRows,
        cols: safeCols,
        cellSize: safeCellSize,
      };
      state.selectedCells = [];
      state.selectionAnchor = null;
      state.clipboard = [];
      state.history = [];
      state.historyIndex = -1;
      state.isDirty = false;
      state.previewMode = false;
      state.previewPlaying = false;
      state.recentAction = null;
    }),

  placeBlock: (row, col, type) =>
    set((state) => {
      const { rows, cols } = state.dimensions;

      if (!isWithinGrid(row, col, rows, cols)) {
        return;
      }

      const nextType = validateBlockType(type ?? state.selectedBlockType);
      const previous = state.grid[row][col];

      if (previous && previous.type === nextType) {
        return;
      }

      const nextBlock: BlockData = {
        type: nextType,
        x: col,
        y: row,
        rotation: previous?.rotation ?? 0,
        durability: previous?.durability,
        points: previous?.points,
        powerUp: previous?.powerUp,
        color: previous?.color,
        metadata: previous?.metadata ? { ...previous.metadata } : undefined,
      };

      state.grid[row][col] = nextBlock;
      recordHistory(state, createHistoryEntry("place", row, col, previous, nextBlock));
      state.isDirty = true;
      updateRecentAction(state, {
        action: "place",
        row,
        col,
        timestamp: Date.now(),
      });
    }),

  removeBlock: (row, col) =>
    set((state) => {
      const { rows, cols } = state.dimensions;

      if (!isWithinGrid(row, col, rows, cols)) {
        return;
      }

      const previous = state.grid[row][col];

      if (!previous) {
        return;
      }

      state.grid[row][col] = null;
      recordHistory(state, createHistoryEntry("remove", row, col, previous, null));
      state.isDirty = true;
      removeCellFromSelection(state, row, col);
      updateRecentAction(state, {
        action: "remove",
        row,
        col,
        timestamp: Date.now(),
      });
    }),

  clearGrid: () =>
    set((state) => {
      state.grid = createEmptyGrid(state.dimensions.rows, state.dimensions.cols);
      state.history = [];
      state.historyIndex = -1;
      state.isDirty = false;
      state.selectedCells = [];
      state.selectionAnchor = null;
      state.clipboard = [];
      state.recentAction = null;
    }),

  undo: () =>
    set((state) => {
      if (state.historyIndex < 0) {
        return;
      }

      const entry = state.history[state.historyIndex];
      applyHistoryEntry(state.grid, entry, "undo");
      state.historyIndex -= 1;
      state.isDirty = true;
      pruneSelection(state);
    }),

  redo: () =>
    set((state) => {
      if (state.historyIndex >= state.history.length - 1) {
        return;
      }

      const entry = state.history[state.historyIndex + 1];
      applyHistoryEntry(state.grid, entry, "redo");
      state.historyIndex += 1;
      state.isDirty = true;
      pruneSelection(state);
    }),

  resetEditor: () =>
    set((state) => {
      const next = createInitialEditorState();
      state.grid = next.grid;
      state.dimensions = next.dimensions;
      state.selectedTool = next.selectedTool;
      state.selectedBlockType = next.selectedBlockType;
      state.hoveredCell = next.hoveredCell;
      state.focusedCell = next.focusedCell;
      state.history = next.history;
      state.historyIndex = next.historyIndex;
      state.isDirty = next.isDirty;
      state.previewMode = next.previewMode;
      state.previewPlaying = next.previewPlaying;
      state.recentAction = next.recentAction;
    }),
});

export const useEditorStore = create<EditorStore>()(
  devtools(
    subscribeWithSelector(
      immer((set) => baseStore(set)),
    ),
  ),
);

export const editorActions: EditorActions = {
  setDimensions: (dimensions) => useEditorStore.getState().setDimensions(dimensions),
  setSelectedTool: (tool) => useEditorStore.getState().setSelectedTool(tool),
  setSelectedBlockType: (type) =>
    useEditorStore.getState().setSelectedBlockType(type),
  setHoveredCell: (cell) => useEditorStore.getState().setHoveredCell(cell),
  setFocusedCell: (cell) => useEditorStore.getState().setFocusedCell(cell),
  setSelectionAnchor: (cell) => useEditorStore.getState().setSelectionAnchor(cell),
  selectSingleCell: (cell) => useEditorStore.getState().selectSingleCell(cell),
  selectRegion: (start, end) =>
    useEditorStore.getState().selectRegion(start, end),
  clearSelection: () => useEditorStore.getState().clearSelection(),
  copySelection: () => useEditorStore.getState().copySelection(),
  pasteSelection: (target) => useEditorStore.getState().pasteSelection(target),
  removeSelection: () => useEditorStore.getState().removeSelection(),
  placeBlock: (row, col, type) => useEditorStore.getState().placeBlock(row, col, type),
  removeBlock: (row, col) => useEditorStore.getState().removeBlock(row, col),
  clearGrid: () => useEditorStore.getState().clearGrid(),
  undo: () => useEditorStore.getState().undo(),
  redo: () => useEditorStore.getState().redo(),
  resetEditor: () => useEditorStore.getState().resetEditor(),
  togglePreviewMode: () => useEditorStore.getState().togglePreviewMode(),
  setPreviewMode: (enabled) =>
    useEditorStore.getState().setPreviewMode(enabled),
  startPreview: () => useEditorStore.getState().startPreview(),
  stopPreview: () => useEditorStore.getState().stopPreview(),
  loadLevel: (payload) => useEditorStore.getState().loadLevel(payload),
};

export const __testUtils = {
  clampIndex,
  isWithinGrid,
  createEmptyGrid,
  createHistoryEntry,
  applyHistoryEntry,
};
