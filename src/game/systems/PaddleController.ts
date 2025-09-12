import { Paddle } from '../entities/Paddle.js';
import { InputManager } from './InputManager.js';
import { InputState, Vector2D } from '../../types/game.types.js';

export interface PaddleControllerConfig {
  paddle: Paddle;
  inputManager: InputManager;
  enableLinearInterpolation?: boolean;
  interpolationSpeed?: number;
}

/**
 * PaddleController - Manages paddle movement based on input
 * Implements Story 2.1 requirements for smooth movement and input handling
 */
export class PaddleController {
  private paddle: Paddle;
  private inputManager: InputManager;
  private enableLinearInterpolation: boolean;
  private interpolationSpeed: number;
  private targetPosition: number | null = null;

  constructor(config: PaddleControllerConfig) {
    this.paddle = config.paddle;
    this.inputManager = config.inputManager;
    this.enableLinearInterpolation = config.enableLinearInterpolation ?? true;
    this.interpolationSpeed = config.interpolationSpeed ?? 0.15; // 15% interpolation per frame
  }

  /**
   * Update paddle movement based on current input state
   * Story 2.1 AC4: スムーズな移動（線形補間処理による滑らかな動き）
   */
  public update(deltaTime: number): void {
    const inputState = this.inputManager.getInputState();
    
    this.handleKeyboardInput(inputState);
    this.handleMouseTouchInput(inputState);
    
    // Apply linear interpolation for smooth movement if enabled
    if (this.enableLinearInterpolation && this.targetPosition !== null) {
      this.applyLinearInterpolation(deltaTime);
    }
    
    // Update paddle entity
    this.paddle.update(deltaTime);
  }

  /**
   * Handle keyboard input (Story 2.1 AC1: キーボード操作対応)
   * Speed: 8px/frame as per technical specifications
   */
  private handleKeyboardInput(inputState: InputState): void {
    if (inputState.device !== 'keyboard') return;

    const { left, right } = inputState.keyboard;
    
    if (left && !right) {
      this.paddle.moveLeft();
      this.targetPosition = null; // Clear target for immediate keyboard control
    } else if (right && !left) {
      this.paddle.moveRight();
      this.targetPosition = null; // Clear target for immediate keyboard control
    } else {
      this.paddle.stopMoving();
      this.targetPosition = null;
    }
  }

  /**
   * Handle mouse and touch input (Story 2.1 AC2, AC3)
   * Mouse/Touch: Immediate positioning as per technical specifications
   */
  private handleMouseTouchInput(inputState: InputState): void {
    if (inputState.device === 'keyboard') return;

    let targetX: number | null = null;

    if (inputState.device === 'mouse' && inputState.mouse.x !== null) {
      targetX = inputState.mouse.x;
    } else if (inputState.device === 'touch' && inputState.touch.x !== null) {
      targetX = inputState.touch.x;
    }

    if (targetX !== null) {
      // Center paddle on cursor/touch position
      const paddleCenter = targetX - (this.paddle.size.x / 2);
      
      if (this.enableLinearInterpolation) {
        this.targetPosition = paddleCenter;
        this.paddle.stopMoving(); // Stop keyboard velocity
      } else {
        this.paddle.setTargetPosition(paddleCenter);
        this.targetPosition = null;
      }
    }
  }

  /**
   * Apply linear interpolation for smooth movement
   * Story 2.1 AC4: 線形補間処理による滑らかな動き
   */
  private applyLinearInterpolation(deltaTime: number): void {
    if (this.targetPosition === null) return;

    const currentX = this.paddle.position.x;
    const distance = this.targetPosition - currentX;
    
    // Apply interpolation with frame-rate independent speed
    const interpolationFactor = 1 - Math.pow(1 - this.interpolationSpeed, deltaTime * 60);
    const newX = currentX + (distance * interpolationFactor);
    
    // Set position directly for smooth interpolation
    this.paddle.setTargetPosition(newX);
    
    // Stop interpolation when close enough (within 1 pixel)
    if (Math.abs(distance) < 1) {
      this.paddle.setTargetPosition(this.targetPosition);
      this.targetPosition = null;
    }
  }

  /**
   * Get current paddle state for React integration
   */
  public getPaddleState() {
    return this.paddle.getState();
  }

  /**
   * Update controller configuration
   */
  public updateConfig(config: Partial<PaddleControllerConfig>): void {
    if (config.enableLinearInterpolation !== undefined) {
      this.enableLinearInterpolation = config.enableLinearInterpolation;
    }
    if (config.interpolationSpeed !== undefined) {
      this.interpolationSpeed = config.interpolationSpeed;
    }
  }

  /**
   * Enable/disable linear interpolation
   */
  public setLinearInterpolation(enabled: boolean): void {
    this.enableLinearInterpolation = enabled;
    if (!enabled) {
      this.targetPosition = null;
    }
  }

  /**
   * Set interpolation speed (0.0 - 1.0)
   */
  public setInterpolationSpeed(speed: number): void {
    this.interpolationSpeed = Math.max(0, Math.min(1, speed));
  }

  /**
   * Get the paddle instance (for external access)
   */
  public getPaddle(): Paddle {
    return this.paddle;
  }

  /**
   * Get the input manager instance (for external access)
   */
  public getInputManager(): InputManager {
    return this.inputManager;
  }

  /**
   * Cleanup controller resources
   */
  public destroy(): void {
    this.targetPosition = null;
    // Note: We don't destroy paddle or inputManager here as they may be used elsewhere
  }
}