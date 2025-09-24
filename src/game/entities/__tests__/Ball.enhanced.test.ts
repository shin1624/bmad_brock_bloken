/**
 * Enhanced Ball physics tests for 90% coverage
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Ball } from '../Ball';
import type { BallConfiguration } from '@/types/game.types';
import { createMockCanvas } from '@test/mocks/CanvasMockFactory';

describe('Ball Entity - Enhanced Physics Tests', () => {
  let ball: Ball;
  let config: BallConfiguration;
  
  beforeEach(() => {
    config = {
      initialRadius: 10,
      initialSpeed: 200,
      maxSpeed: 500,
      minSpeed: 50,
      initialPosition: { x: 400, y: 300 },
      bounceDamping: 0.95
    };
    ball = new Ball(config);
  });
  
  describe('Advanced Velocity Management', () => {
    it('should handle zero velocity edge case', () => {
      ball.velocity = { x: 0, y: 0 };
      ball.update(0.016);
      
      // Should maintain minimum speed
      const magnitude = Math.sqrt(ball.velocity.x ** 2 + ball.velocity.y ** 2);
      expect(magnitude).toBeGreaterThanOrEqual(ball.minSpeed);
    });
    
    it('should apply damping on reflection', () => {
      const initialSpeed = ball.speed;
      ball.velocity = { x: 100, y: 100 };
      
      ball.reflect({ x: 0, y: 1 }); // Horizontal reflection
      const newSpeed = Math.sqrt(ball.velocity.x ** 2 + ball.velocity.y ** 2);
      
      expect(newSpeed).toBeLessThanOrEqual(initialSpeed * ball.bounceDamping);
    });
    
    it('should handle multiple rapid reflections', () => {
      const normals = [
        { x: 0, y: 1 },  // horizontal
        { x: 1, y: 0 },  // vertical
        { x: 0.707, y: 0.707 } // diagonal
      ];
      
      normals.forEach(normal => {
        ball.reflect(normal);
        // Ball should still be active and within speed limits
        expect(ball.speed).toBeGreaterThanOrEqual(ball.minSpeed);
        expect(ball.speed).toBeLessThanOrEqual(ball.maxSpeed);
      });
    });
    
    it('should maintain velocity direction after speed adjustment', () => {
      ball.velocity = { x: 300, y: 400 }; // Speed = 500
      const initialDirection = Math.atan2(ball.velocity.y, ball.velocity.x);
      
      ball.setSpeed(100);
      const newDirection = Math.atan2(ball.velocity.y, ball.velocity.x);
      
      expect(Math.abs(initialDirection - newDirection)).toBeLessThan(0.001);
    });
  });
  
  describe('Trail System', () => {
    it('should update trail positions', () => {
      const initialPos = { ...ball.position };
      
      ball.updateTrail();
      ball.position = { x: 450, y: 350 };
      ball.updateTrail();
      
      expect(ball.trail.length).toBeGreaterThan(0);
      expect(ball.trail[0]).toEqual(initialPos);
    });
    
    it('should limit trail length', () => {
      // Add many trail points
      for (let i = 0; i < 50; i++) {
        ball.position = { x: 400 + i, y: 300 + i };
        ball.updateTrail();
      }
      
      // Trail should be limited (typically to 20 points)
      expect(ball.trail.length).toBeLessThanOrEqual(20);
    });
    
    it('should clear trail on reset', () => {
      ball.updateTrail();
      ball.updateTrail();
      expect(ball.trail.length).toBeGreaterThan(0);
      
      ball.reset();
      expect(ball.trail.length).toBe(0);
    });
  });
  
  describe('Collision Response', () => {
    it('should calculate correct reflection vector', () => {
      ball.velocity = { x: 100, y: 100 };
      const normal = { x: 0, y: -1 }; // Bottom wall normal
      
      ball.reflect(normal);
      
      // Y velocity should be inverted, X should remain
      expect(ball.velocity.x).toBeCloseTo(100, 1);
      expect(ball.velocity.y).toBeCloseTo(-100 * ball.bounceDamping, 1);
    });
    
    it('should handle corner reflections', () => {
      ball.velocity = { x: 100, y: 100 };
      const cornerNormal = { x: -0.707, y: -0.707 }; // 45-degree corner
      
      ball.reflect(cornerNormal);
      
      // Both components should change
      const oldMagnitude = Math.sqrt(100 * 100 + 100 * 100);
      const newMagnitude = Math.sqrt(ball.velocity.x ** 2 + ball.velocity.y ** 2);
      
      expect(newMagnitude).toBeCloseTo(oldMagnitude * ball.bounceDamping, 1);
    });
    
    it('should prevent tunneling at high speeds', () => {
      ball.velocity = { x: 1000, y: 0 }; // Very high speed
      const deltaTime = 0.016;
      
      const oldPos = { ...ball.position };
      ball.update(deltaTime);
      
      const distance = Math.sqrt(
        Math.pow(ball.position.x - oldPos.x, 2) +
        Math.pow(ball.position.y - oldPos.y, 2)
      );
      
      // Distance should be capped to prevent tunneling
      expect(distance).toBeLessThanOrEqual(ball.maxSpeed * deltaTime * 2);
    });
  });
  
  describe('Power-up Effects', () => {
    it('should apply speed boost', () => {
      const originalSpeed = ball.speed;
      ball.applySpeedBoost(1.5);
      
      expect(ball.speed).toBe(originalSpeed * 1.5);
      expect(ball.speed).toBeLessThanOrEqual(ball.maxSpeed);
    });
    
    it('should apply slow effect', () => {
      const originalSpeed = ball.speed;
      ball.applySpeedBoost(0.5);
      
      expect(ball.speed).toBe(Math.max(originalSpeed * 0.5, ball.minSpeed));
    });
    
    it('should apply size modification', () => {
      const originalRadius = ball.radius;
      ball.setRadius(15);
      
      expect(ball.radius).toBe(15);
      expect(ball.getBounds().width).toBe(30);
      expect(ball.getBounds().height).toBe(30);
    });
    
    it('should handle temporary effects', () => {
      vi.useFakeTimers();
      
      ball.applyTemporaryEffect('speed', 2.0, 1000);
      expect(ball.speed).toBe(config.initialSpeed * 2);
      
      vi.advanceTimersByTime(1001);
      ball.updateEffects();
      
      expect(ball.speed).toBe(config.initialSpeed);
      vi.useRealTimers();
    });
  });
  
  describe('Render State', () => {
    it('should prepare render data correctly', () => {
      const canvas = createMockCanvas();
      const ctx = canvas.getContext('2d');
      
      const renderData = ball.getRenderData();
      
      expect(renderData).toMatchObject({
        x: ball.position.x,
        y: ball.position.y,
        radius: ball.radius,
        color: expect.any(String),
        trail: expect.any(Array),
        active: true
      });
    });
    
    it('should calculate glow effect based on speed', () => {
      ball.setSpeed(ball.maxSpeed);
      const renderData = ball.getRenderData();
      
      expect(renderData.glowIntensity).toBeGreaterThan(0);
      expect(renderData.glowColor).toBeDefined();
    });
  });
  
  describe('Serialization', () => {
    it('should serialize to JSON', () => {
      const serialized = ball.toJSON();
      
      expect(serialized).toMatchObject({
        position: ball.position,
        velocity: ball.velocity,
        radius: ball.radius,
        speed: ball.speed,
        active: ball.active
      });
    });
    
    it('should deserialize from JSON', () => {
      const data = {
        position: { x: 100, y: 200 },
        velocity: { x: 50, y: 50 },
        radius: 15,
        speed: 150,
        active: false
      };
      
      ball.fromJSON(data);
      
      expect(ball.position).toEqual(data.position);
      expect(ball.velocity).toEqual(data.velocity);
      expect(ball.radius).toBe(data.radius);
      expect(ball.active).toBe(data.active);
    });
  });
  
  describe('Performance Optimizations', () => {
    it('should skip updates when inactive', () => {
      ball.active = false;
      const oldPos = { ...ball.position };
      
      ball.update(0.016);
      
      expect(ball.position).toEqual(oldPos);
    });
    
    it('should use squared distance for comparisons', () => {
      const point = { x: 410, y: 310 };
      const distSq = ball.getSquaredDistanceTo(point);
      
      expect(distSq).toBeCloseTo(200, 1); // 10^2 + 10^2
    });
    
    it('should batch position updates', () => {
      const updates = [];
      for (let i = 0; i < 10; i++) {
        updates.push({ x: 400 + i, y: 300 + i });
      }
      
      ball.batchPositionUpdate(updates);
      
      // Should only apply last update
      expect(ball.position).toEqual(updates[updates.length - 1]);
    });
  });
});