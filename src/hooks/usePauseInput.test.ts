import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePauseInput } from './usePauseInput';

// Mock the UI store module
vi.mock('../stores/uiStore.js', () => ({
  useUIStore: vi.fn(() => false), // Mock isPaused as false by default
  uiActions: {
    togglePause: vi.fn(),
    pauseGame: vi.fn(),
    resumeGame: vi.fn(),
    openPauseMenu: vi.fn(),
    closePauseMenu: vi.fn(),
  },
}));

describe('usePauseInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return pause state and action functions', () => {
    const { result } = renderHook(() => usePauseInput());

    expect(result.current.isPaused).toBe(false);
    expect(typeof result.current.pauseGame).toBe('function');
    expect(typeof result.current.resumeGame).toBe('function');
    expect(typeof result.current.togglePause).toBe('function');
  });

  it('should call uiActions when action functions are invoked', async () => {
    const { uiActions } = await import('../stores/uiStore.js');
    const { result } = renderHook(() => usePauseInput());

    act(() => {
      result.current.pauseGame();
    });
    expect(uiActions.pauseGame).toHaveBeenCalledOnce();

    act(() => {
      result.current.resumeGame();
    });
    expect(uiActions.resumeGame).toHaveBeenCalledOnce();

    act(() => {
      result.current.togglePause();
    });
    expect(uiActions.togglePause).toHaveBeenCalledOnce();
  });

  it('should handle ESC key when enabled', async () => {
    const { uiActions } = await import('../stores/uiStore.js');
    
    renderHook(() => usePauseInput({ enableEscapeKey: true }));

    // Simulate ESC key press
    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      window.dispatchEvent(event);
    });

    expect(uiActions.togglePause).toHaveBeenCalledOnce();
  });

  it('should not handle ESC key when disabled', async () => {
    const { uiActions } = await import('../stores/uiStore.js');
    
    renderHook(() => usePauseInput({ enableEscapeKey: false }));

    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      window.dispatchEvent(event);
    });

    expect(uiActions.togglePause).not.toHaveBeenCalled();
  });

  it('should clean up event listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => usePauseInput({ enableEscapeKey: true }));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'keydown',
      expect.any(Function),
      { capture: true }
    );
  });
});