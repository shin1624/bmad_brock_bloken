import { gameStateManager } from "../core/GameState";
import { eventBus, GameEventType } from "../core/EventBus";
import { stateBridge } from "../bridges/StateBridge";
import { useUIStore } from "../../stores/uiStore";
import type { PerformanceMetrics } from "../../types/game.types";

/**
 * デバッグ情報の型定義
 */
export interface DebugInfo {
  gameState: {
    status: string;
    score: number;
    level: number;
    lives: number;
    combo: number;
    entityCounts: {
      balls: number;
      blocks: number;
      powerUps: number;
    };
  };
  uiState: {
    currentScreen: string;
    modalsOpen: {
      menu: boolean;
      pause: boolean;
      gameOver: boolean;
      settings: boolean;
    };
    notificationCount: number;
  };
  performance: PerformanceMetrics | null;
  eventHistory: Array<{
    type: string;
    timestamp: number;
    payload?: any;
  }>;
  sync: {
    initialized: boolean;
    lastSync: number | null;
  };
  memory: {
    gameStateSubscribers: number;
    eventBusListeners: number;
  };
}

/**
 * パフォーマンス統計の型定義
 */
export interface PerformanceStats {
  averageFps: number;
  minFps: number;
  maxFps: number;
  frameCount: number;
  memoryUsage?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

/**
 * ゲーム開発用DevToolsシステム
 */
export class DevTools {
  private static instance: DevTools | null = null;
  private isEnabled = false;
  private debugElement: HTMLElement | null = null;
  private performanceHistory: PerformanceMetrics[] = [];
  private maxHistorySize = 100;
  private updateInterval: number | null = null;
  private fpsElement: HTMLElement | null = null;

  private constructor() {
    // 開発環境でのみ有効
    this.isEnabled = process.env.NODE_ENV === "development";
  }

  /**
   * シングルトンインスタンス取得
   */
  static getInstance(): DevTools {
    if (!DevTools.instance) {
      DevTools.instance = new DevTools();
    }
    return DevTools.instance;
  }

  /**
   * DevTools初期化
   */
  initialize(): void {
    if (!this.isEnabled) {
      console.log("DevTools is disabled in production");
      return;
    }

    this.createDebugUI();
    this.setupEventListeners();
    this.startPerformanceMonitoring();

    console.log("DevTools initialized successfully");
  }

  /**
   * デバッグUI作成
   */
  private createDebugUI(): void {
    // デバッグパネルの作成
    this.debugElement = document.createElement("div");
    this.debugElement.id = "bmad-debug-panel";
    this.debugElement.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      width: 350px;
      max-height: 80vh;
      background: rgba(0, 0, 0, 0.9);
      color: #00ff00;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      padding: 15px;
      border: 2px solid #00ff00;
      border-radius: 5px;
      z-index: 10000;
      overflow-y: auto;
      backdrop-filter: blur(10px);
      display: none;
    `;

    // FPS表示の作成
    this.fpsElement = document.createElement("div");
    this.fpsElement.id = "bmad-fps-display";
    this.fpsElement.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: #00ff00;
      font-family: 'Courier New', monospace;
      font-size: 16px;
      font-weight: bold;
      padding: 8px 12px;
      border: 1px solid #00ff00;
      border-radius: 3px;
      z-index: 9999;
      display: none;
    `;

    document.body.appendChild(this.debugElement);
    document.body.appendChild(this.fpsElement);
  }

  /**
   * イベントリスナー設定
   */
  private setupEventListeners(): void {
    // キーボードショートカット
    document.addEventListener("keydown", (event) => {
      // Ctrl+Shift+D でデバッグパネル切り替え
      if (event.ctrlKey && event.shiftKey && event.key === "D") {
        event.preventDefault();
        this.toggleDebugPanel();
      }

      // Ctrl+Shift+F でFPS表示切り替え
      if (event.ctrlKey && event.shiftKey && event.key === "F") {
        event.preventDefault();
        this.toggleFPS();
      }

      // Ctrl+Shift+R でゲーム状態リセット
      if (event.ctrlKey && event.shiftKey && event.key === "R") {
        event.preventDefault();
        this.resetGameState();
      }
    });

    // UIストアの設定と同期
    useUIStore.subscribe((state) => {
      if (this.debugElement) {
        this.debugElement.style.display = state.showDebugInfo
          ? "block"
          : "none";
      }
      if (this.fpsElement) {
        this.fpsElement.style.display = state.showFPS ? "block" : "none";
      }
    });
  }

  /**
   * パフォーマンス監視開始
   */
  private startPerformanceMonitoring(): void {
    this.updateInterval = window.setInterval(() => {
      this.updateDebugInfo();
    }, 500); // 0.5秒間隔で更新
  }

  /**
   * デバッグ情報更新
   */
  private updateDebugInfo(): void {
    if (!this.isEnabled || !this.debugElement) return;

    const debugInfo = this.collectDebugInfo();
    this.renderDebugPanel(debugInfo);
    this.updateFPS();
  }

  /**
   * デバッグ情報収集
   */
  private collectDebugInfo(): DebugInfo {
    const gameState = gameStateManager.getState();
    const uiState = useUIStore.getState();
    const syncStatus = stateBridge.getSyncStatus();
    const eventHistory = eventBus.getEventHistory().slice(-10); // 最新10件

    return {
      gameState: {
        status: gameState.gameStatus,
        score: gameState.score,
        level: gameState.level,
        lives: gameState.lives,
        combo: gameState.combo,
        entityCounts: {
          balls: gameState.balls.length,
          blocks: gameState.blocks.length,
          powerUps: gameState.powerUps.length,
        },
      },
      uiState: {
        currentScreen: uiState.currentScreen,
        modalsOpen: {
          menu: uiState.isMenuOpen,
          pause: uiState.isPauseMenuOpen,
          gameOver: uiState.isGameOverModalOpen,
          settings: uiState.isSettingsOpen,
        },
        notificationCount: uiState.notifications.length,
      },
      performance: this.getCurrentPerformance(),
      eventHistory: eventHistory.map((event) => ({
        type: event.type,
        timestamp: event.timestamp,
        payload: event.payload,
      })),
      sync: {
        initialized: syncStatus.initialized,
        lastSync: Date.now(),
      },
      memory: {
        gameStateSubscribers: gameStateManager.getSubscriberCount(),
        eventBusListeners: eventBus.getTotalListenerCount(),
      },
    };
  }

  /**
   * 現在のパフォーマンス情報取得
   */
  private getCurrentPerformance(): PerformanceMetrics | null {
    // 実際のゲームループからパフォーマンス情報を取得する必要があります
    // ここでは仮の実装
    return {
      fps: this.calculateCurrentFPS(),
      deltaTime: 16.67, // 60FPSの場合
      averageFps: this.calculateAverageFPS(),
      frameCount: this.getFrameCount(),
      lastFrameTime: performance.now(),
    };
  }

  /**
   * 現在のFPS計算（仮実装）
   */
  private calculateCurrentFPS(): number {
    // 実際の実装ではrequestAnimationFrameのタイムスタンプを使用
    return Math.floor(Math.random() * 10) + 55; // 55-65の範囲でランダム
  }

  /**
   * 平均FPS計算
   */
  private calculateAverageFPS(): number {
    if (this.performanceHistory.length === 0) return 0;

    const totalFps = this.performanceHistory.reduce(
      (sum, perf) => sum + perf.fps,
      0,
    );
    return totalFps / this.performanceHistory.length;
  }

  /**
   * フレーム数取得
   */
  private getFrameCount(): number {
    return this.performanceHistory.length;
  }

  /**
   * デバッグパネル描画
   */
  private renderDebugPanel(info: DebugInfo): void {
    if (!this.debugElement) return;

    const memoryInfo = (performance as any).memory;

    this.debugElement.innerHTML = `
      <div style="border-bottom: 1px solid #00ff00; margin-bottom: 10px; padding-bottom: 5px;">
        <strong>🎮 BMAD Debug Tools</strong>
      </div>
      
      <div style="margin-bottom: 10px;">
        <strong>Game State:</strong><br>
        Status: ${info.gameState.status}<br>
        Score: ${info.gameState.score.toLocaleString()}<br>
        Level: ${info.gameState.level}<br>
        Lives: ${info.gameState.lives}<br>
        Combo: ${info.gameState.combo}<br>
        Entities: B:${info.gameState.entityCounts.balls} Bl:${info.gameState.entityCounts.blocks} P:${info.gameState.entityCounts.powerUps}
      </div>
      
      <div style="margin-bottom: 10px;">
        <strong>UI State:</strong><br>
        Screen: ${info.uiState.currentScreen}<br>
        Modals: ${
          Object.entries(info.uiState.modalsOpen)
            .filter(([_, open]) => open)
            .map(([name]) => name)
            .join(", ") || "none"
        }<br>
        Notifications: ${info.uiState.notificationCount}
      </div>
      
      <div style="margin-bottom: 10px;">
        <strong>Performance:</strong><br>
        FPS: ${info.performance?.fps || 0}<br>
        Avg FPS: ${info.performance?.averageFps.toFixed(1) || 0}<br>
        Frame Count: ${info.performance?.frameCount || 0}<br>
        Delta: ${info.performance?.deltaTime.toFixed(2)}ms
      </div>
      
      ${
        memoryInfo
          ? `
      <div style="margin-bottom: 10px;">
        <strong>Memory:</strong><br>
        Used: ${(memoryInfo.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB<br>
        Total: ${(memoryInfo.totalJSHeapSize / 1024 / 1024).toFixed(1)}MB<br>
        Limit: ${(memoryInfo.jsHeapSizeLimit / 1024 / 1024).toFixed(1)}MB
      </div>
      `
          : ""
      }
      
      <div style="margin-bottom: 10px;">
        <strong>System:</strong><br>
        State Bridge: ${info.sync.initialized ? "✅" : "❌"}<br>
        Game Subscribers: ${info.memory.gameStateSubscribers}<br>
        Event Listeners: ${info.memory.eventBusListeners}
      </div>
      
      <div style="margin-bottom: 10px;">
        <strong>Recent Events:</strong><br>
        ${
          info.eventHistory
            .slice(-3)
            .map(
              (event) =>
                `${new Date(event.timestamp).toLocaleTimeString()}: ${event.type}`,
            )
            .join("<br>") || "None"
        }
      </div>
      
      <div style="font-size: 10px; color: #888;">
        Shortcuts: Ctrl+Shift+D (Panel), Ctrl+Shift+F (FPS), Ctrl+Shift+R (Reset)
      </div>
    `;
  }

  /**
   * FPS表示更新
   */
  private updateFPS(): void {
    if (!this.fpsElement) return;

    const currentFps = this.calculateCurrentFPS();
    const avgFps = this.calculateAverageFPS();

    // FPSに応じて色を変更
    let color = "#00ff00"; // 緑
    if (currentFps < 30)
      color = "#ff0000"; // 赤
    else if (currentFps < 50) color = "#ffff00"; // 黄

    this.fpsElement.style.color = color;
    this.fpsElement.textContent = `FPS: ${currentFps} (Avg: ${avgFps.toFixed(1)})`;
  }

  /**
   * デバッグパネル表示切り替え
   */
  toggleDebugPanel(): void {
    const uiStore = useUIStore.getState();
    uiStore.toggleDebugInfo();
  }

  /**
   * FPS表示切り替え
   */
  toggleFPS(): void {
    const uiStore = useUIStore.getState();
    uiStore.toggleFPS();
  }

  /**
   * ゲーム状態リセット
   */
  private resetGameState(): void {
    gameStateManager.reset();
    eventBus.reset();

    const uiStore = useUIStore.getState();
    uiStore.resetUIState();

    console.log("Game state reset via DevTools");
  }

  /**
   * パフォーマンス統計取得
   */
  getPerformanceStats(): PerformanceStats {
    const currentFps = this.calculateCurrentFPS();
    const memoryInfo = (performance as any).memory;

    return {
      averageFps: this.calculateAverageFPS(),
      minFps: Math.min(
        ...this.performanceHistory.map((p) => p.fps),
        currentFps,
      ),
      maxFps: Math.max(
        ...this.performanceHistory.map((p) => p.fps),
        currentFps,
      ),
      frameCount: this.getFrameCount(),
      memoryUsage: memoryInfo
        ? {
            usedJSHeapSize: memoryInfo.usedJSHeapSize,
            totalJSHeapSize: memoryInfo.totalJSHeapSize,
            jsHeapSizeLimit: memoryInfo.jsHeapSizeLimit,
          }
        : undefined,
    };
  }

  /**
   * イベント履歴エクスポート
   */
  exportEventHistory(): string {
    const history = eventBus.getEventHistory();
    return JSON.stringify(history, null, 2);
  }

  /**
   * ゲーム状態エクスポート
   */
  exportGameState(): string {
    const gameState = gameStateManager.getState();
    const uiState = useUIStore.getState();

    return JSON.stringify(
      {
        game: gameState,
        ui: uiState,
        timestamp: Date.now(),
      },
      null,
      2,
    );
  }

  /**
   * DevTools破棄
   */
  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    if (this.debugElement) {
      document.body.removeChild(this.debugElement);
      this.debugElement = null;
    }

    if (this.fpsElement) {
      document.body.removeChild(this.fpsElement);
      this.fpsElement = null;
    }

    this.performanceHistory = [];

    console.log("DevTools destroyed");
  }

  /**
   * 有効状態取得
   */
  isDevToolsEnabled(): boolean {
    return this.isEnabled;
  }
}

// シングルトンインスタンスをエクスポート
export const devTools = DevTools.getInstance();
