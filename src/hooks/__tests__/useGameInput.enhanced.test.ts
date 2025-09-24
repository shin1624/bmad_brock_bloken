import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useGameInput } from '../useGameInput';
import { InputManager } from '../../game/systems/InputManager';
import type { InputState } from '../../types/game.types';

// Mock InputManager
vi.mock('../../game/systems/InputManager', () => ({
  InputManager: vi.fn().mockImplementation(() => ({
    getInputState: vi.fn(),
    destroy: vi.fn(),
    updateConfig: vi.fn(),
    onInput: vi.fn(),
    offInput: vi.fn(),
    isKeyPressed: vi.fn(),
    getMousePosition: vi.fn(),
    getTouchPosition: vi.fn(),
    setEnabled: vi.fn(),
  })),
}));

describe('useGameInput - Enhanced Test Suite', () => {
  let mockCanvas: HTMLCanvasElement;
  let mockInputManager: any;
  let rafCallbacks: FrameRequestCallback[] = [];
  let rafId = 0;
  let originalRAF: typeof requestAnimationFrame;
  let originalCAF: typeof cancelAnimationFrame;

  beforeEach(() => {
    vi.clearAllMocks();
    rafCallbacks = [];
    rafId = 0;

    // Create mock canvas
    mockCanvas = {
      width: 800,
      height: 600,
      getBoundingClientRect: vi.fn(() => ({
        left: 0,
        top: 0,
        width: 800,
        height: 600,
        right: 800,
        bottom: 600,
      })),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as any;

    // Setup InputManager mock
    mockInputManager = {
      getInputState: vi.fn().mockReturnValue({
        device: 'keyboard',
        keyboard: { left: false, right: false },
        mouse: { x: null, y: null },
        touch: { x: null, y: null },
      }),
      destroy: vi.fn(),
      updateConfig: vi.fn(),
      onInput: vi.fn(),
      offInput: vi.fn(),
      isKeyPressed: vi.fn(),
      getMousePosition: vi.fn(),
      getTouchPosition: vi.fn(),
      setEnabled: vi.fn(),
    };

    (InputManager as any).mockImplementation(() => mockInputManager);

    // Mock requestAnimationFrame
    originalRAF = global.requestAnimationFrame;
    originalCAF = global.cancelAnimationFrame;

    global.requestAnimationFrame = vi.fn((callback) => {
      const id = ++rafId;
      rafCallbacks.push(callback);
      return id;
    });

    global.cancelAnimationFrame = vi.fn();
  });

  afterEach(() => {
    global.requestAnimationFrame = originalRAF;
    global.cancelAnimationFrame = originalCAF;
  });

  const executeRAFCallbacks = (time: number = 16) => {
    const callbacks = [...rafCallbacks];
    rafCallbacks = [];
    callbacks.forEach(cb => cb(time));
  };

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      const canvasRef = { current: mockCanvas };
      const { result } = renderHook(() => useGameInput({ canvasRef }));

      expect(result.current.isReady).toBe(true);
      expect(result.current.inputManager).toBeDefined();
      expect(InputManager).toHaveBeenCalledWith({
        canvas: mockCanvas,
        enableKeyboard: true,
        enableMouse: true,
        enableTouch: true,
      });
    });

    it('should initialize with custom configuration', () => {
      const canvasRef = { current: mockCanvas };
      const { result } = renderHook(() =>
        useGameInput({
          canvasRef,
          enableKeyboard: false,
          enableMouse: true,
          enableTouch: false,
        })
      );

      expect(InputManager).toHaveBeenCalledWith({
        canvas: mockCanvas,
        enableKeyboard: false,
        enableMouse: true,
        enableTouch: false,
      });
      expect(result.current.isReady).toBe(true);
    });

    it('should not initialize without canvas', () => {
      const { result } = renderHook(() => useGameInput({}));

      expect(result.current.isReady).toBe(false);
      expect(result.current.inputManager).toBeNull();
      expect(InputManager).not.toHaveBeenCalled();
    });

    it('should handle null canvas ref', () => {
      const canvasRef = { current: null };
      const { result } = renderHook(() => useGameInput({ canvasRef }));

      expect(result.current.isReady).toBe(false);
      expect(result.current.inputManager).toBeNull();
    });

    it('should handle initialization errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      (InputManager as any).mockImplementationOnce(() => {
        throw new Error('Init failed');
      });

      const canvasRef = { current: mockCanvas };
      const { result } = renderHook(() => useGameInput({ canvasRef }));

      expect(result.current.isReady).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to initialize InputManager:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Input State Updates', () => {
    it('should update input state from InputManager', async () => {
      const canvasRef = { current: mockCanvas };
      const { result } = renderHook(() => useGameInput({ canvasRef }));

      // Initial state
      expect(result.current.inputState).toEqual({
        device: 'keyboard',
        keyboard: { left: false, right: false },
        mouse: { x: null, y: null },
        touch: { x: null, y: null },
      });

      // Update mock to return new state
      const newState: InputState = {
        device: 'keyboard',
        keyboard: { left: true, right: false },
        mouse: { x: null, y: null },
        touch: { x: null, y: null },
      };
      mockInputManager.getInputState.mockReturnValue(newState);

      // Trigger RAF update
      act(() => {
        executeRAFCallbacks();
      });

      await waitFor(() => {
        expect(result.current.inputState.keyboard.left).toBe(true);
      });
    });

    it('should continuously update input state on animation frames', async () => {
      const canvasRef = { current: mockCanvas };
      const { result } = renderHook(() => useGameInput({ canvasRef }));

      const states: InputState[] = [
        {
          device: 'keyboard',
          keyboard: { left: true, right: false },
          mouse: { x: null, y: null },
          touch: { x: null, y: null },
        },
        {
          device: 'keyboard',
          keyboard: { left: false, right: true },
          mouse: { x: null, y: null },
          touch: { x: null, y: null },
        },
        {
          device: 'mouse',
          keyboard: { left: false, right: false },
          mouse: { x: 100, y: 200 },
          touch: { x: null, y: null },
        },
      ];

      for (const state of states) {
        mockInputManager.getInputState.mockReturnValue(state);
        act(() => {
          executeRAFCallbacks();
        });
        await waitFor(() => {
          expect(result.current.inputState).toEqual(state);
        });
      }
    });

    it('should avoid unnecessary re-renders when state unchanged', () => {
      const canvasRef = { current: mockCanvas };
      const { result, rerender } = renderHook(() => useGameInput({ canvasRef }));

      const initialState = result.current.inputState;

      // Return same state multiple times
      act(() => {
        executeRAFCallbacks();
        executeRAFCallbacks();
        executeRAFCallbacks();
      });

      expect(result.current.inputState).toBe(initialState);
      expect(mockInputManager.getInputState).toHaveBeenCalledTimes(4); // Initial + 3 RAF
    });

    it('should handle touch input state', async () => {
      const canvasRef = { current: mockCanvas };
      const { result } = renderHook(() => useGameInput({ canvasRef }));

      const touchState: InputState = {
        device: 'touch',
        keyboard: { left: false, right: false },
        mouse: { x: null, y: null },
        touch: { x: 300, y: 400 },
      };

      mockInputManager.getInputState.mockReturnValue(touchState);

      act(() => {
        executeRAFCallbacks();
      });

      await waitFor(() => {
        expect(result.current.inputState.device).toBe('touch');
        expect(result.current.inputState.touch.x).toBe(300);
        expect(result.current.inputState.touch.y).toBe(400);
      });
    });
  });

  describe('Configuration Updates', () => {
    it('should update configuration dynamically', () => {
      const canvasRef = { current: mockCanvas };
      const { result } = renderHook(() => useGameInput({ canvasRef }));

      act(() => {
        result.current.updateConfig({
          enableKeyboard: false,
          enableMouse: true,
        });
      });

      expect(mockInputManager.updateConfig).toHaveBeenCalledWith({
        enableKeyboard: false,
        enableMouse: true,
        enableTouch: true,
      });
    });

    it('should handle partial configuration updates', () => {
      const canvasRef = { current: mockCanvas };
      const { result } = renderHook(() =>
        useGameInput({
          canvasRef,
          enableKeyboard: true,
          enableMouse: false,
          enableTouch: true,
        })
      );

      act(() => {
        result.current.updateConfig({ enableMouse: true });
      });

      expect(mockInputManager.updateConfig).toHaveBeenCalledWith({
        enableKeyboard: true,
        enableMouse: true,
        enableTouch: true,
      });
    });

    it('should not update InputManager when canvas ref changes', () => {
      const canvasRef = { current: mockCanvas };
      const { result } = renderHook(() => useGameInput({ canvasRef }));

      const newCanvas = { ...mockCanvas };
      act(() => {
        result.current.updateConfig({ canvasRef: { current: newCanvas } });
      });

      // Should not call updateConfig when canvas changes
      expect(mockInputManager.updateConfig).not.toHaveBeenCalled();
    });

    it('should preserve existing config when updating', () => {
      const canvasRef = { current: mockCanvas };
      const { result } = renderHook(() =>
        useGameInput({
          canvasRef,
          enableKeyboard: false,
          enableMouse: true,
          enableTouch: false,
        })
      );

      act(() => {
        result.current.updateConfig({ enableTouch: true });
      });

      expect(mockInputManager.updateConfig).toHaveBeenCalledWith({
        enableKeyboard: false,
        enableMouse: true,
        enableTouch: true,
      });
    });
  });

  describe('Cleanup', () => {
    it('should destroy InputManager on unmount', () => {
      const canvasRef = { current: mockCanvas };
      const { unmount } = renderHook(() => useGameInput({ canvasRef }));

      unmount();

      expect(mockInputManager.destroy).toHaveBeenCalled();
    });

    it('should cancel animation frame on unmount', () => {
      const canvasRef = { current: mockCanvas };
      const { unmount } = renderHook(() => useGameInput({ canvasRef }));

      // Start RAF
      act(() => {
        executeRAFCallbacks();
      });

      unmount();

      expect(global.cancelAnimationFrame).toHaveBeenCalled();
    });

    it('should handle re-initialization when canvas changes', async () => {
      const canvasRef = { current: mockCanvas };
      const { rerender } = renderHook(
        (props) => useGameInput(props),
        { initialProps: { canvasRef } }
      );

      expect(InputManager).toHaveBeenCalledTimes(1);
      expect(mockInputManager.destroy).not.toHaveBeenCalled();

      // Change canvas
      const newCanvas = { ...mockCanvas, width: 1024 };
      rerender({ canvasRef: { current: newCanvas } });

      await waitFor(() => {
        expect(mockInputManager.destroy).toHaveBeenCalledTimes(1);
        expect(InputManager).toHaveBeenCalledTimes(2);
      });
    });

    it('should clean up when canvas becomes null', () => {
      const canvasRef = { current: mockCanvas };
      const { rerender, result } = renderHook(
        (props) => useGameInput(props),
        { initialProps: { canvasRef } }
      );

      expect(result.current.isReady).toBe(true);

      rerender({ canvasRef: { current: null } });

      expect(mockInputManager.destroy).toHaveBeenCalled();
      expect(result.current.isReady).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing requestAnimationFrame', () => {
      const originalRAF = global.requestAnimationFrame;
      const originalCAF = global.cancelAnimationFrame;

      // @ts-ignore
      delete global.requestAnimationFrame;
      // @ts-ignore
      delete global.cancelAnimationFrame;

      const canvasRef = { current: mockCanvas };
      const { result } = renderHook(() => useGameInput({ canvasRef }));

      expect(result.current.isReady).toBe(true);
      expect(() => result.current.updateConfig({})).not.toThrow();

      global.requestAnimationFrame = originalRAF;
      global.cancelAnimationFrame = originalCAF;
    });

    it('should handle rapid canvas changes', async () => {
      const canvas1 = { ...mockCanvas, id: 'canvas1' };
      const canvas2 = { ...mockCanvas, id: 'canvas2' };
      const canvas3 = { ...mockCanvas, id: 'canvas3' };

      const { rerender } = renderHook(
        (props) => useGameInput(props),
        { initialProps: { canvasRef: { current: canvas1 } } }
      );

      // Rapidly change canvas
      rerender({ canvasRef: { current: canvas2 } });
      rerender({ canvasRef: { current: canvas3 } });
      rerender({ canvasRef: { current: null } });
      rerender({ canvasRef: { current: canvas1 } });

      await waitFor(() => {
        expect(mockInputManager.destroy).toHaveBeenCalled();
      });
    });

    it('should handle InputManager returning undefined state', () => {
      mockInputManager.getInputState.mockReturnValue(undefined);

      const canvasRef = { current: mockCanvas };
      const { result } = renderHook(() => useGameInput({ canvasRef }));

      act(() => {
        executeRAFCallbacks();
      });

      // Should maintain previous state when undefined is returned
      expect(result.current.inputState).toBeDefined();
    });

    it('should handle configuration changes during RAF updates', () => {
      const canvasRef = { current: mockCanvas };
      const { result } = renderHook(() => useGameInput({ canvasRef }));

      // Change config while RAF is running
      act(() => {
        executeRAFCallbacks();
        result.current.updateConfig({ enableKeyboard: false });
        executeRAFCallbacks();
      });

      expect(mockInputManager.updateConfig).toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('should batch multiple configuration updates efficiently', () => {
      const canvasRef = { current: mockCanvas };
      const { result } = renderHook(() => useGameInput({ canvasRef }));

      act(() => {
        result.current.updateConfig({ enableKeyboard: false });
        result.current.updateConfig({ enableMouse: false });
        result.current.updateConfig({ enableTouch: false });
      });

      // Each update should trigger a separate updateConfig call
      expect(mockInputManager.updateConfig).toHaveBeenCalledTimes(3);
    });

    it('should handle high-frequency input updates', async () => {
      const canvasRef = { current: mockCanvas };
      const { result } = renderHook(() => useGameInput({ canvasRef }));

      // Simulate rapid input changes
      const states: InputState[] = [];
      for (let i = 0; i < 100; i++) {
        states.push({
          device: 'mouse',
          keyboard: { left: false, right: false },
          mouse: { x: i * 10, y: i * 5 },
          touch: { x: null, y: null },
        });
      }

      const startTime = performance.now();

      for (const state of states) {
        mockInputManager.getInputState.mockReturnValue(state);
        act(() => {
          executeRAFCallbacks();
        });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // Should handle 100 updates quickly
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete input flow for keyboard', async () => {
      const canvasRef = { current: mockCanvas };
      const { result } = renderHook(() => useGameInput({ canvasRef }));

      // Simulate key press sequence
      const keySequence = [
        { left: true, right: false },
        { left: true, right: true },
        { left: false, right: true },
        { left: false, right: false },
      ];

      for (const keys of keySequence) {
        mockInputManager.getInputState.mockReturnValue({
          device: 'keyboard',
          keyboard: keys,
          mouse: { x: null, y: null },
          touch: { x: null, y: null },
        });

        act(() => {
          executeRAFCallbacks();
        });

        await waitFor(() => {
          expect(result.current.inputState.keyboard).toEqual(keys);
        });
      }
    });

    it('should handle mouse movement tracking', async () => {
      const canvasRef = { current: mockCanvas };
      const { result } = renderHook(() => useGameInput({ canvasRef }));

      // Simulate mouse movement
      const mousePositions = [
        { x: 100, y: 100 },
        { x: 200, y: 150 },
        { x: 300, y: 200 },
        { x: 400, y: 250 },
      ];

      for (const pos of mousePositions) {
        mockInputManager.getInputState.mockReturnValue({
          device: 'mouse',
          keyboard: { left: false, right: false },
          mouse: pos,
          touch: { x: null, y: null },
        });

        act(() => {
          executeRAFCallbacks();
        });

        await waitFor(() => {
          expect(result.current.inputState.mouse).toEqual(pos);
        });
      }
    });

    it('should handle device switching', async () => {
      const canvasRef = { current: mockCanvas };
      const { result } = renderHook(() => useGameInput({ canvasRef }));

      // Start with keyboard
      mockInputManager.getInputState.mockReturnValue({
        device: 'keyboard',
        keyboard: { left: true, right: false },
        mouse: { x: null, y: null },
        touch: { x: null, y: null },
      });

      act(() => {
        executeRAFCallbacks();
      });

      expect(result.current.inputState.device).toBe('keyboard');

      // Switch to mouse
      mockInputManager.getInputState.mockReturnValue({
        device: 'mouse',
        keyboard: { left: false, right: false },
        mouse: { x: 250, y: 300 },
        touch: { x: null, y: null },
      });

      act(() => {
        executeRAFCallbacks();
      });

      await waitFor(() => {
        expect(result.current.inputState.device).toBe('mouse');
      });

      // Switch to touch
      mockInputManager.getInputState.mockReturnValue({
        device: 'touch',
        keyboard: { left: false, right: false },
        mouse: { x: null, y: null },
        touch: { x: 150, y: 350 },
      });

      act(() => {
        executeRAFCallbacks();
      });

      await waitFor(() => {
        expect(result.current.inputState.device).toBe('touch');
      });
    });

    it('should handle disabled input types correctly', () => {
      const canvasRef = { current: mockCanvas };
      const { result, rerender } = renderHook(
        (props) => useGameInput(props),
        {
          initialProps: {
            canvasRef,
            enableKeyboard: true,
            enableMouse: false,
            enableTouch: false,
          },
        }
      );

      // Try to enable disabled inputs
      act(() => {
        result.current.updateConfig({
          enableMouse: true,
          enableTouch: true,
        });
      });

      expect(mockInputManager.updateConfig).toHaveBeenCalledWith({
        enableKeyboard: true,
        enableMouse: true,
        enableTouch: true,
      });
    });
  });
});
