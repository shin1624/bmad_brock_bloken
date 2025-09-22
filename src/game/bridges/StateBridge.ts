import { gameStateManager } from "../core/GameState";
import { eventBus, GameEventType } from "../core/EventBus";
import { useUIStore } from "../../stores/uiStore";
import type { GameState } from "../../types/game.types";

/**
 * React-Canvas状態同期システム
 * ゲーム状態とUI状態の双方向同期を管理
 */
export class StateBridge {
  private static instance: StateBridge | null = null;
  private isInitialized = false;
  private unsubscribeCallbacks: (() => void)[] = [];

  private constructor() {}

  /**
   * シングルトンインスタンス取得
   */
  static getInstance(): StateBridge {
    if (!StateBridge.instance) {
      StateBridge.instance = new StateBridge();
    }
    return StateBridge.instance;
  }

  /**
   * 状態同期システム初期化
   */
  initialize(): void {
    if (this.isInitialized) {
      console.warn("StateBridge is already initialized");
      return;
    }

    this.setupGameToUISync();
    this.setupUIToGameSync();
    this.setupEventSync();

    this.isInitialized = true;
    console.log("StateBridge initialized successfully");
  }

  /**
   * ゲーム状態からUI状態への同期
   */
  private setupGameToUISync(): void {
    // ゲーム状態変更をUIに反映
    const gameStateUnsubscribe = gameStateManager.subscribe(
      (gameState: Readonly<GameState>) => {
        // 同期的にUI状態を更新
        this.syncScreenState(gameState);

        // ゲームオーバー状態の同期
        this.syncGameOverState(gameState);
      },
    );

    this.unsubscribeCallbacks.push(gameStateUnsubscribe);
  }

  /**
   * UI状態からゲーム状態への同期
   */
  private setupUIToGameSync(): void {
    let previousScreen = useUIStore.getState().currentScreen;
    let previousSettings = useUIStore.getState().settings;

    // UI画面変更をゲーム状態に反映
    const screenUnsubscribe = useUIStore.subscribe((state) => {
      const currentScreen = state.currentScreen;
      if (currentScreen !== previousScreen) {
        this.syncGameStateFromScreen(currentScreen, previousScreen);
        previousScreen = currentScreen;
      }
    });

    // 設定変更をゲームに反映（設定のみを監視）
    const settingsUnsubscribe = useUIStore.subscribe(
      (state) => state.settings,
      (currentSettings) => {
        if (previousSettings && currentSettings !== previousSettings) {
          this.syncGameSettings(currentSettings, previousSettings);
          previousSettings = { ...currentSettings };
        } else if (!previousSettings) {
          previousSettings = { ...currentSettings };
        }
      },
    );

    this.unsubscribeCallbacks.push(screenUnsubscribe);
    this.unsubscribeCallbacks.push(settingsUnsubscribe);
  }

  /**
   * イベントベースの同期
   */
  private setupEventSync(): void {
    // ゲームイベントをUI通知として表示
    eventBus.on(GameEventType.SCORE_UPDATE, (payload) => {
      const uiStore = useUIStore.getState();
      uiStore.addNotification({
        message: `スコア: +${payload.delta}`,
        type: "success",
        duration: 2000,
      });
    });

    eventBus.on(GameEventType.LIVES_UPDATE, (payload) => {
      if (payload.delta < 0) {
        const uiStore = useUIStore.getState();
        uiStore.addNotification({
          message: `ライフ -${Math.abs(payload.delta)}`,
          type: "warning",
          duration: 3000,
        });
      }
    });

    eventBus.on(GameEventType.LEVEL_COMPLETE, (payload) => {
      const uiStore = useUIStore.getState();
      uiStore.addNotification({
        message: `レベル${payload.level}クリア！`,
        type: "success",
        duration: 4000,
      });
    });

    eventBus.on(GameEventType.POWERUP_COLLECTED, (payload) => {
      const uiStore = useUIStore.getState();
      uiStore.addNotification({
        message: `パワーアップ獲得: ${payload.type}`,
        type: "info",
        duration: 3000,
      });
    });

    eventBus.on(GameEventType.GAME_OVER, (payload) => {
      const uiStore = useUIStore.getState();
      uiStore.addNotification({
        message: `ゲームオーバー - スコア: ${payload.score}`,
        type: "error",
        duration: 5000,
      });
      // UI画面もゲームオーバー画面に切り替え
      uiStore.navigateToScreen("gameOver");
    });
  }

  /**
   * ゲーム状態に基づくUI画面同期
   */
  private syncScreenState(gameState: Readonly<GameState>): void {
    const uiStore = useUIStore.getState();
    const currentUIScreen = uiStore.currentScreen;

    switch (gameState.gameStatus) {
      case "idle":
        if (currentUIScreen !== "menu") {
          uiStore.setCurrentScreen("menu");
        }
        break;

      case "playing":
        if (currentUIScreen !== "game") {
          uiStore.setCurrentScreen("game");
        }
        // プレイ中はメニューを閉じる
        if (uiStore.isMenuOpen) {
          uiStore.closeMenu();
        }
        break;

      case "paused":
        if (currentUIScreen === "game" && !uiStore.isPauseMenuOpen) {
          uiStore.openPauseMenu();
        }
        break;

      case "gameOver":
        if (currentUIScreen !== "gameOver") {
          uiStore.setCurrentScreen("gameOver");
        }
        break;

      case "victory":
        // 勝利状態の処理（将来の拡張用）
        break;
    }
  }

  /**
   * ゲームオーバー状態の同期
   */
  private syncGameOverState(gameState: Readonly<GameState>): void {
    const uiStore = useUIStore.getState();

    if (gameState.gameStatus === "gameOver" && !uiStore.isGameOverModalOpen) {
      uiStore.openGameOverModal();
    } else if (
      gameState.gameStatus !== "gameOver" &&
      uiStore.isGameOverModalOpen
    ) {
      uiStore.closeGameOverModal();
    }
  }

  /**
   * UI画面変更からゲーム状態同期
   */
  private syncGameStateFromScreen(
    currentScreen: string,
    previousScreen: string,
  ): void {
    const currentGameState = gameStateManager.getState();

    switch (currentScreen) {
      case "menu":
        if (
          currentGameState.gameStatus === "playing" ||
          currentGameState.gameStatus === "paused"
        ) {
          // メニューに戻る場合はゲームを一時停止
          gameStateManager.setGameStatus("paused");
        } else if (currentGameState.gameStatus === "gameOver") {
          // ゲームオーバーからメニューに戻る場合はリセット
          gameStateManager.reset();
        }
        break;

      case "game":
        if (currentGameState.gameStatus === "idle") {
          // ゲーム開始
          gameStateManager.setGameStatus("playing");
          eventBus.emit(GameEventType.GAME_START, undefined);
        } else if (currentGameState.gameStatus === "paused") {
          // 一時停止から再開
          gameStateManager.setGameStatus("playing");
          eventBus.emit(GameEventType.GAME_RESUME, undefined);
        }
        break;

      case "pause":
        if (currentGameState.gameStatus === "playing") {
          gameStateManager.setGameStatus("paused");
          eventBus.emit(GameEventType.GAME_PAUSE, undefined);
        }
        break;
    }
  }

  /**
   * UI設定変更のゲームへの反映
   */
  syncGameSettings(newSettings: unknown, previousSettings: unknown): void {
    // 音量設定の変更
    if (newSettings.volume !== previousSettings.volume) {
      eventBus.emit(GameEventType.VOLUME_CHANGE, {
        volume: newSettings.volume,
      });
    }

    // テーマ設定の変更
    if (newSettings.theme !== previousSettings.theme) {
      eventBus.emit(GameEventType.THEME_CHANGE, { theme: newSettings.theme });
    }

    // その他の設定変更もイベントとして通知
    if (
      newSettings.soundEnabled !== previousSettings.soundEnabled ||
      newSettings.musicEnabled !== previousSettings.musicEnabled ||
      newSettings.difficulty !== previousSettings.difficulty ||
      newSettings.controls !== previousSettings.controls
    ) {
      // 設定変更の通知
      const uiStore = useUIStore.getState();
      uiStore.addNotification({
        message: "設定が更新されました",
        type: "info",
        duration: 2000,
      });
    }
  }

  /**
   * 手動でゲーム状態とUI状態を同期
   */
  syncStates(): void {
    const gameState = gameStateManager.getState();

    this.syncScreenState(gameState);
    this.syncGameOverState(gameState);

    // 同期後のUI状態を取得してログに記録
    const uiStoreAfterSync = useUIStore.getState();
    console.log("Manual state sync completed", {
      gameStatus: gameState.gameStatus,
      uiScreen: uiStoreAfterSync.currentScreen,
    });
  }

  /**
   * 現在の同期状態を取得（デバッグ用）
   */
  getSyncStatus(): {
    initialized: boolean;
    gameState: Readonly<GameState>;
    uiState: {
      currentScreen: string;
      isMenuOpen: boolean;
      isPauseMenuOpen: boolean;
      isGameOverModalOpen: boolean;
    };
  } {
    const gameState = gameStateManager.getState();
    const uiState = useUIStore.getState();

    return {
      initialized: this.isInitialized,
      gameState,
      uiState: {
        currentScreen: uiState.currentScreen,
        isMenuOpen: uiState.isMenuOpen,
        isPauseMenuOpen: uiState.isPauseMenuOpen,
        isGameOverModalOpen: uiState.isGameOverModalOpen,
      },
    };
  }

  /**
   * 状態同期システム破棄
   */
  destroy(): void {
    // 全ての購読を解除
    this.unsubscribeCallbacks.forEach((unsubscribe) => unsubscribe());
    this.unsubscribeCallbacks = [];

    this.isInitialized = false;
    StateBridge.instance = null;

    console.log("StateBridge destroyed");
  }
}

// シングルトンインスタンスをエクスポート
export const stateBridge = StateBridge.getInstance();
