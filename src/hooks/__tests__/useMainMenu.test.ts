import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useMainMenu } from '../useMainMenu';
import { useUIStore } from '../../stores/uiStore';

// Mock the UI store
vi.mock('../../stores/uiStore');

const mockUseUIStore = vi.mocked(useUIStore);

const mockStoreActions = {
  setCurrentScreen: vi.fn(),
  setSelectedLevel: vi.fn()
};

describe('useMainMenu Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseUIStore.mockReturnValue({
      currentScreen: 'menu',
      ...mockStoreActions
    });
  });

  it('should return initial menu state', () => {
    const { result } = renderHook(() => useMainMenu());

    expect(result.current.menuState).toEqual({
      currentMenu: 'main',
      navigationHistory: [],
      isAnimating: false
    });
    
    expect(result.current.isLoading).toBe(false);
  });

  it('should handle startGame correctly', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useMainMenu());

    act(() => {
      result.current.startGame(3);
    });

    // Should be loading immediately
    expect(result.current.isLoading).toBe(true);
    expect(mockStoreActions.setSelectedLevel).toHaveBeenCalledWith(3);

    // Fast-forward timer
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Should complete loading and navigate to game
    expect(result.current.isLoading).toBe(false);
    expect(mockStoreActions.setCurrentScreen).toHaveBeenCalledWith('game');

    vi.useRealTimers();
  });

  it('should handle openSettings correctly', () => {
    const { result } = renderHook(() => useMainMenu());

    act(() => {
      result.current.openSettings();
    });

    expect(result.current.menuState.currentMenu).toBe('settings');
    expect(result.current.menuState.navigationHistory).toEqual(['main']);
    expect(result.current.menuState.isAnimating).toBe(true);
  });

  it('should handle openHighScores correctly', () => {
    const { result } = renderHook(() => useMainMenu());

    act(() => {
      result.current.openHighScores();
    });

    expect(result.current.menuState.currentMenu).toBe('highScores');
    expect(result.current.menuState.navigationHistory).toEqual(['main']);
    expect(result.current.menuState.isAnimating).toBe(true);
  });

  it('should handle openLevelSelect correctly', () => {
    const { result } = renderHook(() => useMainMenu());

    act(() => {
      result.current.openLevelSelect();
    });

    expect(result.current.menuState.currentMenu).toBe('levelSelect');
    expect(result.current.menuState.navigationHistory).toEqual(['main']);
    expect(result.current.menuState.isAnimating).toBe(true);
  });

  it('should handle goBack correctly', () => {
    const { result } = renderHook(() => useMainMenu());

    // Navigate to settings first
    act(() => {
      result.current.openSettings();
    });

    // Then go back
    act(() => {
      result.current.goBack();
    });

    expect(result.current.menuState.currentMenu).toBe('main');
    expect(result.current.menuState.navigationHistory).toEqual([]);
    expect(result.current.menuState.isAnimating).toBe(true);
  });

  it('should handle goBack with empty history', () => {
    const { result } = renderHook(() => useMainMenu());

    act(() => {
      result.current.goBack();
    });

    expect(result.current.menuState.currentMenu).toBe('main');
    expect(result.current.menuState.navigationHistory).toEqual([]);
  });

  it('should reset animation state after timeout', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useMainMenu());

    act(() => {
      result.current.openSettings();
    });

    expect(result.current.menuState.isAnimating).toBe(true);

    // Fast-forward animation timeout
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.menuState.isAnimating).toBe(false);

    vi.useRealTimers();
  });

  it('should handle multiple navigation actions', () => {
    const { result } = renderHook(() => useMainMenu());

    // Navigate: main -> settings -> highScores
    act(() => {
      result.current.openSettings();
    });

    act(() => {
      result.current.openHighScores();
    });

    expect(result.current.menuState.currentMenu).toBe('highScores');
    expect(result.current.menuState.navigationHistory).toEqual(['main', 'settings']);

    // Go back: highScores -> settings
    act(() => {
      result.current.goBack();
    });

    expect(result.current.menuState.currentMenu).toBe('settings');
    expect(result.current.menuState.navigationHistory).toEqual(['main']);

    // Go back: settings -> main
    act(() => {
      result.current.goBack();
    });

    expect(result.current.menuState.currentMenu).toBe('main');
    expect(result.current.menuState.navigationHistory).toEqual([]);
  });
});