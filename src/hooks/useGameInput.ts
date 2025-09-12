import { useEffect, useRef, useState, useCallback } from 'react';
import { InputManager } from '../game/systems/InputManager.js';
import { InputState, InputDevice } from '../types/game.types.js';

export interface UseGameInputConfig {
  enableKeyboard?: boolean;
  enableMouse?: boolean;
  enableTouch?: boolean;
  canvasRef?: React.RefObject<HTMLCanvasElement>;
}

export interface UseGameInputReturn {
  inputState: InputState;
  inputManager: InputManager | null;
  isReady: boolean;
  updateConfig: (config: Partial<UseGameInputConfig>) => void;
}

/**
 * useGameInput - React hook for managing game input
 * Integrates InputManager with React lifecycle
 * Story 2.1 AC: React統合とカスタムフック
 */
export function useGameInput(config: UseGameInputConfig = {}): UseGameInputReturn {
  const {
    enableKeyboard = true,
    enableMouse = true,
    enableTouch = true,
    canvasRef
  } = config;

  const inputManagerRef = useRef<InputManager | null>(null);
  const [inputState, setInputState] = useState<InputState>({
    device: 'keyboard',
    keyboard: { left: false, right: false },
    mouse: { x: null, y: null },
    touch: { x: null, y: null }
  });
  const [isReady, setIsReady] = useState(false);
  const configRef = useRef(config);

  // Update config ref when config changes
  useEffect(() => {
    configRef.current = { ...config };
  }, [config]);

  // Initialize InputManager
  useEffect(() => {
    if (!canvasRef?.current) {
      setIsReady(false);
      return;
    }

    const canvas = canvasRef.current;
    
    try {
      const inputManager = new InputManager({
        canvas,
        enableKeyboard,
        enableMouse,
        enableTouch
      });

      inputManagerRef.current = inputManager;
      setIsReady(true);

      // Initial state update
      setInputState(inputManager.getInputState());

    } catch (error) {
      console.error('Failed to initialize InputManager:', error);
      setIsReady(false);
    }

    return () => {
      if (inputManagerRef.current) {
        inputManagerRef.current.destroy();
        inputManagerRef.current = null;
      }
      setIsReady(false);
    };
  }, [canvasRef, enableKeyboard, enableMouse, enableTouch]);

  // Update input state on each frame
  useEffect(() => {
    if (!inputManagerRef.current || !isReady) return;

    let animationFrameId: number;

    const updateInputState = () => {
      if (inputManagerRef.current) {
        const newState = inputManagerRef.current.getInputState();
        setInputState(prevState => {
          // Only update state if it has actually changed to avoid unnecessary re-renders
          if (
            prevState.device !== newState.device ||
            prevState.keyboard.left !== newState.keyboard.left ||
            prevState.keyboard.right !== newState.keyboard.right ||
            prevState.mouse.x !== newState.mouse.x ||
            prevState.mouse.y !== newState.mouse.y ||
            prevState.touch.x !== newState.touch.x ||
            prevState.touch.y !== newState.touch.y
          ) {
            return newState;
          }
          return prevState;
        });
      }
      
      if (typeof requestAnimationFrame !== 'undefined') {
        animationFrameId = requestAnimationFrame(updateInputState);
      }
    };

    if (typeof requestAnimationFrame !== 'undefined') {
      animationFrameId = requestAnimationFrame(updateInputState);
    }

    return () => {
      if (animationFrameId && typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isReady]);

  // Update configuration
  const updateConfig = useCallback((newConfig: Partial<UseGameInputConfig>) => {
    configRef.current = { ...configRef.current, ...newConfig };
    
    if (inputManagerRef.current && newConfig.canvasRef === undefined) {
      // Update existing input manager configuration
      const { enableKeyboard: newKeyboard, enableMouse: newMouse, enableTouch: newTouch } = newConfig;
      
      if (newKeyboard !== undefined || newMouse !== undefined || newTouch !== undefined) {
        inputManagerRef.current.updateConfig({
          enableKeyboard: newKeyboard ?? configRef.current.enableKeyboard,
          enableMouse: newMouse ?? configRef.current.enableMouse,
          enableTouch: newTouch ?? configRef.current.enableTouch
        });
      }
    }
  }, []);

  return {
    inputState,
    inputManager: inputManagerRef.current,
    isReady,
    updateConfig
  };
}

/**
 * useGameInputDevice - Hook for getting current input device
 */
export function useGameInputDevice(inputState: InputState): InputDevice {
  return inputState.device;
}

/**
 * useKeyboardInput - Hook for keyboard-specific input handling
 */
export function useKeyboardInput(inputState: InputState) {
  return {
    isLeftPressed: inputState.device === 'keyboard' && inputState.keyboard.left,
    isRightPressed: inputState.device === 'keyboard' && inputState.keyboard.right,
    isActive: inputState.device === 'keyboard'
  };
}

/**
 * useMouseInput - Hook for mouse-specific input handling
 */
export function useMouseInput(inputState: InputState) {
  return {
    x: inputState.device === 'mouse' ? inputState.mouse.x : null,
    y: inputState.device === 'mouse' ? inputState.mouse.y : null,
    isActive: inputState.device === 'mouse'
  };
}

/**
 * useTouchInput - Hook for touch-specific input handling
 */
export function useTouchInput(inputState: InputState) {
  return {
    x: inputState.device === 'touch' ? inputState.touch.x : null,
    y: inputState.device === 'touch' ? inputState.touch.y : null,
    isActive: inputState.device === 'touch'
  };
}