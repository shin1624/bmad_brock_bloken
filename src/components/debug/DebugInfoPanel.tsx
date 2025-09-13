import React from "react";
import type { PerformanceMetrics } from "../../types/game.types";
import { useDebugInfo } from "../../hooks/useDebugInfo";

interface DebugInfoPanelProps {
  performanceMetrics: PerformanceMetrics;
  className?: string;
}

/**
 * Debug information panel component that displays FPS and performance metrics
 * Only visible in development environment
 *
 * Keyboard shortcuts:
 * - F3: Toggle visibility
 * - F4: Toggle detailed view
 */
export function DebugInfoPanel({
  performanceMetrics,
  className = "",
}: DebugInfoPanelProps) {
  const {
    isVisible,
    showDetailed,
    isDevEnvironment,
    getPerformanceStatus,
    getFrameTimeStatus,
  } = useDebugInfo(performanceMetrics);

  // Don't render in production environment
  if (!isDevEnvironment || !isVisible) {
    return null;
  }

  const { fps, averageFps, deltaTime, frameCount, lastFrameTime } =
    performanceMetrics;

  const fpsStatus = getPerformanceStatus(fps);
  const frameTimeStatus = getFrameTimeStatus(deltaTime);

  // Calculate additional metrics
  const frameTimeMs = deltaTime * 1000;
  const targetFrameTime = 16.67; // 60 FPS target
  const efficiency = Math.min((targetFrameTime / frameTimeMs) * 100, 100);

  return (
    <div
      className={`fixed top-4 right-4 bg-black/90 text-white text-xs font-mono rounded-lg p-4 z-50 backdrop-blur-md border border-gray-600/50 shadow-lg ${className}`}
    >
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-gray-300 font-semibold">Performance Debug</h3>
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full bg-${fpsStatus.color}-400`} />
            <span className="text-xs text-gray-400">{fpsStatus.status}</span>
          </div>
        </div>
        <div className="text-xs text-gray-500">F3: Toggle | F4: Details</div>
      </div>

      <div className="space-y-2">
        {/* Core Metrics */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <div className="flex justify-between">
            <span className="text-gray-400">FPS:</span>
            <span className={`text-${fpsStatus.color}-400 font-medium`}>
              {fps.toFixed(0)}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-400">Avg:</span>
            <span
              className={`text-${getPerformanceStatus(averageFps).color}-400`}
            >
              {averageFps.toFixed(1)}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-400">Frame:</span>
            <span className={`text-${frameTimeStatus.color}-400`}>
              {frameTimeMs.toFixed(1)}ms
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-400">Efficiency:</span>
            <span
              className={`text-${efficiency > 90 ? "green" : efficiency > 70 ? "yellow" : "red"}-400`}
            >
              {efficiency.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Detailed View */}
        {showDetailed && (
          <>
            <div className="border-t border-gray-600 pt-2 mt-3">
              <div className="text-gray-300 mb-1 text-xs font-semibold">
                Detailed Metrics
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">Frames:</span>
                  <span className="text-purple-400">
                    {frameCount.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-400">Runtime:</span>
                  <span className="text-blue-400">
                    {(lastFrameTime / 1000).toFixed(1)}s
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-400">Target:</span>
                  <span className="text-gray-300">
                    {targetFrameTime.toFixed(1)}ms
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-400">Delta:</span>
                  <span className="text-cyan-400">{deltaTime.toFixed(4)}s</span>
                </div>
              </div>
            </div>

            {/* Performance Bar */}
            <div className="border-t border-gray-600 pt-2 mt-2">
              <div className="text-gray-300 mb-1 text-xs font-semibold">
                Performance
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full bg-${efficiency > 90 ? "green" : efficiency > 70 ? "yellow" : "red"}-400 transition-all duration-300`}
                  style={{ width: `${Math.min(efficiency, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0%</span>
                <span>100%</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default DebugInfoPanel;
