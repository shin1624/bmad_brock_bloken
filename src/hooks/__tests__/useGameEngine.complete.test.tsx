import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useGameEngine } from '../useGameEngine';
import { GameEngine } from '../../game/core/GameEngine';

// Mock GameEngine
vi.mock('../../game/core/GameEngine', () => ({
  GameEngine: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(true),
    start: vi.fn(),
    stop: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    destroy: vi.fn(),
    update: vi.fn(),
    render: vi.fn(),
    getState: vi.fn().mockReturnValue({
      status: 'ready',
      score: 0,
      lives: 3,
      level: 1
    }),
    on: vi.fn(),
    off: vi.fn(),
    setDebugMode: vi.fn(),
    getMetrics: vi.fn().mockReturnValue({
      fps: 60,
      frameTime: 16,
      memoryUsage: 50
    })
  }))
}));

describe('useGameEngine', () => {
  let canvasRef: { current: HTMLCanvasElement | null };

  beforeEach(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    canvasRef = { current: canvas };
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Initialization', () => {
    it('should initialize game engine with canvas', async () => {
      const { result } = renderHook(() => useGameEngine(canvasRef));
      
      await waitFor(() => {
        expect(result.current.engine).toBeDefined();
        expect(result.current.isInitialized).toBe(true);
      });
    });

    it('should handle initialization without canvas', async () => {
      const emptyRef = { current: null };
      const { result } = renderHook(() => useGameEngine(emptyRef));
      
      expect(result.current.engine).toBeNull();
      expect(result.current.isInitialized).toBe(false);
    });

    it('should apply custom configuration', async () => {
      const config = {
        targetFPS: 30,
        debug: true,
        soundEnabled: false
      };
      
      const { result } = renderHook(() => 
        useGameEngine(canvasRef, config)
      );
      
      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });
    });

    it('should handle initialization errors', async () => {
      const mockEngine = GameEngine as vi.Mock;
      mockEngine.mockImplementationOnce(() => ({
        initialize: vi.fn().mockRejectedValue(new Error('Init failed')),
        destroy: vi.fn()
      }));
      
      const { result } = renderHook(() => useGameEngine(canvasRef));
      
      await waitFor(() => {
        expect(result.current.error).toBeDefined();
        expect(result.current.error?.message).toBe('Init failed');
      });
    });

    it('should reinitialize when canvas changes', async () => {
      const { result, rerender } = renderHook(
        ({ ref }) => useGameEngine(ref),
        { initialProps: { ref: canvasRef } }
      );
      
      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });
      
      const newCanvas = document.createElement('canvas');
      const newRef = { current: newCanvas };
      
      rerender({ ref: newRef });
      
      await waitFor(() => {
        expect(GameEngine).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Game Control', () => {
    it('should start game', async () => {
      const { result } = renderHook(() => useGameEngine(canvasRef));
      
      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });
      
      act(() => {
        result.current.startGame();
      });
      
      expect(result.current.engine?.start).toHaveBeenCalled();
      expect(result.current.isRunning).toBe(true);
    });

    it('should stop game', async () => {
      const { result } = renderHook(() => useGameEngine(canvasRef));
      
      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });
      
      act(() => {
        result.current.startGame();
        result.current.stopGame();
      });
      
      expect(result.current.engine?.stop).toHaveBeenCalled();
      expect(result.current.isRunning).toBe(false);
    });

    it('should pause and resume game', async () => {
      const { result } = renderHook(() => useGameEngine(canvasRef));
      
      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });
      
      act(() => {
        result.current.startGame();
        result.current.pauseGame();
      });
      
      expect(result.current.engine?.pause).toHaveBeenCalled();
      expect(result.current.isPaused).toBe(true);
      
      act(() => {
        result.current.resumeGame();
      });
      
      expect(result.current.engine?.resume).toHaveBeenCalled();
      expect(result.current.isPaused).toBe(false);
    });

    it('should reset game', async () => {
      const { result } = renderHook(() => useGameEngine(canvasRef));
      
      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });
      
      act(() => {
        result.current.startGame();
        result.current.resetGame();
      });
      
      expect(result.current.engine?.stop).toHaveBeenCalled();
      expect(result.current.engine?.initialize).toHaveBeenCalledTimes(2);
    });
  });

  describe('State Management', () => {
    it('should provide current game state', async () => {
      const { result } = renderHook(() => useGameEngine(canvasRef));
      
      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });
      
      expect(result.current.gameState).toEqual({
        status: 'ready',
        score: 0,
        lives: 3,
        level: 1
      });
    });

    it('should subscribe to state changes', async () => {
      const mockEngine = {
        initialize: vi.fn().mockResolvedValue(true),
        on: vi.fn(),
        off: vi.fn(),
        getState: vi.fn().mockReturnValue({ score: 0 }),
        destroy: vi.fn()
      };
      
      (GameEngine as vi.Mock).mockImplementation(() => mockEngine);
      
      const { result } = renderHook(() => useGameEngine(canvasRef));
      
      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });
      
      expect(mockEngine.on).toHaveBeenCalledWith('stateChange', expect.any(Function));
    });

    it('should update state on engine events', async () => {
      let stateChangeCallback: ((state: any) => void) | null = null;
      
      const mockEngine = {
        initialize: vi.fn().mockResolvedValue(true),
        on: vi.fn((event, callback) => {
          if (event === 'stateChange') {
            stateChangeCallback = callback;
          }
        }),
        off: vi.fn(),
        getState: vi.fn().mockReturnValue({ score: 0 }),
        destroy: vi.fn()
      };
      
      (GameEngine as vi.Mock).mockImplementation(() => mockEngine);
      
      const { result } = renderHook(() => useGameEngine(canvasRef));
      
      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });
      
      act(() => {
        stateChangeCallback?.({ score: 100 });
      });
      
      expect(result.current.gameState.score).toBe(100);
    });
  });

  describe('Performance Metrics', () => {
    it('should provide performance metrics', async () => {
      const { result } = renderHook(() => useGameEngine(canvasRef));
      
      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });
      
      expect(result.current.metrics).toEqual({
        fps: 60,
        frameTime: 16,
        memoryUsage: 50
      });
    });

    it('should update metrics periodically', async () => {
      vi.useFakeTimers();
      
      const { result } = renderHook(() => useGameEngine(canvasRef));
      
      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });
      
      act(() => {
        result.current.startGame();
      });
      
      const initialCallCount = (result.current.engine?.getMetrics as vi.Mock).mock.calls.length;
      
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      
      expect((result.current.engine?.getMetrics as vi.Mock).mock.calls.length)
        .toBeGreaterThan(initialCallCount);
      
      vi.useRealTimers();
    });
  });

  describe('Error Handling', () => {
    it('should handle runtime errors', async () => {
      const mockEngine = {
        initialize: vi.fn().mockResolvedValue(true),
        start: vi.fn().mockImplementation(() => {
          throw new Error('Runtime error');
        }),
        destroy: vi.fn()
      };
      
      (GameEngine as vi.Mock).mockImplementation(() => mockEngine);
      
      const { result } = renderHook(() => useGameEngine(canvasRef));
      
      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });
      
      act(() => {
        result.current.startGame();
      });
      
      expect(result.current.error).toBeDefined();
      expect(result.current.error?.message).toBe('Runtime error');
    });

    it('should recover from errors', async () => {
      const { result } = renderHook(() => useGameEngine(canvasRef));
      
      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });
      
      // Simulate error
      act(() => {
        result.current.setError(new Error('Test error'));
      });
      
      expect(result.current.error).toBeDefined();
      
      // Clear error
      act(() => {
        result.current.clearError();
      });
      
      expect(result.current.error).toBeNull();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup on unmount', async () => {
      const { result, unmount } = renderHook(() => useGameEngine(canvasRef));
      
      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });
      
      const engine = result.current.engine;
      
      unmount();
      
      expect(engine?.destroy).toHaveBeenCalled();
    });

    it('should unsubscribe from events on unmount', async () => {
      const mockEngine = {
        initialize: vi.fn().mockResolvedValue(true),
        on: vi.fn(),
        off: vi.fn(),
        destroy: vi.fn()
      };
      
      (GameEngine as vi.Mock).mockImplementation(() => mockEngine);
      
      const { unmount } = renderHook(() => useGameEngine(canvasRef));
      
      await waitFor(() => {
        expect(mockEngine.on).toHaveBeenCalled();
      });
      
      unmount();
      
      expect(mockEngine.off).toHaveBeenCalledWith('stateChange', expect.any(Function));
    });

    it('should cancel pending operations on unmount', async () => {
      const abortController = new AbortController();
      const mockEngine = {
        initialize: vi.fn().mockImplementation(
          () => new Promise(resolve => {
            abortController.signal.addEventListener('abort', () => {
              resolve(false);
            });
          })
        ),
        destroy: vi.fn()
      };
      
      (GameEngine as vi.Mock).mockImplementation(() => mockEngine);
      
      const { unmount } = renderHook(() => useGameEngine(canvasRef));
      
      unmount();
      
      expect(mockEngine.destroy).toHaveBeenCalled();
    });
  });

  describe('Debug Mode', () => {
    it('should toggle debug mode', async () => {
      const { result } = renderHook(() => useGameEngine(canvasRef));
      
      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });
      
      act(() => {
        result.current.setDebugMode(true);
      });
      
      expect(result.current.engine?.setDebugMode).toHaveBeenCalledWith(true);
      expect(result.current.isDebugMode).toBe(true);
    });

    it('should provide debug information', async () => {
      const { result } = renderHook(() => useGameEngine(canvasRef));
      
      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });
      
      act(() => {
        result.current.setDebugMode(true);
      });
      
      expect(result.current.debugInfo).toBeDefined();
      expect(result.current.debugInfo?.entityCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Input Handling', () => {
    it('should forward input to engine', async () => {
      const mockEngine = {
        initialize: vi.fn().mockResolvedValue(true),
        handleInput: vi.fn(),
        destroy: vi.fn()
      };
      
      (GameEngine as vi.Mock).mockImplementation(() => mockEngine);
      
      const { result } = renderHook(() => useGameEngine(canvasRef));
      
      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });
      
      act(() => {
        result.current.handleInput('left');
      });
      
      expect(mockEngine.handleInput).toHaveBeenCalledWith('left');
    });

    it('should queue input when not running', async () => {
      const { result } = renderHook(() => useGameEngine(canvasRef));
      
      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });
      
      act(() => {
        result.current.handleInput('fire');
      });
      
      // Input should be queued
      expect(result.current.inputQueue).toContain('fire');
      
      act(() => {
        result.current.startGame();
      });
      
      // Queue should be processed
      expect(result.current.inputQueue).toHaveLength(0);
    });
  });

  describe('Save/Load', () => {
    it('should save game state', async () => {
      const mockEngine = {
        initialize: vi.fn().mockResolvedValue(true),
        saveState: vi.fn().mockReturnValue({ saved: true }),
        destroy: vi.fn()
      };
      
      (GameEngine as vi.Mock).mockImplementation(() => mockEngine);
      
      const { result } = renderHook(() => useGameEngine(canvasRef));
      
      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });
      
      const saveData = result.current.saveGame();
      
      expect(mockEngine.saveState).toHaveBeenCalled();
      expect(saveData).toEqual({ saved: true });
    });

    it('should load game state', async () => {
      const mockEngine = {
        initialize: vi.fn().mockResolvedValue(true),
        loadState: vi.fn(),
        destroy: vi.fn()
      };
      
      (GameEngine as vi.Mock).mockImplementation(() => mockEngine);
      
      const { result } = renderHook(() => useGameEngine(canvasRef));
      
      await waitFor(() => {
        expect(result.current.isInitialized).toBe(true);
      });
      
      const saveData = { level: 5, score: 1000 };
      
      act(() => {
        result.current.loadGame(saveData);
      });
      
      expect(mockEngine.loadState).toHaveBeenCalledWith(saveData);
    });
  });
});