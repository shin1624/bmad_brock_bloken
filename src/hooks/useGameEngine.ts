import {
  useRef,
  useEffect,
  useState,
  useCallback,
  type RefObject,
} from 'react';
import { GameEngine } from '../game/core/GameEngine';

interface GameEngineState {
  isRunning: boolean;
  isPaused: boolean;
  isDebugMode: boolean;
  fps: number;
  fpsStats?: {
    current: number;
    average: number;
    min: number;
    max: number;
  };
}

interface UseGameEngineReturn {
  engine: GameEngine | null;
  isReady: boolean;
  gameState: GameEngineState;
  error: string | null;
  // Control functions
  start: () => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  toggleDebug: () => void;
  // Utility functions
  getPerformanceStats: () => any;
  reset: () => void;
}

/**
 * useGameEngine - Custom React hook for managing GameEngine lifecycle
 * Provides easy integration between React components and the Canvas game engine
 */
export const useGameEngine = (
  canvasRef: RefObject<HTMLCanvasElement>,
  options: {
    autoStart?: boolean;
    enableKeyboard?: boolean;
    onStateChange?: (state: GameEngineState) => void;
    onFpsUpdate?: (fps: number) => void;
    onError?: (error: string) => void;
  } = {}
): UseGameEngineReturn => {
  const {
    autoStart = true,
    enableKeyboard = true,
    onStateChange,
    onFpsUpdate,
    onError,
  } = options;

  const engineRef = useRef<GameEngine | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [gameState, setGameState] = useState<GameEngineState>({
    isRunning: false,
    isPaused: false,
    isDebugMode: false,
    fps: 0,
  });
  const [error, setError] = useState<string | null>(null);

  // Initialize game engine
  useEffect(() => {
    if (!canvasRef.current) {
      setError('Canvas reference is null');
      return;
    }

    try {
      // Create new engine instance
      const engine = new GameEngine(canvasRef.current);
      engineRef.current = engine;

      // Set up state change callback
      engine.onStateChange((newState: any) => {
        const stateUpdate = {
          isRunning: newState.isRunning,
          isPaused: newState.isPaused,
          isDebugMode: newState.isDebugMode,
          fps: newState.fps,
          fpsStats: newState.fpsStats,
        };

        setGameState(stateUpdate);

        // Notify parent component
        if (onStateChange) {
          onStateChange(stateUpdate);
        }
      });

      // Set up FPS update callback
      engine.onFpsUpdate((fps: number) => {
        if (onFpsUpdate) {
          onFpsUpdate(fps);
        }
      });

      setIsReady(true);
      setError(null);

      // Auto-start if enabled
      if (autoStart) {
        engine.start();
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to initialize game engine';
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
      console.error('useGameEngine initialization error:', err);
    }

    // Cleanup function
    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
      setIsReady(false);
      setError(null);
    };
  }, [canvasRef, autoStart, onStateChange, onFpsUpdate, onError]);

  // Keyboard event handling
  useEffect(() => {
    if (!enableKeyboard || !isReady || !engineRef.current) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (engineRef.current) {
        engineRef.current.handleKeyDown(event.key);

        // Prevent default for game-specific keys
        const gameKeys = [
          'd',
          ' ',
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight',
        ];
        if (gameKeys.includes(event.key)) {
          event.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enableKeyboard, isReady]);

  // Control functions
  const start = useCallback(() => {
    if (engineRef.current && !gameState.isRunning) {
      try {
        engineRef.current.start();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to start game engine';
        setError(errorMessage);
        if (onError) {
          onError(errorMessage);
        }
      }
    }
  }, [gameState.isRunning, onError]);

  const stop = useCallback(() => {
    if (engineRef.current && gameState.isRunning) {
      try {
        engineRef.current.stop();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to stop game engine';
        setError(errorMessage);
        if (onError) {
          onError(errorMessage);
        }
      }
    }
  }, [gameState.isRunning, onError]);

  const pause = useCallback(() => {
    if (engineRef.current && gameState.isRunning && !gameState.isPaused) {
      try {
        engineRef.current.pause();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to pause game engine';
        setError(errorMessage);
        if (onError) {
          onError(errorMessage);
        }
      }
    }
  }, [gameState.isRunning, gameState.isPaused, onError]);

  const resume = useCallback(() => {
    if (engineRef.current && gameState.isRunning && gameState.isPaused) {
      try {
        engineRef.current.resume();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to resume game engine';
        setError(errorMessage);
        if (onError) {
          onError(errorMessage);
        }
      }
    }
  }, [gameState.isRunning, gameState.isPaused, onError]);

  const toggleDebug = useCallback(() => {
    if (engineRef.current && isReady) {
      try {
        engineRef.current.toggleDebug();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to toggle debug mode';
        setError(errorMessage);
        if (onError) {
          onError(errorMessage);
        }
      }
    }
  }, [isReady, onError]);

  // Utility functions
  const getPerformanceStats = useCallback(() => {
    if (engineRef.current && isReady) {
      return engineRef.current.getPerformanceStats();
    }
    return null;
  }, [isReady]);

  const reset = useCallback(() => {
    if (engineRef.current) {
      try {
        const wasRunning = gameState.isRunning;
        engineRef.current.stop();

        // Clear any game state (this will be expanded in future stories)

        if (wasRunning && autoStart) {
          engineRef.current.start();
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to reset game engine';
        setError(errorMessage);
        if (onError) {
          onError(errorMessage);
        }
      }
    }
  }, [gameState.isRunning, autoStart, onError]);

  return {
    engine: engineRef.current,
    isReady,
    gameState,
    error,
    start,
    stop,
    pause,
    resume,
    toggleDebug,
    getPerformanceStats,
    reset,
  };
};

export default useGameEngine;
