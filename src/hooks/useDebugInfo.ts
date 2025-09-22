import { useState, useEffect } from "react";
import type { PerformanceMetrics } from "../types/game.types";

interface DebugInfoState {
  isVisible: boolean;
  showDetailed: boolean;
  isDevEnvironment: boolean;
}

/**
 * Custom hook for managing debug information panel state and visibility
 */
export function useDebugInfo(_performanceMetrics?: PerformanceMetrics) {
  const [debugState, setDebugState] = useState<DebugInfoState>({
    isVisible: true,
    showDetailed: false,
    isDevEnvironment: false,
  });

  // Check development environment on mount
  useEffect(() => {
    setDebugState((prev) => ({
      ...prev,
      isDevEnvironment: import.meta.env.DEV,
    }));
  }, []);

  // Keyboard shortcuts for debug controls
  useEffect(() => {
    if (!debugState.isDevEnvironment) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Toggle debug panel visibility with F3
      if (event.key === "F3") {
        event.preventDefault();
        setDebugState((prev) => ({
          ...prev,
          isVisible: !prev.isVisible,
        }));
      }

      // Toggle detailed view with F4
      if (event.key === "F4") {
        event.preventDefault();
        setDebugState((prev) => ({
          ...prev,
          showDetailed: !prev.showDetailed,
        }));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [debugState.isDevEnvironment]);

  // Performance analysis helpers
  const getPerformanceStatus = (fps: number) => {
    if (fps >= 58) return { status: "excellent", color: "green" };
    if (fps >= 45) return { status: "good", color: "yellow" };
    return { status: "poor", color: "red" };
  };

  const getFrameTimeStatus = (deltaTime: number) => {
    const frameTimeMs = deltaTime * 1000;
    if (frameTimeMs <= 16.67) return { status: "optimal", color: "green" };
    if (frameTimeMs <= 22.22) return { status: "acceptable", color: "yellow" };
    return { status: "problematic", color: "red" };
  };

  // Control methods
  const toggleVisibility = () => {
    setDebugState((prev) => ({
      ...prev,
      isVisible: !prev.isVisible,
    }));
  };

  const toggleDetailed = () => {
    setDebugState((prev) => ({
      ...prev,
      showDetailed: !prev.showDetailed,
    }));
  };

  const hide = () => {
    setDebugState((prev) => ({
      ...prev,
      isVisible: false,
    }));
  };

  const show = () => {
    setDebugState((prev) => ({
      ...prev,
      isVisible: true,
    }));
  };

  return {
    // State
    isVisible: debugState.isVisible && debugState.isDevEnvironment,
    showDetailed: debugState.showDetailed,
    isDevEnvironment: debugState.isDevEnvironment,

    // Performance analysis
    getPerformanceStatus,
    getFrameTimeStatus,

    // Control methods
    toggleVisibility,
    toggleDetailed,
    hide,
    show,
  };
}
