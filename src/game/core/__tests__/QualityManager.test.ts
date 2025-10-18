import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QualityManager } from '../QualityManager';
import {
  QualityLevel,
  setQualityLevel,
  getQualitySettings,
} from '../../../stores/qualitySettingsStore';

describe('QualityManager', () => {
  let qualityManager: QualityManager;

  beforeEach(() => {
    qualityManager = new QualityManager();
    // Start with MEDIUM quality
    setQualityLevel(QualityLevel.MEDIUM);
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with default settings', () => {
      const manager = new QualityManager();
      expect(manager).toBeInstanceOf(QualityManager);
      expect(manager.getCurrentAverageFPS()).toBe(0);
    });
  });

  describe('FPS History Tracking', () => {
    it('should track FPS history', () => {
      qualityManager.update(60, 1000);
      qualityManager.update(58, 1100);
      qualityManager.update(62, 1200);

      const avgFPS = qualityManager.getCurrentAverageFPS();
      expect(avgFPS).toBeCloseTo(60, 0);
    });

    it('should maintain history size limit (60 frames)', () => {
      // Add 100 FPS readings
      for (let i = 0; i < 100; i++) {
        qualityManager.update(60, i * 100);
      }

      // History should be capped at 60
      const avgFPS = qualityManager.getCurrentAverageFPS();
      expect(avgFPS).toBe(60);
    });

    it('should reset history after quality adjustment', () => {
      setQualityLevel(QualityLevel.HIGH);
      qualityManager.resetHistory();

      // Add low FPS to trigger downgrade
      for (let i = 0; i < 60; i++) {
        qualityManager.update(30, i * 100);
      }

      // Wait for cooldown
      qualityManager.update(30, 6000);

      // Check if downgraded
      expect(getQualitySettings().level).toBe(QualityLevel.MEDIUM);
    });
  });

  describe('Quality Downgrade', () => {
    it('should downgrade from HIGH to MEDIUM when FPS too low', () => {
      setQualityLevel(QualityLevel.HIGH);
      const targetFPS = getQualitySettings().targetFPS;

      // Build up FPS history below target
      const lowFPS = targetFPS - 10;
      for (let i = 0; i < 60; i++) {
        qualityManager.update(lowFPS, i * 100);
      }

      // Trigger check after cooldown
      qualityManager.update(lowFPS, 6000);

      expect(getQualitySettings().level).toBe(QualityLevel.MEDIUM);
    });

    it('should downgrade from MEDIUM to LOW when FPS too low', () => {
      setQualityLevel(QualityLevel.MEDIUM);
      const targetFPS = getQualitySettings().targetFPS;

      // Build up FPS history below target
      const lowFPS = targetFPS - 10;
      for (let i = 0; i < 60; i++) {
        qualityManager.update(lowFPS, i * 100);
      }

      // Trigger check after cooldown
      qualityManager.update(lowFPS, 6000);

      expect(getQualitySettings().level).toBe(QualityLevel.LOW);
    });

    it('should not downgrade below LOW', () => {
      setQualityLevel(QualityLevel.LOW);

      // Try to trigger downgrade with very low FPS
      for (let i = 0; i < 60; i++) {
        qualityManager.update(20, i * 100);
      }
      qualityManager.update(20, 6000);

      expect(getQualitySettings().level).toBe(QualityLevel.LOW);
    });

    it('should respect cooldown period', () => {
      setQualityLevel(QualityLevel.HIGH);
      const targetFPS = getQualitySettings().targetFPS;
      const lowFPS = targetFPS - 10;

      // Build up history
      for (let i = 0; i < 60; i++) {
        qualityManager.update(lowFPS, i * 100);
      }

      // First adjustment at 6000ms
      qualityManager.update(lowFPS, 6000);
      expect(getQualitySettings().level).toBe(QualityLevel.MEDIUM);

      // Try to adjust again immediately
      setQualityLevel(QualityLevel.HIGH); // Manually set back to HIGH
      for (let i = 0; i < 60; i++) {
        qualityManager.update(lowFPS, 6100 + i * 10);
      }
      qualityManager.update(lowFPS, 7000); // Within cooldown

      // Should still be HIGH because within cooldown
      expect(getQualitySettings().level).toBe(QualityLevel.HIGH);
    });
  });

  describe('Quality Upgrade', () => {
    it('should upgrade from LOW to MEDIUM when FPS high enough', () => {
      setQualityLevel(QualityLevel.LOW);
      const targetFPS = getQualitySettings().targetFPS;

      // Build up FPS history above target
      const highFPS = targetFPS + 15;
      for (let i = 0; i < 60; i++) {
        qualityManager.update(highFPS, i * 100);
      }

      // Trigger check after cooldown
      qualityManager.update(highFPS, 6000);

      expect(getQualitySettings().level).toBe(QualityLevel.MEDIUM);
    });

    it('should upgrade from MEDIUM to HIGH when FPS high enough', () => {
      setQualityLevel(QualityLevel.MEDIUM);
      const targetFPS = getQualitySettings().targetFPS;

      // Build up FPS history above target
      const highFPS = targetFPS + 15;
      for (let i = 0; i < 60; i++) {
        qualityManager.update(highFPS, i * 100);
      }

      // Trigger check after cooldown
      qualityManager.update(highFPS, 6000);

      expect(getQualitySettings().level).toBe(QualityLevel.HIGH);
    });

    it('should not upgrade above HIGH', () => {
      setQualityLevel(QualityLevel.HIGH);

      // Try to trigger upgrade with very high FPS
      for (let i = 0; i < 60; i++) {
        qualityManager.update(120, i * 100);
      }
      qualityManager.update(120, 6000);

      expect(getQualitySettings().level).toBe(QualityLevel.HIGH);
    });
  });

  describe('Auto-Adjust Control', () => {
    it('should not adjust when auto-adjust is disabled', () => {
      setQualityLevel(QualityLevel.HIGH);
      qualityManager.setEnabled(false);

      // Try to trigger downgrade
      const targetFPS = getQualitySettings().targetFPS;
      const lowFPS = targetFPS - 10;
      for (let i = 0; i < 60; i++) {
        qualityManager.update(lowFPS, i * 100);
      }
      qualityManager.update(lowFPS, 6000);

      // Should still be HIGH
      expect(getQualitySettings().level).toBe(QualityLevel.HIGH);
    });

    it('should clear history when disabled', () => {
      // Add some FPS data
      for (let i = 0; i < 30; i++) {
        qualityManager.update(60, i * 100);
      }
      expect(qualityManager.getCurrentAverageFPS()).toBeGreaterThan(0);

      // Disable
      qualityManager.setEnabled(false);

      // History should be cleared
      expect(qualityManager.getCurrentAverageFPS()).toBe(0);
    });

    it('should resume adjustment when re-enabled', () => {
      qualityManager.setEnabled(false);
      qualityManager.setEnabled(true);

      setQualityLevel(QualityLevel.HIGH);
      const targetFPS = getQualitySettings().targetFPS;
      const lowFPS = targetFPS - 10;

      // Build history and trigger downgrade
      for (let i = 0; i < 60; i++) {
        qualityManager.update(lowFPS, i * 100);
      }
      qualityManager.update(lowFPS, 6000);

      expect(getQualitySettings().level).toBe(QualityLevel.MEDIUM);
    });
  });

  describe('getSettings', () => {
    it('should return current quality settings', () => {
      setQualityLevel(QualityLevel.LOW);

      const settings = qualityManager.getSettings();
      expect(settings.level).toBe(QualityLevel.LOW);
      expect(settings.particleDensity).toBe(0.3);
    });
  });

  describe('resetHistory', () => {
    it('should clear FPS history', () => {
      // Add FPS data
      for (let i = 0; i < 30; i++) {
        qualityManager.update(60, i * 100);
      }
      expect(qualityManager.getCurrentAverageFPS()).toBeGreaterThan(0);

      // Reset
      qualityManager.resetHistory();
      expect(qualityManager.getCurrentAverageFPS()).toBe(0);
    });

    it('should reset last adjust time', () => {
      // Trigger an adjustment
      setQualityLevel(QualityLevel.HIGH);
      for (let i = 0; i < 60; i++) {
        qualityManager.update(30, i * 100);
      }
      qualityManager.update(30, 6000);

      // Reset history
      qualityManager.resetHistory();

      // Should be able to adjust again immediately
      setQualityLevel(QualityLevel.HIGH);
      for (let i = 0; i < 60; i++) {
        qualityManager.update(30, 6100 + i * 100);
      }
      qualityManager.update(30, 12000);

      expect(getQualitySettings().level).toBe(QualityLevel.MEDIUM);
    });
  });

  describe('Hysteresis (buffer zones)', () => {
    it('should have 5 FPS buffer for downgrade', () => {
      setQualityLevel(QualityLevel.MEDIUM);
      const targetFPS = getQualitySettings().targetFPS; // 55

      // FPS at exactly target should not downgrade
      for (let i = 0; i < 60; i++) {
        qualityManager.update(targetFPS, i * 100);
      }
      qualityManager.update(targetFPS, 6000);
      expect(getQualitySettings().level).toBe(QualityLevel.MEDIUM);

      // FPS at target - 4 should not downgrade
      qualityManager.resetHistory();
      for (let i = 0; i < 60; i++) {
        qualityManager.update(targetFPS - 4, i * 100);
      }
      qualityManager.update(targetFPS - 4, 6000);
      expect(getQualitySettings().level).toBe(QualityLevel.MEDIUM);

      // FPS at target - 6 should downgrade
      qualityManager.resetHistory();
      for (let i = 0; i < 60; i++) {
        qualityManager.update(targetFPS - 6, i * 100);
      }
      qualityManager.update(targetFPS - 6, 6000);
      expect(getQualitySettings().level).toBe(QualityLevel.LOW);
    });

    it('should have 10 FPS buffer for upgrade', () => {
      setQualityLevel(QualityLevel.MEDIUM);
      const targetFPS = getQualitySettings().targetFPS; // 55

      // FPS at exactly target should not upgrade
      for (let i = 0; i < 60; i++) {
        qualityManager.update(targetFPS, i * 100);
      }
      qualityManager.update(targetFPS, 6000);
      expect(getQualitySettings().level).toBe(QualityLevel.MEDIUM);

      // FPS at target + 9 should not upgrade
      qualityManager.resetHistory();
      for (let i = 0; i < 60; i++) {
        qualityManager.update(targetFPS + 9, i * 100);
      }
      qualityManager.update(targetFPS + 9, 6000);
      expect(getQualitySettings().level).toBe(QualityLevel.MEDIUM);

      // FPS at target + 11 should upgrade
      qualityManager.resetHistory();
      for (let i = 0; i < 60; i++) {
        qualityManager.update(targetFPS + 11, i * 100);
      }
      qualityManager.update(targetFPS + 11, 6000);
      expect(getQualitySettings().level).toBe(QualityLevel.HIGH);
    });
  });
});
