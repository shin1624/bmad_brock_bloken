import { describe, it, expect, beforeEach, vi } from "vitest";
import { SlowMotionEffect } from "../SlowMotionEffect";
import {
  setQualitySettings,
  QualityLevel,
  setQualityLevel,
} from "../../../../stores/qualitySettingsStore";
import {
  createMockCanvas,
  createMockContext2D,
  type MockCanvasContext,
} from "../../../../__tests__/mocks/CanvasMockFactory";

describe("SlowMotionEffect", () => {
  let effect: SlowMotionEffect;
  let mockCtx: MockCanvasContext;

  beforeEach(() => {
    // Reset to MEDIUM quality with visual effects enabled
    setQualityLevel(QualityLevel.MEDIUM);

    effect = new SlowMotionEffect();

    // Create mock context using CanvasMockFactory
    mockCtx = createMockContext2D();

    // Add canvas property for width/height
    (mockCtx as any).canvas = { width: 800, height: 600 };
  });

  describe("Activation and Deactivation", () => {
    it("should be inactive by default", () => {
      expect(effect.isActive()).toBe(false);
      expect(effect.getIntensity()).toBe(0);
    });

    it("should activate when activate() is called", () => {
      effect.activate();
      expect(effect.isActive()).toBe(true);
    });

    it("should deactivate when deactivate() is called", () => {
      effect.activate();
      effect.deactivate();

      // Update to apply deactivation
      for (let i = 0; i < 10; i++) {
        effect.update(50);
      }

      expect(effect.isActive()).toBe(false);
      expect(effect.getIntensity()).toBeLessThan(0.01);
    });
  });

  describe("Intensity Transitions", () => {
    it("should smoothly transition intensity to 1.0 when activated", () => {
      effect.activate();

      // Intensity should start at 0
      expect(effect.getIntensity()).toBe(0);

      // Update multiple times to simulate transition
      for (let i = 0; i < 20; i++) {
        effect.update(25); // 25ms per frame = 500ms total
      }

      // Intensity should be close to 1.0 after transition
      expect(effect.getIntensity()).toBeGreaterThan(0.9);
    });

    it("should smoothly transition intensity to 0 when deactivated", () => {
      effect.activate();

      // Let it fully activate
      for (let i = 0; i < 20; i++) {
        effect.update(25);
      }

      const activeIntensity = effect.getIntensity();
      expect(activeIntensity).toBeGreaterThan(0.9);

      // Deactivate
      effect.deactivate();

      // Update to transition out
      for (let i = 0; i < 20; i++) {
        effect.update(25);
      }

      // Intensity should be close to 0
      expect(effect.getIntensity()).toBeLessThan(0.1);
    });
  });

  describe("Rendering", () => {
    it("should not render when inactive", () => {
      effect.render(mockCtx);

      expect(mockCtx.save).not.toHaveBeenCalled();
      expect(mockCtx.fillRect).not.toHaveBeenCalled();
    });

    it("should render when active with visual effects enabled", () => {
      setQualitySettings({ visualEffects: true });

      effect.activate();
      effect.update(500); // Let transition complete

      effect.render(mockCtx);

      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
      expect(mockCtx.fillRect).toHaveBeenCalled();
    });

    it("should not render when visual effects are disabled", () => {
      setQualitySettings({ visualEffects: false });

      effect.activate();
      effect.update(500);

      effect.render(mockCtx);

      expect(mockCtx.fillRect).not.toHaveBeenCalled();
    });

    it("should render edge waves only with glow effects enabled", () => {
      setQualitySettings({ visualEffects: true, glowEffects: true });

      effect.activate();
      effect.update(500);

      effect.render(mockCtx);

      expect(mockCtx.stroke).toHaveBeenCalled();
    });

    it("should not render edge waves when glow effects disabled", () => {
      setQualitySettings({ visualEffects: true, glowEffects: false });

      effect.activate();
      effect.update(500);

      const strokeCalls = mockCtx.stroke.mock.calls.length;

      effect.render(mockCtx);

      // Should not have additional stroke calls (edge waves)
      expect(mockCtx.stroke.mock.calls.length).toBe(strokeCalls);
    });
  });

  describe("Configuration", () => {
    it("should accept custom configuration", () => {
      const customEffect = new SlowMotionEffect({
        vignetteColor: "rgba(255, 0, 0, 0.5)",
        vignetteIntensity: 0.5,
        waveAmplitude: 10,
        waveFrequency: 0.004,
        transitionDuration: 1000,
      });

      expect(customEffect).toBeInstanceOf(SlowMotionEffect);
    });

    it("should allow updating configuration", () => {
      effect.updateConfig({
        vignetteIntensity: 0.8,
        transitionDuration: 200,
      });

      effect.activate();

      // Faster transition (200ms instead of 500ms)
      for (let i = 0; i < 10; i++) {
        effect.update(20); // 200ms total
      }

      expect(effect.getIntensity()).toBeGreaterThan(0.8);
    });
  });

  describe("Wave Animation", () => {
    it("should animate wave phase over time", () => {
      setQualitySettings({ visualEffects: true, glowEffects: true });

      effect.activate();
      effect.update(500);

      // Render at different times to check wave animation
      const strokeCalls1 = mockCtx.stroke.mock.calls.length;
      effect.render(mockCtx);
      const strokeCalls2 = mockCtx.stroke.mock.calls.length;

      // Update wave phase
      effect.update(100);

      effect.render(mockCtx);
      const strokeCalls3 = mockCtx.stroke.mock.calls.length;

      // Should have rendered waves both times
      expect(strokeCalls2).toBeGreaterThan(strokeCalls1);
      expect(strokeCalls3).toBeGreaterThan(strokeCalls2);
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero intensity gracefully", () => {
      effect.render(mockCtx);

      expect(mockCtx.save).not.toHaveBeenCalled();
    });

    it("should handle rapid activate/deactivate cycles", () => {
      effect.activate();
      effect.update(10);
      effect.deactivate();
      effect.update(10);
      effect.activate();
      effect.update(10);

      expect(effect.isActive()).toBe(true);
      expect(effect.getIntensity()).toBeGreaterThan(0);
    });

    it("should not become active after full deactivation", () => {
      effect.activate();
      for (let i = 0; i < 20; i++) {
        effect.update(25);
      }

      effect.deactivate();

      // Complete deactivation
      for (let i = 0; i < 30; i++) {
        effect.update(25);
      }

      expect(effect.isActive()).toBe(false);
      expect(effect.getIntensity()).toBe(0);
    });
  });
});
