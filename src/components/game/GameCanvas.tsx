import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameEngine } from '../../game/core/GameEngine';

interface GameCanvasProps {
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
  onEngineReady?: (engine: GameEngine) => void;
  onStateChange?: (state: any) => void;
  onFpsUpdate?: (fps: number) => void;
}

interface GameState {
  isRunning: boolean;
  isPaused: boolean;
  isDebugMode: boolean;
  fps: number;
}

/**
 * GameCanvas - React component wrapper for the Canvas game engine
 * Implements bridge pattern between React and Canvas API
 */
export const GameCanvas: React.FC<GameCanvasProps> = ({
  width = 800,
  height = 600,
  className,
  style,
  onEngineReady,
  onStateChange,
  onFpsUpdate,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    isRunning: false,
    isPaused: false,
    isDebugMode: false,
    fps: 0,
  });
  const [isEngineReady, setIsEngineReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle canvas resize
  const handleResize = useCallback(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const container = canvas.parentElement;

    if (container) {
      const rect = container.getBoundingClientRect();
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      // Update canvas internal dimensions to match display size
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
    }
  }, []);

  // Initialize game engine
  useEffect(() => {
    if (!canvasRef.current) return;

    try {
      // Create game engine instance
      const engine = new GameEngine(canvasRef.current);
      engineRef.current = engine;

      // Set up engine callbacks
      engine.onStateChange((state: any) => {
        setGameState(state);
        if (onStateChange) {
          onStateChange(state);
        }
      });

      engine.onFpsUpdate((fps: number) => {
        if (onFpsUpdate) {
          onFpsUpdate(fps);
        }
      });

      // Set initial canvas size
      handleResize();

      setIsEngineReady(true);
      setError(null);

      // Notify parent component that engine is ready
      if (onEngineReady) {
        onEngineReady(engine);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to initialize game engine';
      setError(errorMessage);
      console.error('GameCanvas initialization error:', err);
    }

    // Cleanup function
    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
      setIsEngineReady(false);
    };
  }, []); // Empty dependency array ensures this only runs once

  // Handle window resize
  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [handleResize]);

  // Keyboard event handling
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!engineRef.current || !isEngineReady) return;

      // Pass keyboard events to the game engine
      engineRef.current.handleKeyDown(event.key);

      // Prevent default for game-specific keys
      const gameKeys = [
        'd',
        ' ',
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
      ] as const;
      if (gameKeys.includes(event.key)) {
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEngineReady]);

  // Auto-start engine when ready (can be controlled via props in future)
  useEffect(() => {
    if (isEngineReady && engineRef.current && !gameState.isRunning) {
      // Auto-start the engine
      engineRef.current.start();
    }
  }, [isEngineReady, gameState.isRunning]);

  // Game control functions
  const startEngine = useCallback(() => {
    if (engineRef.current && !gameState.isRunning) {
      engineRef.current.start();
    }
  }, [gameState.isRunning]);

  const stopEngine = useCallback(() => {
    if (engineRef.current && gameState.isRunning) {
      engineRef.current.stop();
    }
  }, [gameState.isRunning]);

  const pauseEngine = useCallback(() => {
    if (engineRef.current && gameState.isRunning && !gameState.isPaused) {
      engineRef.current.pause();
    }
  }, [gameState.isRunning, gameState.isPaused]);

  const resumeEngine = useCallback(() => {
    if (engineRef.current && gameState.isRunning && gameState.isPaused) {
      engineRef.current.resume();
    }
  }, [gameState.isRunning, gameState.isPaused]);

  const toggleDebug = useCallback(() => {
    if (engineRef.current && isEngineReady) {
      engineRef.current.toggleDebug();
    }
  }, [isEngineReady]);

  // Expose engine control functions to parent (if needed)
  React.useImperativeHandle(null, () => ({
    engine: engineRef.current,
    start: startEngine,
    stop: stopEngine,
    pause: pauseEngine,
    resume: resumeEngine,
    toggleDebug: toggleDebug,
    getState: () => gameState,
    isReady: isEngineReady,
  }));

  // Default styles for the canvas
  const defaultStyle: React.CSSProperties = {
    display: 'block',
    border: '1px solid #333',
    backgroundColor: '#000',
    ...style,
  };

  // Error state
  if (error) {
    return (
      <div
        className={className}
        style={{
          ...defaultStyle,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ff4444',
          fontFamily: 'monospace',
          fontSize: '14px',
        }}
      >
        Error: {error}
      </div>
    );
  }

  // Loading state
  if (!isEngineReady) {
    return (
      <div
        className={className}
        style={{
          ...defaultStyle,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#888',
          fontFamily: 'monospace',
          fontSize: '14px',
        }}
      >
        Initializing Game Engine...
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
      style={defaultStyle}
      tabIndex={0} // Make canvas focusable for keyboard events
    />
  );
};

// Default export for easier importing
export default GameCanvas;
