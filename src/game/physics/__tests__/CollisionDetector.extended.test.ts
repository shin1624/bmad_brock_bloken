/**
 * Extended Collision Detection Tests for Story 2.4
 * Starting with the first AABB collision test
 */
import { describe, it, expect } from "vitest";
import { CollisionDetector } from "../CollisionDetector";
import { Rectangle, Vector2D } from "../../../types/game.types";

describe("CollisionDetector - Story 2.4 Extended Features", () => {
  describe("AC1: AABB衝突検出実装", () => {
    describe("2.4-UNIT-001: AABB重複判定アルゴリズム", () => {
      it("should detect AABB collision between overlapping rectangles", () => {
        const rect1: Rectangle = { x: 10, y: 10, width: 20, height: 15 };
        const rect2: Rectangle = { x: 25, y: 20, width: 20, height: 15 };

        const collision = CollisionDetector.checkAABB(rect1, rect2);

        expect(collision.collided).toBe(true);
        expect(collision.normal).toBeDefined();
        expect(collision.penetration).toBeGreaterThan(0);
      });

      it("should not detect collision between separated rectangles", () => {
        const rect1: Rectangle = { x: 10, y: 10, width: 20, height: 15 };
        const rect2: Rectangle = { x: 50, y: 50, width: 20, height: 15 };

        const collision = CollisionDetector.checkAABB(rect1, rect2);

        expect(collision.collided).toBe(false);
      });
    });
  });

  describe("AC2: ボール-パドル衝突（反射角計算含む）", () => {
    describe("2.4-UNIT-004: 反射角計算数学ロジック", () => {
      it("should calculate reflection angle based on paddle hit position", () => {
        const ballPos: Vector2D = { x: 100, y: 50 };
        const ballVel: Vector2D = { x: 0, y: 100 };
        const paddleRect: Rectangle = { x: 90, y: 60, width: 20, height: 5 };
        const hitPosition = 0.25; // Left quarter of paddle

        const reflectionAngle =
          CollisionDetector.calculatePaddleReflectionAngle(
            ballVel,
            paddleRect,
            ballPos,
            hitPosition,
          );

        expect(reflectionAngle).toBeLessThan(0); // Should reflect left
        expect(Math.abs(reflectionAngle)).toBeGreaterThan(0); // Not straight up
      });
    });
  });

  describe("AC4: 複数同時衝突の優先順位処理", () => {
    describe("2.4-UNIT-009: 優先順位アルゴリズム", () => {
      it("should prioritize paddle collision over block collision", () => {
        const collisionResults = [
          { type: "block", distance: 5 },
          { type: "paddle", distance: 7 },
        ];

        const prioritized =
          CollisionDetector.resolvePriorityCollisions(collisionResults);

        expect(prioritized[0].type).toBe("paddle"); // Paddle should be first
      });
    });
  });
});
