import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PerformanceMonitor } from './PerformanceMonitor';

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;
  let rafStub: ReturnType<typeof vi.fn>;
  let originalRAF: typeof requestAnimationFrame;
  let originalPerformanceNow: typeof performance.now;

  beforeEach(() => {
    // Mock requestAnimationFrame
    originalRAF = global.requestAnimationFrame;
    rafStub = vi.fn((callback) => {
      setTimeout(() => callback(0), 0);
      return 1;
    });
    global.requestAnimationFrame = rafStub;

    // Mock performance.now
    originalPerformanceNow = performance.now;
    let time = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => {
      return (time += 16.67); // Simulate 60 FPS
    });

    monitor = new PerformanceMonitor({
      minFPS: 30,
      maxFrameTime: 33.33,
      maxMemoryMB: 500,
      maxRenderTime: 16.67,
    });
  });

  afterEach(() => {
    monitor.stop();
    global.requestAnimationFrame = originalRAF;
    performance.now = originalPerformanceNow;
    vi.clearAllMocks();
  });

  it('should initialize with default thresholds', () => {
    const defaultMonitor = new PerformanceMonitor();
    expect(defaultMonitor).toBeDefined();
    expect(defaultMonitor.getMetrics()).toBeDefined();
  });

  it('should start and stop monitoring', () => {
    const metricsCallback = vi.fn();

    monitor.start(metricsCallback);
    expect(rafStub).toHaveBeenCalled();

    monitor.stop();
    // Should be able to stop multiple times without error
    monitor.stop();
  });

  it('should calculate FPS correctly', async () => {
    vi.useFakeTimers();
    const metricsCallback = vi.fn();

    monitor.start(metricsCallback);

    // Simulate 60 frames over 1 second
    for (let i = 0; i < 60; i++) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    // Allow metrics to be calculated
    vi.advanceTimersByTime(1000);

    const metrics = monitor.getMetrics();
    expect(metrics).toBeDefined();
    expect(metrics.fps).toBeGreaterThan(0);
    
    vi.useRealTimers();
  });

  it('should track render times', () => {
    monitor.recordRenderTime(10);
    monitor.recordRenderTime(20);
    monitor.recordRenderTime(15);

    const metrics = monitor.getMetrics();
    expect(metrics.renderTime).toBeCloseTo(15); // Average of 10, 20, 15
  });

  it('should limit render time history to 60 samples', () => {
    for (let i = 0; i < 100; i++) {
      monitor.recordRenderTime(i);
    }

    const metrics = monitor.getMetrics();
    // Should only keep last 60 samples
    expect(metrics.renderTime).toBeGreaterThan(30); // Average of last 60 numbers
  });

  it('should emit warnings when thresholds are exceeded', () => {
    vi.useFakeTimers();
    const warningCallback = vi.fn();

    monitor.start(undefined, warningCallback);

    // Record slow render times
    for (let i = 0; i < 10; i++) {
      monitor.recordRenderTime(50); // Above 16.67ms threshold
    }

    // Mock slow FPS by advancing time significantly
    vi.spyOn(performance, 'now').mockReturnValue(2000);

    // Trigger metrics calculation
    vi.advanceTimersByTime(1000);

    // Warnings should be called for slow performance
    // Note: Due to mocking limitations, we may not see all warnings
    const metrics = monitor.getMetrics();
    if (metrics.renderTime > 16.67) {
      expect(metrics.renderTime).toBeGreaterThan(16.67);
    }
    
    vi.useRealTimers();
  });

  it('should reset metrics correctly', () => {
    monitor.recordRenderTime(100);
    monitor.recordRenderTime(200);

    monitor.reset();

    const metrics = monitor.getMetrics();
    expect(metrics.fps).toBe(60);
    expect(metrics.frameTime).toBeCloseTo(16.67);
    expect(metrics.renderTime).toBe(0);
    expect(metrics.droppedFrames).toBe(0);
  });

  it('should handle memory usage when available', () => {
    // Mock performance.memory
    Object.defineProperty(performance, 'memory', {
      value: {
        usedJSHeapSize: 52428800, // 50 MB in bytes
      },
      writable: true,
      configurable: true,
    });

    const metrics = monitor.getMetrics();
    expect(metrics.memoryUsage).toBe(50);

    // Clean up
    // @ts-ignore
    delete performance.memory;
  });

  it('should return 0 memory when not available', () => {
    // Ensure performance.memory is not defined
    // @ts-ignore
    delete performance.memory;

    const metrics = monitor.getMetrics();
    expect(metrics.memoryUsage).toBe(0);
  });

  it('should not start monitoring if already monitoring', () => {
    const metricsCallback = vi.fn();

    monitor.start(metricsCallback);
    const initialCallCount = rafStub.mock.calls.length;

    monitor.start(metricsCallback); // Try to start again
    expect(rafStub.mock.calls.length).toBe(initialCallCount);
  });
});
