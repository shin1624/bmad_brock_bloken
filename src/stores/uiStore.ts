import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

/**
 * UI状態のインターフェース定義
 */
export interface UIState {
  // 画面状態管理
  currentScreen: "menu" | "game" | "pause" | "gameOver" | "settings";
  previousScreen: "menu" | "game" | "pause" | "gameOver" | "settings";

  // モーダル・ダイアログ状態
  isMenuOpen: boolean;
  isPauseMenuOpen: boolean;
  isSettingsOpen: boolean;
  isGameOverModalOpen: boolean;

  // ゲーム設定状態
  settings: {
    soundEnabled: boolean;
    musicEnabled: boolean;
    volume: number;
    theme: "light" | "dark";
    difficulty: "easy" | "normal" | "hard";
    controls: "keyboard" | "touch" | "mouse";
  };

  // パフォーマンス・デバッグ表示
  showDebugInfo: boolean;
  showFPS: boolean;

  // 通知・メッセージ
  notifications: Array<{
    id: string;
    message: string;
    type: "info" | "success" | "warning" | "error";
    timestamp: number;
    duration?: number;
  }>;

  // 入力状態
  inputState: {
    isKeyboardActive: boolean;
    isTouchActive: boolean;
    isMouseActive: boolean;
  };
}

/**
 * UIストアのアクション定義
 */
export interface UIActions {
  // 画面遷移
  setCurrentScreen: (screen: UIState["currentScreen"]) => void;
  navigateToScreen: (screen: UIState["currentScreen"]) => void;
  navigateBack: () => void;

  // モーダル・ダイアログ制御
  openMenu: () => void;
  closeMenu: () => void;
  toggleMenu: () => void;

  openPauseMenu: () => void;
  closePauseMenu: () => void;
  togglePauseMenu: () => void;

  openSettings: () => void;
  closeSettings: () => void;
  toggleSettings: () => void;

  openGameOverModal: () => void;
  closeGameOverModal: () => void;

  // 設定変更
  updateSettings: (settings: Partial<UIState["settings"]>) => void;
  toggleSound: () => void;
  toggleMusic: () => void;
  setVolume: (volume: number) => void;
  setTheme: (theme: UIState["settings"]["theme"]) => void;
  setDifficulty: (difficulty: UIState["settings"]["difficulty"]) => void;
  setControls: (controls: UIState["settings"]["controls"]) => void;

  // デバッグ・パフォーマンス
  toggleDebugInfo: () => void;
  toggleFPS: () => void;
  setShowDebugInfo: (show: boolean) => void;
  setShowFPS: (show: boolean) => void;

  // 通知管理
  addNotification: (
    notification: Omit<UIState["notifications"][0], "id" | "timestamp">,
  ) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;

  // 入力状態管理
  setKeyboardActive: (active: boolean) => void;
  setTouchActive: (active: boolean) => void;
  setMouseActive: (active: boolean) => void;
  updateInputState: (inputState: Partial<UIState["inputState"]>) => void;

  // リセット
  resetUIState: () => void;
}

/**
 * 初期UI状態
 */
const initialState: UIState = {
  currentScreen: "menu",
  previousScreen: "menu",

  isMenuOpen: false,
  isPauseMenuOpen: false,
  isSettingsOpen: false,
  isGameOverModalOpen: false,

  settings: {
    soundEnabled: true,
    musicEnabled: true,
    volume: 0.7,
    theme: "light",
    difficulty: "normal",
    controls: "keyboard",
  },

  showDebugInfo: process.env.NODE_ENV === "development",
  showFPS: process.env.NODE_ENV === "development",

  notifications: [],

  inputState: {
    isKeyboardActive: false,
    isTouchActive: false,
    isMouseActive: false,
  },
};

/**
 * UIストア - Zustandベースの状態管理
 */
export const useUIStore = create<UIState & UIActions>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // 初期状態
        ...initialState,

        // 画面遷移アクション
        setCurrentScreen: (screen) =>
          set((state) => {
            state.previousScreen = state.currentScreen;
            state.currentScreen = screen;
          }),

        navigateToScreen: (screen) =>
          set((state) => {
            state.previousScreen = state.currentScreen;
            state.currentScreen = screen;

            // 画面遷移時にモーダルを閉じる
            state.isMenuOpen = false;
            state.isPauseMenuOpen = false;
            state.isSettingsOpen = false;
          }),

        navigateBack: () =>
          set((state) => {
            const temp = state.currentScreen;
            state.currentScreen = state.previousScreen;
            state.previousScreen = temp;
          }),

        // メニュー制御
        openMenu: () =>
          set((state) => {
            state.isMenuOpen = true;
          }),

        closeMenu: () =>
          set((state) => {
            state.isMenuOpen = false;
          }),

        toggleMenu: () =>
          set((state) => {
            state.isMenuOpen = !state.isMenuOpen;
          }),

        // 一時停止メニュー制御
        openPauseMenu: () =>
          set((state) => {
            state.isPauseMenuOpen = true;
          }),

        closePauseMenu: () =>
          set((state) => {
            state.isPauseMenuOpen = false;
          }),

        togglePauseMenu: () =>
          set((state) => {
            state.isPauseMenuOpen = !state.isPauseMenuOpen;
          }),

        // 設定メニュー制御
        openSettings: () =>
          set((state) => {
            state.isSettingsOpen = true;
          }),

        closeSettings: () =>
          set((state) => {
            state.isSettingsOpen = false;
          }),

        toggleSettings: () =>
          set((state) => {
            state.isSettingsOpen = !state.isSettingsOpen;
          }),

        // ゲームオーバーモーダル制御
        openGameOverModal: () =>
          set((state) => {
            state.isGameOverModalOpen = true;
          }),

        closeGameOverModal: () =>
          set((state) => {
            state.isGameOverModalOpen = false;
          }),

        // 設定更新
        updateSettings: (newSettings) =>
          set((state) => {
            Object.assign(state.settings, newSettings);
          }),

        toggleSound: () =>
          set((state) => {
            state.settings.soundEnabled = !state.settings.soundEnabled;
          }),

        toggleMusic: () =>
          set((state) => {
            state.settings.musicEnabled = !state.settings.musicEnabled;
          }),

        setVolume: (volume) =>
          set((state) => {
            state.settings.volume = Math.max(0, Math.min(1, volume));
          }),

        setTheme: (theme) =>
          set((state) => {
            state.settings.theme = theme;
          }),

        setDifficulty: (difficulty) =>
          set((state) => {
            state.settings.difficulty = difficulty;
          }),

        setControls: (controls) =>
          set((state) => {
            state.settings.controls = controls;
          }),

        // デバッグ表示制御
        toggleDebugInfo: () =>
          set((state) => {
            state.showDebugInfo = !state.showDebugInfo;
          }),

        toggleFPS: () =>
          set((state) => {
            state.showFPS = !state.showFPS;
          }),

        setShowDebugInfo: (show) =>
          set((state) => {
            state.showDebugInfo = show;
          }),

        setShowFPS: (show) =>
          set((state) => {
            state.showFPS = show;
          }),

        // 通知管理
        addNotification: (notification) =>
          set((state) => {
            const newNotification = {
              ...notification,
              id: crypto.randomUUID(),
              timestamp: Date.now(),
            };
            state.notifications.push(newNotification);

            // 自動削除設定がある場合の処理
            if (notification.duration) {
              setTimeout(() => {
                get().removeNotification(newNotification.id);
              }, notification.duration);
            }
          }),

        removeNotification: (id) =>
          set((state) => {
            state.notifications = state.notifications.filter(
              (n) => n.id !== id,
            );
          }),

        clearNotifications: () =>
          set((state) => {
            state.notifications = [];
          }),

        // 入力状態管理
        setKeyboardActive: (active) =>
          set((state) => {
            state.inputState.isKeyboardActive = active;
          }),

        setTouchActive: (active) =>
          set((state) => {
            state.inputState.isTouchActive = active;
          }),

        setMouseActive: (active) =>
          set((state) => {
            state.inputState.isMouseActive = active;
          }),

        updateInputState: (inputState) =>
          set((state) => {
            Object.assign(state.inputState, inputState);
          }),

        // リセット
        resetUIState: () =>
          set(() => ({
            ...initialState,
          })),
      })),
    ),
    {
      name: "ui-store",
      enabled: process.env.NODE_ENV === "development",
    },
  ),
);

// セレクター関数（パフォーマンス最適化用）
export const useCurrentScreen = () =>
  useUIStore((state) => state.currentScreen);
export const useIsMenuOpen = () => useUIStore((state) => state.isMenuOpen);
export const useIsPauseMenuOpen = () =>
  useUIStore((state) => state.isPauseMenuOpen);
export const useIsSettingsOpen = () =>
  useUIStore((state) => state.isSettingsOpen);
export const useSettings = () => useUIStore((state) => state.settings);
export const useNotifications = () =>
  useUIStore((state) => state.notifications);
export const useInputState = () => useUIStore((state) => state.inputState);
export const useDebugInfo = () =>
  useUIStore((state) => ({
    showDebugInfo: state.showDebugInfo,
    showFPS: state.showFPS,
  }));

// アクション関数のエクスポート（コンポーネントで使いやすくするため）
export const uiActions = {
  setCurrentScreen: (screen: UIState["currentScreen"]) =>
    useUIStore.getState().setCurrentScreen(screen),
  navigateToScreen: (screen: UIState["currentScreen"]) =>
    useUIStore.getState().navigateToScreen(screen),
  navigateBack: () => useUIStore.getState().navigateBack(),

  openMenu: () => useUIStore.getState().openMenu(),
  closeMenu: () => useUIStore.getState().closeMenu(),
  toggleMenu: () => useUIStore.getState().toggleMenu(),

  openPauseMenu: () => useUIStore.getState().openPauseMenu(),
  closePauseMenu: () => useUIStore.getState().closePauseMenu(),
  togglePauseMenu: () => useUIStore.getState().togglePauseMenu(),

  openSettings: () => useUIStore.getState().openSettings(),
  closeSettings: () => useUIStore.getState().closeSettings(),
  toggleSettings: () => useUIStore.getState().toggleSettings(),

  addNotification: (
    notification: Omit<UIState["notifications"][0], "id" | "timestamp">,
  ) => useUIStore.getState().addNotification(notification),
  removeNotification: (id: string) =>
    useUIStore.getState().removeNotification(id),
  clearNotifications: () => useUIStore.getState().clearNotifications(),
};
