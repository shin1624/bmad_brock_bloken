import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { editorActions } from "../../../stores/editorStore";
import { useEditorStore } from "../../../stores/editorStore";
import { BlockData, SerializedBlockData } from "../../../types/editor.types";
import { LevelService, type LevelRecord, type LevelSummary } from "../../../services/LevelService";
import { BlockPalette } from "../BlockPalette";
import { EditorCanvas } from "../EditorCanvas";
import { EditorProvider } from "../EditorProvider";
import { EditorTools } from "../EditorTools";
import styles from "./EditorWorkspace.module.css";

interface StatusMessage {
  tone: "success" | "error" | "info";
  text: string;
}

const serializeGrid = (grid: (BlockData | null)[][]): SerializedBlockData[] => {
  const blocks: SerializedBlockData[] = [];

  grid.forEach((row) => {
    row.forEach((cell) => {
      if (cell) {
        blocks.push({
          type: cell.type,
          x: cell.x,
          y: cell.y,
          durability: cell.durability,
          points: cell.points,
          powerUp: cell.powerUp,
          color: cell.color,
          rotation: cell.rotation,
          metadata: cell.metadata ? { ...cell.metadata } : undefined,
        });
      }
    });
  });

  return blocks;
};

const SHORTCUTS: Array<{ keys: string; description: string }> = [
  { keys: "⌘ / Ctrl + S", description: "レベルを保存" },
  { keys: "⌘ / Ctrl + Z", description: "元に戻す" },
  { keys: "⌘ / Ctrl + Shift + Z / Y", description: "やり直す" },
  { keys: "⌘ / Ctrl + C", description: "選択をコピー" },
  { keys: "⌘ / Ctrl + V", description: "貼り付け" },
  { keys: "Delete", description: "選択を削除" },
  { keys: "Esc", description: "選択解除 / プレビュー終了" },
  { keys: "Space / Enter (プレビュー中)", description: "プレビューの再生/停止" },
];

const STATUS_TIMEOUT = 4_000;

const ShortcutsDialog = ({ onClose }: { onClose: () => void }): JSX.Element => {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handler);

    return () => {
      window.removeEventListener("keydown", handler);
    };
  }, [onClose]);

  return (
    <div className={styles.dialogBackdrop} role="presentation">
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcut-dialog-title"
        tabIndex={-1}
      >
        <div className={styles.dialogHeader}>
          <h2 id="shortcut-dialog-title">ショートカット一覧</h2>
          <button type="button" onClick={onClose} className={styles.dialogClose}>
            閉じる
          </button>
        </div>

        <dl className={styles.shortcutList}>
          {SHORTCUTS.map((shortcut) => (
            <div key={shortcut.keys} className={styles.shortcutRow}>
              <dt>{shortcut.description}</dt>
              <dd>{shortcut.keys}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
};

const loadSavedLevels = (): LevelSummary[] => {
  try {
    return LevelService.listLevels();
  } catch (error) {
    console.error("Failed to list levels", error);
    return [];
  }
};

const EditorWorkspace = (): JSX.Element => {
  const [levelName, setLevelName] = useState<string>("Untitled Level");
  const [levels, setLevels] = useState<LevelSummary[]>(() => loadSavedLevels());
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const statusTimerRef = useRef<number | null>(null);

  const previewMode = useEditorStore((state) => state.previewMode);

  const dismissStatus = useCallback(() => {
    if (statusTimerRef.current) {
      window.clearTimeout(statusTimerRef.current);
      statusTimerRef.current = null;
    }
    setStatus(null);
  }, []);

  const showStatus = useCallback((message: StatusMessage) => {
    dismissStatus();
    setStatus(message);
    statusTimerRef.current = window.setTimeout(() => {
      setStatus(null);
      statusTimerRef.current = null;
    }, STATUS_TIMEOUT);
  }, [dismissStatus]);

  useEffect(() => () => dismissStatus(), [dismissStatus]);

  const refreshLevels = useCallback(() => {
    setLevels(loadSavedLevels());
  }, []);

  const handleSaveLevel = useCallback(async () => {
    if (isSaving) {
      return;
    }

    const trimmedName = levelName.trim();

    if (!trimmedName) {
      showStatus({ tone: "error", text: "レベル名を入力してください" });
      return;
    }

    try {
      setIsSaving(true);
      const { grid, dimensions } = useEditorStore.getState();
      const blocks = serializeGrid(grid as unknown as (SerializedBlockData | null)[][]);

      const saved = LevelService.saveLevel({
        id: selectedLevelId ?? undefined,
        name: trimmedName,
        rows: dimensions.rows,
        cols: dimensions.cols,
        cellSize: dimensions.cellSize,
        blocks,
      });

      setSelectedLevelId(saved.id);
      setLevelName(saved.name);
      refreshLevels();
      showStatus({ tone: "success", text: "レベルを保存しました" });
    } catch (error) {
      console.error("Failed to save level", error);
      showStatus({ tone: "error", text: "レベルの保存に失敗しました" });
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, levelName, refreshLevels, selectedLevelId, showStatus]);

  const loadLevelRecord = useCallback(
    (record: LevelRecord) => {
      editorActions.loadLevel({
        rows: record.rows,
        cols: record.cols,
        cellSize: record.cellSize,
        blocks: record.blocks,
      });
      setLevelName(record.name);
      setSelectedLevelId(record.id);
      showStatus({ tone: "info", text: "レベルを読み込みました" });
    },
    [showStatus],
  );

  const handleSelectLevel = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const id = event.target.value || null;
      setSelectedLevelId(id);

      if (!id) {
        return;
      }

      const record = LevelService.loadLevel(id);

      if (!record) {
        showStatus({ tone: "error", text: "レベルが見つかりません" });
        refreshLevels();
        return;
      }

      loadLevelRecord(record);
    },
    [loadLevelRecord, refreshLevels, showStatus],
  );

  const handleDeleteLevel = useCallback(() => {
    if (!selectedLevelId) {
      showStatus({ tone: "error", text: "削除するレベルを選択してください" });
      return;
    }

    LevelService.deleteLevel(selectedLevelId);
    refreshLevels();
    setSelectedLevelId(null);
    editorActions.resetEditor();
    setLevelName("Untitled Level");
    showStatus({ tone: "info", text: "レベルを削除しました" });
  }, [refreshLevels, selectedLevelId, showStatus]);

  const handleCreateNew = useCallback(() => {
    editorActions.resetEditor();
    setLevelName("Untitled Level");
    setSelectedLevelId(null);
    showStatus({ tone: "info", text: "新しいレベルを開始しました" });
  }, [showStatus]);

  const headerStatusToneClass = useMemo(() => {
    if (!status) {
      return undefined;
    }
    if (status.tone === "error") {
      return styles.statusError;
    }
    if (status.tone === "success") {
      return styles.statusSuccess;
    }
    return styles.statusInfo;
  }, [status]);

  return (
    <div className={styles.workspace}>
      <header className={styles.header}>
        <div className={styles.brand}>B-Mad Level Editor</div>
        <nav className={styles.nav} aria-label="主要ナビゲーション">
          <a href="#editor" className={styles.navLink}>
            エディター
          </a>
          <button type="button" className={styles.navButton} onClick={() => setShortcutsOpen(true)}>
            ショートカット
          </button>
        </nav>
      </header>

      <section className={styles.controlsSection} aria-label="レベル管理">
        <div className={styles.controlGroup}>
          <label className={styles.fieldLabel} htmlFor="level-name">
            レベル名
          </label>
          <input
            id="level-name"
            className={styles.textField}
            value={levelName}
            onChange={(event) => setLevelName(event.target.value)}
            placeholder="Untitled Level"
          />
        </div>

        <div className={styles.controlGroup}>
          <label className={styles.fieldLabel} htmlFor="level-select">
            保存済みレベル
          </label>
          <select
            id="level-select"
            className={styles.selectField}
            value={selectedLevelId ?? ""}
            onChange={handleSelectLevel}
          >
            <option value="">新規レベル</option>
            {levels.map((level) => (
              <option key={level.id} value={level.id}>
                {level.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.primaryActions}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={handleSaveLevel}
            disabled={isSaving}
          >
            {isSaving ? "保存中..." : "レベルを保存"}
          </button>
          <button type="button" className={styles.secondaryButton} onClick={handleCreateNew}>
            新規
          </button>
          <button type="button" className={styles.secondaryButton} onClick={handleDeleteLevel}>
            削除
          </button>
        </div>

        <div className={styles.statusArea} aria-live="polite">
          {status ? <span className={headerStatusToneClass}>{status.text}</span> : null}
        </div>
      </section>

      <EditorProvider>
        <div className={styles.layout} id="editor">
          <aside className={styles.sidebar}>
            <EditorTools
              onSaveLevel={handleSaveLevel}
              onToggleShortcuts={() => setShortcutsOpen(true)}
            />
          </aside>

          <main className={styles.canvasColumn}>
            <EditorCanvas />
          </main>

          <aside className={styles.paletteColumn}>
            <BlockPalette />
          </aside>
        </div>
      </EditorProvider>

      {shortcutsOpen ? <ShortcutsDialog onClose={() => setShortcutsOpen(false)} /> : null}
    </div>
  );
};

export default EditorWorkspace;
