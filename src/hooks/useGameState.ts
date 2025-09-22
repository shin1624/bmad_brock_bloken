import { useState, useCallback, useEffect, useRef } from "react";

// Generic game state interface
export interface GameStateBase {
  isPlaying: boolean;
  isPaused: boolean;
  score: number;
  level: number;
  lives: number;
  gameTime: number;
}

// Event types for game state changes
export type GameStateEventType =
  | "stateChange"
  | "scoreUpdate"
  | "levelUp"
  | "gameOver"
  | "pause"
  | "resume"
  | "reset";

export interface GameStateEvent<T = unknown> {
  type: GameStateEventType;
  payload?: T;
  timestamp: number;
}

// Callback type for state change listeners
export type GameStateCallback<T = unknown> = (event: GameStateEvent<T>) => void;

/**
 * Custom hook for managing bidirectional game state synchronization
 * between React components and Canvas-based game logic
 */
export function useGameState<T extends GameStateBase>(initialState: T) {
  const [state, setState] = useState<T>(initialState);
  const listenersRef = useRef<Map<string, GameStateCallback[]>>(new Map());
  const stateHistoryRef = useRef<T[]>([initialState]);
  const maxHistorySize = 10;

  // Add state to history
  const addToHistory = useCallback((newState: T) => {
    stateHistoryRef.current.push(newState);
    if (stateHistoryRef.current.length > maxHistorySize) {
      stateHistoryRef.current.shift();
    }
  }, []);

  // Emit event to all listeners
  const emitEvent = useCallback((type: GameStateEventType, payload?: unknown) => {
    const event: GameStateEvent = {
      type,
      payload,
      timestamp: performance.now(),
    };

    const listeners = listenersRef.current.get(type) || [];
    listeners.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.error(`Error in game state listener for ${type}:`, error);
      }
    });

    // Also emit to 'all' listeners
    const allListeners = listenersRef.current.get("*") || [];
    allListeners.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.error("Error in game state all-listener:", error);
      }
    });
  }, []);

  // Update game state with event emission
  const updateState = useCallback(
    (updates: Partial<T> | ((prevState: T) => T)) => {
      setState((prevState) => {
        const newState =
          typeof updates === "function"
            ? updates(prevState)
            : { ...prevState, ...updates };

        // Add to history
        addToHistory(newState);

        // Detect specific state changes and emit appropriate events
        if (prevState.score !== newState.score) {
          emitEvent("scoreUpdate", {
            oldScore: prevState.score,
            newScore: newState.score,
            delta: newState.score - prevState.score,
          });
        }

        if (
          prevState.level !== newState.level &&
          newState.level > prevState.level
        ) {
          emitEvent("levelUp", {
            oldLevel: prevState.level,
            newLevel: newState.level,
          });
        }

        if (prevState.isPaused !== newState.isPaused) {
          emitEvent(newState.isPaused ? "pause" : "resume");
        }

        if (
          !prevState.isPlaying &&
          !newState.isPlaying &&
          newState.lives <= 0
        ) {
          emitEvent("gameOver", {
            finalScore: newState.score,
            level: newState.level,
          });
        }

        // General state change event
        emitEvent("stateChange", { prevState, newState });

        return newState;
      });
    },
    [addToHistory, emitEvent],
  );

  // Subscribe to state change events
  const addEventListener = useCallback(
    (type: GameStateEventType | "*", callback: GameStateCallback) => {
      const eventType = type as string;
      const listeners = listenersRef.current.get(eventType) || [];
      listeners.push(callback);
      listenersRef.current.set(eventType, listeners);

      // Return unsubscribe function
      return () => {
        const currentListeners = listenersRef.current.get(eventType) || [];
        const index = currentListeners.indexOf(callback);
        if (index > -1) {
          currentListeners.splice(index, 1);
          if (currentListeners.length === 0) {
            listenersRef.current.delete(eventType);
          } else {
            listenersRef.current.set(eventType, currentListeners);
          }
        }
      };
    },
    [],
  );

  // Remove event listener
  const removeEventListener = useCallback(
    (type: GameStateEventType | "*", callback: GameStateCallback) => {
      const eventType = type as string;
      const listeners = listenersRef.current.get(eventType) || [];
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
        if (listeners.length === 0) {
          listenersRef.current.delete(eventType);
        } else {
          listenersRef.current.set(eventType, listeners);
        }
      }
    },
    [],
  );

  // Game control methods
  const startGame = useCallback(() => {
    updateState({ isPlaying: true, isPaused: false } as Partial<T>);
  }, [updateState]);

  const pauseGame = useCallback(() => {
    updateState({ isPaused: true } as Partial<T>);
  }, [updateState]);

  const resumeGame = useCallback(() => {
    updateState({ isPaused: false } as Partial<T>);
  }, [updateState]);

  const resetGame = useCallback(() => {
    const resetState = {
      ...initialState,
      gameTime: 0,
      score: 0,
      level: 1,
      lives: initialState.lives,
    } as T;

    setState(resetState);
    stateHistoryRef.current = [resetState];
    emitEvent("reset", { newState: resetState });
  }, [initialState, emitEvent]);

  const endGame = useCallback(() => {
    updateState({ isPlaying: false, isPaused: false } as Partial<T>);
  }, [updateState]);

  // Get previous state
  const getPreviousState = useCallback((stepsBack = 1): T | null => {
    const history = stateHistoryRef.current;
    const index = history.length - 1 - stepsBack;
    return index >= 0 ? history[index] : null;
  }, []);

  // Restore to previous state
  const restorePreviousState = useCallback(
    (stepsBack = 1) => {
      const previousState = getPreviousState(stepsBack);
      if (previousState) {
        setState(previousState);
        emitEvent("stateChange", {
          prevState: state,
          newState: previousState,
          restored: true,
        });
      }
    },
    [getPreviousState, state, emitEvent],
  );

  // Cleanup listeners on unmount
  useEffect(() => {
    return () => {
      listenersRef.current.clear();
    };
  }, []);

  return {
    // Current state
    state,

    // State update methods
    updateState,
    setState: updateState, // Alias for convenience

    // Game control
    startGame,
    pauseGame,
    resumeGame,
    resetGame,
    endGame,

    // Event system
    addEventListener,
    removeEventListener,
    emitEvent,

    // History management
    getPreviousState,
    restorePreviousState,
    history: stateHistoryRef.current,

    // Computed properties
    isGameActive: state.isPlaying && !state.isPaused,
    canPlay: !state.isPlaying || state.isPaused,
  };
}
