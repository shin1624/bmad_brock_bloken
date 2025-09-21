import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import EditorTools from "./EditorTools";
import { editorActions, useEditorStore } from "../../../stores/editorStore";
import { BlockType } from "../../../types/editor.types";

describe("EditorTools", () => {
  beforeEach(() => {
    editorActions.resetEditor();
  });

  it("enables copy and paste actions based on selection state", async () => {
    render(<EditorTools />);

    const copyButton = screen.getByTestId("editor-copy") as HTMLButtonElement;
    const pasteButton = screen.getByTestId("editor-paste") as HTMLButtonElement;

    expect(copyButton.disabled).toBe(true);
    expect(pasteButton.disabled).toBe(true);

    act(() => {
      editorActions.placeBlock(0, 0, BlockType.NORMAL);
      editorActions.selectSingleCell({ row: 0, col: 0 });
    });

    await waitFor(() => {
      expect(copyButton.disabled).toBe(false);
    });

    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(pasteButton.disabled).toBe(false);
    });

    act(() => {
      editorActions.setHoveredCell({ row: 2, col: 2 });
    });

    fireEvent.click(pasteButton);

    await waitFor(() => {
      const state = useEditorStore.getState();
      expect(state.grid[2][2]).toEqual(
        expect.objectContaining({ type: BlockType.NORMAL, x: 2, y: 2 }),
      );
    });
  });

  it("toggles preview mode and playback controls", async () => {
    render(<EditorTools />);

    const previewToggle = screen.getByTestId("editor-preview-toggle");
    expect(previewToggle).toHaveTextContent("Enter Preview");

    fireEvent.click(previewToggle);

    await waitFor(() => {
      expect(useEditorStore.getState().previewMode).toBe(true);
    });

    expect(previewToggle).toHaveTextContent("Exit Preview");

    const playButton = screen.getByTestId("editor-preview-play");
    fireEvent.click(playButton);

    await waitFor(() => {
      expect(useEditorStore.getState().previewPlaying).toBe(true);
    });

    fireEvent.click(previewToggle);

    await waitFor(() => {
      const state = useEditorStore.getState();
      expect(state.previewMode).toBe(false);
      expect(state.previewPlaying).toBe(false);
    });
  });

  it("invokes save handler via buttonとショートカット", async () => {
    const handleSave = vi.fn();
    render(<EditorTools onSaveLevel={handleSave} />);

    const saveButton = screen.getByTestId("editor-save");
    fireEvent.click(saveButton);

    expect(handleSave).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });

    await waitFor(() => {
      expect(handleSave).toHaveBeenCalledTimes(2);
    });
  });

  it("invokesショートカットダイアログトグル", () => {
    const handleToggle = vi.fn();
    render(<EditorTools onToggleShortcuts={handleToggle} />);

    const shortcutButton = screen.getByTestId("editor-shortcuts");
    fireEvent.click(shortcutButton);

    expect(handleToggle).toHaveBeenCalledTimes(1);
  });

  it("deleteキーで選択セルを削除する", async () => {
    render(<EditorTools />);

    act(() => {
      editorActions.placeBlock(0, 0, BlockType.NORMAL);
      editorActions.selectSingleCell({ row: 0, col: 0 });
    });

    fireEvent.keyDown(window, { key: "Delete" });

    await waitFor(() => {
      const state = useEditorStore.getState();
      expect(state.grid[0][0]).toBeNull();
      expect(state.selectedCells).toHaveLength(0);
    });
  });
});
