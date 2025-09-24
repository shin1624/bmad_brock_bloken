/**
 * Collision Resolution Algorithm Tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { CollisionResolver } from '../CollisionResolver';
import { createMockBall, createMockPaddle, createMockBlock } from '@test/fixtures/gameData';
import type { Ball, Paddle, Block } from '@/game/entities';

describe('CollisionResolver - Resolution Algorithms', () => {
  let resolver: CollisionResolver;
  let ball: Ball;
  let paddle: Paddle;
  let block: Block;
  
  beforeEach(() => {
    resolver = new CollisionResolver();
    ball = createMockBall();
    paddle = createMockPaddle();
    block = createMockBlock();
  });
  
  describe('Ball-Paddle Collision Resolution', () => {
    it('should resolve perfect center collision', () => {
      ball.position = { x: 400, y: 540 };
      ball.velocity = { x: 0, y: 100 };
      paddle.position = { x: 400, y: 550 };
      
      const result = resolver.resolveBallPaddleCollision(ball, paddle);
      
      expect(result.reflected).toBe(true);
      expect(ball.velocity.y).toBeLessThan(0); // Bounced upward
      expect(Math.abs(ball.velocity.x)).toBeLessThan(10); // Minimal X change
    });
    
    it('should apply spin based on paddle edge hit', () => {
      ball.position = { x: 350, y: 540 }; // Left edge
      ball.velocity = { x: 0, y: 100 };
      paddle.position = { x: 400, y: 550 };
      
      resolver.resolveBallPaddleCollision(ball, paddle);
      
      expect(ball.velocity.x).toBeLessThan(-50); // Spin to left
      expect(ball.velocity.y).toBeLessThan(0);
    });
    
    it('should handle moving paddle transfer momentum', () => {
      ball.velocity = { x: 0, y: 100 };
      paddle.velocity = { x: 200, y: 0 }; // Moving right
      
      const initialBallVx = ball.velocity.x;
      resolver.resolveBallPaddleCollision(ball, paddle);
      
      expect(ball.velocity.x).toBeGreaterThan(initialBallVx);
    });
    
    it('should prevent multiple collisions in same frame', () => {
      ball.position = { x: 400, y: 545 };
      
      resolver.resolveBallPaddleCollision(ball, paddle);
      const firstVelocity = { ...ball.velocity };
      
      resolver.resolveBallPaddleCollision(ball, paddle);
      expect(ball.velocity).toEqual(firstVelocity); // No change
    });
  });
  
  describe('Ball-Block Collision Resolution', () => {
    it('should resolve horizontal surface collision', () => {
      ball.position = { x: 80, y: 40 }; // Above block
      ball.velocity = { x: 0, y: 100 };
      block.position = { x: 80, y: 60 };
      
      const result = resolver.resolveBallBlockCollision(ball, block);
      
      expect(result.side).toBe('top');
      expect(ball.velocity.y).toBeLessThan(0);
      expect(block.health).toBe(0); // Damaged
    });
    
    it('should resolve vertical surface collision', () => {
      ball.position = { x: 20, y: 60 }; // Left of block
      ball.velocity = { x: 100, y: 0 };
      block.position = { x: 80, y: 60 };
      
      const result = resolver.resolveBallBlockCollision(ball, block);
      
      expect(result.side).toBe('left');
      expect(ball.velocity.x).toBeLessThan(0);
    });
    
    it('should handle corner collisions', () => {
      ball.position = { x: 45, y: 45 }; // Near corner
      ball.velocity = { x: 50, y: 50 };
      block.position = { x: 80, y: 60 };
      
      const result = resolver.resolveBallBlockCollision(ball, block);
      
      expect(result.corner).toBe(true);
      // Both velocity components should change
      expect(ball.velocity.x * 50).toBeLessThan(0); // Sign changed
      expect(ball.velocity.y * 50).toBeLessThan(0); // Sign changed
    });
    
    it('should apply correct damage to block', () => {
      block.health = 3;
      resolver.resolveBallBlockCollision(ball, block);
      
      expect(block.health).toBe(2);
      expect(block.active).toBe(true);
      
      resolver.resolveBallBlockCollision(ball, block);
      resolver.resolveBallBlockCollision(ball, block);
      
      expect(block.health).toBe(0);
      expect(block.active).toBe(false);
    });
    
    it('should handle indestructible blocks', () => {
      block.destructible = false;
      block.health = Infinity;
      
      resolver.resolveBallBlockCollision(ball, block);
      
      expect(block.health).toBe(Infinity);
      expect(block.active).toBe(true);
      expect(ball.velocity.y).toBeLessThan(0); // Still bounces
    });
  });
  
  describe('Ball-Wall Collision Resolution', () => {
    it('should resolve left wall collision', () => {
      ball.position = { x: 5, y: 300 };
      ball.velocity = { x: -100, y: 50 };
      
      resolver.resolveBallWallCollision(ball, 800, 600);
      
      expect(ball.velocity.x).toBeGreaterThan(0);
      expect(ball.position.x).toBeGreaterThanOrEqual(ball.radius);
    });
    
    it('should resolve right wall collision', () => {
      ball.position = { x: 795, y: 300 };
      ball.velocity = { x: 100, y: 50 };
      
      resolver.resolveBallWallCollision(ball, 800, 600);
      
      expect(ball.velocity.x).toBeLessThan(0);
      expect(ball.position.x).toBeLessThanOrEqual(800 - ball.radius);
    });
    
    it('should resolve ceiling collision', () => {
      ball.position = { x: 400, y: 5 };
      ball.velocity = { x: 50, y: -100 };
      
      resolver.resolveBallWallCollision(ball, 800, 600);
      
      expect(ball.velocity.y).toBeGreaterThan(0);
      expect(ball.position.y).toBeGreaterThanOrEqual(ball.radius);
    });
    
    it('should not resolve floor collision (ball lost)', () => {
      ball.position = { x: 400, y: 595 };
      ball.velocity = { x: 50, y: 100 };
      
      const result = resolver.resolveBallWallCollision(ball, 800, 600);
      
      expect(result.lost).toBe(true);
      expect(ball.velocity.y).toBe(100); // Unchanged
    });
  });
  
  describe('Multi-Collision Resolution', () => {
    it('should resolve simultaneous collisions in order', () => {
      const blocks = [
        createMockBlock({ position: { x: 100, y: 100 } }),
        createMockBlock({ position: { x: 160, y: 100 } })
      ];
      
      ball.position = { x: 130, y: 90 };
      ball.velocity = { x: 0, y: 100 };
      
      const results = resolver.resolveMultipleCollisions(ball, blocks);
      
      expect(results.length).toBe(2);
      expect(blocks[0].health).toBe(0);
      expect(blocks[1].health).toBe(0);
    });
    
    it('should handle collision priority correctly', () => {
      const collisions = [
        { entity: paddle, distance: 10, priority: 1 },
        { entity: block, distance: 5, priority: 2 }
      ];
      
      const sorted = resolver.sortCollisionsByPriority(collisions);
      
      expect(sorted[0].entity).toBe(block); // Closer = higher priority
    });
    
    it('should prevent tunneling through thin objects', () => {
      ball.velocity = { x: 500, y: 0 }; // Very fast
      block.width = 10; // Thin block
      
      const penetration = resolver.calculatePenetrationDepth(ball, block);
      resolver.resolvePenetration(ball, block, penetration);
      
      // Ball should be pushed out
      expect(ball.position.x).toBeLessThan(block.position.x - block.width/2 - ball.radius);
    });
  });
  
  describe('Advanced Physics', () => {
    it('should apply correct restitution coefficient', () => {
      const initialSpeed = Math.sqrt(ball.velocity.x ** 2 + ball.velocity.y ** 2);
      
      resolver.applyRestitution(ball, 0.8);
      
      const finalSpeed = Math.sqrt(ball.velocity.x ** 2 + ball.velocity.y ** 2);
      expect(finalSpeed).toBeCloseTo(initialSpeed * 0.8, 1);
    });
    
    it('should calculate collision response with mass', () => {
      const ball2 = createMockBall();
      ball2.mass = 2; // Heavier
      
      resolver.resolveBallBallCollision(ball, ball2);
      
      // Lighter ball should have more velocity change
      expect(Math.abs(ball.velocity.x)).toBeGreaterThan(Math.abs(ball2.velocity.x));
    });
    
    it('should apply friction on glancing collisions', () => {
      ball.velocity = { x: 100, y: 10 }; // Nearly parallel
      
      resolver.applyFriction(ball, 0.5);
      
      expect(ball.velocity.x).toBeLessThan(100);
    });
    
    it('should conserve momentum in elastic collisions', () => {
      const ball2 = createMockBall({ position: { x: 420, y: 300 } });
      ball.velocity = { x: 100, y: 0 };
      ball2.velocity = { x: -50, y: 0 };
      
      const totalMomentumBefore = 
        ball.velocity.x * ball.mass + ball2.velocity.x * ball2.mass;
      
      resolver.resolveBallBallCollision(ball, ball2);
      
      const totalMomentumAfter = 
        ball.velocity.x * ball.mass + ball2.velocity.x * ball2.mass;
      
      expect(totalMomentumAfter).toBeCloseTo(totalMomentumBefore, 1);
    });
  });
  
  describe('Continuous Collision Detection', () => {
    it('should detect fast moving object collisions', () => {
      ball.position = { x: 100, y: 300 };
      ball.velocity = { x: 1000, y: 0 }; // Would skip past block
      block.position = { x: 400, y: 300 };
      
      const collision = resolver.continuousCollisionDetection(
        ball, 
        { x: 100, y: 300 }, // Start
        { x: 600, y: 300 }, // End (would pass through)
        block
      );
      
      expect(collision).toBe(true);
      expect(ball.position.x).toBeLessThan(block.position.x);
    });
    
    it('should calculate time of impact', () => {
      const toi = resolver.calculateTimeOfImpact(
        ball,
        { x: 100, y: 300 },
        { x: 500, y: 300 },
        block
      );
      
      expect(toi).toBeGreaterThan(0);
      expect(toi).toBeLessThan(1);
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle zero velocity collisions', () => {
      ball.velocity = { x: 0, y: 0 };
      
      expect(() => {
        resolver.resolveBallBlockCollision(ball, block);
      }).not.toThrow();
    });
    
    it('should handle overlapping entities at spawn', () => {
      ball.position = block.position; // Same position
      
      resolver.separateOverlappingEntities(ball, block);
      
      const distance = Math.sqrt(
        Math.pow(ball.position.x - block.position.x, 2) +
        Math.pow(ball.position.y - block.position.y, 2)
      );
      
      expect(distance).toBeGreaterThan(0);
    });
    
    it('should handle NaN values gracefully', () => {
      ball.velocity = { x: NaN, y: 100 };
      
      resolver.sanitizeVelocity(ball);
      
      expect(ball.velocity.x).toBe(0);
      expect(ball.velocity.y).toBe(100);
    });
    
    it('should limit maximum velocity after collision', () => {
      ball.velocity = { x: 2000, y: 2000 };
      
      resolver.clampVelocity(ball);
      
      const speed = Math.sqrt(ball.velocity.x ** 2 + ball.velocity.y ** 2);
      expect(speed).toBeLessThanOrEqual(ball.maxSpeed);
    });
  });
});