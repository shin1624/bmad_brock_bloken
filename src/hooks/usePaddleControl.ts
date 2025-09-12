import { useEffect, useRef, useState, useCallback } from 'react';
import { Paddle, PaddleConfig } from '../game/entities/Paddle.js';
import { PaddleController, PaddleControllerConfig } from '../game/systems/PaddleController.js';
import { useGameInput, UseGameInputConfig } from './useGameInput.js';
import { PaddleState } from '../types/game.types.js';

export interface UsePaddleControlConfig extends UseGameInputConfig {
  paddleConfig: PaddleConfig;
  enableLinearInterpolation?: boolean;
  interpolationSpeed?: number;
}

export interface UsePaddleControlReturn {
  paddleState: PaddleState;
  paddle: Paddle | null;
  paddleController: PaddleController | null;
  isReady: boolean;
  updatePaddleConfig: (config: Partial<PaddleConfig>) => void;
  updateControllerConfig: (config: Partial<PaddleControllerConfig>) => void;
  update: (deltaTime: number) => void;
}

/**
 * usePaddleControl - React hook for complete paddle control management
 * Combines Paddle entity, PaddleController, and input handling
 * Story 2.1 Task 4: React統合とカスタムフック
 */
export function usePaddleControl(config: UsePaddleControlConfig): UsePaddleControlReturn {
  const {
    paddleConfig,
    enableLinearInterpolation = true,
    interpolationSpeed = 0.15,
    ...inputConfig
  } = config;

  const paddleRef = useRef<Paddle | null>(null);
  const controllerRef = useRef<PaddleController | null>(null);
  const [paddleState, setPaddleState] = useState<PaddleState>({
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    size: { x: paddleConfig.width, y: paddleConfig.height },
    active: true
  });
  const [isReady, setIsReady] = useState(false);

  // Use input management hook
  const { inputManager, isReady: inputReady } = useGameInput(inputConfig);

  // Initialize paddle and controller when input is ready
  useEffect(() => {
    if (!inputManager || !inputReady) {
      setIsReady(false);
      return;
    }

    try {
      // Create paddle instance
      const paddle = new Paddle(paddleConfig, { x: 350, y: 560 }); // Default position
      paddleRef.current = paddle;

      // Create paddle controller
      const controller = new PaddleController({
        paddle,
        inputManager,
        enableLinearInterpolation,
        interpolationSpeed
      });
      controllerRef.current = controller;

      // Update initial state
      setPaddleState(paddle.getState());
      setIsReady(true);

    } catch (error) {
      console.error('Failed to initialize paddle control:', error);
      setIsReady(false);
    }

    return () => {
      if (controllerRef.current) {
        controllerRef.current.destroy();
        controllerRef.current = null;
      }
      paddleRef.current = null;
      setIsReady(false);
    };
  }, [inputManager, inputReady, paddleConfig, enableLinearInterpolation, interpolationSpeed]);

  // Update paddle configuration
  const updatePaddleConfig = useCallback((newConfig: Partial<PaddleConfig>) => {
    if (paddleRef.current) {
      paddleRef.current.updateConfig(newConfig);
      setPaddleState(paddleRef.current.getState());
    }
  }, []);

  // Update controller configuration
  const updateControllerConfig = useCallback((newConfig: Partial<PaddleControllerConfig>) => {
    if (controllerRef.current) {
      controllerRef.current.updateConfig(newConfig);
    }
  }, []);

  // Update function to be called in game loop
  const update = useCallback((deltaTime: number) => {
    if (!controllerRef.current || !paddleRef.current || !isReady) return;

    try {
      // Update controller (which updates paddle)
      controllerRef.current.update(deltaTime);
      
      // Update React state
      setPaddleState(paddleRef.current.getState());
    } catch (error) {
      console.error('Error updating paddle control:', error);
    }
  }, [isReady]);

  return {
    paddleState,
    paddle: paddleRef.current,
    paddleController: controllerRef.current,
    isReady,
    updatePaddleConfig,
    updateControllerConfig,
    update
  };
}

/**
 * usePaddlePosition - Hook for accessing just paddle position
 */
export function usePaddlePosition(paddleState: PaddleState) {
  return {
    x: paddleState.position.x,
    y: paddleState.position.y,
    centerX: paddleState.position.x + (paddleState.size.x / 2),
    centerY: paddleState.position.y + (paddleState.size.y / 2)
  };
}

/**
 * usePaddleMovement - Hook for paddle movement state
 */
export function usePaddleMovement(paddleState: PaddleState) {
  return {
    velocity: paddleState.velocity,
    isMoving: paddleState.velocity.x !== 0 || paddleState.velocity.y !== 0,
    isMovingLeft: paddleState.velocity.x < 0,
    isMovingRight: paddleState.velocity.x > 0,
    speed: Math.sqrt(paddleState.velocity.x ** 2 + paddleState.velocity.y ** 2)
  };
}

/**
 * usePaddleBounds - Hook for paddle collision bounds
 */
export function usePaddleBounds(paddleState: PaddleState) {
  return {
    left: paddleState.position.x,
    right: paddleState.position.x + paddleState.size.x,
    top: paddleState.position.y,
    bottom: paddleState.position.y + paddleState.size.y,
    width: paddleState.size.x,
    height: paddleState.size.y
  };
}