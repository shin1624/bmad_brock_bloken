import { describe, it, expect, beforeEach } from 'vitest';
import {
  useQualitySettingsStore,
  QualityLevel,
  QUALITY_PRESETS,
  getQualitySettings,
  setQualitySettings,
  setQualityLevel,
} from '../qualitySettingsStore';

describe('qualitySettingsStore', () => {
  beforeEach(() => {
    // Reset store to default state
    useQualitySettingsStore.getState().resetToDefaults();
  });

  describe('QUALITY_PRESETS', () => {
    it('should have presets for all quality levels', () => {
      expect(QUALITY_PRESETS[QualityLevel.LOW]).toBeDefined();
      expect(QUALITY_PRESETS[QualityLevel.MEDIUM]).toBeDefined();
      expect(QUALITY_PRESETS[QualityLevel.HIGH]).toBeDefined();
    });

    it('LOW preset should have lowest quality settings', () => {
      const low = QUALITY_PRESETS[QualityLevel.LOW];
      expect(low.level).toBe(QualityLevel.LOW);
      expect(low.particleDensity).toBe(0.3);
      expect(low.visualEffects).toBe(false);
      expect(low.glowEffects).toBe(false);
      expect(low.maxActiveProjectiles).toBe(10);
      expect(low.targetFPS).toBe(60);
    });

    it('MEDIUM preset should have balanced settings', () => {
      const medium = QUALITY_PRESETS[QualityLevel.MEDIUM];
      expect(medium.level).toBe(QualityLevel.MEDIUM);
      expect(medium.particleDensity).toBe(0.6);
      expect(medium.visualEffects).toBe(true);
      expect(medium.glowEffects).toBe(false);
      expect(medium.maxActiveProjectiles).toBe(15);
      expect(medium.targetFPS).toBe(55);
    });

    it('HIGH preset should have highest quality settings', () => {
      const high = QUALITY_PRESETS[QualityLevel.HIGH];
      expect(high.level).toBe(QualityLevel.HIGH);
      expect(high.particleDensity).toBe(1.0);
      expect(high.visualEffects).toBe(true);
      expect(high.glowEffects).toBe(true);
      expect(high.maxActiveProjectiles).toBe(20);
      expect(high.targetFPS).toBe(50);
    });
  });

  describe('useQualitySettingsStore', () => {
    it('should initialize with MEDIUM preset', () => {
      const state = useQualitySettingsStore.getState();
      expect(state.settings.level).toBe(QualityLevel.MEDIUM);
      expect(state.settings.particleDensity).toBe(0.6);
    });

    it('should change quality level with setQualityLevel', () => {
      const { setQualityLevel } = useQualitySettingsStore.getState();

      setQualityLevel(QualityLevel.LOW);
      let settings = useQualitySettingsStore.getState().settings;
      expect(settings.level).toBe(QualityLevel.LOW);
      expect(settings.particleDensity).toBe(0.3);

      setQualityLevel(QualityLevel.HIGH);
      settings = useQualitySettingsStore.getState().settings;
      expect(settings.level).toBe(QualityLevel.HIGH);
      expect(settings.particleDensity).toBe(1.0);
    });

    it('should preserve autoAdjust when changing quality level', () => {
      const { setSettings, setQualityLevel } = useQualitySettingsStore.getState();

      // Disable auto-adjust
      setSettings({ autoAdjust: false });
      expect(useQualitySettingsStore.getState().settings.autoAdjust).toBe(false);

      // Change quality level
      setQualityLevel(QualityLevel.LOW);

      // Auto-adjust should still be disabled
      expect(useQualitySettingsStore.getState().settings.autoAdjust).toBe(false);
    });

    it('should update partial settings with setSettings', () => {
      const { setSettings } = useQualitySettingsStore.getState();

      setSettings({ particleDensity: 0.5 });
      let settings = useQualitySettingsStore.getState().settings;
      expect(settings.particleDensity).toBe(0.5);
      expect(settings.level).toBe(QualityLevel.MEDIUM); // Other settings unchanged

      setSettings({ autoAdjust: false, visualEffects: false });
      settings = useQualitySettingsStore.getState().settings;
      expect(settings.autoAdjust).toBe(false);
      expect(settings.visualEffects).toBe(false);
      expect(settings.particleDensity).toBe(0.5); // Previous change persisted
    });

    it('should reset to defaults', () => {
      const { setSettings, resetToDefaults } = useQualitySettingsStore.getState();

      // Make changes
      setSettings({ particleDensity: 0.1, autoAdjust: false });
      expect(useQualitySettingsStore.getState().settings.particleDensity).toBe(0.1);

      // Reset
      resetToDefaults();
      const settings = useQualitySettingsStore.getState().settings;
      expect(settings.level).toBe(QualityLevel.MEDIUM);
      expect(settings.particleDensity).toBe(0.6);
      expect(settings.autoAdjust).toBe(true);
    });

    it('should return current settings with getSettings', () => {
      const { getSettings, setQualityLevel } = useQualitySettingsStore.getState();

      setQualityLevel(QualityLevel.HIGH);
      const settings = getSettings();

      expect(settings.level).toBe(QualityLevel.HIGH);
      expect(settings.particleDensity).toBe(1.0);
    });
  });

  describe('Helper functions', () => {
    it('getQualitySettings should return current settings', () => {
      useQualitySettingsStore.getState().setQualityLevel(QualityLevel.LOW);

      const settings = getQualitySettings();
      expect(settings.level).toBe(QualityLevel.LOW);
      expect(settings.particleDensity).toBe(0.3);
    });

    it('setQualitySettings should update settings', () => {
      setQualitySettings({ particleDensity: 0.8, glowEffects: true });

      const settings = getQualitySettings();
      expect(settings.particleDensity).toBe(0.8);
      expect(settings.glowEffects).toBe(true);
    });

    it('setQualityLevel should change quality level', () => {
      setQualityLevel(QualityLevel.HIGH);

      const settings = getQualitySettings();
      expect(settings.level).toBe(QualityLevel.HIGH);
      expect(settings.maxActiveProjectiles).toBe(20);
    });
  });

  describe('Quality level progression', () => {
    it('should have increasing particle density from LOW to HIGH', () => {
      const low = QUALITY_PRESETS[QualityLevel.LOW].particleDensity;
      const medium = QUALITY_PRESETS[QualityLevel.MEDIUM].particleDensity;
      const high = QUALITY_PRESETS[QualityLevel.HIGH].particleDensity;

      expect(low).toBeLessThan(medium);
      expect(medium).toBeLessThan(high);
    });

    it('should have increasing max projectiles from LOW to HIGH', () => {
      const low = QUALITY_PRESETS[QualityLevel.LOW].maxActiveProjectiles;
      const medium = QUALITY_PRESETS[QualityLevel.MEDIUM].maxActiveProjectiles;
      const high = QUALITY_PRESETS[QualityLevel.HIGH].maxActiveProjectiles;

      expect(low).toBeLessThan(medium);
      expect(medium).toBeLessThan(high);
    });

    it('should enable more effects at higher quality levels', () => {
      const low = QUALITY_PRESETS[QualityLevel.LOW];
      const medium = QUALITY_PRESETS[QualityLevel.MEDIUM];
      const high = QUALITY_PRESETS[QualityLevel.HIGH];

      // LOW: no effects
      expect(low.visualEffects).toBe(false);
      expect(low.glowEffects).toBe(false);

      // MEDIUM: visual effects only
      expect(medium.visualEffects).toBe(true);
      expect(medium.glowEffects).toBe(false);

      // HIGH: all effects
      expect(high.visualEffects).toBe(true);
      expect(high.glowEffects).toBe(true);
    });
  });
});
