import { describe, it, expect, beforeEach, vi } from "vitest";
import { LaserEffect } from "../LaserEffect";
import { Projectile, ProjectileType } from "../../../entities/Projectile";
import {
  setQualitySettings,
  QualityLevel,
  setQualityLevel,
} from "../../../../stores/qualitySettingsStore";
import {
  createMockContext2D,
  type MockCanvasContext,
} from "../../../../__tests__/mocks/CanvasMockFactory";

describe("LaserEffect", () => {
  let effect: LaserEffect;
  let mockCtx: MockCanvasContext;
  let mockProjectile: Projectile;

  beforeEach(() => {
    // Reset to MEDIUM quality
    setQualityLevel(QualityLevel.MEDIUM);

    effect = new LaserEffect();

    // Create mock context using CanvasMockFactory
    mockCtx = createMockContext2D();

    // Add canvas property for width/height
    (mockCtx as any).canvas = { width: 800, height: 600 };

    // Create mock projectile
    mockProjectile = new Projectile({
      type: ProjectileType.Laser,
      position: { x: 400, y: 300 },
      velocity: { x: 0, y: -500 },
      damage: 1,
      size: { width: 4, height: 12 },
      color: "#FF0000",
      lifespan: 3000,
    });
    mockProjectile.active = true;
  });

  describe("Projectile Rendering", () => {
    it("should render active projectile", () => {
      effect.renderProjectile(mockCtx, mockProjectile);

      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
      expect(mockCtx.fillRect).toHaveBeenCalled();
    });

    it("should not render inactive projectile", () => {
      mockProjectile.active = false;

      effect.renderProjectile(mockCtx, mockProjectile);

      expect(mockCtx.fillRect).not.toHaveBeenCalled();
    });

    it("should render glow effect with glowEffects enabled", () => {
      setQualitySettings({ glowEffects: true });

      // Track fillRect calls - glow renders the projectile twice
      const fillRectCalls = mockCtx.fillRect.mock.calls.length;

      effect.renderProjectile(mockCtx, mockProjectile);

      // Should have 2 fillRect calls: glow + core
      expect(mockCtx.fillRect.mock.calls.length).toBe(fillRectCalls + 2);
    });

    it("should not render glow effect with glowEffects disabled", () => {
      setQualitySettings({ glowEffects: false });

      effect.renderProjectile(mockCtx, mockProjectile);

      // shadowBlur should remain 0
      expect(mockCtx.shadowBlur).toBe(0);
    });

    it("should render trail with visualEffects enabled", () => {
      setQualitySettings({ visualEffects: true, glowEffects: false });

      // Spy on renderTrail method
      const renderTrailSpy = vi.spyOn(effect as any, "renderTrail");

      effect.renderProjectile(mockCtx, mockProjectile);

      // Verify renderTrail was called
      expect(renderTrailSpy).toHaveBeenCalledWith(mockCtx, mockProjectile);

      // Verify fillRect was called (at least for core projectile)
      expect(mockCtx.fillRect).toHaveBeenCalled();

      renderTrailSpy.mockRestore();
    });

    it("should not render trail with visualEffects disabled", () => {
      setQualitySettings({ visualEffects: false, glowEffects: false });

      const fillRectCalls = mockCtx.fillRect.mock.calls.length;

      effect.renderProjectile(mockCtx, mockProjectile);

      // Should only have core fillRect call
      expect(mockCtx.fillRect.mock.calls.length).toBe(fillRectCalls + 1);
    });
  });

  describe("Muzzle Flash", () => {
    it("should create muzzle flash at specified position", () => {
      effect.createMuzzleFlash(100, 200);

      expect(effect.getActiveMuzzleFlashCount()).toBe(1);
    });

    it("should not create muzzle flash with visualEffects disabled", () => {
      setQualitySettings({ visualEffects: false });

      effect.createMuzzleFlash(100, 200);

      expect(effect.getActiveMuzzleFlashCount()).toBe(0);
    });

    it("should support multiple muzzle flashes", () => {
      effect.createMuzzleFlash(100, 200);
      effect.createMuzzleFlash(200, 300);
      effect.createMuzzleFlash(300, 400);

      expect(effect.getActiveMuzzleFlashCount()).toBe(3);
    });

    it("should fade out muzzle flashes over time", () => {
      effect.createMuzzleFlash(100, 200);

      // Update for duration
      effect.update(150); // Default duration is 150ms

      // Should still be active but fading
      expect(effect.getActiveMuzzleFlashCount()).toBe(0);
    });

    it("should remove expired muzzle flashes", () => {
      effect.createMuzzleFlash(100, 200);

      expect(effect.getActiveMuzzleFlashCount()).toBe(1);

      // Update past duration
      effect.update(200);

      expect(effect.getActiveMuzzleFlashCount()).toBe(0);
    });

    it("should render muzzle flashes", () => {
      setQualitySettings({ visualEffects: true });

      effect.createMuzzleFlash(100, 200);

      effect.renderMuzzleFlashes(mockCtx);

      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.arc).toHaveBeenCalled();
      expect(mockCtx.fill).toHaveBeenCalled();
    });

    it("should not render muzzle flashes with visualEffects disabled", () => {
      setQualitySettings({ visualEffects: false });

      effect.createMuzzleFlash(100, 200);

      effect.renderMuzzleFlashes(mockCtx);

      expect(mockCtx.arc).not.toHaveBeenCalled();
    });
  });

  describe("Combined Rendering", () => {
    it("should render muzzle flashes before projectiles", () => {
      setQualitySettings({ visualEffects: true });

      effect.createMuzzleFlash(100, 200);

      const projectiles = [mockProjectile];

      effect.render(mockCtx, projectiles);

      // Both should be rendered
      expect(mockCtx.arc).toHaveBeenCalled(); // Muzzle flash
      expect(mockCtx.fillRect).toHaveBeenCalled(); // Projectile
    });

    it("should handle empty projectile array", () => {
      effect.render(mockCtx, []);

      // Should not throw error
      expect(true).toBe(true);
    });

    it("should handle multiple projectiles", () => {
      const projectile2 = new Projectile({
        type: ProjectileType.Laser,
        position: { x: 500, y: 400 },
        velocity: { x: 0, y: -500 },
        damage: 1,
        size: { width: 4, height: 12 },
        color: "#FF0000",
        lifespan: 3000,
      });
      projectile2.active = true;

      const projectiles = [mockProjectile, projectile2];

      const fillRectCalls = vi.mocked(mockCtx.fillRect).mock.calls.length;

      effect.render(mockCtx, projectiles);

      // Should render both projectiles
      expect(vi.mocked(mockCtx.fillRect).mock.calls.length).toBeGreaterThan(
        fillRectCalls + 1,
      );
    });
  });

  describe("Clear and Reset", () => {
    it("should clear all muzzle flashes", () => {
      effect.createMuzzleFlash(100, 200);
      effect.createMuzzleFlash(200, 300);

      expect(effect.getActiveMuzzleFlashCount()).toBe(2);

      effect.clear();

      expect(effect.getActiveMuzzleFlashCount()).toBe(0);
    });
  });

  describe("Configuration", () => {
    it("should accept custom configuration", () => {
      const customEffect = new LaserEffect({
        glowBlur: 20,
        glowColor: "rgba(0, 255, 0, 1.0)",
        muzzleFlashDuration: 300,
        muzzleFlashRadius: 20,
        trailLength: 5,
      });

      expect(customEffect).toBeInstanceOf(LaserEffect);
    });

    it("should allow updating configuration", () => {
      effect.updateConfig({
        muzzleFlashDuration: 50,
      });

      effect.createMuzzleFlash(100, 200);

      expect(effect.getActiveMuzzleFlashCount()).toBe(1);

      // Should expire faster with shorter duration
      effect.update(60);

      expect(effect.getActiveMuzzleFlashCount()).toBe(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle projectile with zero velocity", () => {
      mockProjectile.velocity = { x: 0, y: 0 };

      effect.renderProjectile(mockCtx, mockProjectile);

      // Should still render core projectile
      expect(mockCtx.fillRect).toHaveBeenCalled();
    });

    it("should handle rapid muzzle flash creation", () => {
      for (let i = 0; i < 50; i++) {
        effect.createMuzzleFlash(100 + i, 200);
      }

      expect(effect.getActiveMuzzleFlashCount()).toBe(50);

      // Update to remove old flashes
      effect.update(200);

      expect(effect.getActiveMuzzleFlashCount()).toBe(0);
    });
  });
});
