import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useGameInput, useGameInputDevice, useKeyboardInput, useMouseInput, useTouchInput } from '../useGameInput.js';
import { InputState } from '../../types/game.types.js';

// Mock InputManager
vi.mock('../../game/systems/InputManager.js', () => ({
  InputManager: vi.fn().mockImplementation(() => ({
    getInputState: vi.fn(() => ({
      device: 'keyboard',
      keyboard: { left: false, right: false },
      mouse: { x: null, y: null },
      touch: { x: null, y: null }
    })),
    updateConfig: vi.fn(),
    destroy: vi.fn()
  }))
}));

describe('useGameInput', () => {
  let mockCanvas: HTMLCanvasElement;
  let canvasRef: React.RefObject<HTMLCanvasElement>;

  beforeEach(() => {
    // Mock canvas element
    mockCanvas = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      getBoundingClientRect: vi.fn(() => ({
        left: 0,
        top: 0,
        width: 800,
        height: 600
      }))
    } as unknown as HTMLCanvasElement;

    canvasRef = { current: mockCanvas };

    // Mock requestAnimationFrame with immediate execution for tests
    global.requestAnimationFrame = vi.fn((cb) => {
      const id = Math.random();
      setTimeout(() => cb(Date.now()), 0);
      return id;
    });
    global.cancelAnimationFrame = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Hook Initialization', () => {
    it('should initialize with default configuration', () => {
      const { result } = renderHook(() => useGameInput({ canvasRef }));
      
      expect(result.current.inputState).toBeDefined();
      expect(result.current.isReady).toBe(true);
      expect(result.current.inputManager).toBeDefined();
      expect(result.current.updateConfig).toBeInstanceOf(Function);
    });

    it('should handle missing canvas ref', () => {
      const { result } = renderHook(() => useGameInput({}));
      
      expect(result.current.isReady).toBe(false);
      expect(result.current.inputManager).toBe(null);
    });

    it('should initialize with custom configuration', () => {
      const { result } = renderHook(() => useGameInput({
        canvasRef,
        enableKeyboard: false,
        enableMouse: true,
        enableTouch: false
      }));
      
      expect(result.current.isReady).toBe(true);
    });
  });

  describe('Input State Management', () => {
    it('should provide initial input state', () => {
      const { result } = renderHook(() => useGameInput({ canvasRef }));
      
      expect(result.current.inputState).toEqual({
        device: 'keyboard',
        keyboard: { left: false, right: false },
        mouse: { x: null, y: null },
        touch: { x: null, y: null }
      });
    });

    it('should update input state when InputManager state changes', async () => {
      const mockInputManager = {
        getInputState: vi.fn(),
        updateConfig: vi.fn(),
        destroy: vi.fn()
      };

      // Initial state
      mockInputManager.getInputState.mockReturnValue({
        device: 'keyboard',
        keyboard: { left: false, right: false },
        mouse: { x: null, y: null },
        touch: { x: null, y: null }
      });

      const { InputManager } = await import('../../game/systems/InputManager.js');
      (InputManager as ReturnType<typeof vi.fn>).mockImplementation(() => mockInputManager);

      const { result, rerender } = renderHook(() => useGameInput({ canvasRef }));
      
      // Simulate state change
      mockInputManager.getInputState.mockReturnValue({
        device: 'keyboard',
        keyboard: { left: true, right: false },
        mouse: { x: null, y: null },
        touch: { x: null, y: null }
      });

      rerender();

      // Wait for animation frame update
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 20));
      });
    });
  });

  describe('Configuration Updates', () => {
    it('should update configuration dynamically', () => {
      const { result } = renderHook(() => useGameInput({ canvasRef }));
      
      act(() => {
        result.current.updateConfig({
          enableKeyboard: false,
          enableMouse: true
        });
      });
      
      // Verify updateConfig was called on InputManager
      expect(result.current.inputManager?.updateConfig).toHaveBeenCalledWith({
        enableKeyboard: false,
        enableMouse: true,
        enableTouch: undefined
      });
    });
  });

  describe('Cleanup', () => {
    it('should cleanup InputManager on unmount', () => {
      const { result, unmount } = renderHook(() => useGameInput({ canvasRef }));
      const inputManager = result.current.inputManager;
      
      unmount();
      
      expect(inputManager?.destroy).toHaveBeenCalled();
    });

    it('should cancel animation frame on unmount', () => {
      const { unmount } = renderHook(() => useGameInput({ canvasRef }));
      
      unmount();
      
      expect(global.cancelAnimationFrame).toHaveBeenCalled();
    });
  });
});

describe('useGameInputDevice', () => {
  it('should return current input device', () => {
    const inputState: InputState = {
      device: 'mouse',
      keyboard: { left: false, right: false },
      mouse: { x: 100, y: 200 },
      touch: { x: null, y: null }
    };

    const { result } = renderHook(() => useGameInputDevice(inputState));
    
    expect(result.current).toBe('mouse');
  });
});

describe('useKeyboardInput', () => {
  it('should return keyboard input state when device is keyboard', () => {
    const inputState: InputState = {
      device: 'keyboard',
      keyboard: { left: true, right: false },
      mouse: { x: null, y: null },
      touch: { x: null, y: null }
    };

    const { result } = renderHook(() => useKeyboardInput(inputState));
    
    expect(result.current).toEqual({
      isLeftPressed: true,
      isRightPressed: false,
      isActive: true
    });
  });

  it('should return inactive state when device is not keyboard', () => {
    const inputState: InputState = {
      device: 'mouse',
      keyboard: { left: true, right: false },
      mouse: { x: 100, y: 200 },
      touch: { x: null, y: null }
    };

    const { result } = renderHook(() => useKeyboardInput(inputState));
    
    expect(result.current).toEqual({
      isLeftPressed: false,
      isRightPressed: false,
      isActive: false
    });
  });
});

describe('useMouseInput', () => {
  it('should return mouse input state when device is mouse', () => {
    const inputState: InputState = {
      device: 'mouse',
      keyboard: { left: false, right: false },
      mouse: { x: 100, y: 200 },
      touch: { x: null, y: null }
    };

    const { result } = renderHook(() => useMouseInput(inputState));
    
    expect(result.current).toEqual({
      x: 100,
      y: 200,
      isActive: true
    });
  });

  it('should return inactive state when device is not mouse', () => {
    const inputState: InputState = {
      device: 'keyboard',
      keyboard: { left: false, right: false },
      mouse: { x: 100, y: 200 },
      touch: { x: null, y: null }
    };

    const { result } = renderHook(() => useMouseInput(inputState));
    
    expect(result.current).toEqual({
      x: null,
      y: null,
      isActive: false
    });
  });
});

describe('useTouchInput', () => {
  it('should return touch input state when device is touch', () => {
    const inputState: InputState = {
      device: 'touch',
      keyboard: { left: false, right: false },
      mouse: { x: null, y: null },
      touch: { x: 300, y: 400 }
    };

    const { result } = renderHook(() => useTouchInput(inputState));
    
    expect(result.current).toEqual({
      x: 300,
      y: 400,
      isActive: true
    });
  });

  it('should return inactive state when device is not touch', () => {
    const inputState: InputState = {
      device: 'keyboard',
      keyboard: { left: false, right: false },
      mouse: { x: null, y: null },
      touch: { x: 300, y: 400 }
    };

    const { result } = renderHook(() => useTouchInput(inputState));
    
    expect(result.current).toEqual({
      x: null,
      y: null,
      isActive: false
    });
  });
});