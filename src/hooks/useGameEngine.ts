import { useCallback, useEffect, useRef } from 'react';
import { useGameLoop } from './useGameLoop';
import { useGameState, type GameStateBase } from './useGameState';
import type { GameLoopConfig } from '../types/game.types';

interface GameEngineConfig<T extends GameStateBase> extends GameLoopConfig {
  initialGameState: T;
  enableAutoSave?: boolean;
  autoSaveInterval?: number;
}

interface RenderContext {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  deltaTime: number;
  currentTime: number;
}

interface UpdateContext<T extends GameStateBase> {
  deltaTime: number;
  currentTime: number;
  gameState: T;
  updateGameState: (updates: Partial<T> | ((prevState: T) => T)) => void;
}

// Callback types
export type GameUpdateCallback<T extends GameStateBase> = (context: UpdateContext<T>) => void;
export type GameRenderCallback = (context: RenderContext) => void;

/**
 * Master hook that integrates GameLoop, GameState, and Canvas rendering
 * Provides a complete game engine foundation for React-Canvas games
 */
export function useGameEngine<T extends GameStateBase>(config: GameEngineConfig<T>) {
  const {
    initialGameState,
    enableAutoSave = false,
    autoSaveInterval = 30000, // 30 seconds
    ...gameLoopConfig
  } = config;

  // Initialize game systems
  const gameLoop = useGameLoop(gameLoopConfig);
  const gameState = useGameState(initialGameState);
  
  // Canvas references
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  // Callback references
  const updateCallbacksRef = useRef<GameUpdateCallback<T>[]>([]);
  const renderCallbacksRef = useRef<GameRenderCallback[]>([]);

  // Auto-save functionality
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Set up auto-save if enabled
  useEffect(() => {
    if (!enableAutoSave) return;

    const scheduleAutoSave = () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      autoSaveTimeoutRef.current = setTimeout(() => {
        try {
          localStorage.setItem('gameState', JSON.stringify(gameState.state));
          console.log('Game state auto-saved');
        } catch (error) {
          console.error('Failed to auto-save game state:', error);
        }
        scheduleAutoSave();
      }, autoSaveInterval);
    };

    scheduleAutoSave();

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [enableAutoSave, autoSaveInterval, gameState.state]);

  // Canvas initialization handler
  const handleCanvasReady = useCallback((canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) => {
    canvasRef.current = canvas;
    contextRef.current = context;
  }, []);

  // Game update loop
  useEffect(() => {
    const updateCallback = (deltaTime: number, currentTime: number) => {
      // Only update if game is active
      if (!gameState.isGameActive) return;

      // Create update context
      const updateContext: UpdateContext<T> = {
        deltaTime,
        currentTime,
        gameState: gameState.state,
        updateGameState: gameState.updateState,
      };

      // Execute all update callbacks
      updateCallbacksRef.current.forEach(callback => {
        try {
          callback(updateContext);
        } catch (error) {
          console.error('Error in game update callback:', error);
        }
      });

      // Update game time
      gameState.updateState(prevState => ({
        ...prevState,
        gameTime: prevState.gameTime + deltaTime,
      } as T));
    };

    gameLoop.onUpdate(updateCallback);

    return () => {
      gameLoop.removeUpdateCallback(updateCallback);
    };
  }, [gameLoop, gameState]);

  // Game render loop
  useEffect(() => {
    const renderCallback = (deltaTime: number, currentTime: number) => {
      const canvas = canvasRef.current;
      const context = contextRef.current;
      
      if (!canvas || !context) return;

      // Clear canvas
      context.clearRect(0, 0, canvas.width, canvas.height);

      // Create render context
      const renderContext: RenderContext = {
        canvas,
        context,
        deltaTime,
        currentTime,
      };

      // Execute all render callbacks
      renderCallbacksRef.current.forEach(callback => {
        try {
          context.save(); // Save context state before each callback
          callback(renderContext);
          context.restore(); // Restore context state after callback
        } catch (error) {
          console.error('Error in game render callback:', error);
          context.restore(); // Ensure restore even on error
        }
      });
    };

    gameLoop.onRender(renderCallback);

    return () => {
      gameLoop.removeRenderCallback(renderCallback);
    };
  }, [gameLoop]);

  // Register game update callback
  const onUpdate = useCallback((callback: GameUpdateCallback<T>) => {
    updateCallbacksRef.current.push(callback);

    // Return unsubscribe function
    return () => {
      const index = updateCallbacksRef.current.indexOf(callback);
      if (index > -1) {
        updateCallbacksRef.current.splice(index, 1);
      }
    };
  }, []);

  // Register game render callback
  const onRender = useCallback((callback: GameRenderCallback) => {
    renderCallbacksRef.current.push(callback);

    // Return unsubscribe function
    return () => {
      const index = renderCallbacksRef.current.indexOf(callback);
      if (index > -1) {
        renderCallbacksRef.current.splice(index, 1);
      }
    };
  }, []);

  // Load saved game state
  const loadGame = useCallback(() => {
    try {
      const savedState = localStorage.getItem('gameState');
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        gameState.setState(parsedState);
        return true;
      }
    } catch (error) {
      console.error('Failed to load game state:', error);
    }
    return false;
  }, [gameState]);

  // Save current game state
  const saveGame = useCallback(() => {
    try {
      localStorage.setItem('gameState', JSON.stringify(gameState.state));
      return true;
    } catch (error) {
      console.error('Failed to save game state:', error);
      return false;
    }
  }, [gameState.state]);

  // Start the complete game engine
  const startEngine = useCallback(() => {
    gameLoop.start();
    gameState.startGame();
  }, [gameLoop, gameState]);

  // Stop the complete game engine
  const stopEngine = useCallback(() => {
    gameLoop.stop();
    gameState.endGame();
  }, [gameLoop, gameState]);

  // Pause the complete game engine
  const pauseEngine = useCallback(() => {
    gameLoop.pause();
    gameState.pauseGame();
  }, [gameLoop, gameState]);

  // Resume the complete game engine
  const resumeEngine = useCallback(() => {
    gameLoop.resume();
    gameState.resumeGame();
  }, [gameLoop, gameState]);

  return {
    // Canvas integration
    handleCanvasReady,
    canvas: canvasRef.current,
    context: contextRef.current,

    // Game systems
    gameLoop,
    gameState: gameState.state,
    gameStateAPI: gameState,

    // Callback registration
    onUpdate,
    onRender,

    // Engine control
    startEngine,
    stopEngine,
    pauseEngine,
    resumeEngine,

    // Save/Load
    saveGame,
    loadGame,

    // Performance metrics
    performanceMetrics: gameLoop.performanceMetrics,

    // Status
    isRunning: gameLoop.isRunning,
    isPaused: gameLoop.isPaused,
    isGameActive: gameState.isGameActive,
  };
}