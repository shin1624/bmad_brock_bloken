/**
 * Enhanced Paddle physics tests for 90% coverage
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Paddle } from '../Paddle';
import type { PaddleConfiguration } from '@/types/game.types';

describe('Paddle Entity - Enhanced Physics Tests', () => {
  let paddle: Paddle;
  let config: PaddleConfiguration;
  
  beforeEach(() => {
    config = {
      initialWidth: 100,
      initialHeight: 20,
      initialSpeed: 400,
      initialPosition: { x: 400, y: 550 },
      minWidth: 50,
      maxWidth: 200,
      canvasWidth: 800,
      canvasHeight: 600
    };
    paddle = new Paddle(config);
  });
  
  describe('Movement Constraints', () => {
    it('should constrain movement within canvas bounds', () => {
      paddle.position.x = -50;
      paddle.constrainPosition();
      expect(paddle.position.x).toBe(paddle.width / 2);
      
      paddle.position.x = 850;
      paddle.constrainPosition();
      expect(paddle.position.x).toBe(config.canvasWidth - paddle.width / 2);
    });
    
    it('should apply acceleration smoothly', () => {
      paddle.accelerate(1, 0.016); // Right direction
      expect(paddle.velocity.x).toBeGreaterThan(0);
      expect(paddle.velocity.x).toBeLessThanOrEqual(paddle.speed);
    });
    
    it('should apply deceleration with friction', () => {
      paddle.velocity.x = 300;
      paddle.applyFriction(0.016);
      expect(paddle.velocity.x).toBeLessThan(300);
      expect(paddle.velocity.x).toBeGreaterThan(0);
    });
    
    it('should stop completely when velocity is very small', () => {
      paddle.velocity.x = 5; // Very small velocity
      paddle.applyFriction(0.1);
      expect(paddle.velocity.x).toBe(0);
    });
    
    it('should handle instant stop', () => {
      paddle.velocity.x = 400;
      paddle.stop();
      expect(paddle.velocity.x).toBe(0);
    });
  });
  
  describe('Size Modifications', () => {
    it('should apply power-up size increase', () => {
      const originalWidth = paddle.width;
      paddle.applyPowerUp('expand', 1.5);
      expect(paddle.width).toBe(Math.min(originalWidth * 1.5, paddle.maxWidth));
    });
    
    it('should apply power-up size decrease', () => {
      const originalWidth = paddle.width;
      paddle.applyPowerUp('shrink', 0.5);
      expect(paddle.width).toBe(Math.max(originalWidth * 0.5, paddle.minWidth));
    });
    
    it('should animate size changes', () => {
      vi.useFakeTimers();
      const targetWidth = 150;
      paddle.animateSizeChange(targetWidth, 500);
      
      vi.advanceTimersByTime(250);
      paddle.updateAnimation(250);
      
      expect(paddle.width).toBeGreaterThan(100);
      expect(paddle.width).toBeLessThan(150);
      
      vi.advanceTimersByTime(250);
      paddle.updateAnimation(500);
      expect(paddle.width).toBe(150);
      
      vi.useRealTimers();
    });
    
    it('should maintain aspect ratio on size change', () => {
      const originalRatio = paddle.width / paddle.height;
      paddle.setWidth(150);
      const newRatio = paddle.width / paddle.height;
      expect(Math.abs(originalRatio - newRatio)).toBeLessThan(0.1);
    });
  });
  
  describe('Collision Detection', () => {
    it('should calculate correct collision surface', () => {
      const surface = paddle.getCollisionSurface();
      expect(surface).toMatchObject({
        left: paddle.position.x - paddle.width / 2,
        right: paddle.position.x + paddle.width / 2,
        top: paddle.position.y - paddle.height / 2,
        bottom: paddle.position.y + paddle.height / 2
      });
    });
    
    it('should detect ball overlap', () => {
      const ball = {
        position: { x: 400, y: 540 },
        radius: 10
      };
      
      expect(paddle.checkBallOverlap(ball)).toBe(true);
      
      ball.position.y = 500;
      expect(paddle.checkBallOverlap(ball)).toBe(false);
    });
    
    it('should calculate hit position ratio', () => {
      // Hit center
      let ratio = paddle.getHitPositionRatio(400);
      expect(ratio).toBeCloseTo(0, 2);
      
      // Hit left edge
      ratio = paddle.getHitPositionRatio(350);
      expect(ratio).toBeCloseTo(-1, 1);
      
      // Hit right edge
      ratio = paddle.getHitPositionRatio(450);
      expect(ratio).toBeCloseTo(1, 1);
    });
    
    it('should calculate bounce angle based on hit position', () => {
      const centerAngle = paddle.calculateBounceAngle(0);
      expect(centerAngle).toBeCloseTo(Math.PI / 2, 2); // Straight up
      
      const leftAngle = paddle.calculateBounceAngle(-1);
      expect(leftAngle).toBeGreaterThan(Math.PI / 2);
      
      const rightAngle = paddle.calculateBounceAngle(1);
      expect(rightAngle).toBeLessThan(Math.PI / 2);
    });
  });
  
  describe('Input Handling', () => {
    it('should respond to keyboard input', () => {
      paddle.handleKeyDown('ArrowLeft');
      expect(paddle.inputState.left).toBe(true);
      
      paddle.handleKeyUp('ArrowLeft');
      expect(paddle.inputState.left).toBe(false);
    });
    
    it('should respond to touch input', () => {
      paddle.handleTouch(300);
      paddle.update(0.016);
      expect(paddle.velocity.x).toBeLessThan(0); // Moving left
      
      paddle.handleTouch(500);
      paddle.update(0.016);
      expect(paddle.velocity.x).toBeGreaterThan(0); // Moving right
    });
    
    it('should calculate smooth movement to target', () => {
      paddle.setTargetPosition(500);
      const initialX = paddle.position.x;
      
      paddle.moveToTarget(0.016);
      expect(paddle.position.x).toBeGreaterThan(initialX);
      expect(paddle.position.x).toBeLessThan(500);
    });
    
    it('should handle mouse tracking', () => {
      paddle.enableMouseTracking();
      paddle.updateMousePosition(600);
      
      paddle.update(0.016);
      expect(paddle.velocity.x).toBeGreaterThan(0);
    });
  });
  
  describe('Power-up Management', () => {
    it('should track active power-ups', () => {
      vi.useFakeTimers();
      
      paddle.addPowerUp('sticky', 5000);
      expect(paddle.hasPowerUp('sticky')).toBe(true);
      
      vi.advanceTimersByTime(5001);
      paddle.updatePowerUps(5001);
      expect(paddle.hasPowerUp('sticky')).toBe(false);
      
      vi.useRealTimers();
    });
    
    it('should stack multiple power-ups', () => {
      paddle.addPowerUp('speed', 3000);
      paddle.addPowerUp('expand', 3000);
      
      expect(paddle.getActivePowerUps()).toHaveLength(2);
    });
    
    it('should apply combined power-up effects', () => {
      const originalSpeed = paddle.speed;
      const originalWidth = paddle.width;
      
      paddle.addPowerUp('speed', 3000);
      paddle.addPowerUp('expand', 3000);
      paddle.applyPowerUpEffects();
      
      expect(paddle.speed).toBeGreaterThan(originalSpeed);
      expect(paddle.width).toBeGreaterThan(originalWidth);
    });
  });
  
  describe('Special Abilities', () => {
    it('should handle sticky paddle mechanics', () => {
      paddle.enableSticky();
      const ball = { stuck: false };
      
      paddle.catchBall(ball);
      expect(ball.stuck).toBe(true);
      
      paddle.releaseBall(ball);
      expect(ball.stuck).toBe(false);
    });
    
    it('should handle laser shooting', () => {
      paddle.enableLaser();
      const projectiles = paddle.shootLaser();
      
      expect(projectiles).toHaveLength(2); // Dual lasers
      expect(projectiles[0].velocity.y).toBeLessThan(0); // Moving up
    });
    
    it('should handle magnetic effect', () => {
      paddle.enableMagnet();
      const ball = { position: { x: 380, y: 500 } };
      
      const force = paddle.calculateMagneticForce(ball);
      expect(force.x).toBeGreaterThan(0); // Attract to center
    });
  });
  
  describe('Rendering State', () => {
    it('should prepare render data', () => {
      const renderData = paddle.getRenderData();
      
      expect(renderData).toMatchObject({
        x: paddle.position.x,
        y: paddle.position.y,
        width: paddle.width,
        height: paddle.height,
        color: expect.any(String),
        effects: expect.any(Array)
      });
    });
    
    it('should include power-up visual effects', () => {
      paddle.addPowerUp('expand', 1000);
      const renderData = paddle.getRenderData();
      
      expect(renderData.effects).toContainEqual(
        expect.objectContaining({ type: 'expand' })
      );
    });
  });
  
  describe('State Persistence', () => {
    it('should serialize state', () => {
      paddle.velocity.x = 200;
      paddle.addPowerUp('sticky', 3000);
      
      const state = paddle.serialize();
      expect(state).toMatchObject({
        position: paddle.position,
        velocity: paddle.velocity,
        width: paddle.width,
        powerUps: expect.any(Array)
      });
    });
    
    it('should restore from serialized state', () => {
      const state = {
        position: { x: 300, y: 550 },
        velocity: { x: 100, y: 0 },
        width: 120,
        powerUps: [{ type: 'expand', duration: 2000 }]
      };
      
      paddle.deserialize(state);
      
      expect(paddle.position).toEqual(state.position);
      expect(paddle.velocity).toEqual(state.velocity);
      expect(paddle.width).toBe(state.width);
      expect(paddle.getActivePowerUps()).toHaveLength(1);
    });
  });
  
  describe('Performance Optimizations', () => {
    it('should use spatial hashing for collision', () => {
      const hash = paddle.getSpatialHash();
      expect(hash).toMatch(/^\d+,\d+$/);
    });
    
    it('should cache collision bounds', () => {
      const bounds1 = paddle.getCollisionBounds();
      const bounds2 = paddle.getCollisionBounds();
      expect(bounds1).toBe(bounds2); // Same reference
      
      paddle.position.x = 500;
      paddle.invalidateBoundsCache();
      const bounds3 = paddle.getCollisionBounds();
      expect(bounds3).not.toBe(bounds1); // New object
    });
    
    it('should throttle expensive calculations', () => {
      const spy = vi.spyOn(paddle, 'calculateComplexPhysics');
      
      for (let i = 0; i < 10; i++) {
        paddle.update(0.001); // Very small delta
      }
      
      expect(spy).toHaveBeenCalledTimes(1); // Throttled
    });
  });
});