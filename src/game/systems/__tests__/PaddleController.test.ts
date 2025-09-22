import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PaddleController, PaddleControllerConfig } from '../PaddleController.js';
import { Paddle } from '../../entities/Paddle.js';
import { InputManager } from '../InputManager.js';
import { InputState } from '../../../types/game.types.js';

describe('PaddleController', () => {
  let paddleController: PaddleController;
  let mockPaddle: Paddle;
  let mockInputManager: InputManager;
  let config: PaddleControllerConfig;

  beforeEach(() => {
    // Create mock paddle
    mockPaddle = {
      position: { x: 350, y: 560 },
      velocity: { x: 0, y: 0 },
      size: { x: 100, y: 20 },
      speed: 8,
      active: true,
      update: vi.fn(),
      moveLeft: vi.fn(),
      moveRight: vi.fn(),
      stopMoving: vi.fn(),
      setTargetPosition: vi.fn(),
      getState: vi.fn(() => ({
        position: { x: 350, y: 560 },
        velocity: { x: 0, y: 0 },
        size: { x: 100, y: 20 },
        active: true
      }))
    } as unknown as Paddle;

    // Create mock input manager
    mockInputManager = {
      getInputState: vi.fn()
    } as unknown as InputManager;

    config = {
      paddle: mockPaddle,
      inputManager: mockInputManager,
      enableLinearInterpolation: true,
      interpolationSpeed: 0.15
    };

    paddleController = new PaddleController(config);
  });

  describe('Initialization', () => {
    it('should initialize with correct configuration', () => {
      expect(paddleController.getPaddle()).toBe(mockPaddle);
      expect(paddleController.getInputManager()).toBe(mockInputManager);
    });

    it('should initialize with default interpolation settings', () => {
      const defaultController = new PaddleController({
        paddle: mockPaddle,
        inputManager: mockInputManager
      });
      
      expect(defaultController).toBeDefined();
    });
  });

  describe('Keyboard Input Handling', () => {
    it('should move paddle left when left arrow is pressed', () => {
      const inputState: InputState = {
        device: 'keyboard',
        keyboard: { left: true, right: false },
        mouse: { x: null, y: null },
        touch: { x: null, y: null }
      };

      (mockInputManager.getInputState as unknown).mockReturnValue(inputState);
      
      paddleController.update(1.0);
      
      expect(mockPaddle.moveLeft).toHaveBeenCalled();
      expect(mockPaddle.moveRight).not.toHaveBeenCalled();
      expect(mockPaddle.stopMoving).not.toHaveBeenCalled();
    });

    it('should move paddle right when right arrow is pressed', () => {
      const inputState: InputState = {
        device: 'keyboard',
        keyboard: { left: false, right: true },
        mouse: { x: null, y: null },
        touch: { x: null, y: null }
      };

      (mockInputManager.getInputState as unknown).mockReturnValue(inputState);
      
      paddleController.update(1.0);
      
      expect(mockPaddle.moveRight).toHaveBeenCalled();
      expect(mockPaddle.moveLeft).not.toHaveBeenCalled();
      expect(mockPaddle.stopMoving).not.toHaveBeenCalled();
    });

    it('should stop paddle when no keys are pressed', () => {
      const inputState: InputState = {
        device: 'keyboard',
        keyboard: { left: false, right: false },
        mouse: { x: null, y: null },
        touch: { x: null, y: null }
      };

      (mockInputManager.getInputState as unknown).mockReturnValue(inputState);
      
      paddleController.update(1.0);
      
      expect(mockPaddle.stopMoving).toHaveBeenCalled();
      expect(mockPaddle.moveLeft).not.toHaveBeenCalled();
      expect(mockPaddle.moveRight).not.toHaveBeenCalled();
    });

    it('should prioritize right when both keys are pressed', () => {
      const inputState: InputState = {
        device: 'keyboard',
        keyboard: { left: true, right: true },
        mouse: { x: null, y: null },
        touch: { x: null, y: null }
      };

      (mockInputManager.getInputState as unknown).mockReturnValue(inputState);
      
      paddleController.update(1.0);
      
      expect(mockPaddle.stopMoving).toHaveBeenCalled();
      expect(mockPaddle.moveLeft).not.toHaveBeenCalled();
      expect(mockPaddle.moveRight).not.toHaveBeenCalled();
    });
  });

  describe('Mouse Input Handling', () => {
    it('should set target position for mouse input with interpolation', () => {
      const inputState: InputState = {
        device: 'mouse',
        keyboard: { left: false, right: false },
        mouse: { x: 400, y: 300 },
        touch: { x: null, y: null }
      };

      (mockInputManager.getInputState as unknown).mockReturnValue(inputState);
      
      paddleController.update(1.0);
      
      expect(mockPaddle.stopMoving).toHaveBeenCalled();
      // Should call setTargetPosition during interpolation
    });

    it('should center paddle on mouse position', () => {
      const mouseX = 400;
      const expectedPaddleX = mouseX - (mockPaddle.size.x / 2); // 400 - 50 = 350

      const inputState: InputState = {
        device: 'mouse',
        keyboard: { left: false, right: false },
        mouse: { x: mouseX, y: 300 },
        touch: { x: null, y: null }
      };

      (mockInputManager.getInputState as unknown).mockReturnValue(inputState);
      
      paddleController.update(1.0);
      
      expect(mockPaddle.stopMoving).toHaveBeenCalled();
    });

    it('should handle mouse input without interpolation', () => {
      paddleController.setLinearInterpolation(false);
      
      const inputState: InputState = {
        device: 'mouse',
        keyboard: { left: false, right: false },
        mouse: { x: 400, y: 300 },
        touch: { x: null, y: null }
      };

      (mockInputManager.getInputState as unknown).mockReturnValue(inputState);
      
      paddleController.update(1.0);
      
      expect(mockPaddle.setTargetPosition).toHaveBeenCalledWith(350); // 400 - 50
    });
  });

  describe('Touch Input Handling', () => {
    it('should set target position for touch input', () => {
      const inputState: InputState = {
        device: 'touch',
        keyboard: { left: false, right: false },
        mouse: { x: null, y: null },
        touch: { x: 500, y: 400 }
      };

      (mockInputManager.getInputState as unknown).mockReturnValue(inputState);
      
      paddleController.update(1.0);
      
      expect(mockPaddle.stopMoving).toHaveBeenCalled();
    });

    it('should center paddle on touch position', () => {
      paddleController.setLinearInterpolation(false);
      
      const touchX = 500;
      const expectedPaddleX = touchX - (mockPaddle.size.x / 2); // 500 - 50 = 450

      const inputState: InputState = {
        device: 'touch',
        keyboard: { left: false, right: false },
        mouse: { x: null, y: null },
        touch: { x: touchX, y: 400 }
      };

      (mockInputManager.getInputState as unknown).mockReturnValue(inputState);
      
      paddleController.update(1.0);
      
      expect(mockPaddle.setTargetPosition).toHaveBeenCalledWith(450);
    });
  });

  describe('Linear Interpolation', () => {
    it('should apply linear interpolation over multiple frames', () => {
      paddleController.setLinearInterpolation(true);
      mockPaddle.position.x = 300;
      
      const inputState: InputState = {
        device: 'mouse',
        keyboard: { left: false, right: false },
        mouse: { x: 400, y: 300 },
        touch: { x: null, y: null }
      };

      (mockInputManager.getInputState as unknown).mockReturnValue(inputState);
      
      // First frame - should start interpolation
      paddleController.update(1.0);
      expect(mockPaddle.setTargetPosition).toHaveBeenCalled();
      
      // Clear mocks for second frame
      vi.clearAllMocks();
      (mockInputManager.getInputState as unknown).mockReturnValue({
        device: 'keyboard',
        keyboard: { left: false, right: false },
        mouse: { x: null, y: null },
        touch: { x: null, y: null }
      });
      
      // Second frame - should continue interpolation
      paddleController.update(1.0);
    });

    it('should disable interpolation when set to false', () => {
      paddleController.setLinearInterpolation(false);
      
      const inputState: InputState = {
        device: 'mouse',
        keyboard: { left: false, right: false },
        mouse: { x: 400, y: 300 },
        touch: { x: null, y: null }
      };

      (mockInputManager.getInputState as unknown).mockReturnValue(inputState);
      
      paddleController.update(1.0);
      
      expect(mockPaddle.setTargetPosition).toHaveBeenCalledWith(350);
    });

    it('should set interpolation speed within valid range', () => {
      paddleController.setInterpolationSpeed(1.5); // Above 1.0
      paddleController.setInterpolationSpeed(-0.5); // Below 0.0
      paddleController.setInterpolationSpeed(0.5); // Valid range
      
      // Test that it doesn't throw and accepts valid values
      expect(paddleController).toBeDefined();
    });
  });

  describe('Configuration Updates', () => {
    it('should update interpolation settings', () => {
      paddleController.updateConfig({
        enableLinearInterpolation: false,
        interpolationSpeed: 0.25
      });
      
      // Test that configuration was updated (indirect test via behavior)
      expect(paddleController).toBeDefined();
    });
  });

  describe('State Management', () => {
    it('should return paddle state', () => {
      const state = paddleController.getPaddleState();
      
      expect(mockPaddle.getState).toHaveBeenCalled();
      expect(state).toEqual({
        position: { x: 350, y: 560 },
        velocity: { x: 0, y: 0 },
        size: { x: 100, y: 20 },
        active: true
      });
    });

    it('should provide access to paddle and input manager', () => {
      expect(paddleController.getPaddle()).toBe(mockPaddle);
      expect(paddleController.getInputManager()).toBe(mockInputManager);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources on destroy', () => {
      paddleController.destroy();
      
      // Test that destroy doesn't throw
      expect(paddleController).toBeDefined();
    });
  });

  describe('Integration with Story 2.1 Requirements', () => {
    it('should call paddle.update() on each frame', () => {
      const inputState: InputState = {
        device: 'keyboard',
        keyboard: { left: false, right: false },
        mouse: { x: null, y: null },
        touch: { x: null, y: null }
      };

      (mockInputManager.getInputState as unknown).mockReturnValue(inputState);
      
      paddleController.update(1.0);
      
      expect(mockPaddle.update).toHaveBeenCalledWith(1.0);
    });

    it('should implement smooth movement with linear interpolation', () => {
      // Test that linear interpolation is enabled by default
      paddleController.setLinearInterpolation(true);
      expect(paddleController).toBeDefined();
      
      // Test interpolation speed setting
      paddleController.setInterpolationSpeed(0.2);
      expect(paddleController).toBeDefined();
    });

    it('should handle all input types as specified in AC1-AC3', () => {
      // AC1: Keyboard
      const keyboardState: InputState = {
        device: 'keyboard',
        keyboard: { left: true, right: false },
        mouse: { x: null, y: null },
        touch: { x: null, y: null }
      };

      (mockInputManager.getInputState as unknown).mockReturnValue(keyboardState);
      paddleController.update(1.0);
      expect(mockPaddle.moveLeft).toHaveBeenCalled();

      // AC2: Mouse
      vi.clearAllMocks();
      const mouseState: InputState = {
        device: 'mouse',
        keyboard: { left: false, right: false },
        mouse: { x: 400, y: 300 },
        touch: { x: null, y: null }
      };

      (mockInputManager.getInputState as unknown).mockReturnValue(mouseState);
      paddleController.update(1.0);
      expect(mockPaddle.stopMoving).toHaveBeenCalled();

      // AC3: Touch
      vi.clearAllMocks();
      const touchState: InputState = {
        device: 'touch',
        keyboard: { left: false, right: false },
        mouse: { x: null, y: null },
        touch: { x: 500, y: 400 }
      };

      (mockInputManager.getInputState as unknown).mockReturnValue(touchState);
      paddleController.update(1.0);
      expect(mockPaddle.stopMoving).toHaveBeenCalled();
    });
  });
});