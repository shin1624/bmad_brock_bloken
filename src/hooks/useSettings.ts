import { useCallback, useEffect, useState } from 'react';
import { useUIStore, UIState } from '../stores/uiStore';

interface UseSettingsReturn {
  settings: UIState['settings'];
  updateSettings: (newSettings: Partial<UIState['settings']>) => void;
  resetSettings: () => void;
  saveSettings: () => Promise<void>;
  loadSettings: () => Promise<void>;
  isLoading: boolean;
  hasUnsavedChanges: boolean;
}

const SETTINGS_STORAGE_KEY = 'game-settings';

const clamp = (value: number, min = 0, max = 1): number =>
  Math.max(min, Math.min(max, value));

const DEFAULT_SETTINGS: UIState['settings'] = {
  soundEnabled: true,
  musicEnabled: true,
  audioEnabled: true,
  volume: 0.7,
  masterVolume: 0.7,
  sfxVolume: 0.7,
  bgmVolume: 0.6,
  theme: 'light',
  difficulty: 'normal',
  controls: 'keyboard',
  inputSensitivity: {
    keyboard: 1.0,
    mouse: 1.0,
    touch: 1.0,
  },
};

const normalizeSettings = (settings: UIState['settings']): UIState['settings'] => {
  const master = clamp(settings.masterVolume ?? settings.volume ?? DEFAULT_SETTINGS.masterVolume);
  const sfx = clamp(settings.sfxVolume ?? DEFAULT_SETTINGS.sfxVolume);
  const bgm = clamp(settings.bgmVolume ?? DEFAULT_SETTINGS.bgmVolume);

  return {
    ...settings,
    audioEnabled: settings.audioEnabled ?? true,
    soundEnabled: settings.soundEnabled ?? true,
    musicEnabled: settings.musicEnabled ?? true,
    masterVolume: master,
    volume: master,
    sfxVolume: sfx,
    bgmVolume: bgm,
    inputSensitivity: {
      ...DEFAULT_SETTINGS.inputSensitivity,
      ...(settings.inputSensitivity || {}),
    },
  };
};

const mergeSettings = (
  previous: UIState['settings'],
  patch: Partial<UIState['settings']>,
): UIState['settings'] => {
  const mergedInputSensitivity = patch.inputSensitivity
    ? {
        keyboard: patch.inputSensitivity.keyboard ?? previous.inputSensitivity.keyboard,
        mouse: patch.inputSensitivity.mouse ?? previous.inputSensitivity.mouse,
        touch: patch.inputSensitivity.touch ?? previous.inputSensitivity.touch,
      }
    : previous.inputSensitivity;

  const merged: UIState['settings'] = {
    ...previous,
    ...patch,
    inputSensitivity: mergedInputSensitivity,
  };

  if (typeof patch.volume === 'number' && typeof patch.masterVolume !== 'number') {
    merged.masterVolume = patch.volume;
  }

  if (typeof patch.masterVolume === 'number' && typeof patch.volume !== 'number') {
    merged.volume = patch.masterVolume;
  }

  if (typeof patch.sfxVolume === 'number') {
    merged.sfxVolume = clamp(patch.sfxVolume);
  }

  if (typeof patch.bgmVolume === 'number') {
    merged.bgmVolume = clamp(patch.bgmVolume);
  }

  return normalizeSettings(merged);
};

export const useSettings = (): UseSettingsReturn => {
  const { settings: storeSettings, updateSettings: updateStoreSettings } = useUIStore();
  const [localSettings, setLocalSettings] = useState<UIState['settings']>(normalizeSettings(storeSettings));
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    const hasChanges = JSON.stringify(localSettings) !== JSON.stringify(normalizeSettings(storeSettings));
    setHasUnsavedChanges(hasChanges);
  }, [localSettings, storeSettings]);

  const updateSettings = useCallback((newSettings: Partial<UIState['settings']>) => {
    setLocalSettings((prev) => mergeSettings(prev, newSettings));
  }, []);

  const saveSettings = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const normalized = normalizeSettings(localSettings);

      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(normalized));
      updateStoreSettings(normalized);
      document.documentElement.setAttribute('data-theme', normalized.theme);

      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [localSettings, updateStoreSettings]);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
      
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings) as UIState['settings'];
        const validatedSettings = normalizeSettings({
          ...DEFAULT_SETTINGS,
          ...parsed,
        });
        
        setLocalSettings(validatedSettings);
        updateStoreSettings(validatedSettings);
        document.documentElement.setAttribute('data-theme', validatedSettings.theme);
      }
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
    } catch (error) {
      console.error('Failed to load settings:', error);
      const normalizedDefaults = normalizeSettings(DEFAULT_SETTINGS);
      setLocalSettings(normalizedDefaults);
      updateStoreSettings(normalizedDefaults);
    } finally {
      setIsLoading(false);
    }
  }, [updateStoreSettings]);

  const resetSettings = useCallback(() => {
    setLocalSettings(normalizeSettings(DEFAULT_SETTINGS));
  }, []);

  useEffect(() => {
    setLocalSettings(normalizeSettings(storeSettings));
  }, [storeSettings]);

  return {
    settings: localSettings,
    updateSettings,
    resetSettings,
    saveSettings,
    loadSettings,
    isLoading,
    hasUnsavedChanges
  };
};
