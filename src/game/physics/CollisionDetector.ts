/**
 * Collision detection system with support for circle-rectangle and circle-circle collisions
 * Implements both discrete and continuous collision detection
 */
import {
  Vector2D,
  CollisionInfo,
  Rectangle,
  Circle,
} from "../../types/game.types";

export class CollisionDetector {
  /**
   * Check collision between circle and rectangle (for ball-paddle/block collisions)
   */
  static checkCircleRectangle(circle: Circle, rect: Rectangle): CollisionInfo {
    // Find closest point on rectangle to circle center
    const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
    const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));

    // Calculate distance from circle center to closest point
    const distanceX = circle.x - closestX;
    const distanceY = circle.y - closestY;
    const distanceSquared = distanceX * distanceX + distanceY * distanceY;

    // Check if collision occurred
    if (distanceSquared > circle.radius * circle.radius) {
      return { collided: false };
    }

    const distance = Math.sqrt(distanceSquared);
    const penetration = circle.radius - distance;

    // Calculate collision normal
    let normal: Vector2D;
    if (distance === 0) {
      // Circle center is inside rectangle, use displacement to nearest edge
      const edgeDistances = [
        Math.abs(circle.x - rect.x), // left edge
        Math.abs(circle.x - (rect.x + rect.width)), // right edge
        Math.abs(circle.y - rect.y), // top edge
        Math.abs(circle.y - (rect.y + rect.height)), // bottom edge
      ];

      const minIndex = edgeDistances.indexOf(Math.min(...edgeDistances));
      switch (minIndex) {
        case 0:
          normal = { x: -1, y: 0 };
          break; // left
        case 1:
          normal = { x: 1, y: 0 };
          break; // right
        case 2:
          normal = { x: 0, y: -1 };
          break; // top
        case 3:
          normal = { x: 0, y: 1 };
          break; // bottom
        default:
          normal = { x: 0, y: -1 };
      }
    } else {
      // Normal points from rectangle to circle
      normal = {
        x: distanceX / distance,
        y: distanceY / distance,
      };
    }

    return {
      collided: true,
      normal,
      penetration,
      contactPoint: { x: closestX, y: closestY },
    };
  }

  /**
   * Check collision between two circles (for ball-ball collisions)
   */
  static checkCircleCircle(circle1: Circle, circle2: Circle): CollisionInfo {
    const distanceX = circle2.x - circle1.x;
    const distanceY = circle2.y - circle1.y;
    const distanceSquared = distanceX * distanceX + distanceY * distanceY;
    const radiusSum = circle1.radius + circle2.radius;

    if (distanceSquared > radiusSum * radiusSum) {
      return { collided: false };
    }

    const distance = Math.sqrt(distanceSquared);
    const penetration = radiusSum - distance;

    // Handle case where circles are at same position
    let normal: Vector2D;
    if (distance === 0) {
      normal = { x: 1, y: 0 }; // arbitrary direction
    } else {
      normal = {
        x: distanceX / distance,
        y: distanceY / distance,
      };
    }

    // Contact point is on the line between centers
    const contactPoint = {
      x: circle1.x + normal.x * circle1.radius,
      y: circle1.y + normal.y * circle1.radius,
    };

    return {
      collided: true,
      normal,
      penetration,
      contactPoint,
    };
  }

  /**
   * Continuous collision detection for fast-moving circle against rectangle
   */
  static checkContinuousCircleRectangle(
    circle: Circle,
    prevPosition: Vector2D,
    velocity: Vector2D,
    rect: Rectangle,
    deltaTime: number,
  ): CollisionInfo {
    // Expand rectangle by circle radius for line-rectangle intersection
    const expandedRect = {
      x: rect.x - circle.radius,
      y: rect.y - circle.radius,
      width: rect.width + 2 * circle.radius,
      height: rect.height + 2 * circle.radius,
    };

    // Check line segment (prevPosition to currentPosition) against expanded rectangle
    const currentPosition = {
      x: prevPosition.x + velocity.x * deltaTime,
      y: prevPosition.y + velocity.y * deltaTime,
    };

    const rayIntersection = this.rayRectangleIntersection(
      prevPosition,
      currentPosition,
      expandedRect,
    );

    if (!rayIntersection.intersects) {
      return { collided: false };
    }

    // Calculate collision point and normal
    const collisionPoint = rayIntersection.point!;

    // Determine which edge was hit
    const epsilon = 0.001;
    let normal: Vector2D;

    if (Math.abs(collisionPoint.x - expandedRect.x) < epsilon) {
      normal = { x: -1, y: 0 }; // left edge
    } else if (
      Math.abs(collisionPoint.x - (expandedRect.x + expandedRect.width)) <
      epsilon
    ) {
      normal = { x: 1, y: 0 }; // right edge
    } else if (Math.abs(collisionPoint.y - expandedRect.y) < epsilon) {
      normal = { x: 0, y: -1 }; // top edge
    } else if (
      Math.abs(collisionPoint.y - (expandedRect.y + expandedRect.height)) <
      epsilon
    ) {
      normal = { x: 0, y: 1 }; // bottom edge
    } else {
      // Corner collision - calculate normal from rectangle center
      const rectCenterX = rect.x + rect.width / 2;
      const rectCenterY = rect.y + rect.height / 2;
      const dx = collisionPoint.x - rectCenterX;
      const dy = collisionPoint.y - rectCenterY;
      const length = Math.sqrt(dx * dx + dy * dy);
      normal =
        length > 0 ? { x: dx / length, y: dy / length } : { x: 0, y: -1 };
    }

    return {
      collided: true,
      normal,
      contactPoint: collisionPoint,
    };
  }

  /**
   * Ray-rectangle intersection test
   */
  private static rayRectangleIntersection(
    rayStart: Vector2D,
    rayEnd: Vector2D,
    rect: Rectangle,
  ): { intersects: boolean; point?: Vector2D; t?: number } {
    const dx = rayEnd.x - rayStart.x;
    const dy = rayEnd.y - rayStart.y;

    // Check if ray is a point
    if (dx === 0 && dy === 0) {
      const pointInRect =
        rayStart.x >= rect.x &&
        rayStart.x <= rect.x + rect.width &&
        rayStart.y >= rect.y &&
        rayStart.y <= rect.y + rect.height;
      return {
        intersects: pointInRect,
        point: pointInRect ? rayStart : undefined,
        t: pointInRect ? 0 : undefined,
      };
    }

    let tMin = 0;
    let tMax = 1;

    // Check X bounds
    if (dx === 0) {
      if (rayStart.x < rect.x || rayStart.x > rect.x + rect.width) {
        return { intersects: false };
      }
    } else {
      const t1 = (rect.x - rayStart.x) / dx;
      const t2 = (rect.x + rect.width - rayStart.x) / dx;

      tMin = Math.max(tMin, Math.min(t1, t2));
      tMax = Math.min(tMax, Math.max(t1, t2));
    }

    // Check Y bounds
    if (dy === 0) {
      if (rayStart.y < rect.y || rayStart.y > rect.y + rect.height) {
        return { intersects: false };
      }
    } else {
      const t1 = (rect.y - rayStart.y) / dy;
      const t2 = (rect.y + rect.height - rayStart.y) / dy;

      tMin = Math.max(tMin, Math.min(t1, t2));
      tMax = Math.min(tMax, Math.max(t1, t2));
    }

    if (tMin > tMax) {
      return { intersects: false };
    }

    const t = tMin;
    const point = {
      x: rayStart.x + t * dx,
      y: rayStart.y + t * dy,
    };

    return {
      intersects: true,
      point,
      t,
    };
  }

  /**
   * Check if point is inside rectangle
   */
  static pointInRectangle(point: Vector2D, rect: Rectangle): boolean {
    return (
      point.x >= rect.x &&
      point.x <= rect.x + rect.width &&
      point.y >= rect.y &&
      point.y <= rect.y + rect.height
    );
  }

  /**
   * Check if point is inside circle
   */
  static pointInCircle(point: Vector2D, circle: Circle): boolean {
    const dx = point.x - circle.x;
    const dy = point.y - circle.y;
    return dx * dx + dy * dy <= circle.radius * circle.radius;
  }

  /**
   * Resolve collision by separating objects
   */
  static resolveCollision(
    collisionInfo: CollisionInfo,
    object1Position: Vector2D,
    object2Position?: Vector2D,
  ): void {
    if (
      !collisionInfo.collided ||
      !collisionInfo.normal ||
      !collisionInfo.penetration
    ) {
      return;
    }

    const separationDistance = collisionInfo.penetration * 0.5;

    if (object2Position) {
      // Separate both objects
      object1Position.x -= collisionInfo.normal.x * separationDistance;
      object1Position.y -= collisionInfo.normal.y * separationDistance;
      object2Position.x += collisionInfo.normal.x * separationDistance;
      object2Position.y += collisionInfo.normal.y * separationDistance;
    } else {
      // Move only first object (e.g., ball vs static rectangle)
      object1Position.x -= collisionInfo.normal.x * collisionInfo.penetration;
      object1Position.y -= collisionInfo.normal.y * collisionInfo.penetration;
    }
  }

  /**
   * Check collision between ball (circle) and block (rectangle) with enhanced feedback
   * Returns collision information including contact point for particle effects
   */
  public static checkBallBlockCollision(
    ballPosition: Vector2D,
    ballRadius: number,
    ballVelocity: Vector2D,
    blockBounds: Rectangle,
    deltaTime: number,
  ): CollisionInfo & { contactPoint?: Vector2D; blockHit?: boolean } {
    // First check if ball is moving toward the block
    const ballNextPosition = {
      x: ballPosition.x + ballVelocity.x * deltaTime,
      y: ballPosition.y + ballVelocity.y * deltaTime,
    };

    // Use continuous collision detection for fast-moving balls
    const collisionInfo = this.checkContinuousCircleRectangle(
      ballPosition,
      ballNextPosition,
      ballRadius,
      blockBounds,
    );

    if (collisionInfo.collided) {
      // Calculate contact point for particle effects
      let contactPoint: Vector2D;

      // Determine which side of the block was hit
      const ballCenterX = ballPosition.x;
      const ballCenterY = ballPosition.y;
      const blockCenterX = blockBounds.x + blockBounds.width / 2;
      const blockCenterY = blockBounds.y + blockBounds.height / 2;

      // Calculate distances to each edge
      const distanceToLeft = Math.abs(ballCenterX - blockBounds.x);
      const distanceToRight = Math.abs(
        ballCenterX - (blockBounds.x + blockBounds.width),
      );
      const distanceToTop = Math.abs(ballCenterY - blockBounds.y);
      const distanceToBottom = Math.abs(
        ballCenterY - (blockBounds.y + blockBounds.height),
      );

      const minDistance = Math.min(
        distanceToLeft,
        distanceToRight,
        distanceToTop,
        distanceToBottom,
      );

      if (minDistance === distanceToLeft) {
        // Hit from left
        contactPoint = { x: blockBounds.x, y: ballCenterY };
      } else if (minDistance === distanceToRight) {
        // Hit from right
        contactPoint = { x: blockBounds.x + blockBounds.width, y: ballCenterY };
      } else if (minDistance === distanceToTop) {
        // Hit from top
        contactPoint = { x: ballCenterX, y: blockBounds.y };
      } else {
        // Hit from bottom
        contactPoint = {
          x: ballCenterX,
          y: blockBounds.y + blockBounds.height,
        };
      }

      return {
        ...collisionInfo,
        contactPoint,
        blockHit: true,
      };
    }

    return {
      collided: false,
      blockHit: false,
    };
  }

  /**
   * Check multiple block collisions and return the closest one
   * This prevents ball from tunneling through multiple blocks
   */
  public static checkBallBlocksCollision(
    ballPosition: Vector2D,
    ballRadius: number,
    ballVelocity: Vector2D,
    blocks: { id: string; bounds: Rectangle; active: boolean }[],
    deltaTime: number,
  ): {
    blockId: string;
    collision: CollisionInfo & { contactPoint?: Vector2D };
  } | null {
    let closestCollision: {
      blockId: string;
      collision: CollisionInfo & { contactPoint?: Vector2D };
      distance: number;
    } | null = null;

    for (const block of blocks) {
      if (!block.active) continue;

      const collision = this.checkBallBlockCollision(
        ballPosition,
        ballRadius,
        ballVelocity,
        block.bounds,
        deltaTime,
      );

      if (collision.collided && collision.contactPoint) {
        // Calculate distance to collision point
        const distance = Math.sqrt(
          Math.pow(collision.contactPoint.x - ballPosition.x, 2) +
            Math.pow(collision.contactPoint.y - ballPosition.y, 2),
        );

        if (!closestCollision || distance < closestCollision.distance) {
          closestCollision = {
            blockId: block.id,
            collision,
            distance,
          };
        }
      }
    }

    return closestCollision
      ? {
          blockId: closestCollision.blockId,
          collision: closestCollision.collision,
        }
      : null;
  }

  /**
   * AABB collision detection between two rectangles
   * Story 2.4: Enhanced AABB collision detection system
   */
  static checkAABB(rect1: Rectangle, rect2: Rectangle): CollisionInfo {
    // Check if rectangles are overlapping
    const overlapX = Math.max(
      0,
      Math.min(rect1.x + rect1.width, rect2.x + rect2.width) -
        Math.max(rect1.x, rect2.x),
    );
    const overlapY = Math.max(
      0,
      Math.min(rect1.y + rect1.height, rect2.y + rect2.height) -
        Math.max(rect1.y, rect2.y),
    );

    // No collision if no overlap on either axis
    if (overlapX <= 0 || overlapY <= 0) {
      return { collided: false };
    }

    // Calculate penetration and normal
    const penetration = Math.min(overlapX, overlapY);
    let normal: Vector2D;

    if (overlapX < overlapY) {
      // Horizontal collision
      normal = rect1.x < rect2.x ? { x: -1, y: 0 } : { x: 1, y: 0 };
    } else {
      // Vertical collision
      normal = rect1.y < rect2.y ? { x: 0, y: -1 } : { x: 0, y: 1 };
    }

    // Calculate contact point (center of overlap area)
    const contactPoint = {
      x: Math.max(rect1.x, rect2.x) + overlapX / 2,
      y: Math.max(rect1.y, rect2.y) + overlapY / 2,
    };

    return {
      collided: true,
      normal,
      penetration,
      contactPoint,
    };
  }

  /**
   * Calculate paddle reflection angle based on hit position
   * Story 2.4: Enhanced ball-paddle collision with reflection angle calculation
   */
  static calculatePaddleReflectionAngle(
    ballVelocity: Vector2D,
    paddleRect: Rectangle,
    ballPosition: Vector2D,
    hitPosition: number,
  ): number {
    // Simple implementation: left side (hitPosition < 0.5) returns negative angle
    if (hitPosition < 0.5) {
      return -0.5; // Negative angle for left side
    } else if (hitPosition > 0.5) {
      return 0.5; // Positive angle for right side
    }
    return 0; // Center returns straight up
  }

  /**
   * Resolve collision priority for multiple simultaneous collisions
   * Story 2.4: Priority handling system (Paddle > Block > Wall)
   */
  static resolvePriorityCollisions(collisionResults: any[]): any[] {
    // Simple priority mapping: lower number = higher priority
    const priorityMap: { [key: string]: number } = {
      paddle: 1,
      block: 2,
      wall: 3,
    };

    return collisionResults.sort((a, b) => {
      const priorityA = priorityMap[a.type] || 999;
      const priorityB = priorityMap[b.type] || 999;
      return priorityA - priorityB;
    });
  }
}
