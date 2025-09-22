import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DevTools, devTools } from "./DevTools";
import { gameStateManager } from "../core/GameState";
import { eventBus, GameEventType } from "../core/EventBus";
import { useUIStore } from "../../stores/uiStore";

// DOM環境のモック
Object.defineProperty(window, "performance", {
  value: {
    now: vi.fn(() => Date.now()),
    memory: {
      usedJSHeapSize: 1024 * 1024 * 10,
      totalJSHeapSize: 1024 * 1024 * 20,
      jsHeapSizeLimit: 1024 * 1024 * 100,
    },
  },
});

// setIntervalとclearIntervalのモック
const mockSetInterval = vi.fn();
const mockClearInterval = vi.fn();
Object.defineProperty(window, "setInterval", { value: mockSetInterval });
Object.defineProperty(window, "clearInterval", { value: mockClearInterval });

describe("DevTools", () => {
  let devToolsInstance: DevTools;
  let mockElement: HTMLElement;
  let mockFpsElement: HTMLElement;
  let elementCallCount: number;

  beforeEach(() => {
    // Set development environment for DevTools to be enabled
    vi.stubEnv("NODE_ENV", "development");
    // DOM要素のモック
    mockElement = {
      style: { cssText: "", display: "" },
      innerHTML: "",
      id: "",
    } as unknown as HTMLElement;

    mockFpsElement = {
      style: { cssText: "", display: "", color: "" },
      textContent: "",
      id: "",
    } as unknown as HTMLElement;

    // document.createElementのモック
    elementCallCount = 0;
    vi.spyOn(document, "createElement").mockImplementation(() => {
      elementCallCount++;
      return elementCallCount === 1 ? mockElement : mockFpsElement;
    });

    // document.body.appendChildのモック
    vi.spyOn(document.body, "appendChild").mockImplementation(
      () => mockElement,
    );
    vi.spyOn(document.body, "removeChild").mockImplementation(
      () => mockElement,
    );

    // 環境変数を開発環境に設定
    vi.stubEnv("NODE_ENV", "development");

    // 状態をリセット
    gameStateManager.reset();
    useUIStore.getState().resetUIState();
    eventBus.reset();

    devToolsInstance = DevTools.getInstance();
  });

  afterEach(() => {
    devToolsInstance.destroy();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    elementCallCount = 0;
  });

  describe("初期化", () => {
    it("シングルトンパターンで動作する", () => {
      const instance1 = DevTools.getInstance();
      const instance2 = DevTools.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance1).toBe(devTools);
    });

    it("開発環境で初期化できる", () => {
      const consoleSpy = vi.spyOn(console, "log");

      devToolsInstance.initialize();

      expect(consoleSpy).toHaveBeenCalledWith(
        "DevTools initialized successfully",
      );
      expect(document.createElement).toHaveBeenCalledTimes(2);
      expect(document.body.appendChild).toHaveBeenCalledTimes(2);
    });

    it("本番環境では無効化される", () => {
      vi.stubEnv("NODE_ENV", "production");
      const consoleSpy = vi.spyOn(console, "log");

      const prodDevTools = DevTools.getInstance();
      prodDevTools.initialize();

      expect(consoleSpy).toHaveBeenCalledWith(
        "DevTools is disabled in production",
      );
      expect(document.createElement).not.toHaveBeenCalled();
    });

    it("有効状態を正しく返す", () => {
      expect(devToolsInstance.isDevToolsEnabled()).toBe(true);

      vi.stubEnv("NODE_ENV", "production");
      const prodDevTools = DevTools.getInstance();
      expect(prodDevTools.isDevToolsEnabled()).toBe(false);
    });
  });

  describe("UI要素の作成", () => {
    beforeEach(() => {
      devToolsInstance.initialize();
    });

    it("デバッグパネルが作成される", () => {
      expect(mockElement.id).toBe("bmad-debug-panel");
      expect(mockElement.style.cssText).toContain("position: fixed");
      expect(mockElement.style.cssText).toContain(
        "background: rgba(0, 0, 0, 0.9)",
      );
      expect(mockElement.style.display).toBe("none");
    });

    it("FPS表示が作成される", () => {
      expect(mockFpsElement.id).toBe("bmad-fps-display");
      expect(mockFpsElement.style.cssText).toContain("position: fixed");
      expect(mockFpsElement.style.cssText).toContain(
        "font-family: 'Courier New'",
      );
      expect(mockFpsElement.style.display).toBe("none");
    });
  });

  describe("キーボードショートカット", () => {
    beforeEach(() => {
      devToolsInstance.initialize();
    });

    it("Ctrl+Shift+D でデバッグパネルを切り替える", () => {
      const uiStore = useUIStore.getState();
      const initialDebugInfo = uiStore.showDebugInfo;

      const event = new KeyboardEvent("keydown", {
        key: "D",
        ctrlKey: true,
        shiftKey: true,
      });

      document.dispatchEvent(event);

      expect(uiStore.showDebugInfo).toBe(!initialDebugInfo);
    });

    it("Ctrl+Shift+F でFPS表示を切り替える", () => {
      const uiStore = useUIStore.getState();
      const initialFPS = uiStore.showFPS;

      const event = new KeyboardEvent("keydown", {
        key: "F",
        ctrlKey: true,
        shiftKey: true,
      });

      document.dispatchEvent(event);

      expect(uiStore.showFPS).toBe(!initialFPS);
    });

    it("Ctrl+Shift+R でゲーム状態をリセットする", () => {
      const consoleSpy = vi.spyOn(console, "log");

      // ゲーム状態を変更
      gameStateManager.addScore(1000);
      gameStateManager.setGameStatus("playing");

      const event = new KeyboardEvent("keydown", {
        key: "R",
        ctrlKey: true,
        shiftKey: true,
      });

      document.dispatchEvent(event);

      expect(gameStateManager.getState().score).toBe(0);
      expect(gameStateManager.getState().gameStatus).toBe("idle");
      expect(consoleSpy).toHaveBeenCalledWith("Game state reset via DevTools");
    });
  });

  describe("UIストア連携", () => {
    beforeEach(() => {
      devToolsInstance.initialize();
    });

    it("UIストアの設定でデバッグパネル表示が切り替わる", () => {
      const uiStore = useUIStore.getState();

      uiStore.setShowDebugInfo(true);
      expect(mockElement.style.display).toBe("block");

      uiStore.setShowDebugInfo(false);
      expect(mockElement.style.display).toBe("none");
    });

    it("UIストアの設定でFPS表示が切り替わる", () => {
      const uiStore = useUIStore.getState();

      uiStore.setShowFPS(true);
      expect(mockFpsElement.style.display).toBe("block");

      uiStore.setShowFPS(false);
      expect(mockFpsElement.style.display).toBe("none");
    });
  });

  describe("パフォーマンス統計", () => {
    beforeEach(() => {
      devToolsInstance.initialize();
    });

    it("パフォーマンス統計を取得できる", () => {
      const stats = devToolsInstance.getPerformanceStats();

      expect(stats).toHaveProperty("averageFps");
      expect(stats).toHaveProperty("minFps");
      expect(stats).toHaveProperty("maxFps");
      expect(stats).toHaveProperty("frameCount");
      expect(stats).toHaveProperty("memoryUsage");

      expect(typeof stats.averageFps).toBe("number");
      expect(typeof stats.minFps).toBe("number");
      expect(typeof stats.maxFps).toBe("number");
      expect(typeof stats.frameCount).toBe("number");
    });

    it("メモリ使用量が正しく取得される", () => {
      const stats = devToolsInstance.getPerformanceStats();

      expect(stats.memoryUsage).toBeDefined();
      expect(stats.memoryUsage?.usedJSHeapSize).toBe(1024 * 1024 * 10);
      expect(stats.memoryUsage?.totalJSHeapSize).toBe(1024 * 1024 * 20);
      expect(stats.memoryUsage?.jsHeapSizeLimit).toBe(1024 * 1024 * 100);
    });
  });

  describe("データエクスポート", () => {
    beforeEach(() => {
      devToolsInstance.initialize();
    });

    it("イベント履歴をエクスポートできる", () => {
      // テストイベントを発行
      eventBus.emit(GameEventType.GAME_START, undefined);
      eventBus.emit(GameEventType.SCORE_UPDATE, { score: 100, delta: 50 });

      const exported = devToolsInstance.exportEventHistory();
      const parsed = JSON.parse(exported);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(0);
      expect(parsed[0]).toHaveProperty("type");
      expect(parsed[0]).toHaveProperty("timestamp");
    });

    it("ゲーム状態をエクスポートできる", () => {
      // ゲーム状態を変更
      gameStateManager.addScore(500);
      gameStateManager.nextLevel();

      const exported = devToolsInstance.exportGameState();
      const parsed = JSON.parse(exported);

      expect(parsed).toHaveProperty("game");
      expect(parsed).toHaveProperty("ui");
      expect(parsed).toHaveProperty("timestamp");
      expect(parsed.game.score).toBe(500);
      expect(parsed.game.level).toBe(2);
    });
  });

  describe("破棄処理", () => {
    it("DevToolsを破棄できる", () => {
      const consoleSpy = vi.spyOn(console, "log");

      devToolsInstance.initialize();
      devToolsInstance.destroy();

      expect(consoleSpy).toHaveBeenCalledWith("DevTools destroyed");
      expect(mockClearInterval).toHaveBeenCalled();
      expect(document.body.removeChild).toHaveBeenCalledTimes(2);
    });

    it("破棄後は更新が停止する", () => {
      devToolsInstance.initialize();
      expect(mockSetInterval).toHaveBeenCalled();

      devToolsInstance.destroy();
      expect(mockClearInterval).toHaveBeenCalled();
    });
  });

  describe("FPS表示", () => {
    beforeEach(() => {
      devToolsInstance.initialize();
    });

    it("FPSが更新される", () => {
      // パフォーマンス監視の更新をトリガー
      const updateCallback = mockSetInterval.mock.calls[0][0];
      updateCallback();

      expect(mockFpsElement.textContent).toContain("FPS:");
      expect(mockFpsElement.textContent).toContain("Avg:");
    });

    it("低FPSで色が変わる", () => {
      // FPS計算をモック（低FPS）
      vi.spyOn(devToolsInstance as unknown, "calculateCurrentFPS").mockReturnValue(
        25,
      );

      const updateCallback = mockSetInterval.mock.calls[0][0];
      updateCallback();

      expect(mockFpsElement.style.color).toBe("#ff0000"); // 赤
    });

    it("中FPSで色が変わる", () => {
      // FPS計算をモック（中FPS）
      vi.spyOn(devToolsInstance as unknown, "calculateCurrentFPS").mockReturnValue(
        45,
      );

      const updateCallback = mockSetInterval.mock.calls[0][0];
      updateCallback();

      expect(mockFpsElement.style.color).toBe("#ffff00"); // 黄
    });

    it("高FPSで緑色になる", () => {
      // FPS計算をモック（高FPS）
      vi.spyOn(devToolsInstance as unknown, "calculateCurrentFPS").mockReturnValue(
        60,
      );

      const updateCallback = mockSetInterval.mock.calls[0][0];
      updateCallback();

      expect(mockFpsElement.style.color).toBe("#00ff00"); // 緑
    });
  });

  describe("エラーハンドリング", () => {
    it("DOM要素が存在しない場合も安全に動作する", () => {
      // DOM操作を無効化
      vi.spyOn(document, "createElement").mockReturnValue(null as unknown);

      expect(() => devToolsInstance.initialize()).not.toThrow();
      expect(() => devToolsInstance.destroy()).not.toThrow();
    });

    it("本番環境では初期化時にエラーが発生しない", () => {
      vi.stubEnv("NODE_ENV", "production");

      expect(() => {
        const prodDevTools = DevTools.getInstance();
        prodDevTools.initialize();
        prodDevTools.destroy();
      }).not.toThrow();
    });
  });
});
