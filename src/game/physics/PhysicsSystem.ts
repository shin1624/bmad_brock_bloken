/**
 * Physics system for ball movement and wall collision detection
 * Handles continuous collision detection and response
 */
import { Ball } from '../entities/Ball';
import { Vector2D } from '../../types/game.types';

export interface PhysicsConfig {
  canvasWidth: number;
  canvasHeight: number;
  gravity: number;
  wallBounceThreshold: number;
}

export class PhysicsSystem {
  private config: PhysicsConfig;
  private balls: Ball[] = [];

  constructor(config: PhysicsConfig) {
    this.config = config;
  }

  /**
   * Add ball to physics system
   */
  addBall(ball: Ball): void {
    if (!this.balls.includes(ball)) {
      this.balls.push(ball);
    }
  }

  /**
   * Remove ball from physics system
   */
  removeBall(ball: Ball): void {
    const index = this.balls.indexOf(ball);
    if (index !== -1) {
      this.balls.splice(index, 1);
    }
  }

  /**
   * Update all balls with physics
   */
  update(deltaTime: number): void {
    for (const ball of this.balls) {
      if (!ball.active) continue;
      
      this.updateBallPhysics(ball, deltaTime);
      this.handleWallCollisions(ball);
    }
  }

  /**
   * Update individual ball physics
   */
  private updateBallPhysics(ball: Ball, deltaTime: number): void {
    // Store previous position for continuous collision detection
    const prevPosition = { ...ball.position };
    
    // Apply gravity if configured
    if (this.config.gravity !== 0) {
      ball.velocity.y += this.config.gravity * deltaTime;
    }

    // Update position
    ball.update(deltaTime);

    // Continuous collision detection for fast-moving balls
    if (this.needsContinuousCollisionDetection(ball, prevPosition)) {
      this.handleContinuousCollision(ball, prevPosition);
    }
  }

  /**
   * Handle wall collision detection and response
   */
  private handleWallCollisions(ball: Ball): void {
    const { canvasWidth, canvasHeight } = this.config;
    let collisionOccurred = false;

    // Left wall collision
    if (ball.position.x - ball.radius <= 0) {
      ball.position.x = ball.radius;
      ball.reflect({ x: 1, y: 0 });
      collisionOccurred = true;
    }
    
    // Right wall collision
    else if (ball.position.x + ball.radius >= canvasWidth) {
      ball.position.x = canvasWidth - ball.radius;
      ball.reflect({ x: -1, y: 0 });
      collisionOccurred = true;
    }

    // Top wall collision
    if (ball.position.y - ball.radius <= 0) {
      ball.position.y = ball.radius;
      ball.reflect({ x: 0, y: 1 });
      collisionOccurred = true;
    }
    
    // Bottom wall collision (ball goes out of bounds)
    else if (ball.position.y + ball.radius >= canvasHeight) {
      ball.position.y = canvasHeight - ball.radius;
      ball.reflect({ x: 0, y: -1 });
      collisionOccurred = true;
    }

    // Apply wall bounce threshold check
    if (collisionOccurred && this.config.wallBounceThreshold > 0) {
      this.applyBounceThreshold(ball);
    }
  }

  /**
   * Check if continuous collision detection is needed
   */
  private needsContinuousCollisionDetection(ball: Ball, prevPosition: Vector2D): boolean {
    const distance = Math.sqrt(
      (ball.position.x - prevPosition.x) ** 2 + 
      (ball.position.y - prevPosition.y) ** 2
    );
    
    // If ball moved more than its radius, use CCD
    return distance > ball.radius;
  }

  /**
   * Handle continuous collision detection for fast-moving balls
   */
  private handleContinuousCollision(ball: Ball, prevPosition: Vector2D): void {
    const { canvasWidth, canvasHeight } = this.config;
    
    // Check ray intersection with walls
    const rayStart = prevPosition;
    const rayEnd = ball.position;
    const rayDir = {
      x: rayEnd.x - rayStart.x,
      y: rayEnd.y - rayStart.y
    };

    // Left wall (x = ball.radius)
    if (rayDir.x < 0 && rayStart.x > ball.radius && rayEnd.x - ball.radius < 0) {
      const t = (rayStart.x - ball.radius) / -rayDir.x;
      if (t >= 0 && t <= 1) {
        const intersectY = rayStart.y + t * rayDir.y;
        if (intersectY >= 0 && intersectY <= canvasHeight) {
          ball.position.x = ball.radius;
          ball.position.y = intersectY;
          ball.reflect({ x: 1, y: 0 });
          return;
        }
      }
    }

    // Right wall (x = canvasWidth - ball.radius)
    if (rayDir.x > 0 && rayStart.x < canvasWidth - ball.radius && rayEnd.x + ball.radius > canvasWidth) {
      const t = (canvasWidth - ball.radius - rayStart.x) / rayDir.x;
      if (t >= 0 && t <= 1) {
        const intersectY = rayStart.y + t * rayDir.y;
        if (intersectY >= 0 && intersectY <= canvasHeight) {
          ball.position.x = canvasWidth - ball.radius;
          ball.position.y = intersectY;
          ball.reflect({ x: -1, y: 0 });
          return;
        }
      }
    }

    // Top wall (y = ball.radius)
    if (rayDir.y < 0 && rayStart.y > ball.radius && rayEnd.y - ball.radius < 0) {
      const t = (rayStart.y - ball.radius) / -rayDir.y;
      if (t >= 0 && t <= 1) {
        const intersectX = rayStart.x + t * rayDir.x;
        if (intersectX >= 0 && intersectX <= canvasWidth) {
          ball.position.x = intersectX;
          ball.position.y = ball.radius;
          ball.reflect({ x: 0, y: 1 });
          return;
        }
      }
    }

    // Bottom wall (y = canvasHeight - ball.radius)
    if (rayDir.y > 0 && rayStart.y < canvasHeight - ball.radius && rayEnd.y + ball.radius > canvasHeight) {
      const t = (canvasHeight - ball.radius - rayStart.y) / rayDir.y;
      if (t >= 0 && t <= 1) {
        const intersectX = rayStart.x + t * rayDir.x;
        if (intersectX >= 0 && intersectX <= canvasWidth) {
          ball.position.x = intersectX;
          ball.position.y = canvasHeight - ball.radius;
          ball.reflect({ x: 0, y: -1 });
          return;
        }
      }
    }
  }

  /**
   * Apply minimum bounce threshold to prevent slow bouncing
   */
  private applyBounceThreshold(ball: Ball): void {
    const speed = Math.sqrt(ball.velocity.x ** 2 + ball.velocity.y ** 2);
    
    if (speed < this.config.wallBounceThreshold) {
      // Boost velocity to minimum threshold
      const scale = this.config.wallBounceThreshold / speed;
      ball.velocity.x *= scale;
      ball.velocity.y *= scale;
    }
  }

  /**
   * Update physics configuration
   */
  updateConfig(config: Partial<PhysicsConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get all balls managed by physics system
   */
  getBalls(): readonly Ball[] {
    return [...this.balls];
  }

  /**
   * Clear all balls from physics system
   */
  clear(): void {
    this.balls.length = 0;
  }

  /**
   * Check if ball is out of bounds (bottom wall)
   */
  isBallOutOfBounds(ball: Ball): boolean {
    return ball.position.y + ball.radius > this.config.canvasHeight;
  }
}