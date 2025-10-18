/**
 * Game Performance Monitor
 * Story 4.3b - BLOCKER #3 Resolution
 * Extended performance monitoring for gameplay scenarios
 */

export interface GamePerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  renderTime: number;
  updateTime: number;
  droppedFrames: number;
  timestamp: number;

  // Game-specific metrics
  activePowerUps: number;
  activeParticles: number;
  activeBalls: number;
  activeBlocks: number;
  activeProjectiles?: number;
}

export interface GamePerformanceThresholds {
  minFPS: number;           // Default: 50 FPS (Story 4.3b: 50 FPS with 5 power-ups)
  maxFrameTime: number;     // Default: 20ms
  maxMemoryMB: number;      // Default: 250MB (Story 4.3b requirement)
  maxRenderTime: number;    // Default: 10ms
  maxUpdateTime: number;    // Default: 6ms
}

export interface PerformanceBenchmarkResult {
  passed: boolean;
  metrics: GamePerformanceMetrics;
  duration: number;
  averageFPS: number;
  minFPS: number;
  maxFPS: number;
  violations: string[];
}

/**
 * Game Performance Monitor
 * Tracks game performance with power-up and entity metrics
 */
export class GamePerformanceMonitor {
  private frameCount: number = 0;
  private lastTime: number = performance.now();
  private fps: number = 60;
  private frameTime: number = 16.67;
  private droppedFrames: number = 0;
  private renderTimes: number[] = [];
  private updateTimes: number[] = [];
  private isMonitoring: boolean = false;
  private animationFrameId: number | null = null;
  private metricsCallback?: (metrics: GamePerformanceMetrics) => void;
  private thresholds: GamePerformanceThresholds;
  private warningCallback?: (warning: string) => void;

  // FPS tracking for benchmarks
  private fpsHistory: number[] = [];
  private benchmarkStartTime: number = 0;
  private benchmarkDuration: number = 0;

  // Game state tracking
  private gameStateProvider?: () => {
    activePowerUps: number;
    activeParticles: number;
    activeBalls: number;
    activeBlocks: number;
    activeProjectiles?: number;
  };

  constructor(
    thresholds: Partial<GamePerformanceThresholds> = {}
  ) {
    this.thresholds = {
      minFPS: thresholds.minFPS || 50,
      maxFrameTime: thresholds.maxFrameTime || 20,
      maxMemoryMB: thresholds.maxMemoryMB || 250,
      maxRenderTime: thresholds.maxRenderTime || 10,
      maxUpdateTime: thresholds.maxUpdateTime || 6,
    };
  }

  /**
   * Set game state provider for entity counting
   */
  setGameStateProvider(
    provider: () => {
      activePowerUps: number;
      activeParticles: number;
      activeBalls: number;
      activeBlocks: number;
      activeProjectiles?: number;
    }
  ): void {
    this.gameStateProvider = provider;
  }

  /**
   * Start monitoring performance
   */
  start(
    metricsCallback?: (metrics: GamePerformanceMetrics) => void,
    warningCallback?: (warning: string) => void
  ): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.metricsCallback = metricsCallback;
    this.warningCallback = warningCallback;
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.droppedFrames = 0;
    this.fpsHistory = [];

    this.monitor();
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    this.isMonitoring = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Start performance benchmark
   */
  startBenchmark(durationMs: number = 10000): void {
    this.benchmarkStartTime = performance.now();
    this.benchmarkDuration = durationMs;
    this.fpsHistory = [];
    this.droppedFrames = 0;
  }

  /**
   * Stop benchmark and return results
   */
  stopBenchmark(): PerformanceBenchmarkResult {
    const duration = performance.now() - this.benchmarkStartTime;
    const averageFPS = this.fpsHistory.length > 0
      ? this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length
      : 0;
    const minFPS = this.fpsHistory.length > 0
      ? Math.min(...this.fpsHistory)
      : 0;
    const maxFPS = this.fpsHistory.length > 0
      ? Math.max(...this.fpsHistory)
      : 0;

    const currentMetrics = this.getMetrics();
    const violations: string[] = [];

    // Check threshold violations
    if (averageFPS < this.thresholds.minFPS) {
      violations.push(
        `Average FPS ${averageFPS.toFixed(1)} below minimum ${this.thresholds.minFPS}`
      );
    }

    if (minFPS < this.thresholds.minFPS * 0.8) {
      violations.push(
        `Minimum FPS ${minFPS.toFixed(1)} critically low (80% of target)`
      );
    }

    if (currentMetrics.memoryUsage > this.thresholds.maxMemoryMB) {
      violations.push(
        `Memory usage ${currentMetrics.memoryUsage}MB exceeds ${this.thresholds.maxMemoryMB}MB`
      );
    }

    const avgFrameTime = this.frameTime;
    if (avgFrameTime > this.thresholds.maxFrameTime) {
      violations.push(
        `Average frame time ${avgFrameTime.toFixed(2)}ms exceeds ${this.thresholds.maxFrameTime}ms`
      );
    }

    return {
      passed: violations.length === 0,
      metrics: currentMetrics,
      duration,
      averageFPS,
      minFPS,
      maxFPS,
      violations,
    };
  }

  /**
   * Monitor loop
   */
  private monitor = (): void => {
    if (!this.isMonitoring) return;

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;

    // Calculate FPS
    this.frameCount++;
    if (deltaTime >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / deltaTime);
      this.frameTime = deltaTime / this.frameCount;

      // Track FPS for benchmarks
      if (this.benchmarkStartTime > 0) {
        this.fpsHistory.push(this.fps);
      }

      // Check for dropped frames
      const expectedFrames = Math.round(deltaTime / 16.67);
      const droppedInPeriod = Math.max(0, expectedFrames - this.frameCount);
      this.droppedFrames += droppedInPeriod;

      // Reset counters
      this.frameCount = 0;
      this.lastTime = currentTime;

      // Get metrics
      const metrics = this.getMetrics();

      // Check thresholds and emit warnings
      this.checkThresholds(metrics);

      // Callback with metrics
      this.metricsCallback?.(metrics);

      // Clear times for next period
      this.renderTimes = [];
      this.updateTimes = [];
    }

    // Continue monitoring
    this.animationFrameId = requestAnimationFrame(this.monitor);
  };

  /**
   * Get memory usage in MB
   */
  private getMemoryUsage(): number {
    // @ts-ignore - performance.memory is Chrome-specific
    if (performance.memory) {
      // @ts-ignore
      return Math.round(performance.memory.usedJSHeapSize / 1048576);
    }
    return 0;
  }

  /**
   * Check thresholds and emit warnings
   */
  private checkThresholds(metrics: GamePerformanceMetrics): void {
    const warnings: string[] = [];

    if (metrics.fps < this.thresholds.minFPS) {
      warnings.push(
        `Low FPS: ${metrics.fps} (minimum: ${this.thresholds.minFPS})`
      );
    }

    if (metrics.frameTime > this.thresholds.maxFrameTime) {
      warnings.push(
        `High frame time: ${metrics.frameTime.toFixed(2)}ms (maximum: ${this.thresholds.maxFrameTime}ms)`
      );
    }

    if (metrics.memoryUsage > this.thresholds.maxMemoryMB) {
      warnings.push(
        `High memory usage: ${metrics.memoryUsage}MB (maximum: ${this.thresholds.maxMemoryMB}MB)`
      );
    }

    if (metrics.renderTime > this.thresholds.maxRenderTime) {
      warnings.push(
        `Slow render: ${metrics.renderTime.toFixed(2)}ms (maximum: ${this.thresholds.maxRenderTime}ms)`
      );
    }

    if (metrics.updateTime > this.thresholds.maxUpdateTime) {
      warnings.push(
        `Slow update: ${metrics.updateTime.toFixed(2)}ms (maximum: ${this.thresholds.maxUpdateTime}ms)`
      );
    }

    if (warnings.length > 0 && this.warningCallback) {
      warnings.forEach((warning) => this.warningCallback!(warning));
    }
  }

  /**
   * Record render time
   */
  recordRenderTime(time: number): void {
    this.renderTimes.push(time);

    // Keep only last 60 samples
    if (this.renderTimes.length > 60) {
      this.renderTimes.shift();
    }
  }

  /**
   * Record update time
   */
  recordUpdateTime(time: number): void {
    this.updateTimes.push(time);

    // Keep only last 60 samples
    if (this.updateTimes.length > 60) {
      this.updateTimes.shift();
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): GamePerformanceMetrics {
    const gameState = this.gameStateProvider?.() || {
      activePowerUps: 0,
      activeParticles: 0,
      activeBalls: 0,
      activeBlocks: 0,
      activeProjectiles: 0,
    };

    return {
      fps: this.fps,
      frameTime: this.frameTime,
      memoryUsage: this.getMemoryUsage(),
      renderTime:
        this.renderTimes.length > 0
          ? this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length
          : 0,
      updateTime:
        this.updateTimes.length > 0
          ? this.updateTimes.reduce((a, b) => a + b, 0) / this.updateTimes.length
          : 0,
      droppedFrames: this.droppedFrames,
      timestamp: performance.now(),
      ...gameState,
    };
  }

  /**
   * Reset monitoring state
   */
  reset(): void {
    this.frameCount = 0;
    this.droppedFrames = 0;
    this.renderTimes = [];
    this.updateTimes = [];
    this.fpsHistory = [];
    this.fps = 60;
    this.frameTime = 16.67;
    this.benchmarkStartTime = 0;
  }

  /**
   * Update thresholds
   */
  updateThresholds(thresholds: Partial<GamePerformanceThresholds>): void {
    this.thresholds = {
      ...this.thresholds,
      ...thresholds,
    };
  }

  /**
   * Get current thresholds
   */
  getThresholds(): GamePerformanceThresholds {
    return { ...this.thresholds };
  }
}

// Singleton instance for game
export const gamePerformanceMonitor = new GamePerformanceMonitor({
  minFPS: 50,        // Story 4.3b: 50 FPS with 5 power-ups
  maxMemoryMB: 250,  // Story 4.3b: <250MB memory
});
