/**
 * InputManager unit tests
 * Following Story 1.3 successful testing patterns
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InputManager } from '../InputManager';

describe('InputManager', () => {
  let inputManager: InputManager;
  let mockCanvas: HTMLCanvasElement;

  beforeEach(() => {
    // Create mock canvas with dispatchEvent
    mockCanvas = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      getBoundingClientRect: vi.fn(() => ({
        left: 0,
        top: 0,
        width: 800,
        height: 600
      }))
    } as unknown as HTMLCanvasElement;

    // Mock window event listeners
    vi.spyOn(window, 'addEventListener');
    vi.spyOn(window, 'removeEventListener');

    inputManager = new InputManager();
  });

  afterEach(() => {
    inputManager.destroy();
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('initializes successfully with canvas', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      
      inputManager.initialize(mockCanvas);
      
      expect(consoleSpy).toHaveBeenCalledWith('InputManager initialized successfully');
    });

    it('prevents double initialization', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn');
      
      inputManager.initialize(mockCanvas);
      inputManager.initialize(mockCanvas);
      
      expect(consoleWarnSpy).toHaveBeenCalledWith('InputManager is already initialized');
    });

    it('registers keyboard event listeners by default', () => {
      inputManager.initialize(mockCanvas);
      
      expect(window.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(window.addEventListener).toHaveBeenCalledWith('keyup', expect.any(Function));
    });

    it('registers mouse event listeners by default', () => {
      inputManager.initialize(mockCanvas);
      
      expect(mockCanvas.addEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
    });

    it('registers touch event listeners by default', () => {
      inputManager.initialize(mockCanvas);
      
      expect(mockCanvas.addEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function), { passive: true });
      expect(mockCanvas.addEventListener).toHaveBeenCalledWith('touchmove', expect.any(Function), { passive: true });
      expect(mockCanvas.addEventListener).toHaveBeenCalledWith('touchend', expect.any(Function), { passive: true });
    });
  });

  describe('Keyboard Input', () => {
    beforeEach(() => {
      inputManager.initialize(mockCanvas);
    });

    it('handles paddle control key presses', () => {
      const event = new KeyboardEvent('keydown', { code: 'ArrowLeft' });
      window.dispatchEvent(event);
      
      expect(inputManager.isKeyPressed('ArrowLeft')).toBe(true);
      expect(inputManager.getCurrentInput()?.device).toBe('keyboard');
    });

    it('handles key releases', () => {
      const keydownEvent = new KeyboardEvent('keydown', { code: 'ArrowRight' });
      const keyupEvent = new KeyboardEvent('keyup', { code: 'ArrowRight' });
      
      window.dispatchEvent(keydownEvent);
      expect(inputManager.isKeyPressed('ArrowRight')).toBe(true);
      
      window.dispatchEvent(keyupEvent);
      expect(inputManager.isKeyPressed('ArrowRight')).toBe(false);
    });

    it('supports all paddle control keys', () => {
      const keys = ['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'];
      
      keys.forEach(key => {
        const event = new KeyboardEvent('keydown', { code: key });
        window.dispatchEvent(event);
        expect(inputManager.isKeyPressed(key)).toBe(true);
      });
    });

    it('returns active keys set', () => {
      const event1 = new KeyboardEvent('keydown', { code: 'ArrowLeft' });
      const event2 = new KeyboardEvent('keydown', { code: 'KeyA' });
      
      window.dispatchEvent(event1);
      window.dispatchEvent(event2);
      
      const activeKeys = inputManager.getActiveKeys();
      expect(activeKeys.has('ArrowLeft')).toBe(true);
      expect(activeKeys.has('KeyA')).toBe(true);
    });
  });

  describe('Mouse Input', () => {
    beforeEach(() => {
      inputManager.initialize(mockCanvas);
    });

    it('handles mouse movement', () => {
      const mouseEvent = new MouseEvent('mousemove', {
        clientX: 100,
        clientY: 50
      });
      
      // Simulate the mouse event handler directly
      (inputManager as unknown).handleMouseMove(mouseEvent);
      
      const input = inputManager.getCurrentInput();
      expect(input?.device).toBe('mouse');
      expect(input?.position).toEqual({ x: 100, y: 50 });
    });

    it('converts canvas coordinates correctly', () => {
      (mockCanvas.getBoundingClientRect as unknown).mockReturnValue({
        left: 10,
        top: 20,
        width: 800,
        height: 600
      });
      
      const mouseEvent = new MouseEvent('mousemove', {
        clientX: 110, // 110 - 10 = 100
        clientY: 70   // 70 - 20 = 50
      });
      
      (inputManager as unknown).handleMouseMove(mouseEvent);
      
      const position = inputManager.getInputPosition();
      expect(position).toEqual({ x: 100, y: 50 });
    });
  });

  describe('Touch Input', () => {
    beforeEach(() => {
      inputManager.initialize(mockCanvas);
    });

    it('handles touch movement', () => {
      const mockTouch = {
        identifier: 0,
        target: mockCanvas,
        clientX: 200,
        clientY: 100
      };
      
      const touchEvent = {
        type: 'touchmove',
        touches: [mockTouch]
      } as unknown;
      
      // Simulate the touch event handler directly
      (inputManager as unknown).handleTouchMove(touchEvent);
      
      const input = inputManager.getCurrentInput();
      expect(input?.device).toBe('touch');
      expect(input?.position).toEqual({ x: 200, y: 100 });
    });

    it('handles touch end', () => {
      // Start touch
      const mockTouch = {
        identifier: 0,
        target: mockCanvas,
        clientX: 200,
        clientY: 100
      };
      
      const touchMoveEvent = {
        type: 'touchmove',
        touches: [mockTouch]
      } as unknown;
      
      (inputManager as unknown).handleTouchMove(touchMoveEvent);
      expect(inputManager.getCurrentInput()?.device).toBe('touch');
      
      // End touch
      const touchEndEvent = {
        type: 'touchend',
        touches: []
      } as unknown;
      
      (inputManager as unknown).handleTouchEnd(touchEndEvent);
      expect(inputManager.getCurrentInput()).toBeNull();
    });
  });

  describe('Input Priority', () => {
    beforeEach(() => {
      inputManager.initialize(mockCanvas);
    });

    it('prioritizes touch over mouse', () => {
      // First mouse input
      const mouseEvent = new MouseEvent('mousemove', {
        clientX: 100,
        clientY: 50
      });
      (inputManager as unknown).handleMouseMove(mouseEvent);
      expect(inputManager.getCurrentInput()?.device).toBe('mouse');
      
      // Then touch input (should override)
      const touchEvent = {
        type: 'touchmove',
        touches: [{
          identifier: 0,
          target: mockCanvas,
          clientX: 200,
          clientY: 100
        }]
      } as unknown;
      (inputManager as unknown).handleTouchMove(touchEvent);
      expect(inputManager.getCurrentInput()?.device).toBe('touch');
    });

    it('prioritizes mouse over keyboard', () => {
      // First keyboard input
      const keyEvent = new KeyboardEvent('keydown', { code: 'ArrowLeft' });
      window.dispatchEvent(keyEvent);
      expect(inputManager.getCurrentInput()?.device).toBe('keyboard');
      
      // Then mouse input (should override)
      const mouseEvent = new MouseEvent('mousemove', {
        clientX: 100,
        clientY: 50
      });
      (inputManager as unknown).handleMouseMove(mouseEvent);
      expect(inputManager.getCurrentInput()?.device).toBe('mouse');
    });

    it('does not allow lower priority to override higher priority', () => {
      // Touch input first (highest priority)
      const touchEvent = {
        type: 'touchmove',
        touches: [{
          identifier: 0,
          target: mockCanvas,
          clientX: 200,
          clientY: 100
        }]
      } as unknown;
      (inputManager as unknown).handleTouchMove(touchEvent);
      expect(inputManager.getCurrentInput()?.device).toBe('touch');
      
      // Mouse input should not override
      const mouseEvent = new MouseEvent('mousemove', {
        clientX: 100,
        clientY: 50
      });
      (inputManager as unknown).handleMouseMove(mouseEvent);
      expect(inputManager.getCurrentInput()?.device).toBe('touch');
    });
  });

  describe('Cleanup', () => {
    it('removes all event listeners on destroy', () => {
      inputManager.initialize(mockCanvas);
      inputManager.destroy();
      
      expect(window.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(window.removeEventListener).toHaveBeenCalledWith('keyup', expect.any(Function));
      expect(mockCanvas.removeEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(mockCanvas.removeEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function));
      expect(mockCanvas.removeEventListener).toHaveBeenCalledWith('touchmove', expect.any(Function));
      expect(mockCanvas.removeEventListener).toHaveBeenCalledWith('touchend', expect.any(Function));
    });

    it('clears all state on destroy', () => {
      inputManager.initialize(mockCanvas);
      
      // Add some state
      const keyEvent = new KeyboardEvent('keydown', { code: 'ArrowLeft' });
      window.dispatchEvent(keyEvent);
      
      expect(inputManager.getCurrentInput()).not.toBeNull();
      expect(inputManager.isKeyPressed('ArrowLeft')).toBe(true);
      
      inputManager.destroy();
      
      expect(inputManager.getCurrentInput()).toBeNull();
      expect(inputManager.isKeyPressed('ArrowLeft')).toBe(false);
    });
  });

  describe('Configuration', () => {
    it('can disable keyboard input', () => {
      const inputManagerNoKeyboard = new InputManager({ enableKeyboard: false });
      inputManagerNoKeyboard.initialize(mockCanvas);
      
      expect(window.addEventListener).not.toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(window.addEventListener).not.toHaveBeenCalledWith('keyup', expect.any(Function));
      
      inputManagerNoKeyboard.destroy();
    });

    it('can disable mouse input', () => {
      const inputManagerNoMouse = new InputManager({ enableMouse: false });
      inputManagerNoMouse.initialize(mockCanvas);
      
      expect(mockCanvas.addEventListener).not.toHaveBeenCalledWith('mousemove', expect.any(Function));
      
      inputManagerNoMouse.destroy();
    });

    it('can disable touch input', () => {
      const inputManagerNoTouch = new InputManager({ enableTouch: false });
      inputManagerNoTouch.initialize(mockCanvas);
      
      expect(mockCanvas.addEventListener).not.toHaveBeenCalledWith('touchstart', expect.any(Function), { passive: true });
      expect(mockCanvas.addEventListener).not.toHaveBeenCalledWith('touchmove', expect.any(Function), { passive: true });
      expect(mockCanvas.addEventListener).not.toHaveBeenCalledWith('touchend', expect.any(Function), { passive: true });
      
      inputManagerNoTouch.destroy();
    });
  });
});