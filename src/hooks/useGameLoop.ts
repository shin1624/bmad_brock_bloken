import { useEffect, useRef, useState, useCallback } from "react";
import { GameLoop } from "../game/core/GameLoop";
import type { PerformanceMetrics, GameLoopConfig } from "../types/game.types";

/**
 * Custom hook for managing GameLoop instance with React lifecycle integration
 * Provides performance metrics and loop control methods
 */
export function useGameLoop(config?: GameLoopConfig) {
  const gameLoopRef = useRef<GameLoop | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [performanceMetrics, setPerformanceMetrics] =
    useState<PerformanceMetrics>({
      fps: 0,
      deltaTime: 0,
      averageFps: 0,
      frameCount: 0,
      lastFrameTime: 0,
    });

  // Initialize GameLoop instance
  useEffect(() => {
    gameLoopRef.current = new GameLoop(config);

    return () => {
      if (gameLoopRef.current) {
        gameLoopRef.current.stop();
        gameLoopRef.current = null;
      }
    };
  }, [config]);

  // Performance metrics update interval
  useEffect(() => {
    if (!gameLoopRef.current) return;

    const updateMetrics = () => {
      if (gameLoopRef.current) {
        const metrics = gameLoopRef.current.getPerformanceMetrics();
        setPerformanceMetrics(metrics);
        setIsRunning(gameLoopRef.current.isRunning());
        setIsPaused(gameLoopRef.current.isPaused());
      }
    };

    // Update metrics every 100ms for smooth UI updates
    const intervalId = setInterval(updateMetrics, 100);

    return () => clearInterval(intervalId);
  }, []);

  // Start game loop
  const start = useCallback(() => {
    if (gameLoopRef.current && !gameLoopRef.current.isRunning()) {
      gameLoopRef.current.start();
      setIsRunning(true);
      setIsPaused(false);
    }
  }, []);

  // Stop game loop
  const stop = useCallback(() => {
    if (gameLoopRef.current && gameLoopRef.current.isRunning()) {
      gameLoopRef.current.stop();
      setIsRunning(false);
      setIsPaused(false);
    }
  }, []);

  // Pause game loop
  const pause = useCallback(() => {
    if (
      gameLoopRef.current &&
      gameLoopRef.current.isRunning() &&
      !gameLoopRef.current.isPaused()
    ) {
      gameLoopRef.current.pause();
      setIsPaused(true);
    }
  }, []);

  // Resume game loop
  const resume = useCallback(() => {
    if (gameLoopRef.current && gameLoopRef.current.isPaused()) {
      gameLoopRef.current.resume();
      setIsPaused(false);
    }
  }, []);

  // Register update callback
  const onUpdate = useCallback(
    (callback: (deltaTime: number, currentTime: number) => void) => {
      if (gameLoopRef.current) {
        gameLoopRef.current.onUpdate(callback);
      }
    },
    [],
  );

  // Register render callback
  const onRender = useCallback(
    (callback: (deltaTime: number, currentTime: number) => void) => {
      if (gameLoopRef.current) {
        gameLoopRef.current.onRender(callback);
      }
    },
    [],
  );

  // Remove update callback
  const removeUpdateCallback = useCallback(
    (callback: (deltaTime: number, currentTime: number) => void) => {
      if (gameLoopRef.current) {
        gameLoopRef.current.removeUpdateCallback(callback);
      }
    },
    [],
  );

  // Remove render callback
  const removeRenderCallback = useCallback(
    (callback: (deltaTime: number, currentTime: number) => void) => {
      if (gameLoopRef.current) {
        gameLoopRef.current.removeRenderCallback(callback);
      }
    },
    [],
  );

  return {
    // State
    isRunning,
    isPaused,
    performanceMetrics,

    // Control methods
    start,
    stop,
    pause,
    resume,

    // Callback registration
    onUpdate,
    onRender,
    removeUpdateCallback,
    removeRenderCallback,

    // Direct access to GameLoop instance if needed
    gameLoop: gameLoopRef.current,
  };
}
