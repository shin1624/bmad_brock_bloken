/**
 * InputManager - Unified input handling system
 * Follows Story 1.3 success patterns for independent implementation
 */
import { Vector2D, InputState, InputDevice } from '../../types/game.types';

export interface InputManagerConfig {
  canvas?: HTMLCanvasElement;
  enableKeyboard?: boolean;
  enableMouse?: boolean;
  enableTouch?: boolean;
}

export class InputManager {
  private canvas: HTMLCanvasElement | null = null;
  private currentInput: InputState | null = null;
  private activeKeys: Set<string> = new Set();
  private mousePosition: Vector2D = { x: 0, y: 0 };
  private touchPosition: Vector2D = { x: 0, y: 0 };
  private isInitialized = false;

  // Event listeners references for cleanup
  private keydownHandler: (e: KeyboardEvent) => void;
  private keyupHandler: (e: KeyboardEvent) => void;
  private mousemoveHandler: (e: MouseEvent) => void;
  private touchstartHandler: (e: TouchEvent) => void;
  private touchmoveHandler: (e: TouchEvent) => void;
  private touchendHandler: (e: TouchEvent) => void;

  // Input priority: Touch > Mouse > Keyboard
  private static INPUT_PRIORITY: Record<InputDevice, number> = {
    touch: 3,
    mouse: 2,
    keyboard: 1
  };

  constructor(private config: InputManagerConfig = {}) {
    this.initializeEventHandlers();
  }

  private initializeEventHandlers(): void {
    // Keyboard handlers
    this.keydownHandler = (e: KeyboardEvent) => this.handleKeyDown(e);
    this.keyupHandler = (e: KeyboardEvent) => this.handleKeyUp(e);

    // Mouse handlers
    this.mousemoveHandler = (e: MouseEvent) => this.handleMouseMove(e);

    // Touch handlers (passive: true for performance)
    this.touchstartHandler = (e: TouchEvent) => this.handleTouchStart(e);
    this.touchmoveHandler = (e: TouchEvent) => this.handleTouchMove(e);
    this.touchendHandler = (e: TouchEvent) => this.handleTouchEnd(e);
  }

  public initialize(canvas: HTMLCanvasElement): void {
    if (this.isInitialized) {
      console.warn('InputManager is already initialized');
      return;
    }

    this.canvas = canvas;
    this.registerEventListeners();
    this.isInitialized = true;
    console.log('InputManager initialized successfully');
  }

  private registerEventListeners(): void {
    if (!this.canvas) return;

    // Keyboard events (global)
    if (this.config.enableKeyboard !== false) {
      window.addEventListener('keydown', this.keydownHandler);
      window.addEventListener('keyup', this.keyupHandler);
    }

    // Mouse events (canvas-specific)
    if (this.config.enableMouse !== false) {
      this.canvas.addEventListener('mousemove', this.mousemoveHandler);
    }

    // Touch events (canvas-specific, passive for performance)
    if (this.config.enableTouch !== false) {
      this.canvas.addEventListener('touchstart', this.touchstartHandler, { passive: true });
      this.canvas.addEventListener('touchmove', this.touchmoveHandler, { passive: true });
      this.canvas.addEventListener('touchend', this.touchendHandler, { passive: true });
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    // Handle paddle control keys
    if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(e.code)) {
      e.preventDefault();
      this.activeKeys.add(e.code);
      this.updateInputState('keyboard');
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(e.code)) {
      this.activeKeys.delete(e.code);
      this.updateInputState('keyboard');
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.canvas) return;

    const rect = this.canvas.getBoundingClientRect();
    this.mousePosition = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    this.updateInputState('mouse');
  }

  private handleTouchStart(e: TouchEvent): void {
    this.handleTouchMove(e);
  }

  private handleTouchMove(e: TouchEvent): void {
    if (!this.canvas || e.touches.length === 0) return;

    const rect = this.canvas.getBoundingClientRect();
    const touch = e.touches[0];
    this.touchPosition = {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
    this.updateInputState('touch');
  }

  private handleTouchEnd(e: TouchEvent): void {
    if (e.touches.length === 0) {
      // No active touches, clear touch input
      this.clearInputState('touch');
    }
  }

  private updateInputState(device: InputDevice): void {
    const now = performance.now();
    
    // Apply input priority logic
    if (this.currentInput && 
        InputManager.INPUT_PRIORITY[this.currentInput.device] > InputManager.INPUT_PRIORITY[device]) {
      return; // Higher priority input is already active
    }

    let position: Vector2D | undefined;
    let keys: Set<string> | undefined;

    switch (device) {
      case 'keyboard':
        keys = new Set(this.activeKeys);
        break;
      case 'mouse':
        position = { ...this.mousePosition };
        break;
      case 'touch':
        position = { ...this.touchPosition };
        break;
    }

    this.currentInput = {
      device,
      position,
      keys,
      isActive: true,
      timestamp: now
    };
  }

  private clearInputState(device: InputDevice): void {
    if (this.currentInput?.device === device) {
      this.currentInput = null;
    }
  }

  public getCurrentInput(): InputState | null {
    return this.currentInput;
  }

  public getInputPosition(): Vector2D | null {
    return this.currentInput?.position || null;
  }

  public isKeyPressed(key: string): boolean {
    return this.activeKeys.has(key);
  }

  public getActiveKeys(): Set<string> {
    return new Set(this.activeKeys);
  }

  public destroy(): void {
    if (!this.isInitialized) return;

    // Remove all event listeners
    window.removeEventListener('keydown', this.keydownHandler);
    window.removeEventListener('keyup', this.keyupHandler);

    if (this.canvas) {
      this.canvas.removeEventListener('mousemove', this.mousemoveHandler);
      this.canvas.removeEventListener('touchstart', this.touchstartHandler);
      this.canvas.removeEventListener('touchmove', this.touchmoveHandler);
      this.canvas.removeEventListener('touchend', this.touchendHandler);
    }

    // Clear state
    this.currentInput = null;
    this.activeKeys.clear();
    this.canvas = null;
    this.isInitialized = false;

    console.log('InputManager destroyed');
  }
}