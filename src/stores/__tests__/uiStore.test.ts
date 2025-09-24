import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUIStore } from '../uiStore';

describe('UIStore', () => {
  beforeEach(() => {
    // Reset store between tests
    const { result } = renderHook(() => useUIStore());
    act(() => {
      result.current.reset();
    });
  });

  describe('Screen Navigation', () => {
    it('should initialize with main menu', () => {
      const { result } = renderHook(() => useUIStore());
      expect(result.current.currentScreen).toBe('mainMenu');
    });

    it('should navigate between screens', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.setScreen('game');
      });
      expect(result.current.currentScreen).toBe('game');
      
      act(() => {
        result.current.setScreen('settings');
      });
      expect(result.current.currentScreen).toBe('settings');
    });

    it('should track navigation history', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.setScreen('game');
        result.current.setScreen('pause');
        result.current.setScreen('settings');
      });
      
      expect(result.current.screenHistory).toEqual(['mainMenu', 'game', 'pause', 'settings']);
    });

    it('should go back to previous screen', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.setScreen('game');
        result.current.setScreen('pause');
        result.current.goBack();
      });
      
      expect(result.current.currentScreen).toBe('game');
    });

    it('should not go back beyond initial screen', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.goBack();
      });
      
      expect(result.current.currentScreen).toBe('mainMenu');
    });
  });

  describe('Modal Management', () => {
    it('should open modal', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.openModal('confirm', { message: 'Are you sure?' });
      });
      
      expect(result.current.activeModal).toBe('confirm');
      expect(result.current.modalData).toEqual({ message: 'Are you sure?' });
      expect(result.current.isModalOpen).toBe(true);
    });

    it('should close modal', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.openModal('confirm');
        result.current.closeModal();
      });
      
      expect(result.current.activeModal).toBeNull();
      expect(result.current.modalData).toBeNull();
      expect(result.current.isModalOpen).toBe(false);
    });

    it('should stack modals', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.openModal('confirm');
        result.current.openModal('alert');
      });
      
      expect(result.current.activeModal).toBe('alert');
      expect(result.current.modalStack).toHaveLength(2);
      
      act(() => {
        result.current.closeModal();
      });
      
      expect(result.current.activeModal).toBe('confirm');
      expect(result.current.modalStack).toHaveLength(1);
    });

    it('should close all modals', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.openModal('confirm');
        result.current.openModal('alert');
        result.current.openModal('settings');
        result.current.closeAllModals();
      });
      
      expect(result.current.activeModal).toBeNull();
      expect(result.current.modalStack).toHaveLength(0);
    });
  });

  describe('Toast Notifications', () => {
    it('should show toast', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.showToast('Success!', 'success');
      });
      
      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0]).toMatchObject({
        message: 'Success!',
        type: 'success',
        id: expect.any(String)
      });
    });

    it('should auto-dismiss toast', () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.showToast('Info', 'info', 3000);
      });
      
      expect(result.current.toasts).toHaveLength(1);
      
      act(() => {
        vi.advanceTimersByTime(3100);
      });
      
      expect(result.current.toasts).toHaveLength(0);
      vi.useRealTimers();
    });

    it('should manually dismiss toast', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.showToast('Message');
      });
      
      const toastId = result.current.toasts[0].id;
      
      act(() => {
        result.current.dismissToast(toastId);
      });
      
      expect(result.current.toasts).toHaveLength(0);
    });

    it('should limit number of toasts', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.showToast(`Message ${i}`);
        }
      });
      
      expect(result.current.toasts.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Loading States', () => {
    it('should set loading state', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.setLoading(true, 'Loading game...');
      });
      
      expect(result.current.isLoading).toBe(true);
      expect(result.current.loadingMessage).toBe('Loading game...');
    });

    it('should track multiple loading operations', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.startLoading('assets');
        result.current.startLoading('level');
      });
      
      expect(result.current.loadingOperations).toContain('assets');
      expect(result.current.loadingOperations).toContain('level');
      expect(result.current.isLoading).toBe(true);
      
      act(() => {
        result.current.stopLoading('assets');
      });
      
      expect(result.current.loadingOperations).not.toContain('assets');
      expect(result.current.isLoading).toBe(true);
      
      act(() => {
        result.current.stopLoading('level');
      });
      
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Menu States', () => {
    it('should track selected menu item', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.setSelectedMenuItem(2);
      });
      
      expect(result.current.selectedMenuItem).toBe(2);
    });

    it('should navigate menu items', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.setMenuItems(['Play', 'Settings', 'Quit']);
        result.current.navigateMenu('down');
      });
      
      expect(result.current.selectedMenuItem).toBe(1);
      
      act(() => {
        result.current.navigateMenu('down');
      });
      
      expect(result.current.selectedMenuItem).toBe(2);
      
      act(() => {
        result.current.navigateMenu('down');
      });
      
      expect(result.current.selectedMenuItem).toBe(0); // Wrap around
      
      act(() => {
        result.current.navigateMenu('up');
      });
      
      expect(result.current.selectedMenuItem).toBe(2);
    });

    it('should handle menu shortcuts', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.registerShortcut('p', () => result.current.setScreen('game'));
        result.current.handleShortcut('p');
      });
      
      expect(result.current.currentScreen).toBe('game');
    });
  });

  describe('Settings Panel', () => {
    it('should toggle settings panel', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.toggleSettings();
      });
      
      expect(result.current.isSettingsOpen).toBe(true);
      
      act(() => {
        result.current.toggleSettings();
      });
      
      expect(result.current.isSettingsOpen).toBe(false);
    });

    it('should track active settings tab', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.setSettingsTab('audio');
      });
      
      expect(result.current.activeSettingsTab).toBe('audio');
    });
  });

  describe('HUD Visibility', () => {
    it('should toggle HUD elements', () => {
      const { result } = renderHook(() => useUIStore());
      
      expect(result.current.hudVisible.score).toBe(true);
      
      act(() => {
        result.current.toggleHUDElement('score');
      });
      
      expect(result.current.hudVisible.score).toBe(false);
      
      act(() => {
        result.current.toggleHUDElement('score');
      });
      
      expect(result.current.hudVisible.score).toBe(true);
    });

    it('should show/hide all HUD', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.hideAllHUD();
      });
      
      expect(result.current.hudVisible.score).toBe(false);
      expect(result.current.hudVisible.lives).toBe(false);
      expect(result.current.hudVisible.level).toBe(false);
      
      act(() => {
        result.current.showAllHUD();
      });
      
      expect(result.current.hudVisible.score).toBe(true);
      expect(result.current.hudVisible.lives).toBe(true);
      expect(result.current.hudVisible.level).toBe(true);
    });
  });

  describe('Animation States', () => {
    it('should track transition states', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.startTransition('fade', 300);
      });
      
      expect(result.current.isTransitioning).toBe(true);
      expect(result.current.transitionType).toBe('fade');
      
      vi.useFakeTimers();
      
      act(() => {
        vi.advanceTimersByTime(350);
        result.current.endTransition();
      });
      
      expect(result.current.isTransitioning).toBe(false);
      vi.useRealTimers();
    });

    it('should queue animations', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.queueAnimation('slideIn');
        result.current.queueAnimation('fadeIn');
      });
      
      expect(result.current.animationQueue).toHaveLength(2);
      
      act(() => {
        const animation = result.current.nextAnimation();
        expect(animation).toBe('slideIn');
      });
      
      expect(result.current.animationQueue).toHaveLength(1);
    });
  });

  describe('Form States', () => {
    it('should track form values', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.setFormValue('username', 'player1');
        result.current.setFormValue('difficulty', 'hard');
      });
      
      expect(result.current.formValues.username).toBe('player1');
      expect(result.current.formValues.difficulty).toBe('hard');
    });

    it('should validate form', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.setFormValidation('username', {
          required: true,
          minLength: 3
        });
        
        result.current.setFormValue('username', 'ab');
        const errors = result.current.validateForm();
        
        expect(errors.username).toBeDefined();
      });
    });

    it('should clear form', () => {
      const { result } = renderHook(() => useUIStore());
      
      act(() => {
        result.current.setFormValue('username', 'test');
        result.current.setFormValue('email', 'test@test.com');
        result.current.clearForm();
      });
      
      expect(result.current.formValues).toEqual({});
    });
  });

  describe('Subscription Management', () => {
    it('should subscribe to state changes', () => {
      const { result } = renderHook(() => useUIStore());
      const callback = vi.fn();
      
      act(() => {
        result.current.subscribe(callback);
        result.current.setScreen('game');
      });
      
      expect(callback).toHaveBeenCalled();
    });

    it('should unsubscribe from changes', () => {
      const { result } = renderHook(() => useUIStore());
      const callback = vi.fn();
      
      act(() => {
        const unsubscribe = result.current.subscribe(callback);
        unsubscribe();
        result.current.setScreen('game');
      });
      
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('should handle rapid state changes', () => {
      const { result } = renderHook(() => useUIStore());
      const startTime = performance.now();
      
      act(() => {
        for (let i = 0; i < 1000; i++) {
          result.current.setScreen(i % 2 === 0 ? 'game' : 'menu');
        }
      });
      
      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(50);
    });

    it('should batch toast operations efficiently', () => {
      const { result } = renderHook(() => useUIStore());
      const startTime = performance.now();
      
      act(() => {
        for (let i = 0; i < 100; i++) {
          result.current.showToast(`Message ${i}`);
        }
      });
      
      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(20);
      expect(result.current.toasts.length).toBeLessThanOrEqual(5);
    });
  });
});