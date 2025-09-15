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

const DEFAULT_SETTINGS: UIState['settings'] = {
  soundEnabled: true,
  musicEnabled: true,
  volume: 0.7,
  theme: 'light',
  difficulty: 'normal',
  controls: 'keyboard',
  inputSensitivity: {
    keyboard: 1.0,
    mouse: 1.0,
    touch: 1.0,
  },
};

export const useSettings = (): UseSettingsReturn => {
  const { settings: storeSettings, updateSettings: updateStoreSettings } = useUIStore();
  const [localSettings, setLocalSettings] = useState<UIState['settings']>(storeSettings);
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Check for unsaved changes
  useEffect(() => {
    const hasChanges = JSON.stringify(localSettings) !== JSON.stringify(storeSettings);
    setHasUnsavedChanges(hasChanges);
  }, [localSettings, storeSettings]);

  const updateSettings = useCallback((newSettings: Partial<UIState['settings']>) => {
    setLocalSettings(prev => ({
      ...prev,
      ...newSettings
    }));
  }, []);

  const saveSettings = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // Save to localStorage
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(localSettings));
      
      // Update store
      updateStoreSettings(localSettings);
      
      // Apply theme to document
      document.documentElement.setAttribute('data-theme', localSettings.theme);
      
      // Simulate async save operation
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
        
        // Validate and merge with defaults to handle schema changes
        const validatedSettings = {
          ...DEFAULT_SETTINGS,
          ...parsed,
          inputSensitivity: {
            ...DEFAULT_SETTINGS.inputSensitivity,
            ...(parsed.inputSensitivity || {})
          }
        };
        
        setLocalSettings(validatedSettings);
        updateStoreSettings(validatedSettings);
        
        // Apply theme
        document.documentElement.setAttribute('data-theme', validatedSettings.theme);
      }
      
      // Simulate async load operation
      await new Promise(resolve => setTimeout(resolve, 50));
      
    } catch (error) {
      console.error('Failed to load settings:', error);
      // Fall back to defaults on error
      setLocalSettings(DEFAULT_SETTINGS);
      updateStoreSettings(DEFAULT_SETTINGS);
    } finally {
      setIsLoading(false);
    }
  }, [updateStoreSettings]);

  const resetSettings = useCallback(() => {
    setLocalSettings(DEFAULT_SETTINGS);
  }, []);

  // Initialize with store settings but don't auto-load
  useEffect(() => {
    setLocalSettings(storeSettings);
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
};;