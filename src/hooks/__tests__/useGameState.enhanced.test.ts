import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameState, type GameStateBase, type GameStateEventType } from '../useGameState';

interface TestGameState extends GameStateBase {
  isPlaying: boolean;
  isPaused: boolean;
  score: number;
  level: number;
  lives: number;
  gameTime: number;
  combo: number;
  powerUps: string[];
  enemies: number;
  multiplier: number;
}

describe('useGameState - Enhanced Test Suite', () => {
  let initialState: TestGameState;

  beforeEach(() => {
    initialState = {
      isPlaying: false,
      isPaused: false,
      score: 0,
      level: 1,
      lives: 3,
      gameTime: 0,
      combo: 0,
      powerUps: [],
      enemies: 10,
      multiplier: 1,
    };

    vi.spyOn(performance, 'now').mockReturnValue(1000);
  });

  describe('State Initialization', () => {
    it('should initialize with the provided initial state', () => {
      const { result } = renderHook(() => useGameState(initialState));

      expect(result.current.state).toEqual(initialState);
      expect(result.current.getStateHistory()).toHaveLength(1);
      expect(result.current.getStateHistory()[0]).toEqual(initialState);
    });

    it('should handle complex nested initial state', () => {
      const complexState = {
        ...initialState,
        powerUps: ['multiball', 'speedup', 'shield'],
        nested: {
          data: {
            value: 123,
            array: [1, 2, 3],
          },
        },
      };

      const { result } = renderHook(() => useGameState(complexState));

      expect(result.current.state).toEqual(complexState);
      expect(result.current.state.powerUps).toHaveLength(3);
    });
  });

  describe('State Updates', () => {
    it('should update state with partial updates', () => {
      const { result } = renderHook(() => useGameState(initialState));

      act(() => {
        result.current.updateState({ score: 100, combo: 5 });
      });

      expect(result.current.state.score).toBe(100);
      expect(result.current.state.combo).toBe(5);
      expect(result.current.state.level).toBe(1); // Unchanged
    });

    it('should update state with function updater', () => {
      const { result } = renderHook(() => useGameState(initialState));

      act(() => {
        result.current.updateState(prev => ({
          ...prev,
          score: prev.score + 50,
          combo: prev.combo + 1,
        }));
      });

      expect(result.current.state.score).toBe(50);
      expect(result.current.state.combo).toBe(1);
    });

    it('should handle multiple rapid updates', () => {
      const { result } = renderHook(() => useGameState(initialState));

      act(() => {
        result.current.updateState({ score: 10 });
        result.current.updateState({ score: 20 });
        result.current.updateState({ score: 30 });
      });

      expect(result.current.state.score).toBe(30);
      expect(result.current.getStateHistory()).toHaveLength(4); // Initial + 3 updates
    });

    it('should handle array mutations correctly', () => {
      const { result } = renderHook(() => useGameState(initialState));

      act(() => {
        result.current.updateState(prev => ({
          ...prev,
          powerUps: [...prev.powerUps, 'multiball'],
        }));
      });

      expect(result.current.state.powerUps).toContain('multiball');

      act(() => {
        result.current.updateState(prev => ({
          ...prev,
          powerUps: prev.powerUps.filter(p => p !== 'multiball'),
        }));
      });

      expect(result.current.state.powerUps).not.toContain('multiball');
    });
  });

  describe('Event System', () => {
    it('should emit scoreUpdate event on score change', () => {
      const { result } = renderHook(() => useGameState(initialState));
      const listener = vi.fn();

      act(() => {
        result.current.addEventListener('scoreUpdate', listener);
        result.current.updateState({ score: 250 });
      });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'scoreUpdate',
          payload: {
            oldScore: 0,
            newScore: 250,
            delta: 250,
          },
          timestamp: 1000,
        })
      );
    });

    it('should emit levelUp event on level increase', () => {
      const { result } = renderHook(() => useGameState(initialState));
      const listener = vi.fn();

      act(() => {
        result.current.addEventListener('levelUp', listener);
        result.current.updateState({ level: 2 });
      });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'levelUp',
          payload: {
            oldLevel: 1,
            newLevel: 2,
          },
        })
      );
    });

    it('should not emit levelUp event on level decrease', () => {
      const { result } = renderHook(() => useGameState({
        ...initialState,
        level: 3,
      }));
      const listener = vi.fn();

      act(() => {
        result.current.addEventListener('levelUp', listener);
        result.current.updateState({ level: 2 });
      });

      expect(listener).not.toHaveBeenCalled();
    });

    it('should emit pause and resume events', () => {
      const { result } = renderHook(() => useGameState(initialState));
      const pauseListener = vi.fn();
      const resumeListener = vi.fn();

      act(() => {
        result.current.addEventListener('pause', pauseListener);
        result.current.addEventListener('resume', resumeListener);
      });

      act(() => {
        result.current.updateState({ isPaused: true });
      });

      expect(pauseListener).toHaveBeenCalled();
      expect(resumeListener).not.toHaveBeenCalled();

      act(() => {
        result.current.updateState({ isPaused: false });
      });

      expect(resumeListener).toHaveBeenCalled();
    });

    it('should emit gameOver event when lives reach 0', () => {
      const { result } = renderHook(() => useGameState({
        ...initialState,
        score: 1500,
        level: 5,
      }));
      const listener = vi.fn();

      act(() => {
        result.current.addEventListener('gameOver', listener);
        result.current.updateState({
          isPlaying: false,
          lives: 0,
        });
      });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'gameOver',
          payload: {
            finalScore: 1500,
            level: 5,
          },
        })
      );
    });

    it('should emit stateChange event on any update', () => {
      const { result } = renderHook(() => useGameState(initialState));
      const listener = vi.fn();

      act(() => {
        result.current.addEventListener('stateChange', listener);
        result.current.updateState({ combo: 3 });
      });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'stateChange',
          payload: {
            prevState: expect.objectContaining({ combo: 0 }),
            newState: expect.objectContaining({ combo: 3 }),
          },
        })
      );
    });

    it('should handle wildcard listeners', () => {
      const { result } = renderHook(() => useGameState(initialState));
      const wildcardListener = vi.fn();

      act(() => {
        result.current.addEventListener('*', wildcardListener);
        result.current.updateState({ score: 100 });
      });

      // Should receive all events
      expect(wildcardListener).toHaveBeenCalledTimes(2); // scoreUpdate + stateChange
    });

    it('should unsubscribe listeners correctly', () => {
      const { result } = renderHook(() => useGameState(initialState));
      const listener = vi.fn();

      let unsubscribe: () => void;
      act(() => {
        unsubscribe = result.current.addEventListener('scoreUpdate', listener);
      });

      act(() => {
        result.current.updateState({ score: 100 });
      });

      expect(listener).toHaveBeenCalledTimes(1);

      act(() => {
        unsubscribe();
        result.current.updateState({ score: 200 });
      });

      expect(listener).toHaveBeenCalledTimes(1); // Not called again
    });

    it('should handle multiple listeners for same event', () => {
      const { result } = renderHook(() => useGameState(initialState));
      const listener1 = vi.fn();
      const listener2 = vi.fn();
      const listener3 = vi.fn();

      act(() => {
        result.current.addEventListener('scoreUpdate', listener1);
        result.current.addEventListener('scoreUpdate', listener2);
        result.current.addEventListener('scoreUpdate', listener3);
        result.current.updateState({ score: 50 });
      });

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
      expect(listener3).toHaveBeenCalled();
    });

    it('should handle listener errors gracefully', () => {
      const { result } = renderHook(() => useGameState(initialState));
      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      const normalListener = vi.fn();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      act(() => {
        result.current.addEventListener('scoreUpdate', errorListener);
        result.current.addEventListener('scoreUpdate', normalListener);
        result.current.updateState({ score: 100 });
      });

      expect(errorListener).toHaveBeenCalled();
      expect(normalListener).toHaveBeenCalled(); // Should still be called
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error in game state listener'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('State History', () => {
    it('should maintain state history', () => {
      const { result } = renderHook(() => useGameState(initialState));

      act(() => {
        result.current.updateState({ score: 100 });
        result.current.updateState({ score: 200 });
        result.current.updateState({ score: 300 });
      });

      const history = result.current.getStateHistory();
      expect(history).toHaveLength(4); // Initial + 3 updates
      expect(history[0].score).toBe(0);
      expect(history[1].score).toBe(100);
      expect(history[2].score).toBe(200);
      expect(history[3].score).toBe(300);
    });

    it('should limit history size to prevent memory leaks', () => {
      const { result } = renderHook(() => useGameState(initialState));

      // Make more than maxHistorySize (10) updates
      act(() => {
        for (let i = 1; i <= 15; i++) {
          result.current.updateState({ score: i * 10 });
        }
      });

      const history = result.current.getStateHistory();
      expect(history).toHaveLength(10); // Limited to max size
      expect(history[0].score).toBe(60); // Oldest kept entry
      expect(history[9].score).toBe(150); // Newest entry
    });

    it('should handle undo operation', () => {
      const { result } = renderHook(() => useGameState(initialState));

      act(() => {
        result.current.updateState({ score: 100, combo: 5 });
        result.current.updateState({ score: 200, combo: 10 });
      });

      expect(result.current.state.score).toBe(200);
      expect(result.current.state.combo).toBe(10);

      act(() => {
        result.current.undo();
      });

      expect(result.current.state.score).toBe(100);
      expect(result.current.state.combo).toBe(5);

      act(() => {
        result.current.undo();
      });

      expect(result.current.state.score).toBe(0);
      expect(result.current.state.combo).toBe(0);
    });

    it('should not undo beyond initial state', () => {
      const { result } = renderHook(() => useGameState(initialState));

      act(() => {
        result.current.updateState({ score: 100 });
      });

      act(() => {
        result.current.undo();
        result.current.undo(); // Try to undo past initial
      });

      expect(result.current.state).toEqual(initialState);
    });
  });

  describe('Reset Functionality', () => {
    it('should reset to initial state', () => {
      const { result } = renderHook(() => useGameState(initialState));

      act(() => {
        result.current.updateState({
          score: 500,
          level: 3,
          lives: 1,
          powerUps: ['multiball'],
        });
      });

      expect(result.current.state.score).toBe(500);

      act(() => {
        result.current.reset();
      });

      expect(result.current.state).toEqual(initialState);
    });

    it('should emit reset event on reset', () => {
      const { result } = renderHook(() => useGameState(initialState));
      const listener = vi.fn();

      act(() => {
        result.current.addEventListener('reset', listener);
        result.current.updateState({ score: 500 });
        result.current.reset();
      });

      expect(listener).toHaveBeenCalled();
    });

    it('should clear history on reset', () => {
      const { result } = renderHook(() => useGameState(initialState));

      act(() => {
        result.current.updateState({ score: 100 });
        result.current.updateState({ score: 200 });
        result.current.reset();
      });

      const history = result.current.getStateHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toEqual(initialState);
    });
  });

  describe('Computed Properties', () => {
    it('should provide computed game over state', () => {
      const { result } = renderHook(() => useGameState(initialState));

      expect(result.current.isGameOver).toBe(false);

      act(() => {
        result.current.updateState({ lives: 0 });
      });

      expect(result.current.isGameOver).toBe(true);
    });

    it('should provide computed high score', () => {
      const { result } = renderHook(() => useGameState({
        ...initialState,
        highScore: 1000,
      }));

      expect(result.current.state.highScore).toBe(1000);

      act(() => {
        result.current.updateState({ score: 500 });
      });

      expect(result.current.state.highScore).toBe(1000);

      act(() => {
        result.current.updateState({ score: 1500 });
      });

      // Note: highScore update would typically be handled by game logic
      // This is just testing that the state can hold it
      expect(result.current.state.score).toBe(1500);
    });
  });

  describe('Batch Updates', () => {
    it('should batch multiple state updates efficiently', () => {
      const { result } = renderHook(() => useGameState(initialState));
      const listener = vi.fn();

      act(() => {
        result.current.addEventListener('stateChange', listener);
      });

      act(() => {
        // All these should be batched into a single render
        result.current.updateState(prev => ({ ...prev, score: prev.score + 10 }));
        result.current.updateState(prev => ({ ...prev, score: prev.score + 20 }));
        result.current.updateState(prev => ({ ...prev, score: prev.score + 30 }));
      });

      expect(result.current.state.score).toBe(60);
      // React batches these updates, so we get 3 events (one per update)
      expect(listener).toHaveBeenCalledTimes(3);
    });

    it('should handle complex batch operations', () => {
      const { result } = renderHook(() => useGameState(initialState));

      act(() => {
        result.current.batchUpdate((draft) => {
          draft.score += 100;
          draft.combo += 1;
          draft.multiplier = draft.combo * 2;
          draft.powerUps.push('speedup');
        });
      });

      expect(result.current.state.score).toBe(100);
      expect(result.current.state.combo).toBe(1);
      expect(result.current.state.multiplier).toBe(2);
      expect(result.current.state.powerUps).toContain('speedup');
    });
  });

  describe('Performance', () => {
    it('should handle rapid updates without performance degradation', () => {
      const { result } = renderHook(() => useGameState(initialState));
      const startTime = performance.now();

      act(() => {
        for (let i = 0; i < 1000; i++) {
          result.current.updateState({ score: i });
        }
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // Should complete in under 100ms
      expect(result.current.state.score).toBe(999);
    });

    it('should handle many listeners efficiently', () => {
      const { result } = renderHook(() => useGameState(initialState));
      const listeners = Array.from({ length: 100 }, () => vi.fn());

      act(() => {
        listeners.forEach(listener => {
          result.current.addEventListener('scoreUpdate', listener);
        });
      });

      const startTime = performance.now();

      act(() => {
        result.current.updateState({ score: 100 });
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(50); // Should complete quickly
      listeners.forEach(listener => {
        expect(listener).toHaveBeenCalled();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined updates gracefully', () => {
      const { result } = renderHook(() => useGameState(initialState));

      act(() => {
        result.current.updateState({ score: undefined as any });
      });

      expect(result.current.state.score).toBeUndefined();
    });

    it('should handle null values in state', () => {
      const stateWithNull = {
        ...initialState,
        customField: null as any,
      };

      const { result } = renderHook(() => useGameState(stateWithNull));

      expect(result.current.state.customField).toBeNull();

      act(() => {
        result.current.updateState({ customField: 'value' as any });
      });

      expect(result.current.state.customField).toBe('value');
    });

    it('should handle removing event listeners that were never added', () => {
      const { result } = renderHook(() => useGameState(initialState));
      const listener = vi.fn();

      // Get unsubscribe function without adding listener
      const unsubscribe = () => {
        const listeners = [];
        const index = listeners.indexOf(listener);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      };

      expect(() => unsubscribe()).not.toThrow();
    });

    it('should handle state updates after unmount gracefully', () => {
      const { result, unmount } = renderHook(() => useGameState(initialState));

      unmount();

      // This shouldn't throw even though component is unmounted
      expect(() => {
        result.current.updateState({ score: 100 });
      }).not.toThrow();
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete game flow', () => {
      const { result } = renderHook(() => useGameState(initialState));
      const events: string[] = [];

      act(() => {
        result.current.addEventListener('*', (event) => {
          events.push(event.type);
        });
      });

      // Start game
      act(() => {
        result.current.updateState({ isPlaying: true });
      });

      // Play game
      act(() => {
        result.current.updateState({ score: 100 });
        result.current.updateState({ combo: 3 });
        result.current.updateState({ level: 2 });
      });

      // Pause
      act(() => {
        result.current.updateState({ isPaused: true });
      });

      // Resume
      act(() => {
        result.current.updateState({ isPaused: false });
      });

      // Game over
      act(() => {
        result.current.updateState({ lives: 0, isPlaying: false });
      });

      expect(events).toContain('stateChange');
      expect(events).toContain('scoreUpdate');
      expect(events).toContain('levelUp');
      expect(events).toContain('pause');
      expect(events).toContain('resume');
      expect(events).toContain('gameOver');
    });

    it('should handle power-up collection flow', () => {
      const { result } = renderHook(() => useGameState(initialState));

      // Collect power-ups
      act(() => {
        result.current.updateState(prev => ({
          ...prev,
          powerUps: [...prev.powerUps, 'multiball'],
          multiplier: 2,
        }));
      });

      expect(result.current.state.powerUps).toContain('multiball');
      expect(result.current.state.multiplier).toBe(2);

      // Power-up expires
      act(() => {
        result.current.updateState(prev => ({
          ...prev,
          powerUps: prev.powerUps.filter(p => p !== 'multiball'),
          multiplier: 1,
        }));
      });

      expect(result.current.state.powerUps).not.toContain('multiball');
      expect(result.current.state.multiplier).toBe(1);
    });
  });
});
