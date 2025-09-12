import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Paddle, PaddleConfig } from '../Paddle.js';
import { Vector2D } from '../../../types/game.types.js';

describe('Paddle', () => {
  let paddle: Paddle;
  let config: PaddleConfig;

  beforeEach(() => {
    config = {
      width: 100,
      height: 20,
      speed: 8,
      color: '#ffffff',
      maxX: 800
    };
    paddle = new Paddle(config, { x: 350, y: 560 });
  });

  describe('Initialization', () => {
    it('should initialize with correct properties', () => {
      expect(paddle.position).toEqual({ x: 350, y: 560 });
      expect(paddle.velocity).toEqual({ x: 0, y: 0 });
      expect(paddle.size).toEqual({ x: 100, y: 20 });
      expect(paddle.speed).toBe(8);
      expect(paddle.color).toBe('#ffffff');
      expect(paddle.maxX).toBe(800);
      expect(paddle.active).toBe(true);
    });

    it('should initialize with default position when not provided', () => {
      const defaultPaddle = new Paddle(config);
      expect(defaultPaddle.position).toEqual({ x: 0, y: 0 });
    });

    it('should have unique ID inherited from Entity', () => {
      const paddle1 = new Paddle(config);
      const paddle2 = new Paddle(config);
      expect(paddle1.id).toBeDefined();
      expect(paddle2.id).toBeDefined();
      expect(paddle1.id).not.toBe(paddle2.id);
    });
  });

  describe('Movement - Keyboard Input', () => {
    it('should move left when moveLeft() is called', () => {
      paddle.moveLeft();
      expect(paddle.velocity.x).toBe(-8);
    });

    it('should move right when moveRight() is called', () => {
      paddle.moveRight();
      expect(paddle.velocity.x).toBe(8);
    });

    it('should stop moving when stopMoving() is called', () => {
      paddle.moveRight();
      paddle.stopMoving();
      expect(paddle.velocity.x).toBe(0);
    });
  });

  describe('Movement - Mouse/Touch Input', () => {
    it('should set position immediately for mouse/touch input', () => {
      paddle.setTargetPosition(400);
      expect(paddle.position.x).toBe(400);
      expect(paddle.velocity.x).toBe(0);
    });

    it('should constrain position to screen bounds when setting target', () => {
      // Test left boundary
      paddle.setTargetPosition(-50);
      expect(paddle.position.x).toBe(0);

      // Test right boundary (maxX - width)
      paddle.setTargetPosition(850);
      expect(paddle.position.x).toBe(700); // 800 - 100
    });
  });

  describe('Update Method', () => {
    it('should update position based on velocity and deltaTime', () => {
      paddle.velocity.x = 8;
      const initialX = paddle.position.x;
      
      paddle.update(1.0); // 1 frame worth of deltaTime
      expect(paddle.position.x).toBe(initialX + 8);
    });

    it('should constrain paddle to left boundary during update', () => {
      paddle.position.x = 5;
      paddle.velocity.x = -10;
      
      paddle.update(1.0);
      expect(paddle.position.x).toBe(0);
    });

    it('should constrain paddle to right boundary during update', () => {
      paddle.position.x = 750;
      paddle.velocity.x = 100;
      
      paddle.update(1.0);
      expect(paddle.position.x).toBe(700); // maxX - width = 800 - 100
    });

    it('should not update when inactive', () => {
      paddle.active = false;
      const initialPosition = { ...paddle.position };
      paddle.velocity.x = 10;
      
      paddle.update(1.0);
      expect(paddle.position).toEqual(initialPosition);
    });

    it('should handle fractional deltaTime correctly', () => {
      paddle.velocity.x = 8;
      const initialX = paddle.position.x;
      
      paddle.update(0.5); // Half frame
      expect(paddle.position.x).toBe(initialX + 4);
    });
  });

  describe('Render Method', () => {
    it('should call fillRect with correct parameters when active', () => {
      const mockCtx = {
        fillStyle: '',
        fillRect: vi.fn()
      } as unknown as CanvasRenderingContext2D;

      paddle.render(mockCtx);

      expect(mockCtx.fillStyle).toBe('#ffffff');
      expect(mockCtx.fillRect).toHaveBeenCalledWith(350, 560, 100, 20);
    });

    it('should not render when inactive', () => {
      const mockCtx = {
        fillStyle: '',
        fillRect: vi.fn()
      } as unknown as CanvasRenderingContext2D;

      paddle.active = false;
      paddle.render(mockCtx);

      expect(mockCtx.fillRect).not.toHaveBeenCalled();
    });
  });

  describe('Bounds Calculation', () => {
    it('should return correct bounds', () => {
      const bounds = paddle.getBounds();
      expect(bounds).toEqual({
        x: 350,
        y: 560,
        width: 100,
        height: 20
      });
    });

    it('should update bounds when position changes', () => {
      paddle.position.x = 200;
      paddle.position.y = 300;
      
      const bounds = paddle.getBounds();
      expect(bounds.x).toBe(200);
      expect(bounds.y).toBe(300);
    });
  });

  describe('State Management', () => {
    it('should return current state', () => {
      const state = paddle.getState();
      expect(state).toEqual({
        position: { x: 350, y: 560 },
        velocity: { x: 0, y: 0 },
        size: { x: 100, y: 20 },
        active: true
      });
    });

    it('should return deep copies in state to prevent mutation', () => {
      const state = paddle.getState();
      state.position.x = 999;
      
      expect(paddle.position.x).toBe(350); // Should not be mutated
    });
  });

  describe('Configuration Updates', () => {
    it('should update width configuration', () => {
      paddle.updateConfig({ width: 150 });
      expect(paddle.size.x).toBe(150);
    });

    it('should update height configuration', () => {
      paddle.updateConfig({ height: 30 });
      expect(paddle.size.y).toBe(30);
    });

    it('should update speed configuration', () => {
      paddle.updateConfig({ speed: 12 });
      expect(paddle.speed).toBe(12);
    });

    it('should update color configuration', () => {
      paddle.updateConfig({ color: '#ff0000' });
      expect(paddle.color).toBe('#ff0000');
    });

    it('should update maxX configuration', () => {
      paddle.updateConfig({ maxX: 1024 });
      expect(paddle.maxX).toBe(1024);
    });

    it('should update multiple properties at once', () => {
      paddle.updateConfig({
        width: 120,
        height: 25,
        speed: 10,
        color: '#00ff00'
      });
      
      expect(paddle.size.x).toBe(120);
      expect(paddle.size.y).toBe(25);
      expect(paddle.speed).toBe(10);
      expect(paddle.color).toBe('#00ff00');
    });

    it('should only update provided properties', () => {
      const originalSpeed = paddle.speed;
      const originalColor = paddle.color;
      
      paddle.updateConfig({ width: 80 });
      
      expect(paddle.size.x).toBe(80);
      expect(paddle.speed).toBe(originalSpeed);
      expect(paddle.color).toBe(originalColor);
    });
  });

  describe('Integration with Story 2.1 Requirements', () => {
    it('should meet keyboard speed requirement (8px/frame)', () => {
      paddle.moveRight();
      expect(paddle.velocity.x).toBe(8);
    });

    it('should meet default paddle size requirement (100px × 20px)', () => {
      expect(paddle.size.x).toBe(100);
      expect(paddle.size.y).toBe(20);
    });

    it('should implement immediate positioning for mouse/touch', () => {
      const targetX = 500;
      paddle.setTargetPosition(targetX);
      
      // Should be immediate, not gradual
      expect(paddle.position.x).toBe(targetX);
      expect(paddle.velocity.x).toBe(0);
    });

    it('should enforce movement range (0 to maxX - width)', () => {
      // Test left boundary
      paddle.position.x = -10;
      paddle.update(1.0);
      expect(paddle.position.x).toBe(0);
      
      // Test right boundary
      paddle.position.x = 750;
      paddle.velocity.x = 100;
      paddle.update(1.0);
      expect(paddle.position.x).toBe(700); // 800 - 100
    });
  });
});