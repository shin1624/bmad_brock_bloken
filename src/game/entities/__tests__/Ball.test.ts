/**
 * Unit tests for Ball entity
 */
import { describe, it, expect, beforeEach } from "vitest";
import { Ball } from '../Ball';
import { BallConfiguration } from '../../../types/game.types';

describe('Ball Entity', () => {
  let defaultConfig: BallConfiguration;
  let ball: Ball;

  beforeEach(() => {
    defaultConfig = {
      initialRadius: 10,
      initialSpeed: 200,
      maxSpeed: 500,
      minSpeed: 50,
      initialPosition: { x: 400, y: 300 },
      bounceDamping: 0.95
    };
    ball = new Ball(defaultConfig);
  });

  describe('Constructor', () => {
    it('should initialize with correct properties', () => {
      expect(ball.radius).toBe(10);
      expect(ball.speed).toBe(200);
      expect(ball.maxSpeed).toBe(500);
      expect(ball.minSpeed).toBe(50);
      expect(ball.position.x).toBe(400);
      expect(ball.position.y).toBe(300);
      expect(ball.bounceDamping).toBe(0.95);
      expect(ball.active).toBe(true);
    });

    it('should generate random initial velocity', () => {
      const ball1 = new Ball(defaultConfig);
      const ball2 = new Ball(defaultConfig);
      
      // Velocities should be different (statistically very unlikely to be same)
      expect(ball1.velocity.x !== ball2.velocity.x || ball1.velocity.y !== ball2.velocity.y).toBe(true);
    });

    it('should maintain correct speed magnitude', () => {
      const magnitude = Math.sqrt(ball.velocity.x ** 2 + ball.velocity.y ** 2);
      expect(Math.abs(magnitude - ball.speed)).toBeLessThan(0.001);
    });
  });

  describe('Update Method', () => {
    it('should update position based on velocity', () => {
      const initialX = ball.position.x;
      const initialY = ball.position.y;
      const deltaTime = 1/60; // 16.67ms

      ball.update(deltaTime);

      expect(ball.position.x).toBeCloseTo(initialX + ball.velocity.x * deltaTime, 5);
      expect(ball.position.y).toBeCloseTo(initialY + ball.velocity.y * deltaTime, 5);
    });

    it('should not update when inactive', () => {
      ball.active = false;
      const initialPosition = { ...ball.position };

      ball.update(1/60);

      expect(ball.position.x).toBe(initialPosition.x);
      expect(ball.position.y).toBe(initialPosition.y);
    });

    it('should maintain speed consistency after update', () => {
      ball.update(1/60);
      const magnitude = Math.sqrt(ball.velocity.x ** 2 + ball.velocity.y ** 2);
      expect(Math.abs(magnitude - ball.speed)).toBeLessThan(0.001);
    });
  });

  describe('Reflection Method', () => {
    it('should reflect velocity correctly off horizontal surface', () => {
      ball.velocity = { x: 100, y: 100 };
      const normal = { x: 0, y: 1 }; // horizontal surface

      ball.reflect(normal);

      expect(ball.velocity.x).toBeCloseTo(100 * 0.95); // damped
      expect(ball.velocity.y).toBeCloseTo(-100 * 0.95); // reflected and damped
    });

    it('should reflect velocity correctly off vertical surface', () => {
      ball.velocity = { x: 100, y: 100 };
      const normal = { x: 1, y: 0 }; // vertical surface

      ball.reflect(normal);

      expect(ball.velocity.x).toBeCloseTo(-100 * 0.95); // reflected and damped
      expect(ball.velocity.y).toBeCloseTo(100 * 0.95); // damped
    });

    it('should maintain speed within limits after reflection', () => {
      ball.velocity = { x: 600, y: 0 }; // above max speed
      ball.reflect({ x: 1, y: 0 });

      const magnitude = Math.sqrt(ball.velocity.x ** 2 + ball.velocity.y ** 2);
      expect(magnitude).toBeLessThanOrEqual(ball.maxSpeed);
    });
  });

  describe('Velocity Management', () => {
    it('should set velocity correctly', () => {
      const newVelocity = { x: 150, y: -150 };
      ball.setVelocity(newVelocity);

      // Should normalize to maintain speed constraints
      const magnitude = Math.sqrt(ball.velocity.x ** 2 + ball.velocity.y ** 2);
      expect(magnitude).toBeGreaterThanOrEqual(ball.minSpeed);
      expect(magnitude).toBeLessThanOrEqual(ball.maxSpeed);
    });

    it('should prevent zero velocity', () => {
      ball.setVelocity({ x: 0, y: 0 });

      expect(ball.velocity.x).not.toBe(0);
      expect(ball.velocity.y).not.toBe(0);
    });

    it('should clamp speed to maximum', () => {
      ball.setVelocity({ x: 1000, y: 1000 });

      const magnitude = Math.sqrt(ball.velocity.x ** 2 + ball.velocity.y ** 2);
      expect(magnitude).toBeLessThanOrEqual(ball.maxSpeed + 0.01); // Allow small precision error
    });

    it('should boost speed to minimum', () => {
      ball.setVelocity({ x: 10, y: 10 });

      const magnitude = Math.sqrt(ball.velocity.x ** 2 + ball.velocity.y ** 2);
      expect(magnitude).toBeGreaterThanOrEqual(ball.minSpeed - 0.01); // Allow small precision error
    });
  });

  describe('Bounds Checking', () => {
    it('should correctly detect in-bounds position', () => {
      ball.position = { x: 400, y: 300 };
      expect(ball.isInBounds(800, 600)).toBe(true);
    });

    it('should correctly detect out-of-bounds position', () => {
      ball.position = { x: 5, y: 300 }; // too far left
      expect(ball.isInBounds(800, 600)).toBe(false);

      ball.position = { x: 795, y: 300 }; // too far right
      expect(ball.isInBounds(800, 600)).toBe(false);

      ball.position = { x: 400, y: 5 }; // too far up
      expect(ball.isInBounds(800, 600)).toBe(false);

      ball.position = { x: 400, y: 595 }; // too far down
      expect(ball.isInBounds(800, 600)).toBe(false);
    });
  });

  describe('Bounds Calculation', () => {
    it('should return correct bounds', () => {
      ball.position = { x: 100, y: 200 };
      ball.radius = 15;

      const bounds = ball.getBounds();

      expect(bounds.x).toBe(85);
      expect(bounds.y).toBe(185);
      expect(bounds.width).toBe(30);
      expect(bounds.height).toBe(30);
    });
  });

  describe('Reset Method', () => {
    it('should reset ball to initial configuration', () => {
      // Modify ball state
      ball.position = { x: 100, y: 100 };
      ball.velocity = { x: 50, y: 50 };
      ball.active = false;

      // Reset with new config
      const newConfig: BallConfiguration = {
        ...defaultConfig,
        initialPosition: { x: 200, y: 250 },
        initialSpeed: 300
      };

      ball.reset(newConfig);

      expect(ball.position.x).toBe(200);
      expect(ball.position.y).toBe(250);
      expect(ball.speed).toBe(300);
      expect(ball.active).toBe(true);

      const magnitude = Math.sqrt(ball.velocity.x ** 2 + ball.velocity.y ** 2);
      expect(Math.abs(magnitude - 300)).toBeLessThan(0.001);
    });
  });

  describe('Mathematical Precision', () => {
    it('should maintain velocity magnitude precision over multiple updates', () => {
      const initialSpeed = ball.speed;

      // Update multiple times
      for (let i = 0; i < 100; i++) {
        ball.update(1/60);
        const magnitude = Math.sqrt(ball.velocity.x ** 2 + ball.velocity.y ** 2);
        expect(Math.abs(magnitude - initialSpeed)).toBeLessThan(0.01);
      }
    });

    it('should handle edge case of very small velocity components', () => {
      ball.setVelocity({ x: 0.001, y: 0.001 });

      const magnitude = Math.sqrt(ball.velocity.x ** 2 + ball.velocity.y ** 2);
      expect(magnitude).toBeGreaterThanOrEqual(ball.minSpeed - 0.01); // Allow small precision error
    });
  });
});