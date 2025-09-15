import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useSettings } from '../useSettings';
import { useUIStore } from '../../stores/uiStore';

// Mock the UI store
vi.mock('../../stores/uiStore');

const mockUseUIStore = vi.mocked(useUIStore);

const mockStoreActions = {
  updateSettings: vi.fn()
};

const mockStoreSettings = {
  soundEnabled: true,
  musicEnabled: true,
  volume: 0.7,
  theme: 'light' as const,
  difficulty: 'normal' as const,
  controls: 'keyboard' as const,
  inputSensitivity: {
    keyboard: 1.0,
    mouse: 1.0,
    touch: 1.0,
  },
};

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('useSettings Hook', () => {
  beforeEach(() => {
    mockUseUIStore.mockReturnValue({
      settings: mockStoreSettings,
      ...mockStoreActions
    });

    mockLocalStorage.getItem.mockReturnValue(null);
    mockLocalStorage.setItem.mockClear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with store settings', () => {
    const { result } = renderHook(() => useSettings());

    expect(result.current.settings).toEqual(mockStoreSettings);
    expect(result.current.hasUnsavedChanges).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('should update local settings', () => {
    const { result } = renderHook(() => useSettings());

    act(() => {
      result.current.updateSettings({ volume: 0.5 });
    });

    expect(result.current.settings.volume).toBe(0.5);
    expect(result.current.hasUnsavedChanges).toBe(true);
  });

  it('should save settings to localStorage and store', async () => {
    const { result } = renderHook(() => useSettings());

    // Update settings first
    act(() => {
      result.current.updateSettings({ volume: 0.8, theme: 'dark' });
    });

    expect(result.current.hasUnsavedChanges).toBe(true);

    // Save settings
    await act(async () => {
      await result.current.saveSettings();
    });

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'game-settings',
      JSON.stringify({
        ...mockStoreSettings,
        volume: 0.8,
        theme: 'dark'
      })
    );

    expect(mockStoreActions.updateSettings).toHaveBeenCalledWith({
      ...mockStoreSettings,
      volume: 0.8,
      theme: 'dark'
    });
  });

  it('should load settings from localStorage', async () => {
    const savedSettings = {
      ...mockStoreSettings,
      volume: 0.9,
      theme: 'dark' as const
    };

    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(savedSettings));

    const { result } = renderHook(() => useSettings());

    // Manually trigger load
    await act(async () => {
      await result.current.loadSettings();
    });

    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('game-settings');
    expect(result.current.settings).toEqual(savedSettings);
    expect(mockStoreActions.updateSettings).toHaveBeenCalledWith(savedSettings);
  });

  it('should handle corrupted localStorage gracefully', async () => {
    mockLocalStorage.getItem.mockReturnValue('invalid-json');

    const { result } = renderHook(() => useSettings());

    await act(async () => {
      await result.current.loadSettings();
    });

    // Should fall back to defaults
    expect(result.current.settings).toEqual(expect.objectContaining({
      soundEnabled: true,
      musicEnabled: true,
      volume: 0.7,
      theme: 'light',
      difficulty: 'normal',
      controls: 'keyboard'
    }));
  });

  it('should reset settings to defaults', () => {
    const { result } = renderHook(() => useSettings());

    // Update settings first
    act(() => {
      result.current.updateSettings({ volume: 0.1, soundEnabled: false });
    });

    // Reset settings
    act(() => {
      result.current.resetSettings();
    });

    expect(result.current.settings).toEqual(expect.objectContaining({
      soundEnabled: true,
      musicEnabled: true,
      volume: 0.7,
      theme: 'light',
      difficulty: 'normal'
    }));
    // If defaults match store settings, hasUnsavedChanges should be false
    // This is correct behavior - resetting to same values as store = no changes
    expect(result.current.hasUnsavedChanges).toBe(false);
  });

  it('should validate and merge settings with defaults on load', async () => {
    const partialSettings = {
      volume: 0.5,
      theme: 'dark',
      // Missing inputSensitivity and other fields
    };

    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(partialSettings));

    const { result } = renderHook(() => useSettings());

    await act(async () => {
      await result.current.loadSettings();
    });

    expect(result.current.settings).toEqual(expect.objectContaining({
      volume: 0.5,
      theme: 'dark',
      soundEnabled: true, // Default value
      inputSensitivity: { // Default structure
        keyboard: 1.0,
        mouse: 1.0,
        touch: 1.0
      }
    }));
  });

  it('should handle save errors gracefully', async () => {
    const mockSetItem = vi.fn().mockImplementation(() => {
      throw new Error('Storage quota exceeded');
    });
    mockLocalStorage.setItem = mockSetItem;

    const { result } = renderHook(() => useSettings());

    act(() => {
      result.current.updateSettings({ volume: 0.5 });
    });

    await expect(
      act(async () => {
        await result.current.saveSettings();
      })
    ).rejects.toThrow();

    expect(result.current.isLoading).toBe(false);
  });

  it('should apply theme to document on save', async () => {
    const mockSetAttribute = vi.spyOn(document.documentElement, 'setAttribute');
    // Reset mock to avoid interference from previous test
    mockLocalStorage.setItem = vi.fn();

    const { result } = renderHook(() => useSettings());

    act(() => {
      result.current.updateSettings({ theme: 'dark' });
    });

    await act(async () => {
      await result.current.saveSettings();
    });

    expect(mockSetAttribute).toHaveBeenCalledWith('data-theme', 'dark');

    mockSetAttribute.mockRestore();
  });
});