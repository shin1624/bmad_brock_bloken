/**
 * Debug - Debug system with FPS counter and performance metrics
 */
export class Debug {
  private isEnabled: boolean = false;
  private renderer: any; // Will be set via dependency injection

  // Performance metrics
  private fpsHistory: number[] = [];
  private readonly FPS_HISTORY_SIZE = 60;
  private lastUpdateTime = 0;
  private frameTimeHistory: number[] = [];

  // Debug display settings
  private readonly DEBUG_FONT = '14px monospace';
  private readonly DEBUG_COLOR = '#00ff00';
  private readonly DEBUG_BACKGROUND = 'rgba(0, 0, 0, 0.7)';
  private readonly DEBUG_PADDING = 10;

  constructor() {
    // Enable debug mode in development
    this.isEnabled = import.meta.env.DEV;
  }

  /**
   * Set the renderer instance for drawing debug info
   */
  setRenderer(renderer: any): void {
    this.renderer = renderer;
  }

  /**
   * Enable or disable debug mode
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Check if debug mode is enabled
   */
  isDebugEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Toggle debug mode
   */
  toggle(): void {
    this.isEnabled = !this.isEnabled;
  }

  /**
   * Update performance metrics
   */
  update(currentFps: number, deltaTime: number): void {
    if (!this.isEnabled) return;

    const currentTime = performance.now();

    // Update FPS history
    this.fpsHistory.push(currentFps);
    if (this.fpsHistory.length > this.FPS_HISTORY_SIZE) {
      this.fpsHistory.shift();
    }

    // Update frame time history
    this.frameTimeHistory.push(deltaTime);
    if (this.frameTimeHistory.length > this.FPS_HISTORY_SIZE) {
      this.frameTimeHistory.shift();
    }

    this.lastUpdateTime = currentTime;
  }

  /**
   * Render debug information on screen
   */
  render(): void {
    if (!this.isEnabled || !this.renderer) return;

    const stats = this.getPerformanceStats();
    const debugInfo = [
      `FPS: ${stats.fps.current}`,
      `Avg FPS: ${stats.fps.average}`,
      `Min FPS: ${stats.fps.min}`,
      `Max FPS: ${stats.fps.max}`,
      `Frame Time: ${stats.frameTime.current.toFixed(2)}ms`,
      `Avg Frame Time: ${stats.frameTime.average.toFixed(2)}ms`,
      `Memory: ${this.getMemoryUsage().toFixed(1)}MB`,
    ];

    this.renderDebugPanel(debugInfo);
  }

  /**
   * Get current performance statistics
   */
  getPerformanceStats(): {
    fps: { current: number; average: number; min: number; max: number };
    frameTime: { current: number; average: number; min: number; max: number };
  } {
    const fpsStats = this.calculateStats(this.fpsHistory);
    const frameTimeStats = this.calculateStats(this.frameTimeHistory);

    return {
      fps: fpsStats,
      frameTime: frameTimeStats,
    };
  }

  /**
   * Calculate statistics for a data array
   */
  private calculateStats(data: number[]): {
    current: number;
    average: number;
    min: number;
    max: number;
  } {
    if (data.length === 0) {
      return { current: 0, average: 0, min: 0, max: 0 };
    }

    const current = data[data.length - 1] || 0;
    const sum = data.reduce((acc, val) => acc + val, 0);
    const average = sum / data.length;
    const min = Math.min(...data);
    const max = Math.max(...data);

    return {
      current: Math.round(current),
      average: Math.round(average),
      min: Math.round(min),
      max: Math.round(max),
    };
  }

  /**
   * Get current memory usage in MB
   */
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize / 1024 / 1024;
    }
    return 0;
  }

  /**
   * Render debug panel with performance information
   */
  private renderDebugPanel(debugInfo: string[]): void {
    if (!this.renderer) return;

    const lineHeight = 18;
    const panelWidth = 200;
    const panelHeight = debugInfo.length * lineHeight + this.DEBUG_PADDING * 2;

    // Save current state
    this.renderer.save();

    // Draw background panel
    this.renderer.getContext().fillStyle = this.DEBUG_BACKGROUND;
    this.renderer
      .getContext()
      .fillRect(
        this.DEBUG_PADDING,
        this.DEBUG_PADDING,
        panelWidth,
        panelHeight
      );

    // Draw debug text
    debugInfo.forEach((text, index) => {
      this.renderer.drawUIText(
        text,
        this.DEBUG_PADDING * 2,
        this.DEBUG_PADDING * 2 + index * lineHeight,
        this.DEBUG_COLOR,
        this.DEBUG_FONT
      );
    });

    // Restore state
    this.renderer.restore();
  }

  /**
   * Log performance warning if FPS drops below threshold
   */
  checkPerformance(): void {
    if (!this.isEnabled || this.fpsHistory.length < 30) return;

    const recentFps = this.fpsHistory.slice(-30);
    const avgFps =
      recentFps.reduce((sum, fps) => sum + fps, 0) / recentFps.length;

    // Warn if FPS drops below 30 for extended period
    if (avgFps < 30) {
      console.warn(
        `Performance Warning: Average FPS dropped to ${avgFps.toFixed(1)}`
      );
    }

    // Warn if frame time is consistently high
    const recentFrameTimes = this.frameTimeHistory.slice(-30);
    const avgFrameTime =
      recentFrameTimes.reduce((sum, time) => sum + time, 0) /
      recentFrameTimes.length;

    if (avgFrameTime > 33.33) {
      // More than 33.33ms indicates <30 FPS
      console.warn(
        `Performance Warning: Average frame time is ${avgFrameTime.toFixed(1)}ms`
      );
    }
  }

  /**
   * Export performance data for analysis
   */
  exportPerformanceData(): {
    timestamp: number;
    fpsHistory: number[];
    frameTimeHistory: number[];
    stats: any;
  } {
    return {
      timestamp: Date.now(),
      fpsHistory: [...this.fpsHistory],
      frameTimeHistory: [...this.frameTimeHistory],
      stats: this.getPerformanceStats(),
    };
  }

  /**
   * Reset performance history
   */
  reset(): void {
    this.fpsHistory = [];
    this.frameTimeHistory = [];
  }

  /**
   * Log a debug message (only in debug mode)
   */
  log(message: string, ...args: any[]): void {
    if (this.isEnabled) {
      console.log(`[Debug] ${message}`, ...args);
    }
  }

  /**
   * Log a debug warning (only in debug mode)
   */
  warn(message: string, ...args: any[]): void {
    if (this.isEnabled) {
      console.warn(`[Debug] ${message}`, ...args);
    }
  }

  /**
   * Log a debug error (only in debug mode)
   */
  error(message: string, ...args: any[]): void {
    if (this.isEnabled) {
      console.error(`[Debug] ${message}`, ...args);
    }
  }
}
