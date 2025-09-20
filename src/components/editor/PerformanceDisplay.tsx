import React from 'react';
import { PerformanceMetrics } from '../../utils/PerformanceMonitor';
import styles from './PerformanceDisplay.module.css';

interface PerformanceDisplayProps {
  metrics: PerformanceMetrics | null;
  show?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

/**
 * Component to display performance metrics overlay
 */
export const PerformanceDisplay: React.FC<PerformanceDisplayProps> = ({
  metrics,
  show = process.env.NODE_ENV === 'development',
  position = 'top-right',
}) => {
  if (!show || !metrics) return null;

  const getFPSColor = (fps: number): string => {
    if (fps >= 55) return '#4caf50'; // Green
    if (fps >= 30) return '#ff9800'; // Orange
    return '#f44336'; // Red
  };

  const getMemoryColor = (memory: number): string => {
    if (memory <= 200) return '#4caf50'; // Green
    if (memory <= 400) return '#ff9800'; // Orange
    return '#f44336'; // Red
  };

  return (
    <div className={`${styles.performanceDisplay} ${styles[position]}`}>
      <div className={styles.metric}>
        <span className={styles.label}>FPS:</span>
        <span
          className={styles.value}
          style={{ color: getFPSColor(metrics.fps) }}
        >
          {metrics.fps}
        </span>
      </div>

      <div className={styles.metric}>
        <span className={styles.label}>Frame:</span>
        <span className={styles.value}>
          {metrics.frameTime.toFixed(2)}ms
        </span>
      </div>

      <div className={styles.metric}>
        <span className={styles.label}>Memory:</span>
        <span
          className={styles.value}
          style={{ color: getMemoryColor(metrics.memoryUsage) }}
        >
          {metrics.memoryUsage}MB
        </span>
      </div>

      <div className={styles.metric}>
        <span className={styles.label}>Render:</span>
        <span className={styles.value}>
          {metrics.renderTime.toFixed(2)}ms
        </span>
      </div>

      {metrics.droppedFrames > 0 && (
        <div className={styles.metric}>
          <span className={styles.label}>Dropped:</span>
          <span className={styles.value} style={{ color: '#f44336' }}>
            {metrics.droppedFrames}
          </span>
        </div>
      )}
    </div>
  );
};
