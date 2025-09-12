import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useGameEngine } from '../useGameEngine';
import type { GameStateBase } from '../useGameState';

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock performance.now
Object.defineProperty(window, 'performance', {
  value: {
    now: vi.fn(() => Date.now()),
  },
});

// Mock requestAnimationFrame and cancelAnimationFrame
let animationFrameId = 0;
const mockRAF = vi.fn((callback: FrameRequestCallback) => {
  animationFrameId++;
  setTimeout(() => callback(performance.now()), 16);
  return animationFrameId;
});
const mockCAF = vi.fn(() => {});

Object.defineProperty(window, 'requestAnimationFrame', { value: mockRAF });
Object.defineProperty(window, 'cancelAnimationFrame', { value: mockCAF });

interface TestGameState extends GameStateBase {
  isPlaying: boolean;
  isPaused: boolean;
  score: number;
  level: number;
  lives: number;
  gameTime: number;
  playerX: number;
  playerY: number;
}

// Mock canvas context
const mockContext = {
  clearRect: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  canvas: { width: 800, height: 600 },
} as any;

describe('useGameEngine', () => {
  const initialGameState: TestGameState = {
    isPlaying: false,
    isPaused: false,
    score: 0,
    level: 1,
    lives: 3,
    gameTime: 0,
    playerX: 100,
    playerY: 100,
  };

  const config = {
    initialGameState,
    targetFps: 60,
    enablePerformanceMonitoring: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    animationFrameId = 0;
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('initializes with provided configuration', () => {
    const { result } = renderHook(() => useGameEngine(config));

    expect(result.current.gameState).toEqual(initialGameState);
    expect(result.current.isRunning).toBe(false);
    expect(result.current.isPaused).toBe(false);
    expect(result.current.isGameActive).toBe(false);
  });

  it('handles canvas ready callback', async () => {
    const { result } = renderHook(() => useGameEngine(config));

    const mockCanvas = document.createElement('canvas');
    
    act(() => {
      result.current.handleCanvasReady(mockCanvas, mockContext);
    });

    expect(result.current.canvas).toBe(mockCanvas);
    expect(result.current.context).toBe(mockContext);
  });

  it('starts and stops engine correctly', async () => {
    const { result } = renderHook(() => useGameEngine(config));

    // Start engine
    act(() => {
      result.current.startEngine();
    });

    expect(result.current.isRunning).toBe(true);
    expect(result.current.gameState.isPlaying).toBe(true);
    expect(result.current.isGameActive).toBe(true);

    // Stop engine
    act(() => {
      result.current.stopEngine();
    });

    expect(result.current.isRunning).toBe(false);
    expect(result.current.gameState.isPlaying).toBe(false);
    expect(result.current.isGameActive).toBe(false);
  });

  it('pauses and resumes engine correctly', async () => {
    const { result } = renderHook(() => useGameEngine(config));

    // Start engine first
    act(() => {
      result.current.startEngine();
    });

    // Pause engine
    act(() => {
      result.current.pauseEngine();
    });

    expect(result.current.isPaused).toBe(true);
    expect(result.current.gameState.isPaused).toBe(true);
    expect(result.current.isGameActive).toBe(false);

    // Resume engine
    act(() => {
      result.current.resumeEngine();
    });

    expect(result.current.isPaused).toBe(false);
    expect(result.current.gameState.isPaused).toBe(false);
    expect(result.current.isGameActive).toBe(true);
  });

  it('registers and executes update callbacks', async () => {
    const { result } = renderHook(() => useGameEngine(config));
    const mockUpdateCallback = vi.fn();

    // Register update callback
    let unsubscribe: (() => void) | undefined;
    act(() => {
      unsubscribe = result.current.onUpdate(mockUpdateCallback);
    });

    // Set up canvas
    const mockCanvas = document.createElement('canvas');
    act(() => {
      result.current.handleCanvasReady(mockCanvas, mockContext);
    });

    // Start engine
    act(() => {
      result.current.startEngine();
    });

    // Wait for animation frame
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 20));
    });

    expect(mockUpdateCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        deltaTime: expect.any(Number),
        currentTime: expect.any(Number),
        gameState: expect.objectContaining(result.current.gameState),
        updateGameState: expect.any(Function),
      })
    );

    // Test unsubscribe
    if (unsubscribe) {
      act(() => {
        unsubscribe();
      });
    }
  });

  it('registers and executes render callbacks', async () => {
    const { result } = renderHook(() => useGameEngine(config));
    const mockRenderCallback = vi.fn();

    // Register render callback
    let unsubscribe: (() => void) | undefined;
    act(() => {
      unsubscribe = result.current.onRender(mockRenderCallback);
    });

    // Set up canvas
    const mockCanvas = document.createElement('canvas');
    act(() => {
      result.current.handleCanvasReady(mockCanvas, mockContext);
    });

    // Start engine
    act(() => {
      result.current.startEngine();
    });

    // Wait for animation frame
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 20));
    });

    expect(mockRenderCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        canvas: mockCanvas,
        context: mockContext,
        deltaTime: expect.any(Number),
        currentTime: expect.any(Number),
      })
    );

    // Test unsubscribe
    if (unsubscribe) {
      act(() => {
        unsubscribe();
      });
    }
  });

  it('clears canvas before render callbacks', async () => {
    const { result } = renderHook(() => useGameEngine(config));
    const mockRenderCallback = vi.fn();

    act(() => {
      result.current.onRender(mockRenderCallback);
    });

    const mockCanvas = document.createElement('canvas');
    mockCanvas.width = 800;
    mockCanvas.height = 600;
    
    act(() => {
      result.current.handleCanvasReady(mockCanvas, mockContext);
    });

    act(() => {
      result.current.startEngine();
    });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 20));
    });

    expect(mockContext.clearRect).toHaveBeenCalledWith(0, 0, 800, 600);
    expect(mockRenderCallback).toHaveBeenCalled();
  });

  it('updates game time during game loop', async () => {
    const { result } = renderHook(() => useGameEngine(config));

    const mockCanvas = document.createElement('canvas');
    act(() => {
      result.current.handleCanvasReady(mockCanvas, mockContext);
    });

    act(() => {
      result.current.startEngine();
    });

    const initialGameTime = result.current.gameState.gameTime;

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    expect(result.current.gameState.gameTime).toBeGreaterThan(initialGameTime);
  });

  it('only updates when game is active', async () => {
    const { result } = renderHook(() => useGameEngine(config));
    const mockUpdateCallback = vi.fn();

    act(() => {
      result.current.onUpdate(mockUpdateCallback);
    });

    const mockCanvas = document.createElement('canvas');
    act(() => {
      result.current.handleCanvasReady(mockCanvas, mockContext);
    });

    // Start game loop but don't start game
    act(() => {
      result.current.gameLoop.start();
    });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 20));
    });

    // Update callback should not have been called because game is not active
    expect(mockUpdateCallback).not.toHaveBeenCalled();

    // Now start the game
    act(() => {
      result.current.gameStateAPI.startGame();
    });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 20));
    });

    // Now update callback should be called
    expect(mockUpdateCallback).toHaveBeenCalled();
  });

  it('saves game state to localStorage', () => {
    const { result } = renderHook(() => useGameEngine(config));

    // Modify game state
    act(() => {
      result.current.gameStateAPI.updateState({
        score: 1000,
        level: 3,
      });
    });

    // Save game
    let saveResult: boolean;
    act(() => {
      saveResult = result.current.saveGame();
    });

    expect(saveResult!).toBe(true);
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'gameState',
      expect.stringContaining('"score":1000')
    );
  });

  it('loads game state from localStorage', () => {
    const savedState = {
      ...initialGameState,
      score: 500,
      level: 2,
    };

    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(savedState));

    const { result } = renderHook(() => useGameEngine(config));

    let loadResult: boolean;
    act(() => {
      loadResult = result.current.loadGame();
    });

    expect(loadResult!).toBe(true);
    expect(result.current.gameState.score).toBe(500);
    expect(result.current.gameState.level).toBe(2);
  });

  it('handles save/load errors gracefully', () => {
    const { result } = renderHook(() => useGameEngine(config));
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Test save error
    mockLocalStorage.setItem.mockImplementation(() => {
      throw new Error('Storage full');
    });

    let saveResult: boolean;
    act(() => {
      saveResult = result.current.saveGame();
    });

    expect(saveResult!).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalled();

    // Test load error
    mockLocalStorage.getItem.mockImplementation(() => {
      throw new Error('Storage error');
    });

    let loadResult: boolean;
    act(() => {
      loadResult = result.current.loadGame();
    });

    expect(loadResult!).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it('enables auto-save functionality', async () => {
    const configWithAutoSave = {
      ...config,
      enableAutoSave: true,
      autoSaveInterval: 100, // 100ms for testing
    };

    const { result } = renderHook(() => useGameEngine(configWithAutoSave));

    // Modify game state
    act(() => {
      result.current.gameStateAPI.updateState({ score: 100 });
    });

    // Wait for auto-save interval
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150));
    });

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'gameState',
      expect.stringContaining('"score":100')
    );
  });

  it('handles callback errors gracefully', async () => {
    const { result } = renderHook(() => useGameEngine(config));
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const faultyUpdateCallback = vi.fn(() => {
      throw new Error('Update error');
    });

    const faultyRenderCallback = vi.fn(() => {
      throw new Error('Render error');
    });

    act(() => {
      result.current.onUpdate(faultyUpdateCallback);
      result.current.onRender(faultyRenderCallback);
    });

    const mockCanvas = document.createElement('canvas');
    act(() => {
      result.current.handleCanvasReady(mockCanvas, mockContext);
    });

    act(() => {
      result.current.startEngine();
    });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 20));
    });

    expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
    expect(faultyUpdateCallback).toHaveBeenCalled();
    expect(faultyRenderCallback).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it('provides performance metrics', async () => {
    const { result } = renderHook(() => useGameEngine(config));

    const mockCanvas = document.createElement('canvas');
    act(() => {
      result.current.handleCanvasReady(mockCanvas, mockContext);
    });

    act(() => {
      result.current.startEngine();
    });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 20));
    });

    expect(result.current.performanceMetrics).toBeDefined();
    expect(result.current.performanceMetrics.fps).toBeGreaterThan(0);
    expect(result.current.performanceMetrics.deltaTime).toBeGreaterThan(0);
  });
});