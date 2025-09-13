/**
 * Unit tests for CollisionDetector
 */
import { describe, it, expect } from "vitest";
import { CollisionDetector } from "../CollisionDetector";
import { Circle, Rectangle, Vector2D } from "../../../types/game.types";

describe("CollisionDetector", () => {
  describe("Circle-Rectangle Collision", () => {
    const rect: Rectangle = { x: 100, y: 100, width: 200, height: 100 };

    it("should detect collision when circle overlaps rectangle", () => {
      const circle: Circle = { x: 150, y: 120, radius: 30 };
      const result = CollisionDetector.checkCircleRectangle(circle, rect);

      expect(result.collided).toBe(true);
      expect(result.normal).toBeDefined();
      expect(result.penetration).toBeGreaterThan(0);
      expect(result.contactPoint).toBeDefined();
    });

    it("should not detect collision when circle is far from rectangle", () => {
      const circle: Circle = { x: 50, y: 50, radius: 10 };
      const result = CollisionDetector.checkCircleRectangle(circle, rect);

      expect(result.collided).toBe(false);
      expect(result.normal).toBeUndefined();
      expect(result.penetration).toBeUndefined();
    });

    it("should detect collision when circle touches rectangle edge", () => {
      const circle: Circle = { x: 90, y: 150, radius: 10 }; // Touching left edge
      const result = CollisionDetector.checkCircleRectangle(circle, rect);

      expect(result.collided).toBe(true);
      expect(result.normal?.x).toBeCloseTo(-1);
      expect(result.normal?.y).toBeCloseTo(0);
    });

    it("should calculate correct normal for top collision", () => {
      const circle: Circle = { x: 200, y: 90, radius: 15 }; // Above rectangle
      const result = CollisionDetector.checkCircleRectangle(circle, rect);

      expect(result.collided).toBe(true);
      expect(result.normal?.x).toBeCloseTo(0);
      expect(result.normal?.y).toBeCloseTo(-1);
    });

    it("should calculate correct normal for right collision", () => {
      const circle: Circle = { x: 310, y: 150, radius: 15 }; // Right of rectangle
      const result = CollisionDetector.checkCircleRectangle(circle, rect);

      expect(result.collided).toBe(true);
      expect(result.normal?.x).toBeCloseTo(1);
      expect(result.normal?.y).toBeCloseTo(0);
    });

    it("should calculate correct normal for bottom collision", () => {
      const circle: Circle = { x: 200, y: 210, radius: 15 }; // Below rectangle
      const result = CollisionDetector.checkCircleRectangle(circle, rect);

      expect(result.collided).toBe(true);
      expect(result.normal?.x).toBeCloseTo(0);
      expect(result.normal?.y).toBeCloseTo(1);
    });

    it("should handle circle center inside rectangle", () => {
      const circle: Circle = { x: 200, y: 150, radius: 10 }; // Center inside
      const result = CollisionDetector.checkCircleRectangle(circle, rect);

      expect(result.collided).toBe(true);
      expect(result.normal).toBeDefined();
      expect(result.penetration).toBeGreaterThan(0);
    });

    it("should handle corner collision correctly", () => {
      const circle: Circle = { x: 90, y: 90, radius: 15 }; // Near top-left corner
      const result = CollisionDetector.checkCircleRectangle(circle, rect);

      expect(result.collided).toBe(true);
      expect(result.normal).toBeDefined();
      expect(Math.abs(result.normal!.x)).toBeGreaterThan(0);
      expect(Math.abs(result.normal!.y)).toBeGreaterThan(0);
    });
  });

  describe("Circle-Circle Collision", () => {
    it("should detect collision when circles overlap", () => {
      const circle1: Circle = { x: 100, y: 100, radius: 20 };
      const circle2: Circle = { x: 130, y: 100, radius: 20 };
      const result = CollisionDetector.checkCircleCircle(circle1, circle2);

      expect(result.collided).toBe(true);
      expect(result.normal).toBeDefined();
      expect(result.penetration).toBeGreaterThan(0);
      expect(result.contactPoint).toBeDefined();
    });

    it("should not detect collision when circles are apart", () => {
      const circle1: Circle = { x: 100, y: 100, radius: 20 };
      const circle2: Circle = { x: 200, y: 100, radius: 20 };
      const result = CollisionDetector.checkCircleCircle(circle1, circle2);

      expect(result.collided).toBe(false);
    });

    it("should detect collision when circles just touch", () => {
      const circle1: Circle = { x: 100, y: 100, radius: 20 };
      const circle2: Circle = { x: 140, y: 100, radius: 20 };
      const result = CollisionDetector.checkCircleCircle(circle1, circle2);

      expect(result.collided).toBe(true);
      expect(result.penetration).toBeCloseTo(0, 1);
    });

    it("should calculate correct normal direction", () => {
      const circle1: Circle = { x: 100, y: 100, radius: 20 };
      const circle2: Circle = { x: 130, y: 100, radius: 20 };
      const result = CollisionDetector.checkCircleCircle(circle1, circle2);

      expect(result.normal?.x).toBeCloseTo(1);
      expect(result.normal?.y).toBeCloseTo(0);
    });

    it("should handle circles at same position", () => {
      const circle1: Circle = { x: 100, y: 100, radius: 20 };
      const circle2: Circle = { x: 100, y: 100, radius: 20 };
      const result = CollisionDetector.checkCircleCircle(circle1, circle2);

      expect(result.collided).toBe(true);
      expect(result.normal).toBeDefined();
      expect(result.penetration).toBe(40); // sum of radii
    });

    it("should calculate correct contact point", () => {
      const circle1: Circle = { x: 100, y: 100, radius: 20 };
      const circle2: Circle = { x: 130, y: 100, radius: 15 };
      const result = CollisionDetector.checkCircleCircle(circle1, circle2);

      expect(result.contactPoint?.x).toBeCloseTo(120);
      expect(result.contactPoint?.y).toBeCloseTo(100);
    });
  });

  describe("Continuous Collision Detection", () => {
    const rect: Rectangle = { x: 200, y: 200, width: 100, height: 100 };

    it("should detect collision when fast circle passes through rectangle", () => {
      const circle: Circle = { x: 0, y: 0, radius: 10 };
      const prevPosition: Vector2D = { x: 100, y: 250 };
      const velocity: Vector2D = { x: 15000, y: 0 }; // Much faster to cross expanded rect
      const deltaTime = 1 / 60;

      const result = CollisionDetector.checkContinuousCircleRectangle(
        circle,
        prevPosition,
        velocity,
        rect,
        deltaTime,
      );

      expect(result.collided).toBe(true);
      expect(result.normal).toBeDefined();
      expect(result.contactPoint).toBeDefined();
    });

    it("should not detect collision when ray misses rectangle", () => {
      const circle: Circle = { x: 0, y: 0, radius: 10 };
      const prevPosition: Vector2D = { x: 50, y: 50 };
      const velocity: Vector2D = { x: 100, y: 0 };
      const deltaTime = 1 / 60;

      const result = CollisionDetector.checkContinuousCircleRectangle(
        circle,
        prevPosition,
        velocity,
        rect,
        deltaTime,
      );

      expect(result.collided).toBe(false);
    });

    it("should detect collision with correct normal for left edge", () => {
      const circle: Circle = { x: 0, y: 0, radius: 10 };
      const prevPosition: Vector2D = { x: 100, y: 250 };
      const velocity: Vector2D = { x: 15000, y: 0 }; // Match first test velocity
      const deltaTime = 1 / 60;

      const result = CollisionDetector.checkContinuousCircleRectangle(
        circle,
        prevPosition,
        velocity,
        rect,
        deltaTime,
      );

      expect(result.normal?.x).toBeCloseTo(-1);
      expect(result.normal?.y).toBeCloseTo(0);
    });

    it("should handle vertical collision correctly", () => {
      const circle: Circle = { x: 0, y: 0, radius: 10 };
      const prevPosition: Vector2D = { x: 250, y: 100 };
      const velocity: Vector2D = { x: 0, y: 15000 }; // Much faster to cross expanded rect
      const deltaTime = 1 / 60;

      const result = CollisionDetector.checkContinuousCircleRectangle(
        circle,
        prevPosition,
        velocity,
        rect,
        deltaTime,
      );

      expect(result.collided).toBe(true);
      expect(result.normal?.x).toBeCloseTo(0);
      expect(result.normal?.y).toBeCloseTo(-1);
    });
  });

  describe("Point Testing", () => {
    it("should correctly test point in rectangle", () => {
      const rect: Rectangle = { x: 100, y: 100, width: 100, height: 100 };

      expect(CollisionDetector.pointInRectangle({ x: 150, y: 150 }, rect)).toBe(
        true,
      );
      expect(CollisionDetector.pointInRectangle({ x: 50, y: 150 }, rect)).toBe(
        false,
      );
      expect(CollisionDetector.pointInRectangle({ x: 100, y: 100 }, rect)).toBe(
        true,
      ); // Edge case
      expect(CollisionDetector.pointInRectangle({ x: 200, y: 200 }, rect)).toBe(
        true,
      ); // Edge case
    });

    it("should correctly test point in circle", () => {
      const circle: Circle = { x: 100, y: 100, radius: 50 };

      expect(CollisionDetector.pointInCircle({ x: 100, y: 100 }, circle)).toBe(
        true,
      ); // Center
      expect(CollisionDetector.pointInCircle({ x: 130, y: 100 }, circle)).toBe(
        true,
      ); // Inside
      expect(CollisionDetector.pointInCircle({ x: 150, y: 100 }, circle)).toBe(
        true,
      ); // On edge
      expect(CollisionDetector.pointInCircle({ x: 160, y: 100 }, circle)).toBe(
        false,
      ); // Outside
    });
  });

  describe("Collision Resolution", () => {
    it("should resolve collision between two objects", () => {
      const pos1: Vector2D = { x: 100, y: 100 };
      const pos2: Vector2D = { x: 110, y: 100 };
      const collisionInfo = {
        collided: true,
        normal: { x: 1, y: 0 },
        penetration: 10,
        contactPoint: { x: 105, y: 100 },
      };

      const originalPos1 = { ...pos1 };
      const originalPos2 = { ...pos2 };

      CollisionDetector.resolveCollision(collisionInfo, pos1, pos2);

      expect(pos1.x).toBeLessThan(originalPos1.x);
      expect(pos2.x).toBeGreaterThan(originalPos2.x);
      expect(Math.abs(pos2.x - pos1.x - 20)).toBeLessThan(0.001); // After separation: 115 - 95 = 20
    });

    it("should resolve collision for single object against static", () => {
      const pos1: Vector2D = { x: 105, y: 100 };
      const collisionInfo = {
        collided: true,
        normal: { x: -1, y: 0 },
        penetration: 5,
        contactPoint: { x: 100, y: 100 },
      };

      const originalPos = { ...pos1 };

      CollisionDetector.resolveCollision(collisionInfo, pos1);

      expect(pos1.x).toBeGreaterThan(originalPos.x);
      expect(pos1.x - originalPos.x).toBeCloseTo(5);
    });

    it("should not resolve when no collision", () => {
      const pos1: Vector2D = { x: 100, y: 100 };
      const pos2: Vector2D = { x: 110, y: 100 };
      const collisionInfo = { collided: false };

      const originalPos1 = { ...pos1 };
      const originalPos2 = { ...pos2 };

      CollisionDetector.resolveCollision(collisionInfo, pos1, pos2);

      expect(pos1.x).toBe(originalPos1.x);
      expect(pos1.y).toBe(originalPos1.y);
      expect(pos2.x).toBe(originalPos2.x);
      expect(pos2.y).toBe(originalPos2.y);
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero-size rectangle", () => {
      const circle: Circle = { x: 100, y: 100, radius: 10 };
      const rect: Rectangle = { x: 100, y: 100, width: 0, height: 0 };

      const result = CollisionDetector.checkCircleRectangle(circle, rect);
      expect(result.collided).toBe(true);
    });

    it("should handle zero-radius circle", () => {
      const circle: Circle = { x: 150, y: 150, radius: 0 };
      const rect: Rectangle = { x: 100, y: 100, width: 100, height: 100 };

      const result = CollisionDetector.checkCircleRectangle(circle, rect);
      expect(result.collided).toBe(true);
    });

    it("should handle very small penetration values", () => {
      const circle1: Circle = { x: 100, y: 100, radius: 10 };
      const circle2: Circle = { x: 119.999, y: 100, radius: 10 };

      const result = CollisionDetector.checkCircleCircle(circle1, circle2);
      expect(result.collided).toBe(true);
      expect(result.penetration).toBeGreaterThan(0);
      expect(result.penetration).toBeLessThan(0.01);
    });

    it("should handle negative coordinates", () => {
      const circle: Circle = { x: -50, y: -50, radius: 20 };
      const rect: Rectangle = { x: -100, y: -100, width: 100, height: 100 };

      const result = CollisionDetector.checkCircleRectangle(circle, rect);
      expect(result.collided).toBe(true);
    });
  });
});
