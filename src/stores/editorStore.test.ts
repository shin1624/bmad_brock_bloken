import { beforeEach, describe, expect, it } from "vitest";

import {
  BlockType,
  DEFAULT_EDITOR_CELL_SIZE,
  DEFAULT_EDITOR_COLS,
  DEFAULT_EDITOR_ROWS,
} from "../types/editor.types";
import { editorActions, useEditorStore } from "./editorStore";

const resetEditorStore = () => {
  editorActions.resetEditor();
};

describe("editorStore", () => {
  beforeEach(() => {
    resetEditorStore();
  });

  it("初期状態がデフォルト値になっている", () => {
    const state = useEditorStore.getState();

    expect(state.grid).toHaveLength(DEFAULT_EDITOR_ROWS);
    expect(state.grid[0]).toHaveLength(DEFAULT_EDITOR_COLS);
    expect(state.dimensions).toEqual({
      rows: DEFAULT_EDITOR_ROWS,
      cols: DEFAULT_EDITOR_COLS,
      cellSize: DEFAULT_EDITOR_CELL_SIZE,
    });
    expect(state.selectedTool).toBe("select");
    expect(state.selectedBlockType).toBe(BlockType.NORMAL);
    expect(state.history).toHaveLength(0);
    expect(state.historyIndex).toBe(-1);
    expect(state.isDirty).toBe(false);
  });

  it("placeBlockでブロックを配置し履歴が更新される", () => {
    editorActions.placeBlock(2, 3, "hard");

    const state = useEditorStore.getState();
    expect(state.grid[2][3]).toEqual(
      expect.objectContaining({
        type: BlockType.HARD,
        x: 3,
        y: 2,
        rotation: 0,
      }),
    );
    expect(state.history).toHaveLength(1);
    expect(state.history[0]).toMatchObject({
      action: "place",
      row: 2,
      col: 3,
      next: expect.objectContaining({ type: BlockType.HARD }),
    });
    expect(state.historyIndex).toBe(0);
    expect(state.isDirty).toBe(true);
  });

  it("removeBlockでブロックを削除し履歴が記録される", () => {
    editorActions.placeBlock(1, 1, "special");
    editorActions.removeBlock(1, 1);

    const state = useEditorStore.getState();
    expect(state.grid[1][1]).toBeNull();
    expect(state.history).toHaveLength(2);
    expect(state.history[1]).toMatchObject({
      action: "remove",
      row: 1,
      col: 1,
      previous: expect.objectContaining({ type: BlockType.SPECIAL }),
      next: null,
    });
    expect(state.historyIndex).toBe(1);
  });

  it("undoとredoで履歴通りに状態が戻る", () => {
    editorActions.placeBlock(0, 0, "normal");
    editorActions.placeBlock(0, 1, "hard");

    editorActions.undo();
    let state = useEditorStore.getState();
    expect(state.grid[0][1]).toBeNull();
    expect(state.historyIndex).toBe(0);

    editorActions.undo();
    state = useEditorStore.getState();
    expect(state.grid[0][0]).toBeNull();
    expect(state.historyIndex).toBe(-1);

    editorActions.redo();
    state = useEditorStore.getState();
    expect(state.grid[0][0]).toEqual(
      expect.objectContaining({ type: BlockType.NORMAL, x: 0, y: 0 }),
    );
    expect(state.historyIndex).toBe(0);

    editorActions.redo();
    state = useEditorStore.getState();
    expect(state.grid[0][1]).toEqual(
      expect.objectContaining({ type: BlockType.HARD, x: 1, y: 0 }),
    );
    expect(state.historyIndex).toBe(1);
  });

  it("selectSingleCellでブロックを選択できる", () => {
    editorActions.placeBlock(2, 2, "special");
    editorActions.selectSingleCell({ row: 2, col: 2 });

    const state = useEditorStore.getState();
    expect(state.selectedCells).toEqual([{ row: 2, col: 2 }]);
    expect(state.selectionAnchor).toEqual({ row: 2, col: 2 });
  });

  it("selectRegionで範囲内のブロックのみ選択する", () => {
    editorActions.placeBlock(1, 1, "normal");
    editorActions.placeBlock(1, 2, "hard");
    editorActions.placeBlock(2, 1, "power");
    editorActions.placeBlock(3, 3, "special");

    editorActions.selectRegion({ row: 1, col: 1 }, { row: 2, col: 3 });

    const state = useEditorStore.getState();
    expect(state.selectedCells).toEqual(
      expect.arrayContaining([
        { row: 1, col: 1 },
        { row: 1, col: 2 },
        { row: 2, col: 1 },
      ]),
    );
    expect(state.selectedCells).toHaveLength(3);
  });

  it("copySelectionとpasteSelectionで配置を複製できる", () => {
    editorActions.placeBlock(0, 0, "normal");
    editorActions.placeBlock(0, 1, "hard");
    editorActions.selectRegion({ row: 0, col: 0 }, { row: 0, col: 1 });
    editorActions.copySelection();

    editorActions.pasteSelection({ row: 4, col: 4 });

    const state = useEditorStore.getState();

    expect(state.grid[4][4]).toEqual(
      expect.objectContaining({ type: BlockType.NORMAL, x: 4, y: 4 }),
    );
    expect(state.grid[4][5]).toEqual(
      expect.objectContaining({ type: BlockType.HARD, x: 5, y: 4 }),
    );
    expect(state.selectedCells).toEqual(
      expect.arrayContaining([
        { row: 4, col: 4 },
        { row: 4, col: 5 },
      ]),
    );
  });

  it("previewモードの切り替えで再生状態をリセットする", () => {
    editorActions.setPreviewMode(true);
    editorActions.startPreview();

    editorActions.togglePreviewMode();

    const state = useEditorStore.getState();
    expect(state.previewMode).toBe(false);
    expect(state.previewPlaying).toBe(false);
  });

  it("startPreviewはプレビューモード中のみ有効", () => {
    editorActions.resetEditor();
    editorActions.startPreview();

    let state = useEditorStore.getState();
    expect(state.previewPlaying).toBe(false);

    editorActions.setPreviewMode(true);
    editorActions.startPreview();

    state = useEditorStore.getState();
    expect(state.previewPlaying).toBe(true);
  });

  it("setDimensionsでグリッドサイズが変更され履歴がリセットされる", () => {
    editorActions.placeBlock(0, 0, "normal");
    editorActions.setDimensions({ rows: 10, cols: 12, cellSize: 24 });

    const state = useEditorStore.getState();
    expect(state.dimensions.rows).toBe(10);
    expect(state.dimensions.cols).toBe(12);
    expect(state.dimensions.cellSize).toBe(24);
    expect(state.grid).toHaveLength(10);
    expect(state.grid[0]).toHaveLength(12);
    expect(state.grid[0][0]).toEqual(
      expect.objectContaining({ type: BlockType.NORMAL, x: 0, y: 0 }),
    );
    expect(state.history).toHaveLength(0);
    expect(state.historyIndex).toBe(-1);
    expect(state.isDirty).toBe(false);
  });
});
