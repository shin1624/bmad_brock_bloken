import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export enum QualityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export interface QualitySettings {
  level: QualityLevel;
  particleDensity: number; // 0.0-1.0
  visualEffects: boolean; // Enable/disable visual effects
  glowEffects: boolean; // Enable/disable glow
  maxActiveProjectiles: number; // Projectile pool limit
  targetFPS: number; // Performance target
  autoAdjust: boolean; // Enable automatic quality adjustment
}

export const QUALITY_PRESETS: Record<QualityLevel, QualitySettings> = {
  [QualityLevel.LOW]: {
    level: QualityLevel.LOW,
    particleDensity: 0.3,
    visualEffects: false,
    glowEffects: false,
    maxActiveProjectiles: 10,
    targetFPS: 60,
    autoAdjust: true,
  },
  [QualityLevel.MEDIUM]: {
    level: QualityLevel.MEDIUM,
    particleDensity: 0.6,
    visualEffects: true,
    glowEffects: false,
    maxActiveProjectiles: 15,
    targetFPS: 55,
    autoAdjust: true,
  },
  [QualityLevel.HIGH]: {
    level: QualityLevel.HIGH,
    particleDensity: 1.0,
    visualEffects: true,
    glowEffects: true,
    maxActiveProjectiles: 20,
    targetFPS: 50,
    autoAdjust: true,
  },
};

interface QualitySettingsStore {
  settings: QualitySettings;
  setQualityLevel: (level: QualityLevel) => void;
  setSettings: (settings: Partial<QualitySettings>) => void;
  resetToDefaults: () => void;
  getSettings: () => QualitySettings;
}

export const useQualitySettingsStore = create<QualitySettingsStore>()(
  persist(
    (set, get) => ({
      settings: QUALITY_PRESETS[QualityLevel.MEDIUM],

      setQualityLevel: (level: QualityLevel) => {
        const preset = QUALITY_PRESETS[level];
        set({ settings: { ...preset, autoAdjust: get().settings.autoAdjust } });
      },

      setSettings: (partialSettings: Partial<QualitySettings>) => {
        set((state) => ({
          settings: { ...state.settings, ...partialSettings },
        }));
      },

      resetToDefaults: () => {
        set({ settings: QUALITY_PRESETS[QualityLevel.MEDIUM] });
      },

      getSettings: () => get().settings,
    }),
    {
      name: 'quality-settings-storage',
    }
  )
);

// Helper functions for external access
export const getQualitySettings = (): QualitySettings =>
  useQualitySettingsStore.getState().settings;

export const setQualitySettings = (settings: Partial<QualitySettings>): void =>
  useQualitySettingsStore.getState().setSettings(settings);

export const setQualityLevel = (level: QualityLevel): void =>
  useQualitySettingsStore.getState().setQualityLevel(level);
