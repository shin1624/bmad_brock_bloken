import { useCallback, useEffect, useState, useRef } from 'react';

export interface MenuNavigationOptions {
  menuItems: string[];
  onSelect: (index: number) => void;
  onEscape?: () => void;
  initialFocusIndex?: number;
}

/**
 * Hook for pause menu keyboard navigation
 * Story 3.3 Task 3: Implements keyboard navigation (Arrow keys, Tab, Enter)
 * with focus management and visual focus indicators
 */
export const usePauseMenuNavigation = ({
  menuItems,
  onSelect,
  onEscape,
  initialFocusIndex = 0,
}: MenuNavigationOptions) => {
  const [focusedIndex, setFocusedIndex] = useState(initialFocusIndex);
  const [isNavigationActive, setIsNavigationActive] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const moveFocus = useCallback((direction: 'up' | 'down') => {
    setFocusedIndex((currentIndex) => {
      const newIndex = direction === 'up' 
        ? (currentIndex - 1 + menuItems.length) % menuItems.length
        : (currentIndex + 1) % menuItems.length;
      return newIndex;
    });
  }, [menuItems.length]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isNavigationActive) return;

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        moveFocus('up');
        break;
      
      case 'ArrowDown':
        event.preventDefault();
        moveFocus('down');
        break;
      
      case 'Tab':
        event.preventDefault();
        moveFocus(event.shiftKey ? 'up' : 'down');
        break;
      
      case 'Enter':
      case ' ':
        event.preventDefault();
        onSelect(focusedIndex);
        break;
      
      case 'Escape':
        event.preventDefault();
        onEscape?.();
        break;
      
      default:
        break;
    }
  }, [isNavigationActive, focusedIndex, moveFocus, onSelect, onEscape]);

  const activateNavigation = useCallback(() => {
    setIsNavigationActive(true);
    setFocusedIndex(initialFocusIndex);
  }, [initialFocusIndex]);

  const deactivateNavigation = useCallback(() => {
    setIsNavigationActive(false);
  }, []);

  const selectItem = useCallback((index: number) => {
    onSelect(index);
  }, [onSelect]);

  const getFocusProps = useCallback((index: number) => ({
    'data-focused': index === focusedIndex,
    'aria-selected': index === focusedIndex,
    tabIndex: index === focusedIndex ? 0 : -1,
  }), [focusedIndex]);

  useEffect(() => {
    if (isNavigationActive) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown, isNavigationActive]);

  // Auto-activate navigation when component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      activateNavigation();
    }, 100); // Small delay to ensure component is ready

    return () => clearTimeout(timer);
  }, [activateNavigation]);

  return {
    focusedIndex,
    isNavigationActive,
    activateNavigation,
    deactivateNavigation,
    selectItem,
    getFocusProps,
    menuRef,
  };
};

export default usePauseMenuNavigation;