import { useEffect } from "react";

import { useEditorStore } from "../../../stores/editorStore";
import { EditorTool, EditorToolValue } from "../../../types/editor.types";
import styles from "./EditorTools.module.css";

interface EditorToolsProps {
  onSaveLevel?: () => void;
  onToggleShortcuts?: () => void;
}

const noop = (): void => {};

const TOOL_OPTIONS: Array<{ tool: EditorToolValue; label: string; shortcut: string }> = [
  { tool: EditorTool.SELECT, label: "選択", shortcut: "V" },
  { tool: EditorTool.PLACE, label: "配置", shortcut: "B" },
  { tool: EditorTool.ERASE, label: "削除", shortcut: "E" },
  { tool: EditorTool.FILL, label: "塗りつぶし", shortcut: "F" },
];

const EditorTools = ({
  onSaveLevel = noop,
  onToggleShortcuts = noop,
}: EditorToolsProps): JSX.Element => {
  const selectedTool = useEditorStore((state) => state.selectedTool);
  const setSelectedTool = useEditorStore((state) => state.setSelectedTool);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const clearGrid = useEditorStore((state) => state.clearGrid);
  const copySelection = useEditorStore((state) => state.copySelection);
  const pasteSelection = useEditorStore((state) => state.pasteSelection);
  const clearSelection = useEditorStore((state) => state.clearSelection);
  const selectedCount = useEditorStore((state) => state.selectedCells.length);
  const clipboardCount = useEditorStore((state) => state.clipboard.length);
  const previewMode = useEditorStore((state) => state.previewMode);
  const previewPlaying = useEditorStore((state) => state.previewPlaying);
  const togglePreviewMode = useEditorStore((state) => state.togglePreviewMode);
  const startPreview = useEditorStore((state) => state.startPreview);
  const stopPreview = useEditorStore((state) => state.stopPreview);
  const removeSelection = useEditorStore((state) => state.removeSelection);

  const canCopy = selectedCount > 0;
  const canPaste = clipboardCount > 0;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMeta = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (isMeta) {
        if (previewMode) {
          if (key === " " || key === "enter") {
            event.preventDefault();
            if (previewPlaying) {
              stopPreview();
            } else {
              startPreview();
            }
            return;
          }
        }

        if (key === "z" && !previewMode) {
          event.preventDefault();
          if (event.shiftKey) {
            redo();
          } else {
            undo();
          }
          return;
        }

        if (key === "y" && !previewMode) {
          event.preventDefault();
          redo();
          return;
        }

        if (key === "c" && !previewMode) {
          event.preventDefault();
          if (selectedCount > 0) {
            copySelection();
          }
          return;
        }

        if (key === "v" && !previewMode) {
          event.preventDefault();
          pasteSelection();
          return;
        }

        if (key === "s" && !previewMode) {
          event.preventDefault();
          onSaveLevel();
          return;
        }
      }

      if (!isMeta && event.key === "Escape") {
        if (previewMode) {
          togglePreviewMode();
          return;
        }

        if (selectedCount > 0) {
          event.preventDefault();
          clearSelection();
        }

        return;
      }

      if (
        !isMeta &&
        !previewMode &&
        (event.key === "Delete" || event.key === "Backspace") &&
        selectedCount > 0
      ) {
        event.preventDefault();
        removeSelection();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    clearSelection,
    copySelection,
    previewMode,
    previewPlaying,
    pasteSelection,
    redo,
    selectedCount,
    removeSelection,
    startPreview,
    stopPreview,
    togglePreviewMode,
    undo,
    onSaveLevel,
  ]);

  const handlePreviewToggle = () => {
    if (previewMode) {
      stopPreview();
    }
    togglePreviewMode();
  };

  const handlePreviewPlay = () => {
    if (previewPlaying) {
      stopPreview();
    } else {
      startPreview();
    }
  };

  return (
    <section className={styles.tools} aria-label="エディター操作">
      <div className={styles.toolbar} data-testid="editor-tools">
        {TOOL_OPTIONS.map((option) => {
          const isActive = option.tool === selectedTool;

          return (
            <button
              key={option.tool}
              type="button"
              className={isActive ? styles.activeTool : styles.tool}
              onClick={() => setSelectedTool(option.tool)}
              data-tool={option.tool}
              title={`${option.label} (${option.shortcut})`}
              disabled={previewMode}
            >
              <span>{option.label}</span>
              <kbd className={styles.shortcut}>{option.shortcut}</kbd>
            </button>
          );
        })}
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.actionButton}
          onClick={undo}
          data-testid="editor-undo"
          title="Undo (⌘/Ctrl + Z)"
          disabled={previewMode}
        >
          Undo
        </button>
        <button
          type="button"
          className={styles.actionButton}
          onClick={redo}
          data-testid="editor-redo"
          title="Redo (⌘/Ctrl + Shift + Z or ⌘/Ctrl + Y)"
          disabled={previewMode}
        >
          Redo
        </button>
        <button
          type="button"
          className={styles.dangerButton}
          onClick={clearGrid}
          data-testid="editor-clear"
          disabled={previewMode}
        >
          Clear Grid
        </button>
      </div>

      <div className={styles.selectionActions}>
        <button
          type="button"
          className={styles.actionButton}
          onClick={copySelection}
          disabled={!canCopy}
          title="Copy selection (⌘/Ctrl + C)"
          data-testid="editor-copy"
        >
          Copy
        </button>
        <button
          type="button"
          className={styles.actionButton}
          onClick={() => pasteSelection()}
          disabled={!canPaste}
          title="Paste selection (⌘/Ctrl + V)"
          data-testid="editor-paste"
        >
          Paste
        </button>
        <button
          type="button"
          className={styles.actionButton}
          onClick={clearSelection}
          disabled={!canCopy}
          title="Clear selection (Esc)"
          data-testid="editor-clear-selection"
        >
          Clear Selection
        </button>
      </div>

      <div className={styles.miscActions}>
        <button
          type="button"
          className={styles.actionButton}
          onClick={onSaveLevel}
          title="Save level (⌘/Ctrl + S)"
          data-testid="editor-save"
        >
          Save Level
        </button>
        <button
          type="button"
          className={styles.actionButton}
          onClick={onToggleShortcuts}
          data-testid="editor-shortcuts"
        >
          Show Shortcuts
        </button>
      </div>

      <div className={styles.previewActions}>
        <button
          type="button"
          className={previewMode ? styles.previewActive : styles.previewButton}
          onClick={handlePreviewToggle}
          data-testid="editor-preview-toggle"
        >
          {previewMode ? "Exit Preview" : "Enter Preview"}
        </button>
        {previewMode ? (
          <button
            type="button"
            className={styles.previewButton}
            onClick={handlePreviewPlay}
            data-testid="editor-preview-play"
          >
            {previewPlaying ? "Stop Play" : "Play Preview"}
          </button>
        ) : null}
      </div>
    </section>
  );
};

export default EditorTools;
