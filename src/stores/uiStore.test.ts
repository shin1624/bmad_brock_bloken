import { describe, it, expect, beforeEach, vi } from "vitest";
import { useUIStore, uiActions, UIState } from "./uiStore";

// Zustandストアのテスト用リセット関数
const resetStore = () => {
  useUIStore.getState().resetUIState();
};

describe("UIStore", () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  describe("初期状態", () => {
    it("初期状態が正しく設定されている", () => {
      const state = useUIStore.getState();

      expect(state.currentScreen).toBe("menu");
      expect(state.previousScreen).toBe("menu");
      expect(state.isMenuOpen).toBe(false);
      expect(state.isPauseMenuOpen).toBe(false);
      expect(state.isSettingsOpen).toBe(false);
      expect(state.isGameOverModalOpen).toBe(false);
      expect(state.notifications).toEqual([]);

      expect(state.settings).toEqual({
        soundEnabled: true,
        musicEnabled: true,
        volume: 0.7,
        theme: "light",
        difficulty: "normal",
        controls: "keyboard",
      });

      expect(state.inputState).toEqual({
        isKeyboardActive: false,
        isTouchActive: false,
        isMouseActive: false,
      });
    });
  });

  describe("画面遷移", () => {
    it("画面を設定できる", () => {
      const { setCurrentScreen } = useUIStore.getState();

      setCurrentScreen("game");
      expect(useUIStore.getState().currentScreen).toBe("game");
      expect(useUIStore.getState().previousScreen).toBe("menu");
    });

    it("navigateToScreenでモーダルが閉じられる", () => {
      const { openMenu, openSettings, navigateToScreen } =
        useUIStore.getState();

      openMenu();
      openSettings();
      expect(useUIStore.getState().isMenuOpen).toBe(true);
      expect(useUIStore.getState().isSettingsOpen).toBe(true);

      navigateToScreen("game");

      expect(useUIStore.getState().currentScreen).toBe("game");
      expect(useUIStore.getState().isMenuOpen).toBe(false);
      expect(useUIStore.getState().isSettingsOpen).toBe(false);
    });

    it("navigateBackで前の画面に戻る", () => {
      const { navigateToScreen, navigateBack } = useUIStore.getState();

      navigateToScreen("game");
      expect(useUIStore.getState().currentScreen).toBe("game");
      expect(useUIStore.getState().previousScreen).toBe("menu");

      navigateBack();
      expect(useUIStore.getState().currentScreen).toBe("menu");
      expect(useUIStore.getState().previousScreen).toBe("game");
    });
  });

  describe("メニュー制御", () => {
    it("メニューの開閉ができる", () => {
      const { openMenu, closeMenu, toggleMenu } = useUIStore.getState();

      expect(useUIStore.getState().isMenuOpen).toBe(false);

      openMenu();
      expect(useUIStore.getState().isMenuOpen).toBe(true);

      closeMenu();
      expect(useUIStore.getState().isMenuOpen).toBe(false);

      toggleMenu();
      expect(useUIStore.getState().isMenuOpen).toBe(true);

      toggleMenu();
      expect(useUIStore.getState().isMenuOpen).toBe(false);
    });

    it("一時停止メニューの制御ができる", () => {
      const { openPauseMenu, closePauseMenu, togglePauseMenu } =
        useUIStore.getState();

      expect(useUIStore.getState().isPauseMenuOpen).toBe(false);

      openPauseMenu();
      expect(useUIStore.getState().isPauseMenuOpen).toBe(true);

      closePauseMenu();
      expect(useUIStore.getState().isPauseMenuOpen).toBe(false);

      togglePauseMenu();
      expect(useUIStore.getState().isPauseMenuOpen).toBe(true);
    });

    it("設定メニューの制御ができる", () => {
      const { openSettings, closeSettings, toggleSettings } =
        useUIStore.getState();

      expect(useUIStore.getState().isSettingsOpen).toBe(false);

      openSettings();
      expect(useUIStore.getState().isSettingsOpen).toBe(true);

      closeSettings();
      expect(useUIStore.getState().isSettingsOpen).toBe(false);

      toggleSettings();
      expect(useUIStore.getState().isSettingsOpen).toBe(true);
    });

    it("ゲームオーバーモーダルの制御ができる", () => {
      const { openGameOverModal, closeGameOverModal } = useUIStore.getState();

      expect(useUIStore.getState().isGameOverModalOpen).toBe(false);

      openGameOverModal();
      expect(useUIStore.getState().isGameOverModalOpen).toBe(true);

      closeGameOverModal();
      expect(useUIStore.getState().isGameOverModalOpen).toBe(false);
    });
  });

  describe("設定管理", () => {
    it("設定を部分更新できる", () => {
      const { updateSettings } = useUIStore.getState();

      updateSettings({ volume: 0.5, theme: "dark" });

      const settings = useUIStore.getState().settings;
      expect(settings.volume).toBe(0.5);
      expect(settings.theme).toBe("dark");
      expect(settings.soundEnabled).toBe(true); // 既存値は保持
    });

    it("音声設定のトグルができる", () => {
      const { toggleSound, toggleMusic } = useUIStore.getState();

      expect(useUIStore.getState().settings.soundEnabled).toBe(true);
      toggleSound();
      expect(useUIStore.getState().settings.soundEnabled).toBe(false);

      expect(useUIStore.getState().settings.musicEnabled).toBe(true);
      toggleMusic();
      expect(useUIStore.getState().settings.musicEnabled).toBe(false);
    });

    it("音量設定が範囲内に制限される", () => {
      const { setVolume } = useUIStore.getState();

      setVolume(1.5);
      expect(useUIStore.getState().settings.volume).toBe(1);

      setVolume(-0.5);
      expect(useUIStore.getState().settings.volume).toBe(0);

      setVolume(0.3);
      expect(useUIStore.getState().settings.volume).toBe(0.3);
    });

    it("個別設定項目を設定できる", () => {
      const { setTheme, setDifficulty, setControls } = useUIStore.getState();

      setTheme("dark");
      expect(useUIStore.getState().settings.theme).toBe("dark");

      setDifficulty("hard");
      expect(useUIStore.getState().settings.difficulty).toBe("hard");

      setControls("touch");
      expect(useUIStore.getState().settings.controls).toBe("touch");
    });
  });

  describe("デバッグ表示制御", () => {
    it("デバッグ情報表示をトグルできる", () => {
      const { toggleDebugInfo, setShowDebugInfo } = useUIStore.getState();

      const initialDebugInfo = useUIStore.getState().showDebugInfo;

      toggleDebugInfo();
      expect(useUIStore.getState().showDebugInfo).toBe(!initialDebugInfo);

      setShowDebugInfo(true);
      expect(useUIStore.getState().showDebugInfo).toBe(true);

      setShowDebugInfo(false);
      expect(useUIStore.getState().showDebugInfo).toBe(false);
    });

    it("FPS表示をトグルできる", () => {
      const { toggleFPS, setShowFPS } = useUIStore.getState();

      const initialFPS = useUIStore.getState().showFPS;

      toggleFPS();
      expect(useUIStore.getState().showFPS).toBe(!initialFPS);

      setShowFPS(true);
      expect(useUIStore.getState().showFPS).toBe(true);

      setShowFPS(false);
      expect(useUIStore.getState().showFPS).toBe(false);
    });
  });

  describe("通知管理", () => {
    it("通知を追加できる", () => {
      const { addNotification } = useUIStore.getState();

      addNotification({
        message: "テスト通知",
        type: "info",
      });

      const notifications = useUIStore.getState().notifications;
      expect(notifications).toHaveLength(1);
      expect(notifications[0].message).toBe("テスト通知");
      expect(notifications[0].type).toBe("info");
      expect(notifications[0].id).toBeDefined();
      expect(notifications[0].timestamp).toBeDefined();
    });

    it("通知を削除できる", () => {
      const { addNotification, removeNotification } = useUIStore.getState();

      addNotification({ message: "テスト1", type: "info" });
      addNotification({ message: "テスト2", type: "success" });

      const notifications = useUIStore.getState().notifications;
      expect(notifications).toHaveLength(2);

      const firstId = notifications[0].id;
      removeNotification(firstId);

      const updatedNotifications = useUIStore.getState().notifications;
      expect(updatedNotifications).toHaveLength(1);
      expect(updatedNotifications[0].message).toBe("テスト2");
    });

    it("全通知をクリアできる", () => {
      const { addNotification, clearNotifications } = useUIStore.getState();

      addNotification({ message: "テスト1", type: "info" });
      addNotification({ message: "テスト2", type: "success" });

      expect(useUIStore.getState().notifications).toHaveLength(2);

      clearNotifications();
      expect(useUIStore.getState().notifications).toHaveLength(0);
    });

    it("自動削除タイマー付き通知のテスト", () => {
      vi.useFakeTimers();

      const { addNotification } = useUIStore.getState();

      addNotification({
        message: "自動削除テスト",
        type: "info",
        duration: 1000,
      });

      expect(useUIStore.getState().notifications).toHaveLength(1);

      // 1秒後に自動削除
      vi.advanceTimersByTime(1000);

      // タイマーの実行を待つ
      vi.runAllTimers();

      expect(useUIStore.getState().notifications).toHaveLength(0);

      vi.useRealTimers();
    });
  });

  describe("入力状態管理", () => {
    it("個別入力状態を設定できる", () => {
      const { setKeyboardActive, setTouchActive, setMouseActive } =
        useUIStore.getState();

      setKeyboardActive(true);
      expect(useUIStore.getState().inputState.isKeyboardActive).toBe(true);

      setTouchActive(true);
      expect(useUIStore.getState().inputState.isTouchActive).toBe(true);

      setMouseActive(true);
      expect(useUIStore.getState().inputState.isMouseActive).toBe(true);
    });

    it("入力状態を一括更新できる", () => {
      const { updateInputState } = useUIStore.getState();

      updateInputState({
        isKeyboardActive: true,
        isMouseActive: true,
      });

      const inputState = useUIStore.getState().inputState;
      expect(inputState.isKeyboardActive).toBe(true);
      expect(inputState.isTouchActive).toBe(false); // 既存値保持
      expect(inputState.isMouseActive).toBe(true);
    });
  });

  describe("リセット機能", () => {
    it("UIストアをリセットできる", () => {
      const {
        navigateToScreen,
        openMenu,
        addNotification,
        updateSettings,
        resetUIState,
      } = useUIStore.getState();

      // 状態を変更
      navigateToScreen("game");
      openMenu();
      addNotification({ message: "テスト", type: "info" });
      updateSettings({ volume: 0.3, theme: "dark" });

      // 変更を確認
      expect(useUIStore.getState().currentScreen).toBe("game");
      expect(useUIStore.getState().isMenuOpen).toBe(true);
      expect(useUIStore.getState().notifications).toHaveLength(1);
      expect(useUIStore.getState().settings.volume).toBe(0.3);

      // リセット実行
      resetUIState();

      // 初期状態に戻ったことを確認
      const state = useUIStore.getState();
      expect(state.currentScreen).toBe("menu");
      expect(state.isMenuOpen).toBe(false);
      expect(state.notifications).toHaveLength(0);
      expect(state.settings.volume).toBe(0.7);
      expect(state.settings.theme).toBe("light");
    });
  });

  describe("セレクター関数", () => {
    it("セレクター関数が正しく動作する", () => {
      const { navigateToScreen, openMenu, updateSettings } =
        useUIStore.getState();

      // 状態を変更
      navigateToScreen("game");
      openMenu();
      updateSettings({ theme: "dark" });

      // セレクターで値を取得（実際のコンポーネントでの使用をシミュレート）
      const currentScreen = useUIStore.getState().currentScreen;
      const isMenuOpen = useUIStore.getState().isMenuOpen;
      const settings = useUIStore.getState().settings;

      expect(currentScreen).toBe("game");
      expect(isMenuOpen).toBe(true);
      expect(settings.theme).toBe("dark");
    });
  });

  describe("uiActionsヘルパー", () => {
    it("uiActionsヘルパー関数が動作する", () => {
      uiActions.navigateToScreen("game");
      expect(useUIStore.getState().currentScreen).toBe("game");

      uiActions.openMenu();
      expect(useUIStore.getState().isMenuOpen).toBe(true);

      uiActions.addNotification({ message: "ヘルパーテスト", type: "success" });
      expect(useUIStore.getState().notifications).toHaveLength(1);
      expect(useUIStore.getState().notifications[0].message).toBe(
        "ヘルパーテスト",
      );
    });
  });
});
