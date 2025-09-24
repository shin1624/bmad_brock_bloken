import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useGameEngine } from '../useGameEngine';
import type { GameStateBase } from '../useGameState';

// Mock audio system
vi.mock('../../game/systems/AudioSystem', () => ({
  audioSystem: {
    initialize: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn(),
    playSound: vi.fn(),
    playMusic: vi.fn(),
    stopMusic: vi.fn(),
    setVolume: vi.fn(),
  },
}));

// Mock canvas and context
const createMockCanvas = () => {
  const mockContext = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: 'left' as CanvasTextAlign,
    textBaseline: 'alphabetic' as CanvasTextBaseline,
    globalAlpha: 1,
    globalCompositeOperation: 'source-over' as GlobalCompositeOperation,
    imageSmoothingEnabled: true,

    clearRect: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    measureText: vi.fn(() => ({ width: 100 })),

    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    arcTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    rect: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),

    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),
    transform: vi.fn(),
    setTransform: vi.fn(),
    resetTransform: vi.fn(),

    drawImage: vi.fn(),
    createImageData: vi.fn(),
    getImageData: vi.fn(),
    putImageData: vi.fn(),

    createLinearGradient: vi.fn(),
    createRadialGradient: vi.fn(),
    createPattern: vi.fn(),

    clip: vi.fn(),
    isPointInPath: vi.fn(),
    isPointInStroke: vi.fn(),
  };

  const mockCanvas = {
    width: 800,
    height: 600,
    getContext: vi.fn(() => mockContext),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    getBoundingClientRect: vi.fn(() => ({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
      right: 800,
      bottom: 600,
    })),
  };

  return { canvas: mockCanvas as any, context: mockContext };
};

interface TestGameState extends GameStateBase {
  score: number;
  level: number;
  lives: number;
  powerUps: string[];
  combo: number;
  highScore: number;
}

describe('useGameEngine - Enhanced Test Suite', () => {
  let mockCanvas: ReturnType<typeof createMockCanvas>;
  let originalRAF: typeof requestAnimationFrame;
  let originalCAF: typeof cancelAnimationFrame;
  let rafCallbacks: FrameRequestCallback[] = [];
  let rafId = 0;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCanvas = createMockCanvas();
    rafCallbacks = [];
    rafId = 0;

    // Mock requestAnimationFrame
    originalRAF = global.requestAnimationFrame;
    originalCAF = global.cancelAnimationFrame;

    global.requestAnimationFrame = vi.fn((callback) => {
      const id = ++rafId;
      rafCallbacks.push(callback);
      return id;
    });

    global.cancelAnimationFrame = vi.fn();

    // Mock performance.now
    vi.spyOn(performance, 'now').mockReturnValue(0);

    // Mock localStorage
    const mockLocalStorage = {} as any;
    global.localStorage = {
      getItem: vi.fn((key) => mockLocalStorage[key] || null),
      setItem: vi.fn((key, value) => {
        mockLocalStorage[key] = value;
      }),
      removeItem: vi.fn((key) => {
        delete mockLocalStorage[key];
      }),
      clear: vi.fn(() => {
        Object.keys(mockLocalStorage).forEach(key => delete mockLocalStorage[key]);
      }),
      length: 0,
      key: vi.fn(() => null),
    } as Storage;
  });

  afterEach(() => {
    global.requestAnimationFrame = originalRAF;
    global.cancelAnimationFrame = originalCAF;
    vi.clearAllTimers();
    vi.restoreAllMocks();
  });

  const executeRAFCallbacks = (time: number = 16) => {
    const callbacks = [...rafCallbacks];
    rafCallbacks = [];
    callbacks.forEach(cb => cb(time));
  };

  describe('Initialization and Cleanup', () => {
    it('should initialize with default configuration', () => {
      const initialState: TestGameState = {
        status: 'idle',
        isPaused: false,
        score: 0,
        level: 1,
        lives: 3,
        powerUps: [],
        combo: 0,
        highScore: 0,
      };

      const { result } = renderHook(() =>
        useGameEngine({ initialGameState: initialState })
      );

      expect(result.current.gameState).toEqual(initialState);
      expect(result.current.isRunning).toBe(false);
      expect(result.current.isPaused).toBe(false);
      expect(result.current.fps).toBe(0);
    });

    it('should initialize audio system on mount', async () => {
      const { audioSystem } = await import('../../game/systems/AudioSystem');

      const initialState: TestGameState = {
        status: 'idle',
        isPaused: false,
        score: 0,
        level: 1,
        lives: 3,
        powerUps: [],
        combo: 0,
        highScore: 0,
      };

      renderHook(() => useGameEngine({ initialGameState: initialState }));

      await waitFor(() => {
        expect(audioSystem.initialize).toHaveBeenCalled();
      });
    });

    it('should handle audio initialization failure gracefully', async () => {
      const { audioSystem } = await import('../../game/systems/AudioSystem');
      (audioSystem.initialize as any).mockRejectedValueOnce(new Error('Audio init failed'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const initialState: TestGameState = {
        status: 'idle',
        isPaused: false,
        score: 0,
        level: 1,
        lives: 3,
        powerUps: [],
        combo: 0,
        highScore: 0,
      };

      renderHook(() => useGameEngine({ initialGameState: initialState }));

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to initialize audio system:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });

    it('should destroy audio system on unmount', async () => {
      const { audioSystem } = await import('../../game/systems/AudioSystem');

      const initialState: TestGameState = {
        status: 'idle',
        isPaused: false,
        score: 0,
        level: 1,
        lives: 3,
        powerUps: [],
        combo: 0,
        highScore: 0,
      };

      const { unmount } = renderHook(() =>
        useGameEngine({ initialGameState: initialState })
      );

      unmount();

      expect(audioSystem.destroy).toHaveBeenCalled();
    });
  });

  describe('Canvas Integration', () => {
    it('should attach canvas and context', () => {
      const initialState: TestGameState = {
        status: 'idle',
        isPaused: false,
        score: 0,
        level: 1,
        lives: 3,
        powerUps: [],
        combo: 0,
        highScore: 0,
      };

      const { result } = renderHook(() =>
        useGameEngine({ initialGameState: initialState })
      );

      act(() => {
        result.current.attachCanvas(mockCanvas.canvas);
      });

      // The hook should have properly attached the canvas
      expect(mockCanvas.canvas.getContext).toHaveBeenCalledWith('2d');
    });

    it('should handle null canvas gracefully', () => {
      const initialState: TestGameState = {
        status: 'idle',
        isPaused: false,
        score: 0,
        level: 1,
        lives: 3,
        powerUps: [],
        combo: 0,
        highScore: 0,
      };

      const { result } = renderHook(() =>
        useGameEngine({ initialGameState: initialState })
      );

      expect(() => {
        act(() => {
          result.current.attachCanvas(null);
        });
      }).not.toThrow();
    });

    it('should handle canvas without 2d context support', () => {
      const badCanvas = {
        ...mockCanvas.canvas,
        getContext: vi.fn(() => null),
      };

      const initialState: TestGameState = {
        status: 'idle',
        isPaused: false,
        score: 0,
        level: 1,
        lives: 3,
        powerUps: [],
        combo: 0,
        highScore: 0,
      };

      const { result } = renderHook(() =>
        useGameEngine({ initialGameState: initialState })
      );

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      act(() => {
        result.current.attachCanvas(badCanvas as any);
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to get 2D context')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Game Loop Control', () => {
    it('should start and stop game loop', () => {
      const initialState: TestGameState = {
        status: 'idle',
        isPaused: false,
        score: 0,
        level: 1,
        lives: 3,
        powerUps: [],
        combo: 0,
        highScore: 0,
      };

      const { result } = renderHook(() =>
        useGameEngine({ initialGameState: initialState })
      );

      // Start game
      act(() => {
        result.current.start();
      });

      expect(result.current.isRunning).toBe(true);
      expect(global.requestAnimationFrame).toHaveBeenCalled();

      // Stop game
      act(() => {
        result.current.stop();
      });

      expect(result.current.isRunning).toBe(false);
      expect(global.cancelAnimationFrame).toHaveBeenCalled();
    });

    it('should pause and resume game loop', () => {
      const initialState: TestGameState = {
        status: 'playing',
        isPaused: false,
        score: 0,
        level: 1,
        lives: 3,
        powerUps: [],
        combo: 0,
        highScore: 0,
      };

      const { result } = renderHook(() =>
        useGameEngine({ initialGameState: initialState })
      );

      act(() => {
        result.current.start();
      });

      // Pause
      act(() => {
        result.current.pause();
      });

      expect(result.current.isPaused).toBe(true);
      expect(result.current.gameState.isPaused).toBe(true);

      // Resume
      act(() => {
        result.current.resume();
      });

      expect(result.current.isPaused).toBe(false);
      expect(result.current.gameState.isPaused).toBe(false);
    });

    it('should reset game state', () => {
      const initialState: TestGameState = {
        status: 'idle',
        isPaused: false,
        score: 0,
        level: 1,
        lives: 3,
        powerUps: [],
        combo: 0,
        highScore: 0,
      };

      const { result } = renderHook(() =>
        useGameEngine({ initialGameState: initialState })
      );

      // Modify state
      act(() => {
        result.current.updateGameState({
          score: 1000,
          level: 5,
          lives: 1,
        });
      });

      expect(result.current.gameState.score).toBe(1000);
      expect(result.current.gameState.level).toBe(5);

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.gameState).toEqual(initialState);
      expect(result.current.isRunning).toBe(false);
    });
  });

  describe('Update and Render Callbacks', () => {
    it('should register and execute update callbacks', () => {
      const initialState: TestGameState = {
        status: 'playing',
        isPaused: false,
        score: 0,
        level: 1,
        lives: 3,
        powerUps: [],
        combo: 0,
        highScore: 0,
      };

      const { result } = renderHook(() =>
        useGameEngine({ initialGameState: initialState })
      );

      const updateCallback = vi.fn();

      // Register callback
      act(() => {
        result.current.onUpdate(updateCallback);
        result.current.attachCanvas(mockCanvas.canvas);
        result.current.start();
      });

      // Simulate frame
      act(() => {
        executeRAFCallbacks(16);
      });

      expect(updateCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          deltaTime: expect.any(Number),
          currentTime: expect.any(Number),
          gameState: expect.any(Object),
          updateGameState: expect.any(Function),
        })
      );
    });

    it('should register and execute render callbacks', () => {
      const initialState: TestGameState = {
        status: 'playing',
        isPaused: false,
        score: 0,
        level: 1,
        lives: 3,
        powerUps: [],
        combo: 0,
        highScore: 0,
      };

      const { result } = renderHook(() =>
        useGameEngine({ initialGameState: initialState })
      );

      const renderCallback = vi.fn();

      // Register callback
      act(() => {
        result.current.onRender(renderCallback);
        result.current.attachCanvas(mockCanvas.canvas);
        result.current.start();
      });

      // Simulate frame
      act(() => {
        executeRAFCallbacks(16);
      });

      expect(renderCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          canvas: expect.any(Object),
          context: expect.any(Object),
          deltaTime: expect.any(Number),
          currentTime: expect.any(Number),
        })
      );
    });

    it('should handle multiple callbacks in order', () => {
      const initialState: TestGameState = {
        status: 'playing',
        isPaused: false,
        score: 0,
        level: 1,
        lives: 3,
        powerUps: [],
        combo: 0,
        highScore: 0,
      };

      const { result } = renderHook(() =>
        useGameEngine({ initialGameState: initialState })
      );

      const callOrder: string[] = [];
      const update1 = vi.fn(() => callOrder.push('update1'));
      const update2 = vi.fn(() => callOrder.push('update2'));
      const render1 = vi.fn(() => callOrder.push('render1'));
      const render2 = vi.fn(() => callOrder.push('render2'));

      act(() => {
        result.current.onUpdate(update1);
        result.current.onUpdate(update2);
        result.current.onRender(render1);
        result.current.onRender(render2);
        result.current.attachCanvas(mockCanvas.canvas);
        result.current.start();
      });

      act(() => {
        executeRAFCallbacks(16);
      });

      expect(callOrder).toEqual(['update1', 'update2', 'render1', 'render2']);
    });

    it('should skip callbacks when paused', () => {
      const initialState: TestGameState = {
        status: 'playing',
        isPaused: false,
        score: 0,
        level: 1,
        lives: 3,
        powerUps: [],
        combo: 0,
        highScore: 0,
      };

      const { result } = renderHook(() =>
        useGameEngine({ initialGameState: initialState })
      );

      const updateCallback = vi.fn();
      const renderCallback = vi.fn();

      act(() => {
        result.current.onUpdate(updateCallback);
        result.current.onRender(renderCallback);
        result.current.attachCanvas(mockCanvas.canvas);
        result.current.start();
        result.current.pause();
      });

      act(() => {
        executeRAFCallbacks(16);
      });

      expect(updateCallback).not.toHaveBeenCalled();
      expect(renderCallback).not.toHaveBeenCalled();
    });
  });

  describe('Auto-Save Functionality', () => {
    it('should auto-save game state at intervals', async () => {
      vi.useFakeTimers();

      const initialState: TestGameState = {
        status: 'playing',
        isPaused: false,
        score: 0,
        level: 1,
        lives: 3,
        powerUps: [],
        combo: 0,
        highScore: 0,
      };

      const { result } = renderHook(() =>
        useGameEngine({
          initialGameState: initialState,
          enableAutoSave: true,
          autoSaveInterval: 1000, // 1 second for testing
        })
      );

      // Update state
      act(() => {
        result.current.updateGameState({ score: 500 });
      });

      // Advance time
      await act(async () => {
        vi.advanceTimersByTime(1100);
      });

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'gameState',
        expect.stringContaining('"score":500')
      );

      vi.useRealTimers();
    });

    it('should handle auto-save errors gracefully', async () => {
      vi.useFakeTimers();

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Make localStorage.setItem throw
      (localStorage.setItem as any).mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      const initialState: TestGameState = {
        status: 'playing',
        isPaused: false,
        score: 0,
        level: 1,
        lives: 3,
        powerUps: [],
        combo: 0,
        highScore: 0,
      };

      renderHook(() =>
        useGameEngine({
          initialGameState: initialState,
          enableAutoSave: true,
          autoSaveInterval: 1000,
        })
      );

      await act(async () => {
        vi.advanceTimersByTime(1100);
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to auto-save game state:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
      vi.useRealTimers();
    });

    it('should clear auto-save timer on unmount', () => {
      vi.useFakeTimers();

      const initialState: TestGameState = {
        status: 'playing',
        isPaused: false,
        score: 0,
        level: 1,
        lives: 3,
        powerUps: [],
        combo: 0,
        highScore: 0,
      };

      const { unmount } = renderHook(() =>
        useGameEngine({
          initialGameState: initialState,
          enableAutoSave: true,
          autoSaveInterval: 1000,
        })
      );

      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe('Performance Monitoring', () => {
    it('should track FPS accurately', () => {
      const initialState: TestGameState = {
        status: 'playing',
        isPaused: false,
        score: 0,
        level: 1,
        lives: 3,
        powerUps: [],
        combo: 0,
        highScore: 0,
      };

      const { result } = renderHook(() =>
        useGameEngine({ initialGameState: initialState })
      );

      act(() => {
        result.current.start();
      });

      // Simulate 60 FPS (16.67ms per frame)
      let time = 0;
      for (let i = 0; i < 60; i++) {
        (performance.now as any).mockReturnValue(time);
        act(() => {
          executeRAFCallbacks(time);
        });
        time += 16.67;
      }

      // FPS should be close to 60
      expect(result.current.fps).toBeGreaterThan(55);
      expect(result.current.fps).toBeLessThan(65);
    });

    it('should track frame time statistics', () => {
      const initialState: TestGameState = {
        status: 'playing',
        isPaused: false,
        score: 0,
        level: 1,
        lives: 3,
        powerUps: [],
        combo: 0,
        highScore: 0,
      };

      const { result } = renderHook(() =>
        useGameEngine({ initialGameState: initialState })
      );

      act(() => {
        result.current.start();
      });

      // Simulate varying frame times
      const frameTimes = [16, 17, 15, 20, 16, 18];
      let time = 0;

      frameTimes.forEach(frameTime => {
        (performance.now as any).mockReturnValue(time);
        act(() => {
          executeRAFCallbacks(time);
        });
        time += frameTime;
      });

      expect(result.current.frameTime).toBeGreaterThan(0);
    });
  });

  describe('State Management Integration', () => {
    it('should update game state from callbacks', () => {
      const initialState: TestGameState = {
        status: 'playing',
        isPaused: false,
        score: 0,
        level: 1,
        lives: 3,
        powerUps: [],
        combo: 0,
        highScore: 0,
      };

      const { result } = renderHook(() =>
        useGameEngine({ initialGameState: initialState })
      );

      act(() => {
        result.current.onUpdate(({ updateGameState }) => {
          updateGameState(prev => ({
            ...prev,
            score: prev.score + 10,
            combo: prev.combo + 1,
          }));
        });

        result.current.start();
      });

      act(() => {
        executeRAFCallbacks(16);
      });

      expect(result.current.gameState.score).toBe(10);
      expect(result.current.gameState.combo).toBe(1);
    });

    it('should handle complex state updates', () => {
      const initialState: TestGameState = {
        status: 'playing',
        isPaused: false,
        score: 0,
        level: 1,
        lives: 3,
        powerUps: [],
        combo: 0,
        highScore: 0,
      };

      const { result } = renderHook(() =>
        useGameEngine({ initialGameState: initialState })
      );

      act(() => {
        result.current.updateGameState(prev => ({
          ...prev,
          powerUps: [...prev.powerUps, 'multiball'],
          score: prev.score + 100,
          highScore: Math.max(prev.score + 100, prev.highScore),
        }));
      });

      expect(result.current.gameState.powerUps).toContain('multiball');
      expect(result.current.gameState.score).toBe(100);
      expect(result.current.gameState.highScore).toBe(100);
    });
  });

  describe('Error Handling', () => {
    it('should handle update callback errors', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const initialState: TestGameState = {
        status: 'playing',
        isPaused: false,
        score: 0,
        level: 1,
        lives: 3,
        powerUps: [],
        combo: 0,
        highScore: 0,
      };

      const { result } = renderHook(() =>
        useGameEngine({ initialGameState: initialState })
      );

      const errorCallback = vi.fn(() => {
        throw new Error('Update error');
      });

      act(() => {
        result.current.onUpdate(errorCallback);
        result.current.start();
      });

      act(() => {
        executeRAFCallbacks(16);
      });

      expect(errorCallback).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error in update callback'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should handle render callback errors', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const initialState: TestGameState = {
        status: 'playing',
        isPaused: false,
        score: 0,
        level: 1,
        lives: 3,
        powerUps: [],
        combo: 0,
        highScore: 0,
      };

      const { result } = renderHook(() =>
        useGameEngine({ initialGameState: initialState })
      );

      const errorCallback = vi.fn(() => {
        throw new Error('Render error');
      });

      act(() => {
        result.current.onRender(errorCallback);
        result.current.attachCanvas(mockCanvas.canvas);
        result.current.start();
      });

      act(() => {
        executeRAFCallbacks(16);
      });

      expect(errorCallback).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error in render callback'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Configuration Options', () => {
    it('should respect targetFPS configuration', () => {
      const initialState: TestGameState = {
        status: 'playing',
        isPaused: false,
        score: 0,
        level: 1,
        lives: 3,
        powerUps: [],
        combo: 0,
        highScore: 0,
      };

      const updateCallback = vi.fn();

      const { result } = renderHook(() =>
        useGameEngine({
          initialGameState: initialState,
          targetFPS: 30, // Half the normal rate
        })
      );

      act(() => {
        result.current.onUpdate(updateCallback);
        result.current.start();
      });

      // Simulate frames at 60Hz but expect updates at 30Hz
      let time = 0;
      for (let i = 0; i < 4; i++) {
        (performance.now as any).mockReturnValue(time);
        act(() => {
          executeRAFCallbacks(time);
        });
        time += 16.67; // 60 FPS timing
      }

      // Should be called approximately half the time
      expect(updateCallback).toHaveBeenCalledTimes(2);
    });

    it('should use fixed timestep when configured', () => {
      const initialState: TestGameState = {
        status: 'playing',
        isPaused: false,
        score: 0,
        level: 1,
        lives: 3,
        powerUps: [],
        combo: 0,
        highScore: 0,
      };

      const updateCallback = vi.fn();

      const { result } = renderHook(() =>
        useGameEngine({
          initialGameState: initialState,
          useFixedTimestep: true,
          fixedTimestep: 20, // 20ms fixed step
        })
      );

      act(() => {
        result.current.onUpdate(updateCallback);
        result.current.start();
      });

      // Simulate variable frame times
      const frameTimes = [16, 25, 10, 30];
      let time = 0;

      frameTimes.forEach(frameTime => {
        (performance.now as any).mockReturnValue(time);
        act(() => {
          executeRAFCallbacks(time);
        });
        time += frameTime;
      });

      // Check that callbacks received fixed timestep
      updateCallback.mock.calls.forEach(call => {
        expect(call[0].deltaTime).toBe(20);
      });
    });
  });
});
