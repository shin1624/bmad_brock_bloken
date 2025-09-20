import { useEffect, useState, useCallback, useRef } from 'react';
import { PerformanceMetrics, PerformanceThresholds, editorPerformanceMonitor } from '../utils/PerformanceMonitor';

interface UsePerformanceMonitorOptions {
  enabled?: boolean;
  thresholds?: Partial<PerformanceThresholds>;
  onWarning?: (warning: string) => void;
  updateInterval?: number;
}

interface UsePerformanceMonitorReturn {
  metrics: PerformanceMetrics | null;
  isMonitoring: boolean;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  recordRenderTime: (time: number) => void;
}

/**
 * Hook for monitoring editor performance metrics
 */
export const usePerformanceMonitor = (
  options: UsePerformanceMonitorOptions = {}
): UsePerformanceMonitorReturn => {
  const {
    enabled = true,
    thresholds,
    onWarning,
    updateInterval = 1000,
  } = options;

  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout>();

  const startMonitoring = useCallback(() => {
    if (!enabled || isMonitoring) return;

    // Configure thresholds if provided
    if (thresholds) {
      const defaultThresholds: PerformanceThresholds = {
        minFPS: thresholds.minFPS ?? 30,
        maxFrameTime: thresholds.maxFrameTime ?? 33.33,
        maxMemoryMB: thresholds.maxMemoryMB ?? 500,
        maxRenderTime: thresholds.maxRenderTime ?? 16.67,
      };

      // Create new monitor instance with custom thresholds
      editorPerformanceMonitor.stop();
      Object.assign(editorPerformanceMonitor, {
        thresholds: defaultThresholds,
      });
    }

    editorPerformanceMonitor.start(
      (newMetrics) => {
        setMetrics(newMetrics);
      },
      onWarning
    );

    setIsMonitoring(true);

    // Set up periodic metric updates
    intervalRef.current = setInterval(() => {
      const currentMetrics = editorPerformanceMonitor.getMetrics();
      setMetrics(currentMetrics);
    }, updateInterval);
  }, [enabled, isMonitoring, thresholds, onWarning, updateInterval]);

  const stopMonitoring = useCallback(() => {
    editorPerformanceMonitor.stop();
    setIsMonitoring(false);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
  }, []);

  const recordRenderTime = useCallback((time: number) => {
    editorPerformanceMonitor.recordRenderTime(time);
  }, []);

  // Auto-start monitoring on mount if enabled
  useEffect(() => {
    if (enabled && !isMonitoring) {
      startMonitoring();
    }

    return () => {
      if (isMonitoring) {
        stopMonitoring();
      }
    };
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    metrics,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    recordRenderTime,
  };
};
