import { useState, useEffect, useCallback, useRef } from 'react';
import { useGameState, type GameStateEvent } from './useGameState';

// HUD-specific state interface extending base game state
export interface HUDState {
  score: number;
  lives: number;
  level: number;
  powerUps: ActivePowerUp[];
  combo: ComboState;
  
  // HUD display properties
  isVisible: boolean;
  isAnimating: boolean;
  notifications: HUDNotification[];
  
  // Performance and debugging
  lastUpdateTime: number;
  renderCount: number;
}

// Supporting interfaces
export interface ActivePowerUp {
  id: string;
  type: string;
  duration: number;
  maxDuration: number;
  icon: string;
  color: string;
  name: string;
}

export interface ComboState {
  count: number;
  multiplier: number;
  streak: number;
  timeRemaining: number;
}

export interface HUDNotification {
  id: string;
  type: 'score' | 'powerup' | 'combo' | 'life' | 'level';
  message: string;
  duration: number;
  priority: number;
  timestamp: number;
}

// HUD configuration options
export interface HUDConfig {
  enableAnimations: boolean;
  animationDuration: number;
  notificationTimeout: number;
  maxNotifications: number;
  persistState: boolean;
  performanceMode: boolean;
}

// Default HUD configuration
const DEFAULT_HUD_CONFIG: HUDConfig = {
  enableAnimations: true,
  animationDuration: 600,
  notificationTimeout: 3000,
  maxNotifications: 5,
  persistState: true,
  performanceMode: false,
};

// Default HUD state
const DEFAULT_HUD_STATE: HUDState = {
  score: 0,
  lives: 3,
  level: 1,
  powerUps: [],
  combo: { count: 0, multiplier: 1, streak: 0, timeRemaining: 0 },
  isVisible: true,
  isAnimating: false,
  notifications: [],
  lastUpdateTime: 0,
  renderCount: 0,
};

/**
 * Custom hook for HUD state management with GameStateManager integration
 * Handles real-time updates, animations, notifications, and state persistence
 */
export function useHUD(config: Partial<HUDConfig> = {}) {
  const hudConfig = { ...DEFAULT_HUD_CONFIG, ...config };
  const [hudState, setHudState] = useState<HUDState>(DEFAULT_HUD_STATE);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Performance tracking
  const performanceRef = useRef({
    lastRenderTime: 0,
    averageRenderTime: 0,
    renderTimes: [] as number[],
    maxRenderTimes: 60, // Track last 60 renders for average
  });

  // Notification management
  const notificationTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  // Use the base game state hook for core game state management
  const gameState = useGameState({
    isPlaying: false,
    isPaused: false,
    score: 0,
    level: 1,
    lives: 3,
    gameTime: 0,
  });

  // Performance monitoring
  const trackRenderPerformance = useCallback(() => {
    if (!hudConfig.performanceMode) return;
    
    const now = performance.now();
    const renderTime = now - performanceRef.current.lastRenderTime;
    
    if (performanceRef.current.lastRenderTime > 0) {
      const { renderTimes } = performanceRef.current;
      renderTimes.push(renderTime);
      
      if (renderTimes.length > performanceRef.current.maxRenderTimes) {
        renderTimes.shift();
      }
      
      performanceRef.current.averageRenderTime = 
        renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length;
    }
    
    performanceRef.current.lastRenderTime = now;
  }, [hudConfig.performanceMode]);

  // Update HUD state based on game state changes
  const syncWithGameState = useCallback(() => {
    const { state } = gameState;
    
    setHudState(prevHud => {
      const newHud = {
        ...prevHud,
        score: state.score,
        lives: state.lives,
        level: state.level,
        isVisible: state.isPlaying,
        lastUpdateTime: performance.now(),
        renderCount: prevHud.renderCount + 1,
      };
      
      // Track performance
      trackRenderPerformance();
      
      return newHud;
    });
  }, [gameState, trackRenderPerformance]);

  // Add notification to HUD
  const addNotification = useCallback((notification: Omit<HUDNotification, 'id' | 'timestamp'>) => {
    const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullNotification: HUDNotification = {
      ...notification,
      id,
      timestamp: performance.now(),
    };

    setHudState(prev => {
      const notifications = [...prev.notifications, fullNotification]
        .sort((a, b) => b.priority - a.priority)
        .slice(0, hudConfig.maxNotifications);
      
      return { ...prev, notifications };
    });

    // Auto-remove notification after timeout
    const timeout = setTimeout(() => {
      removeNotification(id);
    }, notification.duration || hudConfig.notificationTimeout);
    
    notificationTimeouts.current.set(id, timeout);
  }, [hudConfig.maxNotifications, hudConfig.notificationTimeout]);

  // Remove notification from HUD
  const removeNotification = useCallback((notificationId: string) => {
    setHudState(prev => ({
      ...prev,
      notifications: prev.notifications.filter(n => n.id !== notificationId)
    }));
    
    const timeout = notificationTimeouts.current.get(notificationId);
    if (timeout) {
      clearTimeout(timeout);
      notificationTimeouts.current.delete(notificationId);
    }
  }, []);

  // Update power-up state
  const updatePowerUps = useCallback((powerUps: ActivePowerUp[]) => {
    setHudState(prev => ({ ...prev, powerUps }));
  }, []);

  // Update combo state
  const updateCombo = useCallback((combo: ComboState) => {
    setHudState(prev => ({ ...prev, combo }));
  }, []);

  // Set animation state
  const setAnimating = useCallback((isAnimating: boolean) => {
    if (!hudConfig.enableAnimations) return;
    
    setHudState(prev => ({ ...prev, isAnimating }));
    
    if (isAnimating) {
      setTimeout(() => {
        setHudState(prev => ({ ...prev, isAnimating: false }));
      }, hudConfig.animationDuration);
    }
  }, [hudConfig.enableAnimations, hudConfig.animationDuration]);

  // Show/hide HUD
  const setVisible = useCallback((isVisible: boolean) => {
    setHudState(prev => ({ ...prev, isVisible }));
  }, []);

  // Reset HUD state
  const resetHUD = useCallback(() => {
    setHudState(DEFAULT_HUD_STATE);
    notificationTimeouts.current.forEach(timeout => clearTimeout(timeout));
    notificationTimeouts.current.clear();
  }, []);

  // State persistence
  const saveHUDState = useCallback(() => {
    if (!hudConfig.persistState) return;
    
    try {
      const stateToSave = {
        ...hudState,
        notifications: [], // Don't persist notifications
      };
      localStorage.setItem('hud_state', JSON.stringify(stateToSave));
    } catch (error) {
      console.error('Failed to save HUD state:', error);
      setError('Failed to save HUD state');
    }
  }, [hudState, hudConfig.persistState]);

  const loadHUDState = useCallback(() => {
    if (!hudConfig.persistState) return;
    
    try {
      const savedState = localStorage.getItem('hud_state');
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        setHudState(prev => ({ ...prev, ...parsedState, notifications: [] }));
      }
    } catch (error) {
      console.error('Failed to load HUD state:', error);
      setError('Failed to load HUD state');
    }
  }, [hudConfig.persistState]);

  // Event handlers for game state changes
  useEffect(() => {
    const unsubscribeScore = gameState.addEventListener('scoreUpdate', (event: GameStateEvent) => {
      syncWithGameState();
      if (event.payload?.delta > 0) {
        addNotification({
          type: 'score',
          message: `+${event.payload.delta}`,
          duration: 1500,
          priority: 3,
        });
        setAnimating(true);
      }
    });

    const unsubscribeLevelUp = gameState.addEventListener('levelUp', (event: GameStateEvent) => {
      syncWithGameState();
      addNotification({
        type: 'level',
        message: `Level ${event.payload?.newLevel}!`,
        duration: 2000,
        priority: 5,
      });
      setAnimating(true);
    });

    const unsubscribeGameOver = gameState.addEventListener('gameOver', () => {
      addNotification({
        type: 'life',
        message: 'Game Over',
        duration: 5000,
        priority: 10,
      });
    });

    const unsubscribeStateChange = gameState.addEventListener('stateChange', () => {
      syncWithGameState();
    });

    return () => {
      unsubscribeScore();
      unsubscribeLevelUp();
      unsubscribeGameOver();
      unsubscribeStateChange();
    };
  }, [gameState, syncWithGameState, addNotification, setAnimating]);

  // Initialize HUD
  useEffect(() => {
    loadHUDState();
    setIsLoaded(true);
  }, [loadHUDState]);

  // Save state on changes (debounced)
  useEffect(() => {
    if (!isLoaded) return;
    
    const saveTimeout = setTimeout(saveHUDState, 1000);
    return () => clearTimeout(saveTimeout);
  }, [hudState, isLoaded, saveHUDState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      notificationTimeouts.current.forEach(timeout => clearTimeout(timeout));
      notificationTimeouts.current.clear();
    };
  }, []);

  // Error handling
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Get performance metrics
  const getPerformanceMetrics = useCallback(() => {
    const { averageRenderTime, renderTimes } = performanceRef.current;
    return {
      averageRenderTime,
      currentFPS: renderTimes.length > 0 ? 1000 / averageRenderTime : 0,
      renderCount: hudState.renderCount,
      lastUpdateTime: hudState.lastUpdateTime,
      isWithinTarget: averageRenderTime < 8, // <8ms target for 60FPS compliance
    };
  }, [hudState]);

  return {
    // HUD state
    hudState,
    isLoaded,
    error,

    // State update methods
    updatePowerUps,
    updateCombo,
    setAnimating,
    setVisible,
    resetHUD,

    // Notification management
    addNotification,
    removeNotification,

    // Game state integration
    gameState: gameState.state,
    gameControls: {
      startGame: gameState.startGame,
      pauseGame: gameState.pauseGame,
      resumeGame: gameState.resumeGame,
      resetGame: gameState.resetGame,
      endGame: gameState.endGame,
    },

    // State persistence
    saveHUDState,
    loadHUDState,

    // Performance and debugging
    getPerformanceMetrics,
    config: hudConfig,

    // Error handling
    clearError,

    // Computed properties
    isGameActive: gameState.isGameActive,
    canPlay: gameState.canPlay,
  };
}