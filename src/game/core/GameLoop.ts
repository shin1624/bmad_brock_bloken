/**
 * GameLoop - Manages the game's main loop with fixed timestep at 60 FPS
 * Implements accumulator pattern for smooth frame interpolation
 */
export class GameLoop {
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private animationId: number | null = null;

  // Fixed timestep targeting 60 FPS
  private readonly FIXED_TIMESTEP = 1000 / 60; // 16.67ms per frame
  private lastTime = 0;
  private accumulator = 0;

  // Performance monitoring
  private frameCount = 0;
  private lastFpsTime = 0;
  private currentFps = 0;
  private fpsHistory: number[] = [];
  private readonly FPS_HISTORY_SIZE = 60; // Reduced from 100 for better memory efficiency

  // Performance warnings
  private lowFpsWarningCount = 0;
  private readonly LOW_FPS_THRESHOLD = 45;

  // Callbacks
  private updateCallback: ((deltaTime: number) => void) | null = null;
  private renderCallback: ((interpolation: number) => void) | null = null;
  private fpsUpdateCallback: ((fps: number) => void) | null = null;

  constructor() {
    this.loop = this.loop.bind(this);
  }

  /**
   * Start the game loop
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.isPaused = false;
    this.lastTime = performance.now();
    this.lastFpsTime = this.lastTime;
    this.frameCount = 0;
    this.accumulator = 0;

    this.animationId = requestAnimationFrame(this.loop);
  }

  /**
   * Stop the game loop
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    this.isPaused = false;

    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Pause the game loop (maintains loop but skips updates)
   */
  pause(): void {
    this.isPaused = true;
  }

  /**
   * Resume the game loop
   */
  resume(): void {
    if (this.isRunning && this.isPaused) {
      this.isPaused = false;
      this.lastTime = performance.now(); // Reset timing to prevent large delta
    }
  }

  /**
   * Set the update callback function
   */
  onUpdate(callback: (deltaTime: number) => void): void {
    this.updateCallback = callback;
  }

  /**
   * Set the render callback function
   */
  onRender(callback: (interpolation: number) => void): void {
    this.renderCallback = callback;
  }

  /**
   * Set the FPS update callback function
   */
  onFpsUpdate(callback: (fps: number) => void): void {
    this.fpsUpdateCallback = callback;
  }

  /**
   * Get current FPS
   */
  getFps(): number {
    return this.currentFps;
  }

  /**
   * Get FPS statistics
   */
  getFpsStats(): {
    current: number;
    average: number;
    min: number;
    max: number;
  } {
    if (this.fpsHistory.length === 0) {
      return { current: 0, average: 0, min: 0, max: 0 };
    }

    const average =
      this.fpsHistory.reduce((sum, fps) => sum + fps, 0) /
      this.fpsHistory.length;
    const min = Math.min(...this.fpsHistory);
    const max = Math.max(...this.fpsHistory);

    return {
      current: this.currentFps,
      average: Math.round(average),
      min: Math.round(min),
      max: Math.round(max),
    };
  }

  /**
   * Main game loop with fixed timestep and interpolation
   */
  private loop(currentTime: number): void {
    if (!this.isRunning) return;

    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // Update FPS counter
    this.updateFpsCounter(currentTime);

    if (!this.isPaused) {
      // Add frame time to accumulator
      this.accumulator += deltaTime;

      // Fixed timestep updates
      let updateCount = 0;
      const maxUpdates = 5; // Prevent spiral of death

      while (
        this.accumulator >= this.FIXED_TIMESTEP &&
        updateCount < maxUpdates
      ) {
        if (this.updateCallback) {
          this.updateCallback(this.FIXED_TIMESTEP);
        }
        this.accumulator -= this.FIXED_TIMESTEP;
        updateCount++;
      }

      // Calculate interpolation for smooth rendering
      const interpolation = this.accumulator / this.FIXED_TIMESTEP;

      if (this.renderCallback) {
        this.renderCallback(interpolation);
      }
    }

    // Continue the loop
    this.animationId = requestAnimationFrame(this.loop);
  }

  /**
   * Update FPS counter and statistics
   */
  private updateFpsCounter(currentTime: number): void {
    this.frameCount++;

    // Update FPS every 100ms
    if (currentTime - this.lastFpsTime >= 100) {
      this.currentFps = Math.round(
        (this.frameCount * 1000) / (currentTime - this.lastFpsTime)
      );

      // Update FPS history
      this.fpsHistory.push(this.currentFps);
      if (this.fpsHistory.length > this.FPS_HISTORY_SIZE) {
        this.fpsHistory.shift();
      }

      // Notify FPS update callback
      if (this.fpsUpdateCallback) {
        this.fpsUpdateCallback(this.currentFps);
      }

      this.frameCount = 0;
      this.lastFpsTime = currentTime;
    }
  }

  /**
   * Check if the loop is running
   */
  isLoopRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Check if the loop is paused
   */
  isLoopPaused(): boolean {
    return this.isPaused;
  }

  /**
   * Destroy the game loop and clean up resources
   */
  destroy(): void {
    this.stop();
    this.updateCallback = null;
    this.renderCallback = null;
    this.fpsUpdateCallback = null;
    this.fpsHistory = [];
  }
}
