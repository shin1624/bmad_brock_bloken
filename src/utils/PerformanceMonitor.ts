/**
 * Performance Monitoring System for Editor
 * Tracks FPS, render time, memory usage, and other metrics
 */

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  renderTime: number;
  droppedFrames: number;
  timestamp: number;
}

export interface PerformanceThresholds {
  minFPS: number;
  maxFrameTime: number;
  maxMemoryMB: number;
  maxRenderTime: number;
}

export class PerformanceMonitor {
  private frameCount: number = 0;
  private lastTime: number = performance.now();
  private fps: number = 60;
  private frameTime: number = 16.67;
  private droppedFrames: number = 0;
  private renderTimes: number[] = [];
  private isMonitoring: boolean = false;
  private animationFrameId: number | null = null;
  private metricsCallback?: (metrics: PerformanceMetrics) => void;
  private thresholds: PerformanceThresholds;
  private warningCallback?: (warning: string) => void;

  constructor(
    thresholds: PerformanceThresholds = {
      minFPS: 30,
      maxFrameTime: 33.33, // ~30 FPS
      maxMemoryMB: 500,
      maxRenderTime: 16.67, // 60 FPS target
    }
  ) {
    this.thresholds = thresholds;
  }

  start(metricsCallback?: (metrics: PerformanceMetrics) => void, warningCallback?: (warning: string) => void): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.metricsCallback = metricsCallback;
    this.warningCallback = warningCallback;
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.droppedFrames = 0;

    this.monitor();
  }

  stop(): void {
    this.isMonitoring = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private monitor = (): void => {
    if (!this.isMonitoring) return;

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;

    // Calculate FPS
    this.frameCount++;
    if (deltaTime >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / deltaTime);
      this.frameTime = deltaTime / this.frameCount;

      // Check for dropped frames
      const expectedFrames = Math.round(deltaTime / 16.67);
      const droppedInPeriod = Math.max(0, expectedFrames - this.frameCount);
      this.droppedFrames += droppedInPeriod;

      // Reset counters
      this.frameCount = 0;
      this.lastTime = currentTime;

      // Get memory usage if available
      const memoryUsage = this.getMemoryUsage();

      // Calculate average render time
      const avgRenderTime = this.renderTimes.length > 0
        ? this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length
        : 0;

      // Create metrics object
      const metrics: PerformanceMetrics = {
        fps: this.fps,
        frameTime: this.frameTime,
        memoryUsage,
        renderTime: avgRenderTime,
        droppedFrames: this.droppedFrames,
        timestamp: currentTime,
      };

      // Check thresholds and emit warnings
      this.checkThresholds(metrics);

      // Callback with metrics
      this.metricsCallback?.(metrics);

      // Clear render times for next period
      this.renderTimes = [];
    }

    // Continue monitoring
    this.animationFrameId = requestAnimationFrame(this.monitor);
  };

  private getMemoryUsage(): number {
    // @ts-ignore - performance.memory is not in TypeScript types
    if (performance.memory) {
      // @ts-ignore
      return Math.round(performance.memory.usedJSHeapSize / 1048576); // Convert to MB
    }
    return 0;
  }

  private checkThresholds(metrics: PerformanceMetrics): void {
    const warnings: string[] = [];

    if (metrics.fps < this.thresholds.minFPS) {
      warnings.push(`Low FPS: ${metrics.fps} (minimum: ${this.thresholds.minFPS})`);
    }

    if (metrics.frameTime > this.thresholds.maxFrameTime) {
      warnings.push(`High frame time: ${metrics.frameTime.toFixed(2)}ms (maximum: ${this.thresholds.maxFrameTime}ms)`);
    }

    if (metrics.memoryUsage > this.thresholds.maxMemoryMB) {
      warnings.push(`High memory usage: ${metrics.memoryUsage}MB (maximum: ${this.thresholds.maxMemoryMB}MB)`);
    }

    if (metrics.renderTime > this.thresholds.maxRenderTime) {
      warnings.push(`Slow render: ${metrics.renderTime.toFixed(2)}ms (maximum: ${this.thresholds.maxRenderTime}ms)`);
    }

    if (warnings.length > 0 && this.warningCallback) {
      warnings.forEach(warning => this.warningCallback!(warning));
    }
  }

  recordRenderTime(time: number): void {
    this.renderTimes.push(time);

    // Keep only last 60 samples
    if (this.renderTimes.length > 60) {
      this.renderTimes.shift();
    }
  }

  getMetrics(): PerformanceMetrics {
    return {
      fps: this.fps,
      frameTime: this.frameTime,
      memoryUsage: this.getMemoryUsage(),
      renderTime: this.renderTimes.length > 0
        ? this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length
        : 0,
      droppedFrames: this.droppedFrames,
      timestamp: performance.now(),
    };
  }

  reset(): void {
    this.frameCount = 0;
    this.droppedFrames = 0;
    this.renderTimes = [];
    this.fps = 60;
    this.frameTime = 16.67;
  }
}

// Singleton instance
export const editorPerformanceMonitor = new PerformanceMonitor();
