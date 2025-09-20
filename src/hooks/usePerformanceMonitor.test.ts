import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePerformanceMonitor } from './usePerformanceMonitor';
import * as PerformanceMonitorModule from '../utils/PerformanceMonitor';

describe('usePerformanceMonitor', () => {
  let mockStart: ReturnType<typeof vi.fn>;
  let mockStop: ReturnType<typeof vi.fn>;
  let mockGetMetrics: ReturnType<typeof vi.fn>;
  let mockRecordRenderTime: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock the editorPerformanceMonitor methods
    mockStart = vi.fn();
    mockStop = vi.fn();
    mockGetMetrics = vi.fn().mockReturnValue({
      fps: 60,
      frameTime: 16.67,
      memoryUsage: 100,
      renderTime: 10,
      droppedFrames: 0,
      timestamp: Date.now(),
    });
    mockRecordRenderTime = vi.fn();

    vi.spyOn(PerformanceMonitorModule.editorPerformanceMonitor, 'start').mockImplementation(mockStart);
    vi.spyOn(PerformanceMonitorModule.editorPerformanceMonitor, 'stop').mockImplementation(mockStop);
    vi.spyOn(PerformanceMonitorModule.editorPerformanceMonitor, 'getMetrics').mockImplementation(mockGetMetrics);
    vi.spyOn(PerformanceMonitorModule.editorPerformanceMonitor, 'recordRenderTime').mockImplementation(mockRecordRenderTime);

    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should initialize with null metrics', () => {
    const { result } = renderHook(() => usePerformanceMonitor({ enabled: false }));

    expect(result.current.metrics).toBeNull();
    expect(result.current.isMonitoring).toBe(false);
  });

  it('should start monitoring when enabled', () => {
    const { result } = renderHook(() => usePerformanceMonitor({ enabled: true }));

    expect(mockStart).toHaveBeenCalled();
    expect(result.current.isMonitoring).toBe(true);
  });

  it('should not start monitoring when disabled', () => {
    const { result } = renderHook(() => usePerformanceMonitor({ enabled: false }));

    expect(mockStart).not.toHaveBeenCalled();
    expect(result.current.isMonitoring).toBe(false);
  });

  it('should update metrics periodically', () => {
    const { result } = renderHook(() =>
      usePerformanceMonitor({ enabled: true, updateInterval: 1000 })
    );

    // Initially, metrics might be null
    expect(result.current.isMonitoring).toBe(true);

    // Advance timers to trigger metric update
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(mockGetMetrics).toHaveBeenCalled();
  });

  it('should handle manual start and stop', () => {
    const { result } = renderHook(() => usePerformanceMonitor({ enabled: false }));

    expect(result.current.isMonitoring).toBe(false);
    expect(mockStart).not.toHaveBeenCalled();

    // Manually start monitoring
    act(() => {
      result.current.startMonitoring();
    });

    expect(mockStart).toHaveBeenCalledTimes(1);
    expect(result.current.isMonitoring).toBe(true);

    // Manually stop monitoring
    act(() => {
      result.current.stopMonitoring();
    });

    expect(mockStop).toHaveBeenCalledTimes(1);
    expect(result.current.isMonitoring).toBe(false);
  });

  it('should record render time', () => {
    const { result } = renderHook(() => usePerformanceMonitor());

    act(() => {
      result.current.recordRenderTime(15.5);
    });

    expect(mockRecordRenderTime).toHaveBeenCalledWith(15.5);
  });

  it('should handle custom thresholds', () => {
    const customThresholds = {
      minFPS: 45,
      maxFrameTime: 22.22,
      maxMemoryMB: 300,
      maxRenderTime: 10,
    };

    renderHook(() => usePerformanceMonitor({
      enabled: true,
      thresholds: customThresholds,
    }));

    expect(mockStart).toHaveBeenCalled();
  });

  it('should call warning callback', () => {
    const onWarning = vi.fn();
    const mockStartWithWarning = vi.fn((metricsCallback, warningCallback) => {
      // Simulate a warning
      warningCallback?.('Low FPS: 25');
    });

    vi.spyOn(PerformanceMonitorModule.editorPerformanceMonitor, 'start').mockImplementation(mockStartWithWarning);

    renderHook(() => usePerformanceMonitor({
      enabled: true,
      onWarning,
    }));

    expect(onWarning).toHaveBeenCalledWith('Low FPS: 25');
  });

  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(() => usePerformanceMonitor({ enabled: true }));

    expect(mockStart).toHaveBeenCalled();

    unmount();

    expect(mockStop).toHaveBeenCalled();
  });

  it('should not start monitoring multiple times', () => {
    const { result } = renderHook(() => usePerformanceMonitor({ enabled: true }));

    mockStart.mockClear();

    act(() => {
      result.current.startMonitoring();
    });

    // Should not call start again since already monitoring
    expect(mockStart).not.toHaveBeenCalled();
  });

  it('should handle different update intervals', () => {
    renderHook(() => usePerformanceMonitor({
      enabled: true,
      updateInterval: 500,
    }));

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(mockGetMetrics).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(mockGetMetrics).toHaveBeenCalledTimes(2);
  });
});
