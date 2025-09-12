import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useGameState, type GameStateBase } from '../useGameState';

interface TestGameState extends GameStateBase {
  isPlaying: boolean;
  isPaused: boolean;
  score: number;
  level: number;
  lives: number;
  gameTime: number;
  playerName: string;
}

describe('useGameState', () => {
  const initialState: TestGameState = {
    isPlaying: false,
    isPaused: false,
    score: 0,
    level: 1,
    lives: 3,
    gameTime: 0,
    playerName: 'Player1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('initializes with provided initial state', () => {
    const { result } = renderHook(() => useGameState(initialState));

    expect(result.current.state).toEqual(initialState);
    expect(result.current.isGameActive).toBe(false);
    expect(result.current.canPlay).toBe(true);
  });

  it('updates state correctly with partial updates', () => {
    const { result } = renderHook(() => useGameState(initialState));

    act(() => {
      result.current.updateState({ score: 100, level: 2 });
    });

    expect(result.current.state.score).toBe(100);
    expect(result.current.state.level).toBe(2);
    expect(result.current.state.playerName).toBe('Player1'); // unchanged
  });

  it('updates state with function updates', () => {
    const { result } = renderHook(() => useGameState(initialState));

    act(() => {
      result.current.updateState(prevState => ({
        ...prevState,
        score: prevState.score + 50,
        level: prevState.level + 1,
      }));
    });

    expect(result.current.state.score).toBe(50);
    expect(result.current.state.level).toBe(2);
  });

  it('emits scoreUpdate event when score changes', () => {
    const { result } = renderHook(() => useGameState(initialState));
    const mockCallback = vi.fn();

    act(() => {
      result.current.addEventListener('scoreUpdate', mockCallback);
    });

    act(() => {
      result.current.updateState({ score: 100 });
    });

    expect(mockCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'scoreUpdate',
        payload: {
          oldScore: 0,
          newScore: 100,
          delta: 100,
        },
      })
    );
  });

  it('emits levelUp event when level increases', () => {
    const { result } = renderHook(() => useGameState(initialState));
    const mockCallback = vi.fn();

    act(() => {
      result.current.addEventListener('levelUp', mockCallback);
    });

    act(() => {
      result.current.updateState({ level: 2 });
    });

    expect(mockCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'levelUp',
        payload: {
          oldLevel: 1,
          newLevel: 2,
        },
      })
    );
  });

  it('emits pause/resume events when pause state changes', () => {
    const { result } = renderHook(() => useGameState(initialState));
    const pauseCallback = vi.fn();
    const resumeCallback = vi.fn();

    act(() => {
      result.current.addEventListener('pause', pauseCallback);
      result.current.addEventListener('resume', resumeCallback);
    });

    // Pause game
    act(() => {
      result.current.updateState({ isPaused: true });
    });

    expect(pauseCallback).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'pause' })
    );

    // Resume game
    act(() => {
      result.current.updateState({ isPaused: false });
    });

    expect(resumeCallback).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'resume' })
    );
  });

  it('emits gameOver event when game ends with no lives', () => {
    const { result } = renderHook(() => useGameState(initialState));
    const mockCallback = vi.fn();

    act(() => {
      result.current.addEventListener('gameOver', mockCallback);
    });

    act(() => {
      result.current.updateState({ isPlaying: false, lives: 0, score: 500 });
    });

    expect(mockCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'gameOver',
        payload: {
          finalScore: 500,
          level: 1,
        },
      })
    );
  });

  it('always emits stateChange event on updates', () => {
    const { result } = renderHook(() => useGameState(initialState));
    const mockCallback = vi.fn();

    act(() => {
      result.current.addEventListener('stateChange', mockCallback);
    });

    act(() => {
      result.current.updateState({ score: 50 });
    });

    expect(mockCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'stateChange',
        payload: expect.objectContaining({
          prevState: expect.objectContaining({ score: 0 }),
          newState: expect.objectContaining({ score: 50 }),
        }),
      })
    );
  });

  it('supports wildcard event listener', () => {
    const { result } = renderHook(() => useGameState(initialState));
    const mockCallback = vi.fn();

    act(() => {
      result.current.addEventListener('*', mockCallback);
    });

    act(() => {
      result.current.updateState({ score: 100 });
    });

    // Should receive both scoreUpdate and stateChange events
    expect(mockCallback).toHaveBeenCalledTimes(2);
    expect(mockCallback).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'scoreUpdate' })
    );
    expect(mockCallback).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'stateChange' })
    );
  });

  it('removes event listeners correctly', () => {
    const { result } = renderHook(() => useGameState(initialState));
    const mockCallback = vi.fn();

    let unsubscribe: () => void;

    act(() => {
      unsubscribe = result.current.addEventListener('scoreUpdate', mockCallback);
    });

    act(() => {
      unsubscribe();
    });

    act(() => {
      result.current.updateState({ score: 100 });
    });

    expect(mockCallback).not.toHaveBeenCalled();
  });

  it('handles game control methods correctly', () => {
    const { result } = renderHook(() => useGameState(initialState));

    // Start game
    act(() => {
      result.current.startGame();
    });

    expect(result.current.state.isPlaying).toBe(true);
    expect(result.current.state.isPaused).toBe(false);
    expect(result.current.isGameActive).toBe(true);

    // Pause game
    act(() => {
      result.current.pauseGame();
    });

    expect(result.current.state.isPaused).toBe(true);
    expect(result.current.isGameActive).toBe(false);

    // Resume game
    act(() => {
      result.current.resumeGame();
    });

    expect(result.current.state.isPaused).toBe(false);
    expect(result.current.isGameActive).toBe(true);

    // End game
    act(() => {
      result.current.endGame();
    });

    expect(result.current.state.isPlaying).toBe(false);
    expect(result.current.isGameActive).toBe(false);
  });

  it('resets game state correctly', () => {
    const { result } = renderHook(() => useGameState(initialState));

    // Modify state
    act(() => {
      result.current.updateState({
        score: 1000,
        level: 5,
        lives: 1,
        gameTime: 120,
        isPlaying: true,
      });
    });

    // Reset game
    act(() => {
      result.current.resetGame();
    });

    expect(result.current.state).toEqual({
      ...initialState,
      gameTime: 0,
      score: 0,
      level: 1,
      lives: initialState.lives,
    });
  });

  it('maintains state history correctly', () => {
    const { result } = renderHook(() => useGameState(initialState));

    // Make several state changes
    act(() => {
      result.current.updateState({ score: 100 });
    });

    act(() => {
      result.current.updateState({ score: 200 });
    });

    act(() => {
      result.current.updateState({ level: 2 });
    });

    expect(result.current.history.length).toBeGreaterThan(1);
    expect(result.current.getPreviousState(1)).toMatchObject({ score: 200, level: 1 });
    expect(result.current.getPreviousState(2)).toMatchObject({ score: 100, level: 1 });
  });

  it('restores previous state correctly', () => {
    const { result } = renderHook(() => useGameState(initialState));

    // Make state changes
    act(() => {
      result.current.updateState({ score: 100, level: 2 });
    });

    act(() => {
      result.current.updateState({ score: 200, level: 3 });
    });

    // Restore previous state
    act(() => {
      result.current.restorePreviousState(1);
    });

    expect(result.current.state).toMatchObject({ score: 100, level: 2 });
  });

  it('handles isGameActive computed property correctly', () => {
    const { result } = renderHook(() => useGameState(initialState));

    // Initially not active
    expect(result.current.isGameActive).toBe(false);

    // Start game - should be active
    act(() => {
      result.current.startGame();
    });

    expect(result.current.isGameActive).toBe(true);

    // Pause game - should not be active
    act(() => {
      result.current.pauseGame();
    });

    expect(result.current.isGameActive).toBe(false);

    // Resume game - should be active
    act(() => {
      result.current.resumeGame();
    });

    expect(result.current.isGameActive).toBe(true);

    // End game - should not be active
    act(() => {
      result.current.endGame();
    });

    expect(result.current.isGameActive).toBe(false);
  });

  it('handles canPlay computed property correctly', () => {
    const { result } = renderHook(() => useGameState(initialState));

    // Initially can play
    expect(result.current.canPlay).toBe(true);

    // Start game - cannot play (already playing)
    act(() => {
      result.current.startGame();
    });

    expect(result.current.canPlay).toBe(false);

    // Pause game - can play (can resume)
    act(() => {
      result.current.pauseGame();
    });

    expect(result.current.canPlay).toBe(true);

    // End game - can play
    act(() => {
      result.current.endGame();
    });

    expect(result.current.canPlay).toBe(true);
  });

  it('limits history size correctly', () => {
    const { result } = renderHook(() => useGameState(initialState));

    // Make more than 10 state changes (maxHistorySize = 10)
    for (let i = 0; i < 15; i++) {
      act(() => {
        result.current.updateState({ score: i * 10 });
      });
    }

    expect(result.current.history.length).toBeLessThanOrEqual(10);
  });

  it('handles event listener errors gracefully', () => {
    const { result } = renderHook(() => useGameState(initialState));
    const faultyCallback = vi.fn(() => {
      throw new Error('Test error');
    });

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    act(() => {
      result.current.addEventListener('scoreUpdate', faultyCallback);
    });

    act(() => {
      result.current.updateState({ score: 100 });
    });

    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(faultyCallback).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});