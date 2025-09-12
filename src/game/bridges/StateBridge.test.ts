import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { StateBridge, stateBridge } from "./StateBridge";
import { gameStateManager } from "../core/GameState";
import { eventBus, GameEventType } from "../core/EventBus";
import { useUIStore } from "../../stores/uiStore";

// テスト用のモック設定
const mockConsole = {
  log: vi.fn(),
  warn: vi.fn(),
};

describe("StateBridge", () => {
  let bridge: StateBridge;

  beforeEach(() => {
    // コンソールのモック
    vi.spyOn(console, "log").mockImplementation(mockConsole.log);
    vi.spyOn(console, "warn").mockImplementation(mockConsole.warn);

    // 状態をリセット
    gameStateManager.reset();
    useUIStore.getState().resetUIState();
    eventBus.reset();

    // 新しいStateBridgeインスタンスを作成
    bridge = StateBridge.getInstance();
  });

  afterEach(() => {
    // StateBridgeを破棄
    bridge.destroy();
    vi.restoreAllMocks();
  });

  describe("初期化", () => {
    it("シングルトンパターンで動作する", () => {
      const instance1 = StateBridge.getInstance();
      const instance2 = StateBridge.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance1).toBe(stateBridge);
    });

    it("初期化できる", () => {
      expect(bridge.getSyncStatus().initialized).toBe(false);

      bridge.initialize();

      expect(bridge.getSyncStatus().initialized).toBe(true);
      expect(mockConsole.log).toHaveBeenCalledWith(
        "StateBridge initialized successfully",
      );
    });

    it("重複初期化時に警告を表示する", () => {
      bridge.initialize();
      bridge.initialize();

      expect(mockConsole.warn).toHaveBeenCalledWith(
        "StateBridge is already initialized",
      );
    });
  });

  describe("ゲーム状態からUI状態への同期", () => {
    beforeEach(() => {
      bridge.initialize();
    });

    it("ゲーム開始時にUI画面を切り替える", () => {
      expect(useUIStore.getState().currentScreen).toBe("menu");

      gameStateManager.setGameStatus("playing");

      expect(useUIStore.getState().currentScreen).toBe("game");
    });

    it("ゲームオーバー時にモーダルを表示する", () => {
      expect(useUIStore.getState().isGameOverModalOpen).toBe(false);

      gameStateManager.setGameStatus("gameOver");

      expect(useUIStore.getState().isGameOverModalOpen).toBe(true);
    });

    it("一時停止時にポーズメニューを表示する", () => {
      // まずゲーム画面に移動
      useUIStore.getState().navigateToScreen("game");
      gameStateManager.setGameStatus("playing");

      expect(useUIStore.getState().isPauseMenuOpen).toBe(false);

      gameStateManager.setGameStatus("paused");

      expect(useUIStore.getState().isPauseMenuOpen).toBe(true);
    });
  });

  describe("UI状態からゲーム状態への同期", () => {
    beforeEach(() => {
      bridge.initialize();
    });

    it("ゲーム画面遷移時にゲームを開始する", () => {
      expect(gameStateManager.getState().gameStatus).toBe("idle");

      const uiStore = useUIStore.getState();
      uiStore.navigateToScreen("game");

      expect(gameStateManager.getState().gameStatus).toBe("playing");
    });

    it("メニューに戻る時にゲームを一時停止する", () => {
      const uiStore = useUIStore.getState();

      // ゲーム開始
      uiStore.navigateToScreen("game");
      expect(gameStateManager.getState().gameStatus).toBe("playing");

      // メニューに戻る
      uiStore.navigateToScreen("menu");
      expect(gameStateManager.getState().gameStatus).toBe("paused");
    });

    it("ゲームオーバーからメニューに戻る時にリセットする", () => {
      const uiStore = useUIStore.getState();

      // ゲーム状態を変更
      gameStateManager.setGameStatus("gameOver");
      gameStateManager.addScore(1000);

      expect(gameStateManager.getState().gameStatus).toBe("gameOver");
      expect(gameStateManager.getState().score).toBe(1000);

      // メニューに戻る
      uiStore.navigateToScreen("menu");

      expect(gameStateManager.getState().gameStatus).toBe("idle");
      expect(gameStateManager.getState().score).toBe(0);
    });
  });

  describe("イベントベースの同期", () => {
    beforeEach(() => {
      bridge.initialize();
    });

    it("スコア更新イベントで通知を表示する", () => {
      expect(useUIStore.getState().notifications).toHaveLength(0);

      eventBus.emit(GameEventType.SCORE_UPDATE, { score: 150, delta: 50 });

      const notifications = useUIStore.getState().notifications;
      expect(notifications).toHaveLength(1);
      expect(notifications[0].message).toBe("スコア: +50");
      expect(notifications[0].type).toBe("success");
    });

    it("ライフ減少イベントで警告通知を表示する", () => {
      eventBus.emit(GameEventType.LIVES_UPDATE, { lives: 2, delta: -1 });

      const notifications = useUIStore.getState().notifications;
      expect(notifications).toHaveLength(1);
      expect(notifications[0].message).toBe("ライフ -1");
      expect(notifications[0].type).toBe("warning");
    });

    it("レベルクリアイベントで成功通知を表示する", () => {
      eventBus.emit(GameEventType.LEVEL_COMPLETE, { level: 2, score: 500 });

      const notifications = useUIStore.getState().notifications;
      expect(notifications).toHaveLength(1);
      expect(notifications[0].message).toBe("レベル2クリア！");
      expect(notifications[0].type).toBe("success");
    });

    it("パワーアップ収集イベントで情報通知を表示する", () => {
      eventBus.emit(GameEventType.POWERUP_COLLECTED, {
        type: "speed",
        id: "powerup1",
      });

      const notifications = useUIStore.getState().notifications;
      expect(notifications).toHaveLength(1);
      expect(notifications[0].message).toBe("パワーアップ獲得: speed");
      expect(notifications[0].type).toBe("info");
    });

    it("ゲームオーバーイベントで画面切り替えと通知を行う", () => {
      eventBus.emit(GameEventType.GAME_OVER, { score: 800, level: 3 });

      const uiState = useUIStore.getState();
      expect(uiState.notifications).toHaveLength(1);
      expect(uiState.notifications[0].message).toBe(
        "ゲームオーバー - スコア: 800",
      );
      expect(uiState.notifications[0].type).toBe("error");
      expect(uiState.currentScreen).toBe("gameOver");
    });
  });

  describe("設定同期", () => {
    beforeEach(() => {
      bridge.initialize();
    });

    it("音量変更をイベントとして通知する", () => {
      const eventSpy = vi.fn();
      eventBus.on(GameEventType.VOLUME_CHANGE, eventSpy);

      const uiStore = useUIStore.getState();
      uiStore.setVolume(0.5);

      expect(eventSpy).toHaveBeenCalledWith({ volume: 0.5 });
    });

    it("テーマ変更をイベントとして通知する", () => {
      const eventSpy = vi.fn();
      eventBus.on(GameEventType.THEME_CHANGE, eventSpy);

      const uiStore = useUIStore.getState();
      uiStore.setTheme("dark");

      expect(eventSpy).toHaveBeenCalledWith({ theme: "dark" });
    });

    it("その他の設定変更で通知を表示する", () => {
      const uiStore = useUIStore.getState();

      // 通知の初期状態を確認
      expect(useUIStore.getState().notifications).toHaveLength(0);

      // 手動で設定変更を同期をトリガー
      const oldSettings = { ...uiStore.settings };
      uiStore.toggleSound();
      const newSettings = useUIStore.getState().settings;

      // 直接syncGameSettingsを呼び出してテスト
      bridge.syncGameSettings(newSettings, oldSettings);

      const finalNotifications = useUIStore.getState().notifications;
      expect(finalNotifications.length).toBeGreaterThanOrEqual(1);
      const lastNotification = finalNotifications[finalNotifications.length - 1];
      expect(lastNotification.message).toBe("設定が更新されました");
      expect(lastNotification.type).toBe("info");
    });
  });

  describe("手動同期", () => {
    beforeEach(() => {
      bridge.initialize();
    });

    it("手動同期が実行される", () => {
      // 初期状態：idle状態でmenu画面
      expect(gameStateManager.getState().gameStatus).toBe("idle");
      expect(useUIStore.getState().currentScreen).toBe("menu");
      
      // ゲーム状態をplayingに設定
      gameStateManager.setGameStatus("playing");
      
      // UI画面を意図的にsettingsに設定して不一致状態を作る
      const uiStore = useUIStore.getState();
      uiStore.setCurrentScreen("settings");
      
      // 手動同期前の不一致状態を確認
      expect(gameStateManager.getState().gameStatus).toBe("playing");
      expect(useUIStore.getState().currentScreen).toBe("settings");

      bridge.syncStates();

      // 同期後：ゲーム状態（playing）に合わせてUI状態が更新される
      expect(useUIStore.getState().currentScreen).toBe("game");
      // ログは同期前の状態と同期後の状態の違いを記録する
      expect(mockConsole.log).toHaveBeenLastCalledWith(
        "Manual state sync completed",
        expect.objectContaining({
          gameStatus: "playing",
          uiScreen: "game",
        }),
      );
    });
  });

  describe("同期状態取得", () => {
    it("同期状態を正しく取得する", () => {
      const status = bridge.getSyncStatus();

      expect(status).toHaveProperty("initialized");
      expect(status).toHaveProperty("gameState");
      expect(status).toHaveProperty("uiState");
      expect(status.uiState).toHaveProperty("currentScreen");
      expect(status.uiState).toHaveProperty("isMenuOpen");
      expect(status.uiState).toHaveProperty("isPauseMenuOpen");
      expect(status.uiState).toHaveProperty("isGameOverModalOpen");
    });

    it("初期化前後で状態が変わる", () => {
      const statusBefore = bridge.getSyncStatus();
      expect(statusBefore.initialized).toBe(false);

      bridge.initialize();

      const statusAfter = bridge.getSyncStatus();
      expect(statusAfter.initialized).toBe(true);
    });
  });

  describe("破棄処理", () => {
    it("StateBridgeを破棄できる", () => {
      bridge.initialize();
      expect(bridge.getSyncStatus().initialized).toBe(true);

      bridge.destroy();

      expect(mockConsole.log).toHaveBeenCalledWith("StateBridge destroyed");

      // 新しいインスタンスを取得すると初期化されていない状態
      const newBridge = StateBridge.getInstance();
      expect(newBridge.getSyncStatus().initialized).toBe(false);
    });

    it("破棄後は購読が解除される", () => {
      bridge.initialize();

      const uiStore = useUIStore.getState();
      const initialNotificationCount = uiStore.notifications.length;

      bridge.destroy();

      // 破棄後にイベントを発行しても通知は追加されない
      eventBus.emit(GameEventType.SCORE_UPDATE, { score: 100, delta: 50 });

      expect(uiStore.notifications.length).toBe(initialNotificationCount);
    });
  });

  describe("エラーハンドリング", () => {
    it("初期化されていない状態でも安全に状態取得できる", () => {
      expect(() => bridge.getSyncStatus()).not.toThrow();
      expect(bridge.getSyncStatus().initialized).toBe(false);
    });

    it("初期化されていない状態でも手動同期は安全に実行される", () => {
      expect(() => bridge.syncStates()).not.toThrow();
    });
  });
});
