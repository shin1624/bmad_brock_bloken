/**
 * Unit tests for Projectile entity
 * Story 4.3b - Phase 2 Advanced Power-ups
 * Target: 90% code coverage
 */
import { describe, it, expect, beforeEach } from "vitest";
import { Projectile, ProjectileType, ProjectileConfig } from "../Projectile";
import {
  createMockContext2D,
  type MockCanvasContext,
} from "../../../__tests__/mocks/CanvasMockFactory";

describe("Projectile Entity", () => {
  let projectile: Projectile;
  let mockContext: MockCanvasContext;

  beforeEach(() => {
    projectile = new Projectile("test-projectile-1");
    mockContext = createMockContext2D();
  });

  describe("Constructor", () => {
    it("should create projectile with default values", () => {
      expect(projectile.id).toBe("test-projectile-1");
      expect(projectile.type).toBe(ProjectileType.LASER);
      expect(projectile.damage).toBe(1);
      expect(projectile.size.width).toBe(4);
      expect(projectile.size.height).toBe(12);
      expect(projectile.color).toBe("#FF0000");
      expect(projectile.active).toBe(false);
    });

    it("should create projectile without ID", () => {
      const proj = new Projectile();
      expect(proj.id).toBeDefined();
      expect(proj.active).toBe(false);
    });
  });

  describe("initialize()", () => {
    it("should initialize projectile with config", () => {
      const config: ProjectileConfig = {
        type: ProjectileType.LASER,
        position: { x: 100, y: 200 },
        velocity: { x: 0, y: -500 },
        damage: 2,
        size: { width: 6, height: 15 },
        color: "#00FF00",
        glowColor: "#00FF44",
        lifetime: 5000,
      };

      projectile.initialize(config);

      expect(projectile.type).toBe(ProjectileType.LASER);
      expect(projectile.position.x).toBe(100);
      expect(projectile.position.y).toBe(200);
      expect(projectile.velocity.x).toBe(0);
      expect(projectile.velocity.y).toBe(-500);
      expect(projectile.damage).toBe(2);
      expect(projectile.size.width).toBe(6);
      expect(projectile.size.height).toBe(15);
      expect(projectile.color).toBe("#00FF00");
      expect(projectile.glowColor).toBe("#00FF44");
      expect(projectile.active).toBe(true);
    });

    it("should initialize without optional fields", () => {
      const config: ProjectileConfig = {
        type: ProjectileType.LASER,
        position: { x: 50, y: 100 },
        velocity: { x: 0, y: -300 },
        damage: 1,
        size: { width: 4, height: 12 },
        color: "#FF0000",
      };

      projectile.initialize(config);

      expect(projectile.active).toBe(true);
      expect(projectile.glowColor).toBeUndefined();
    });

    it("should copy position and velocity (not reference)", () => {
      const position = { x: 100, y: 200 };
      const velocity = { x: 10, y: -20 };

      const config: ProjectileConfig = {
        type: ProjectileType.LASER,
        position,
        velocity,
        damage: 1,
        size: { width: 4, height: 12 },
        color: "#FF0000",
      };

      projectile.initialize(config);

      // Modify original objects
      position.x = 999;
      velocity.y = 999;

      // Projectile should have copied values, not references
      expect(projectile.position.x).toBe(100);
      expect(projectile.velocity.y).toBe(-20);
    });
  });

  describe("reset()", () => {
    it("should reset projectile to initial state", () => {
      // Initialize first
      const config: ProjectileConfig = {
        type: ProjectileType.LASER,
        position: { x: 100, y: 200 },
        velocity: { x: 10, y: -500 },
        damage: 3,
        size: { width: 8, height: 16 },
        color: "#0000FF",
        glowColor: "#4444FF",
        lifetime: 3000,
      };
      projectile.initialize(config);

      expect(projectile.active).toBe(true);

      // Reset
      projectile.reset();

      expect(projectile.active).toBe(false);
      expect(projectile.position.x).toBe(0);
      expect(projectile.position.y).toBe(0);
      expect(projectile.velocity.x).toBe(0);
      expect(projectile.velocity.y).toBe(0);
    });
  });

  describe("update()", () => {
    beforeEach(() => {
      const config: ProjectileConfig = {
        type: ProjectileType.LASER,
        position: { x: 400, y: 300 },
        velocity: { x: 100, y: -500 },
        damage: 1,
        size: { width: 4, height: 12 },
        color: "#FF0000",
      };
      projectile.initialize(config);
    });

    it("should update position based on velocity and deltaTime", () => {
      const deltaTime = 16; // ~60 FPS

      projectile.update(deltaTime);

      // Expected: position += velocity * (deltaTime / 1000)
      // x: 400 + 100 * 0.016 = 401.6
      // y: 300 + (-500) * 0.016 = 292
      expect(projectile.position.x).toBeCloseTo(401.6, 1);
      expect(projectile.position.y).toBeCloseTo(292, 1);
    });

    it("should accumulate position over multiple updates", () => {
      projectile.update(16); // First frame
      projectile.update(16); // Second frame
      projectile.update(16); // Third frame

      // After 3 frames of 16ms:
      // x: 400 + (100 * 0.016 * 3) = 404.8
      // y: 300 + (-500 * 0.016 * 3) = 276
      expect(projectile.position.x).toBeCloseTo(404.8, 1);
      expect(projectile.position.y).toBeCloseTo(276, 1);
    });

    it("should not update when inactive", () => {
      projectile.reset(); // Make inactive

      const initialX = projectile.position.x;
      const initialY = projectile.position.y;

      projectile.update(16);

      expect(projectile.position.x).toBe(initialX);
      expect(projectile.position.y).toBe(initialY);
    });

    it("should handle zero deltaTime", () => {
      const initialX = projectile.position.x;
      const initialY = projectile.position.y;

      projectile.update(0);

      expect(projectile.position.x).toBe(initialX);
      expect(projectile.position.y).toBe(initialY);
    });
  });

  describe("render()", () => {
    beforeEach(() => {
      const config: ProjectileConfig = {
        type: ProjectileType.LASER,
        position: { x: 400, y: 300 },
        velocity: { x: 0, y: -500 },
        damage: 1,
        size: { width: 4, height: 12 },
        color: "#FF0000",
        glowColor: "#FF4444",
      };
      projectile.initialize(config);
    });

    it("should render projectile rectangle", () => {
      let fillRectCalled = false;
      let rectX = 0;
      let rectY = 0;
      let rectWidth = 0;
      let rectHeight = 0;

      mockContext.fillRect = (x: number, y: number, w: number, h: number) => {
        fillRectCalled = true;
        rectX = x;
        rectY = y;
        rectWidth = w;
        rectHeight = h;
      };

      projectile.render(mockContext);

      expect(fillRectCalled).toBe(true);
      // Rectangle centered on position
      // x: 400 - 4/2 = 398
      // y: 300 - 12/2 = 294
      expect(rectX).toBe(398);
      expect(rectY).toBe(294);
      expect(rectWidth).toBe(4);
      expect(rectHeight).toBe(12);
    });

    it("should apply glow effect when glowColor is set", () => {
      let shadowColorSet = false;
      let shadowBlurSet = false;

      Object.defineProperty(mockContext, "shadowColor", {
        set: (value) => {
          shadowColorSet = true;
          expect(value).toBe("#FF4444");
        },
        configurable: true,
      });

      Object.defineProperty(mockContext, "shadowBlur", {
        set: (value) => {
          shadowBlurSet = true;
          expect(value).toBe(10);
        },
        configurable: true,
      });

      projectile.render(mockContext);

      expect(shadowColorSet).toBe(true);
      expect(shadowBlurSet).toBe(true);
    });

    it("should not render when inactive", () => {
      projectile.reset(); // Make inactive

      let fillRectCalled = false;
      mockContext.fillRect = () => {
        fillRectCalled = true;
      };

      projectile.render(mockContext);

      expect(fillRectCalled).toBe(false);
    });

    it("should call save and restore on context", () => {
      let saveCalled = false;
      let restoreCalled = false;

      mockContext.save = () => {
        saveCalled = true;
      };

      mockContext.restore = () => {
        restoreCalled = true;
      };

      projectile.render(mockContext);

      expect(saveCalled).toBe(true);
      expect(restoreCalled).toBe(true);
    });
  });

  describe("isOffScreen()", () => {
    beforeEach(() => {
      const config: ProjectileConfig = {
        type: ProjectileType.LASER,
        position: { x: 400, y: 300 },
        velocity: { x: 0, y: -500 },
        damage: 1,
        size: { width: 4, height: 12 },
        color: "#FF0000",
      };
      projectile.initialize(config);
    });

    it("should return false when projectile is on screen", () => {
      const canvasWidth = 800;
      const canvasHeight = 600;

      expect(projectile.isOffScreen(canvasWidth, canvasHeight)).toBe(false);
    });

    it("should return true when projectile is above screen", () => {
      projectile.position.y = -20;

      expect(projectile.isOffScreen(800, 600)).toBe(true);
    });

    it("should return true when projectile is below screen", () => {
      projectile.position.y = 620;

      expect(projectile.isOffScreen(800, 600)).toBe(true);
    });

    it("should return true when projectile is left of screen", () => {
      projectile.position.x = -10;

      expect(projectile.isOffScreen(800, 600)).toBe(true);
    });

    it("should return true when projectile is right of screen", () => {
      projectile.position.x = 810;

      expect(projectile.isOffScreen(800, 600)).toBe(true);
    });

    it("should account for projectile size in bounds check", () => {
      // Position at edge, but size extends beyond
      projectile.position.x = 802; // 800 + size.width (4) / 2

      // Should be off-screen because: x > canvasWidth + size.width
      // 802 > 800 + 4 = false, so still on screen
      expect(projectile.isOffScreen(800, 600)).toBe(false);

      projectile.position.x = 805; // Beyond threshold
      expect(projectile.isOffScreen(800, 600)).toBe(true);
    });
  });

  describe("getBounds()", () => {
    it("should return correct bounding box", () => {
      const config: ProjectileConfig = {
        type: ProjectileType.LASER,
        position: { x: 400, y: 300 },
        velocity: { x: 0, y: -500 },
        damage: 1,
        size: { width: 4, height: 12 },
        color: "#FF0000",
      };
      projectile.initialize(config);

      const bounds = projectile.getBounds();

      // Bounds centered on position
      // x: 400 - 4/2 = 398
      // y: 300 - 12/2 = 294
      expect(bounds.x).toBe(398);
      expect(bounds.y).toBe(294);
      expect(bounds.width).toBe(4);
      expect(bounds.height).toBe(12);
    });

    it("should update when projectile moves", () => {
      const config: ProjectileConfig = {
        type: ProjectileType.LASER,
        position: { x: 100, y: 200 },
        velocity: { x: 50, y: -100 },
        damage: 1,
        size: { width: 6, height: 10 },
        color: "#00FF00",
      };
      projectile.initialize(config);

      const bounds1 = projectile.getBounds();
      expect(bounds1.x).toBe(97); // 100 - 6/2

      projectile.update(1000); // 1 second
      // New position: x = 100 + 50 = 150

      const bounds2 = projectile.getBounds();
      expect(bounds2.x).toBe(147); // 150 - 6/2
    });
  });

  describe("Edge Cases", () => {
    it("should handle very large deltaTime values", () => {
      const config: ProjectileConfig = {
        type: ProjectileType.LASER,
        position: { x: 400, y: 300 },
        velocity: { x: 100, y: -500 },
        damage: 1,
        size: { width: 4, height: 12 },
        color: "#FF0000",
      };
      projectile.initialize(config);

      projectile.update(10000); // 10 seconds

      // Should move very far
      expect(projectile.position.x).toBe(1400); // 400 + 100 * 10
      expect(projectile.position.y).toBe(-4700); // 300 - 500 * 10
    });

    it("should handle negative velocity", () => {
      const config: ProjectileConfig = {
        type: ProjectileType.LASER,
        position: { x: 400, y: 100 },
        velocity: { x: -200, y: 300 }, // Moving left and down
        damage: 1,
        size: { width: 4, height: 12 },
        color: "#FF0000",
      };
      projectile.initialize(config);

      projectile.update(100); // 0.1 second

      expect(projectile.position.x).toBeCloseTo(380, 1); // 400 - 200 * 0.1
      expect(projectile.position.y).toBeCloseTo(130, 1); // 100 + 300 * 0.1
    });

    it("should handle zero velocity", () => {
      const config: ProjectileConfig = {
        type: ProjectileType.LASER,
        position: { x: 400, y: 300 },
        velocity: { x: 0, y: 0 },
        damage: 1,
        size: { width: 4, height: 12 },
        color: "#FF0000",
      };
      projectile.initialize(config);

      projectile.update(100);

      expect(projectile.position.x).toBe(400);
      expect(projectile.position.y).toBe(300);
    });

    it("should handle re-initialization after reset", () => {
      const config1: ProjectileConfig = {
        type: ProjectileType.LASER,
        position: { x: 100, y: 200 },
        velocity: { x: 50, y: -100 },
        damage: 2,
        size: { width: 8, height: 16 },
        color: "#00FF00",
      };
      projectile.initialize(config1);
      expect(projectile.active).toBe(true);

      projectile.reset();
      expect(projectile.active).toBe(false);

      const config2: ProjectileConfig = {
        type: ProjectileType.LASER,
        position: { x: 500, y: 400 },
        velocity: { x: -50, y: 100 },
        damage: 1,
        size: { width: 4, height: 12 },
        color: "#FF0000",
      };
      projectile.initialize(config2);

      expect(projectile.active).toBe(true);
      expect(projectile.position.x).toBe(500);
      expect(projectile.damage).toBe(1);
    });
  });
});
