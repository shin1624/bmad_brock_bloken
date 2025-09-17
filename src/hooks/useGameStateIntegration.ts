import { useEffect, useCallback, useRef } from 'react';
import { useIsPaused, useIsPauseMenuOpen, uiActions } from '../stores/uiStore';
import { GameStateManager } from '../game/core/GameState';
import { GameStatus } from '../types/game.types';

export interface GameStateIntegrationOptions {
  gameStateManager?: GameStateManager;
  onGamePause?: () => void;
  onGameResume?: () => void;
  enableHudSync?: boolean;
}

/**
 * Hook for integrating pause menu with game state management
 * Story 3.3 Task 4: Game State Integration
 * Handles pause state across React-Canvas bridge and maintains game integrity
 */
export const useGameStateIntegration = ({
  gameStateManager,
  onGamePause,
  onGameResume,
  enableHudSync = true,
}: GameStateIntegrationOptions = {}) => {
  const isPaused = useIsPaused();
  const isPauseMenuOpen = useIsPauseMenuOpen();
  const gameManagerRef = useRef<GameStateManager | null>(gameStateManager || null);
  const previousGameStatusRef = useRef<GameStatus | null>(null);

  // Update game manager reference when it changes
  useEffect(() => {
    gameManagerRef.current = gameStateManager || null;
  }, [gameStateManager]);

  // Pause game engine when pause state changes
  useEffect(() => {
    const gameManager = gameManagerRef.current;
    if (!gameManager) return;

    if (isPaused && !isPauseMenuOpen) {
      // Game is paused but menu is not open (ESC was pressed)
      const currentState = gameManager.getState();
      
      if (currentState.gameStatus !== 'paused') {
        // Store previous status before pausing
        previousGameStatusRef.current = currentState.gameStatus;
        
        // Pause the game engine
        gameManager.pause();
        
        // Trigger pause callback
        onGamePause?.();
      }
    } else if (!isPaused && previousGameStatusRef.current) {
      // Resume game when unpaused
      const previousStatus = previousGameStatusRef.current;
      previousGameStatusRef.current = null;
      
      // Resume game engine with previous status
      gameManager.resume();
      
      // Trigger resume callback
      onGameResume?.();
    }
  }, [isPaused, isPauseMenuOpen, onGamePause, onGameResume]);

  // HUD visibility synchronization
  useEffect(() => {
    if (!enableHudSync) return;

    // Hide/show HUD based on pause menu state
    // This would integrate with HUD component from Story 3.1/3.2
    const hudElement = document.querySelector('[data-testid="game-hud"]');
    if (hudElement) {
      if (isPauseMenuOpen) {
        hudElement.setAttribute('data-paused', 'true');
        hudElement.style.opacity = '0.3';
      } else {
        hudElement.removeAttribute('data-paused');
        hudElement.style.opacity = '1';
      }
    }
  }, [isPauseMenuOpen, enableHudSync]);

  // Game loop management
  const pauseGameLoop = useCallback(() => {
    const gameManager = gameManagerRef.current;
    if (!gameManager) return;

    const currentState = gameManager.getState();
    if (currentState.gameStatus === 'playing') {
      previousGameStatusRef.current = 'playing';
      gameManager.pause();
    }
  }, []);

  const resumeGameLoop = useCallback(() => {
    const gameManager = gameManagerRef.current;
    if (!gameManager) return;

    const currentState = gameManager.getState();
    if (currentState.gameStatus === 'paused' && previousGameStatusRef.current) {
      gameManager.resume();
      previousGameStatusRef.current = null;
    }
  }, []);

  // Force pause (for emergency situations)
  const forcePause = useCallback(() => {
    const gameManager = gameManagerRef.current;
    if (!gameManager) return;

    const currentState = gameManager.getState();
    previousGameStatusRef.current = currentState.gameStatus;
    gameManager.pause();
    uiActions.pauseGame();
  }, []);

  // Cleanup on component unmount
  const cleanup = useCallback(() => {
    const gameManager = gameManagerRef.current;
    if (!gameManager) return;

    const currentState = gameManager.getState();
    if (currentState.gameStatus === 'paused') {
      // Resume game if it was paused by this component
      gameManager.resume();
    }

    // Clean up HUD state
    const hudElement = document.querySelector('[data-testid="game-hud"]');
    if (hudElement) {
      hudElement.removeAttribute('data-paused');
      hudElement.style.opacity = '1';
    }

    previousGameStatusRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Game state validation
  const validateGameState = useCallback(() => {
    const gameManager = gameManagerRef.current;
    if (!gameManager) return false;

    const state = gameManager.getState();
    
    // Validate that game state is consistent
    return {
      isValid: true,
      gameStatus: state.gameStatus,
      isPausedCorrectly: isPaused ? state.gameStatus === 'paused' : state.gameStatus !== 'paused',
      stateIntegrity: {
        hasValidScore: typeof state.score === 'number' && state.score >= 0,
        hasValidLives: typeof state.lives === 'number' && state.lives >= 0,
        hasValidLevel: typeof state.level === 'number' && state.level >= 1,
      },
    };
  }, [isPaused]);

  return {
    gameManager: gameManagerRef.current,
    pauseGameLoop,
    resumeGameLoop,
    forcePause,
    cleanup,
    validateGameState,
    isPausedCorrectly: isPaused,
    previousGameStatus: previousGameStatusRef.current,
  };
};

export default useGameStateIntegration;