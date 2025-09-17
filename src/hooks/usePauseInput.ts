import { useEffect, useCallback } from 'react';
import { useUIStore, uiActions } from '../stores/uiStore.js';

export interface UsePauseInputConfig {
  enableEscapeKey?: boolean;
  onPause?: () => void;
  onResume?: () => void;
}

export interface UsePauseInputReturn {
  isPaused: boolean;
  pauseGame: () => void;
  resumeGame: () => void;
  togglePause: () => void;
}

/**
 * usePauseInput - React hook for managing pause functionality
 * Handles ESC key events and integrates with UI store
 * Story 3.3 AC1, AC3: ESCキーで一時停止, 再開オプション
 */
export function usePauseInput(config: UsePauseInputConfig = {}): UsePauseInputReturn {
  const {
    enableEscapeKey = true,
    onPause,
    onResume
  } = config;

  const isPaused = useUIStore((state) => state.isPaused);

  // ESC key event handling
  useEffect(() => {
    if (!enableEscapeKey) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        
        // Toggle pause state
        uiActions.togglePause();
      }
    };

    // Add event listener to window for global ESC key handling
    window.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [enableEscapeKey]);

  // Execute callbacks when pause state changes
  useEffect(() => {
    if (isPaused && onPause) {
      onPause();
    } else if (!isPaused && onResume) {
      onResume();
    }
  }, [isPaused, onPause, onResume]);

  // Memoized action functions
  const pauseGame = useCallback(() => {
    uiActions.pauseGame();
  }, []);

  const resumeGame = useCallback(() => {
    uiActions.resumeGame();
  }, []);

  const togglePause = useCallback(() => {
    uiActions.togglePause();
  }, []);

  return {
    isPaused,
    pauseGame,
    resumeGame,
    togglePause
  };
}

/**
 * usePauseValidation - Hook for pause state validation
 * Ensures pause state integrity and error handling
 */
export function usePauseValidation() {
  const isPaused = useUIStore((state) => state.isPaused);
  const isPauseMenuOpen = useUIStore((state) => state.isPauseMenuOpen);

  // Validate pause state consistency
  useEffect(() => {
    if (isPaused && !isPauseMenuOpen) {
      console.warn('Pause state inconsistency detected: game is paused but menu is closed');
      // Auto-correct the state
      uiActions.openPauseMenu();
    } else if (!isPaused && isPauseMenuOpen) {
      console.warn('Pause state inconsistency detected: game is not paused but menu is open');
      // Auto-correct the state
      uiActions.closePauseMenu();
    }
  }, [isPaused, isPauseMenuOpen]);

  return {
    isPaused,
    isPauseMenuOpen,
    isStateConsistent: (isPaused && isPauseMenuOpen) || (!isPaused && !isPauseMenuOpen)
  };
}