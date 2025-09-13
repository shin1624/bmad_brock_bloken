/**
 * Unit tests for PhysicsSystem
 */
import { describe, it, expect, beforeEach } from "vitest";
import { PhysicsSystem, PhysicsConfig } from "../PhysicsSystem";
import { Ball } from "../../entities/Ball";
import { BallConfiguration } from "../../../types/game.types";

describe("PhysicsSystem", () => {
  let physicsSystem: PhysicsSystem;
  let physicsConfig: PhysicsConfig;
  let ballConfig: BallConfiguration;

  beforeEach(() => {
    physicsConfig = {
      canvasWidth: 800,
      canvasHeight: 600,
      gravity: 0,
      wallBounceThreshold: 30,
    };

    ballConfig = {
      initialRadius: 10,
      initialSpeed: 200,
      maxSpeed: 500,
      minSpeed: 50,
      initialPosition: { x: 400, y: 300 },
      bounceDamping: 0.95,
    };

    physicsSystem = new PhysicsSystem(physicsConfig);
  });

  describe("Ball Management", () => {
    it("should add ball to system", () => {
      const ball = new Ball(ballConfig);
      physicsSystem.addBall(ball);

      const balls = physicsSystem.getBalls();
      expect(balls).toContain(ball);
      expect(balls.length).toBe(1);
    });

    it("should not add duplicate ball", () => {
      const ball = new Ball(ballConfig);
      physicsSystem.addBall(ball);
      physicsSystem.addBall(ball);

      const balls = physicsSystem.getBalls();
      expect(balls.length).toBe(1);
    });

    it("should remove ball from system", () => {
      const ball = new Ball(ballConfig);
      physicsSystem.addBall(ball);
      physicsSystem.removeBall(ball);

      const balls = physicsSystem.getBalls();
      expect(balls.length).toBe(0);
    });

    it("should handle removing non-existent ball", () => {
      const ball = new Ball(ballConfig);

      expect(() => physicsSystem.removeBall(ball)).not.toThrow();
      expect(physicsSystem.getBalls().length).toBe(0);
    });

    it("should clear all balls", () => {
      const ball1 = new Ball(ballConfig);
      const ball2 = new Ball(ballConfig);

      physicsSystem.addBall(ball1);
      physicsSystem.addBall(ball2);
      physicsSystem.clear();

      expect(physicsSystem.getBalls().length).toBe(0);
    });
  });

  describe("Wall Collision Detection", () => {
    it("should detect and handle left wall collision", () => {
      const ball = new Ball({
        ...ballConfig,
        initialPosition: { x: 5, y: 300 }, // Near left wall
      });
      ball.velocity = { x: -100, y: 0 };

      physicsSystem.addBall(ball);
      physicsSystem.update(1 / 60);

      expect(ball.position.x).toBeGreaterThanOrEqual(ball.radius);
      expect(ball.velocity.x).toBeGreaterThan(0); // Should bounce right
    });

    it("should detect and handle right wall collision", () => {
      const ball = new Ball({
        ...ballConfig,
        initialPosition: { x: 795, y: 300 }, // Near right wall
      });
      ball.velocity = { x: 100, y: 0 };

      physicsSystem.addBall(ball);
      physicsSystem.update(1 / 60);

      expect(ball.position.x).toBeLessThanOrEqual(
        physicsConfig.canvasWidth - ball.radius,
      );
      expect(ball.velocity.x).toBeLessThan(0); // Should bounce left
    });

    it("should detect and handle top wall collision", () => {
      const ball = new Ball({
        ...ballConfig,
        initialPosition: { x: 400, y: 5 }, // Near top wall
      });
      ball.velocity = { x: 0, y: -100 };

      physicsSystem.addBall(ball);
      physicsSystem.update(1 / 60);

      expect(ball.position.y).toBeGreaterThanOrEqual(ball.radius);
      expect(ball.velocity.y).toBeGreaterThan(0); // Should bounce down
    });

    it("should detect and handle bottom wall collision", () => {
      const ball = new Ball({
        ...ballConfig,
        initialPosition: { x: 400, y: 595 }, // Near bottom wall
      });
      ball.velocity = { x: 0, y: 100 };

      physicsSystem.addBall(ball);
      physicsSystem.update(1 / 60);

      expect(ball.position.y).toBeLessThanOrEqual(
        physicsConfig.canvasHeight - ball.radius,
      );
      expect(ball.velocity.y).toBeLessThan(0); // Should bounce up
    });
  });

  describe("Continuous Collision Detection", () => {
    it("should handle fast-moving ball through wall", () => {
      const ball = new Ball({
        ...ballConfig,
        initialPosition: { x: 15, y: 300 }, // Closer to wall
        maxSpeed: 600, // Allow faster movement for this test
      });
      // Set to maxSpeed - 1 to avoid immediate clamping but still be fast
      ball.velocity = { x: -599, y: 0 }; // Fast towards left wall, within speed limit

      physicsSystem.addBall(ball);
      physicsSystem.update(1 / 60);

      // Ball should not pass through wall
      expect(ball.position.x).toBeGreaterThanOrEqual(ball.radius);
      expect(ball.velocity.x).toBeGreaterThan(0); // Should bounce
    });

    it("should handle corner collision correctly", () => {
      const ball = new Ball({
        ...ballConfig,
        initialPosition: { x: 20, y: 20 },
      });
      ball.velocity = { x: -500, y: -500 }; // Towards top-left corner

      physicsSystem.addBall(ball);
      physicsSystem.update(1 / 60);

      expect(ball.position.x).toBeGreaterThanOrEqual(ball.radius);
      expect(ball.position.y).toBeGreaterThanOrEqual(ball.radius);
    });
  });

  describe("Physics Configuration", () => {
    it("should update configuration correctly", () => {
      const newConfig = {
        canvasWidth: 1000,
        canvasHeight: 800,
        gravity: 100,
        wallBounceThreshold: 50,
      };

      physicsSystem.updateConfig(newConfig);

      // Test that new config is applied
      const ball = new Ball({
        ...ballConfig,
        initialPosition: { x: 995, y: 400 },
      });
      ball.velocity = { x: 100, y: 0 };

      physicsSystem.addBall(ball);
      physicsSystem.update(1 / 60);

      expect(ball.position.x).toBeLessThanOrEqual(1000 - ball.radius);
    });

    it("should apply gravity when configured", () => {
      physicsSystem.updateConfig({ gravity: 500 });

      const ball = new Ball(ballConfig);
      const initialVelocityY = ball.velocity.y;

      physicsSystem.addBall(ball);
      physicsSystem.update(1 / 60);

      expect(ball.velocity.y).toBeGreaterThan(initialVelocityY);
    });

    it("should apply wall bounce threshold", () => {
      physicsSystem.updateConfig({ wallBounceThreshold: 100 });

      const ball = new Ball(ballConfig);
      ball.velocity = { x: 20, y: 0 }; // Slow velocity
      ball.position = { x: 5, y: 300 }; // Near wall

      physicsSystem.addBall(ball);
      physicsSystem.update(1 / 60);

      // Velocity should be boosted due to threshold
      const speed = Math.sqrt(ball.velocity.x ** 2 + ball.velocity.y ** 2);
      expect(speed).toBeGreaterThanOrEqual(100);
    });
  });

  describe("Out of Bounds Detection", () => {
    it("should correctly identify ball out of bounds", () => {
      const ball = new Ball({
        ...ballConfig,
        initialPosition: { x: 400, y: 700 }, // Below canvas
      });

      expect(physicsSystem.isBallOutOfBounds(ball)).toBe(true);
    });

    it("should correctly identify ball in bounds", () => {
      const ball = new Ball(ballConfig);

      expect(physicsSystem.isBallOutOfBounds(ball)).toBe(false);
    });
  });

  describe("Multiple Ball Physics", () => {
    it("should handle multiple balls independently", () => {
      const ball1 = new Ball({
        ...ballConfig,
        initialPosition: { x: 100, y: 300 },
      });
      const ball2 = new Ball({
        ...ballConfig,
        initialPosition: { x: 700, y: 300 },
      });

      ball1.velocity = { x: 200, y: 0 };
      ball2.velocity = { x: -200, y: 0 };

      physicsSystem.addBall(ball1);
      physicsSystem.addBall(ball2);

      const ball1InitialX = ball1.position.x;
      const ball2InitialX = ball2.position.x;

      physicsSystem.update(1 / 60);

      expect(ball1.position.x).toBeGreaterThan(ball1InitialX);
      expect(ball2.position.x).toBeLessThan(ball2InitialX);
    });

    it("should handle inactive balls correctly", () => {
      const ball = new Ball(ballConfig);
      ball.active = false;

      const initialPosition = { ...ball.position };

      physicsSystem.addBall(ball);
      physicsSystem.update(1 / 60);

      expect(ball.position.x).toBe(initialPosition.x);
      expect(ball.position.y).toBe(initialPosition.y);
    });
  });

  describe("Performance and Stability", () => {
    it("should handle large delta times without instability", () => {
      const ball = new Ball(ballConfig);
      ball.velocity = { x: 1000, y: 1000 };

      physicsSystem.addBall(ball);
      physicsSystem.update(1); // 1 second delta time

      // Ball should still be in reasonable position
      expect(ball.position.x).toBeGreaterThan(0);
      expect(ball.position.x).toBeLessThan(physicsConfig.canvasWidth);
      expect(ball.position.y).toBeGreaterThan(0);
      expect(ball.position.y).toBeLessThan(physicsConfig.canvasHeight);
    });

    it("should maintain consistency over many updates", () => {
      const ball = new Ball(ballConfig);
      physicsSystem.addBall(ball);

      // Run physics for 1000 frames
      for (let i = 0; i < 1000; i++) {
        physicsSystem.update(1 / 60);

        // Ball should always be in bounds
        expect(ball.position.x).toBeGreaterThanOrEqual(ball.radius);
        expect(ball.position.x).toBeLessThanOrEqual(
          physicsConfig.canvasWidth - ball.radius,
        );
        expect(ball.position.y).toBeGreaterThanOrEqual(ball.radius);
        expect(ball.position.y).toBeLessThanOrEqual(
          physicsConfig.canvasHeight - ball.radius,
        );

        // Velocity should be reasonable
        const speed = Math.sqrt(ball.velocity.x ** 2 + ball.velocity.y ** 2);
        expect(speed).toBeGreaterThan(0);
        expect(speed).toBeLessThan(1000);
      }
    });
  });
});
