import type {
  GameLoopInterface,
  GameLoopCallback,
  PerformanceMetrics,
  GameLoopConfig,
} from "../../types/game.types";

/**
 * High-performance game loop implementation using requestAnimationFrame
 * Provides 60 FPS target with performance monitoring capabilities
 */
export class GameLoop implements GameLoopInterface {
  private animationId: number | null = null;
  private running = false;
  private paused = false;
  private lastFrameTime = 0;
  private deltaTime = 0;
  private frameCount = 0;
  private fpsBuffer: number[] = [];
  // private readonly targetFps: number; // Reserved for future frame rate limiting
  private readonly enablePerformanceMonitoring: boolean;
  private readonly maxFpsBufferSize = 60; // 1 second at 60fps

  private updateCallbacks: GameLoopCallback[] = [];
  private renderCallbacks: GameLoopCallback[] = [];

  constructor(
    config: GameLoopConfig = {
      targetFps: 60,
      enablePerformanceMonitoring: true,
    },
  ) {
    this.targetFps = config.targetFps; // Reserved for future frame rate limiting feature
    this.enablePerformanceMonitoring = config.enablePerformanceMonitoring;

    // Bind methods to preserve 'this' context
    this.gameLoop = this.gameLoop.bind(this);
  }

  /**
   * Start the game loop
   */
  start(): void {
    if (this.running) return;

    this.running = true;
    this.paused = false;
    this.lastFrameTime = performance.now();
    this.frameCount = 0;
    this.fpsBuffer = [];

    this.animationId = requestAnimationFrame(this.gameLoop);
  }

  /**
   * Stop the game loop completely
   */
  stop(): void {
    if (!this.running) return;

    this.running = false;
    this.paused = false;

    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Pause the game loop (can be resumed)
   */
  pause(): void {
    if (!this.running || this.paused) return;

    this.paused = true;

    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Resume the paused game loop
   */
  resume(): void {
    if (!this.running || !this.paused) return;

    this.paused = false;
    this.lastFrameTime = performance.now(); // Reset timing to prevent large deltaTime

    this.animationId = requestAnimationFrame(this.gameLoop);
  }

  /**
   * Check if the game loop is currently running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Check if the game loop is currently paused
   */
  isPaused(): boolean {
    return this.paused;
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const currentFps = this.calculateCurrentFps();
    const averageFps = this.calculateAverageFps();

    return {
      fps: currentFps,
      deltaTime: this.deltaTime,
      averageFps,
      frameCount: this.frameCount,
      lastFrameTime: this.lastFrameTime,
    };
  }

  /**
   * Register an update callback
   */
  onUpdate(callback: GameLoopCallback): void {
    this.updateCallbacks.push(callback);
  }

  /**
   * Register a render callback
   */
  onRender(callback: GameLoopCallback): void {
    this.renderCallbacks.push(callback);
  }

  /**
   * Remove an update callback
   */
  removeUpdateCallback(callback: GameLoopCallback): void {
    const index = this.updateCallbacks.indexOf(callback);
    if (index > -1) {
      this.updateCallbacks.splice(index, 1);
    }
  }

  /**
   * Remove a render callback
   */
  removeRenderCallback(callback: GameLoopCallback): void {
    const index = this.renderCallbacks.indexOf(callback);
    if (index > -1) {
      this.renderCallbacks.splice(index, 1);
    }
  }

  /**
   * Main game loop implementation
   */
  private gameLoop(currentTime: number): void {
    if (!this.running || this.paused) return;

    // Calculate deltaTime in seconds
    this.deltaTime = (currentTime - this.lastFrameTime) / 1000;
    this.lastFrameTime = currentTime;

    // Cap deltaTime to prevent spiral of death
    this.deltaTime = Math.min(this.deltaTime, 1 / 30); // Max 30fps minimum

    // Update performance tracking
    if (this.enablePerformanceMonitoring) {
      this.updatePerformanceTracking(currentTime);
    }

    // Execute update callbacks
    this.updateCallbacks.forEach((callback) => {
      try {
        callback(this.deltaTime, currentTime);
      } catch (error) {
        console.error("Error in update callback:", error);
      }
    });

    // Execute render callbacks
    this.renderCallbacks.forEach((callback) => {
      try {
        callback(this.deltaTime, currentTime);
      } catch (error) {
        console.error("Error in render callback:", error);
      }
    });

    // Continue the loop
    this.animationId = requestAnimationFrame(this.gameLoop);
  }

  /**
   * Update performance tracking metrics
   */
  private updatePerformanceTracking(currentTime: number): void {
    this.frameCount++;

    // Calculate FPS and maintain buffer
    const fps =
      1000 / (currentTime - (this.lastFrameTime || currentTime - 16.67));
    this.fpsBuffer.push(fps);

    // Keep buffer size manageable
    if (this.fpsBuffer.length > this.maxFpsBufferSize) {
      this.fpsBuffer.shift();
    }
  }

  /**
   * Calculate current instantaneous FPS
   */
  private calculateCurrentFps(): number {
    if (this.deltaTime === 0) return 0;
    return Math.round(1 / this.deltaTime);
  }

  /**
   * Calculate average FPS over the buffer period
   */
  private calculateAverageFps(): number {
    if (this.fpsBuffer.length === 0) return 0;

    const sum = this.fpsBuffer.reduce((acc, fps) => acc + fps, 0);
    return Math.round(sum / this.fpsBuffer.length);
  }
}
