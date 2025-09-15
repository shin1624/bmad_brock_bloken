import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useHUD } from '../useHUD';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });



describe('useHUD Hook', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    vi.clearAllTimers();
    vi.useFakeTimers();
    
    // Mock performance.now for each test
    Object.defineProperty(global, 'performance', {
      writable: true,
      value: {
        now: vi.fn(() => Date.now()),
      },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should initialize with default HUD state', () => {
    const { result } = renderHook(() => useHUD());

    expect(result.current.hudState).toEqual({
      score: 0,
      lives: 3,
      level: 1,
      powerUps: [],
      combo: { count: 0, multiplier: 1, streak: 0, timeRemaining: 0 },
      isVisible: true,
      isAnimating: false,
      notifications: [],
      lastUpdateTime: expect.any(Number),
      renderCount: expect.any(Number),
    });
    
    expect(result.current.isLoaded).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('should update power-ups correctly', () => {
    const { result } = renderHook(() => useHUD());
    
    const mockPowerUps = [
      {
        id: 'test-1',
        type: 'multiball',
        duration: 5000,
        maxDuration: 10000,
        icon: '⚡',
        color: '#ff6b6b',
        name: 'Multi Ball'
      }
    ];

    act(() => {
      result.current.updatePowerUps(mockPowerUps);
    });

    expect(result.current.hudState.powerUps).toEqual(mockPowerUps);
  });

  it('should update combo state correctly', () => {
    const { result } = renderHook(() => useHUD());
    
    const mockCombo = {
      count: 5,
      multiplier: 2.0,
      streak: 3,
      timeRemaining: 3000
    };

    act(() => {
      result.current.updateCombo(mockCombo);
    });

    expect(result.current.hudState.combo).toEqual(mockCombo);
  });

  it('should add and remove notifications', () => {
    const { result } = renderHook(() => useHUD());

    act(() => {
      result.current.addNotification({
        type: 'score',
        message: '+100',
        duration: 2000,
        priority: 3,
      });
    });

    expect(result.current.hudState.notifications).toHaveLength(1);
    expect(result.current.hudState.notifications[0]).toMatchObject({
      type: 'score',
      message: '+100',
      duration: 2000,
      priority: 3,
    });

    const notificationId = result.current.hudState.notifications[0].id;

    act(() => {
      result.current.removeNotification(notificationId);
    });

    expect(result.current.hudState.notifications).toHaveLength(0);
  });

  it('should auto-remove notifications after timeout', () => {
    const { result } = renderHook(() => useHUD());

    act(() => {
      result.current.addNotification({
        type: 'score',
        message: '+100',
        duration: 1000,
        priority: 3,
      });
    });

    expect(result.current.hudState.notifications).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.hudState.notifications).toHaveLength(0);
  });

  it('should limit max notifications', () => {
    const { result } = renderHook(() => useHUD({ maxNotifications: 2 }));

    act(() => {
      result.current.addNotification({ type: 'score', message: '1', duration: 5000, priority: 1 });
      result.current.addNotification({ type: 'score', message: '2', duration: 5000, priority: 2 });
      result.current.addNotification({ type: 'score', message: '3', duration: 5000, priority: 3 });
    });

    expect(result.current.hudState.notifications).toHaveLength(2);
    // Should keep highest priority notifications
    expect(result.current.hudState.notifications[0].priority).toBe(3);
    expect(result.current.hudState.notifications[1].priority).toBe(2);
  });

  it('should handle animation state correctly', () => {
    const { result } = renderHook(() => useHUD({ enableAnimations: true, animationDuration: 500 }));

    act(() => {
      result.current.setAnimating(true);
    });

    expect(result.current.hudState.isAnimating).toBe(true);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.hudState.isAnimating).toBe(false);
  });

  it('should not animate when animations are disabled', () => {
    const { result } = renderHook(() => useHUD({ enableAnimations: false }));

    act(() => {
      result.current.setAnimating(true);
    });

    expect(result.current.hudState.isAnimating).toBe(false);
  });

  it('should control visibility correctly', () => {
    const { result } = renderHook(() => useHUD());

    expect(result.current.hudState.isVisible).toBe(true);

    act(() => {
      result.current.setVisible(false);
    });

    expect(result.current.hudState.isVisible).toBe(false);

    act(() => {
      result.current.setVisible(true);
    });

    expect(result.current.hudState.isVisible).toBe(true);
  });

  it('should reset HUD state correctly', () => {
    const { result } = renderHook(() => useHUD());

    // Modify state
    act(() => {
      result.current.updateCombo({ count: 5, multiplier: 2, streak: 3, timeRemaining: 1000 });
      result.current.addNotification({ type: 'score', message: 'test', duration: 1000, priority: 1 });
    });

    expect(result.current.hudState.combo.count).toBe(5);
    expect(result.current.hudState.notifications).toHaveLength(1);

    // Reset
    act(() => {
      result.current.resetHUD();
    });

    expect(result.current.hudState.combo.count).toBe(0);
    expect(result.current.hudState.notifications).toHaveLength(0);
  });

  it('should provide game controls', () => {
    const { result } = renderHook(() => useHUD());

    expect(result.current.gameControls).toEqual({
      startGame: expect.any(Function),
      pauseGame: expect.any(Function),
      resumeGame: expect.any(Function),
      resetGame: expect.any(Function),
      endGame: expect.any(Function),
    });
  });

  it('should provide performance metrics', () => {
    const { result } = renderHook(() => useHUD({ performanceMode: true }));

    const metrics = result.current.getPerformanceMetrics();
    
    expect(metrics).toEqual({
      averageRenderTime: expect.any(Number),
      currentFPS: expect.any(Number),
      renderCount: expect.any(Number),
      lastUpdateTime: expect.any(Number),
      isWithinTarget: expect.any(Boolean),
    });
  });

  it('should handle state persistence', () => {
    const mockSavedState = {
      score: 1500,
      lives: 2,
      level: 3,
      powerUps: [],
      combo: { count: 0, multiplier: 1, streak: 0, timeRemaining: 0 },
    };

    localStorageMock.getItem.mockReturnValue(JSON.stringify(mockSavedState));

    const { result } = renderHook(() => useHUD({ persistState: true }));

    expect(result.current.hudState.score).toBe(1500);
    expect(result.current.hudState.lives).toBe(2);
    expect(result.current.hudState.level).toBe(3);
  });

  it('should handle localStorage errors gracefully', () => {
    localStorageMock.getItem.mockImplementation(() => {
      throw new Error('localStorage error');
    });

    const { result } = renderHook(() => useHUD({ persistState: true }));

    expect(result.current.error).toBe('Failed to load HUD state');
    
    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });
});