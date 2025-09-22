import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { usePauseMenuNavigation } from "./usePauseMenuNavigation";

describe("usePauseMenuNavigation", () => {
  const mockOnSelect = vi.fn();
  const mockOnEscape = vi.fn();
  const menuItems = ["resume", "settings", "mainMenu"];

  // Mock keyboard events
  let dispatchKeyboardEvent: (
    key: string,
    options?: Partial<KeyboardEvent>,
  ) => void;

  beforeEach(() => {
    vi.clearAllMocks();

    dispatchKeyboardEvent = (
      key: string,
      options: Partial<KeyboardEvent> = {},
    ) => {
      const event = new KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true,
        ...options,
      });
      document.dispatchEvent(event);
    };
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it("should initialize with default values", () => {
    renderHook(() =>
      usePauseMenuNavigation({
        menuItems,
        onSelect: mockOnSelect,
        onEscape: mockOnEscape,
        initialFocusIndex: 1,
      }),
    );

    expect(result.current.focusedIndex).toBe(1);
    expect(result.current.isNavigationActive).toBe(false);
  });

  it("should activate navigation automatically after timeout", async () => {
    vi.useFakeTimers();

    const { result } = renderHook(() =>
      usePauseMenuNavigation({
        menuItems,
        onSelect: mockOnSelect,
        onEscape: mockOnEscape,
      }),
    );

    expect(result.current.isNavigationActive).toBe(false);

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.isNavigationActive).toBe(true);
    expect(result.current.focusedIndex).toBe(0);

    vi.useRealTimers();
  });

  it("should handle arrow key navigation", () => {
    vi.useFakeTimers();

    const { result } = renderHook(() =>
      usePauseMenuNavigation({
        menuItems,
        onSelect: mockOnSelect,
        onEscape: mockOnEscape,
      }),
    );

    // Activate navigation
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Arrow down should move to next item
    act(() => {
      dispatchKeyboardEvent("ArrowDown");
    });
    expect(result.current.focusedIndex).toBe(1);

    // Arrow down again should move to next item
    act(() => {
      dispatchKeyboardEvent("ArrowDown");
    });
    expect(result.current.focusedIndex).toBe(2);

    // Arrow down at last item should wrap to first
    act(() => {
      dispatchKeyboardEvent("ArrowDown");
    });
    expect(result.current.focusedIndex).toBe(0);

    // Arrow up should move to previous item
    act(() => {
      dispatchKeyboardEvent("ArrowUp");
    });
    expect(result.current.focusedIndex).toBe(2);

    vi.useRealTimers();
  });

  it("should handle Tab key navigation", () => {
    vi.useFakeTimers();

    const { result } = renderHook(() =>
      usePauseMenuNavigation({
        menuItems,
        onSelect: mockOnSelect,
        onEscape: mockOnEscape,
      }),
    );

    // Activate navigation
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Tab should move forward
    act(() => {
      dispatchKeyboardEvent("Tab");
    });
    expect(result.current.focusedIndex).toBe(1);

    // Shift+Tab should move backward
    act(() => {
      dispatchKeyboardEvent("Tab", { shiftKey: true });
    });
    expect(result.current.focusedIndex).toBe(0);

    vi.useRealTimers();
  });

  it("should handle Enter key selection", () => {
    vi.useFakeTimers();

    const { result } = renderHook(() =>
      usePauseMenuNavigation({
        menuItems,
        onSelect: mockOnSelect,
        onEscape: mockOnEscape,
      }),
    );

    // Activate navigation
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Move to index 1 and verify
    act(() => {
      dispatchKeyboardEvent("ArrowDown");
    });

    // Enter should trigger onSelect with current focused index
    act(() => {
      dispatchKeyboardEvent("Enter");
    });

    // The onSelect should be called with the currently focused index
    expect(mockOnSelect).toHaveBeenCalledWith(result.current.focusedIndex);

    vi.useRealTimers();
  });

  it("should handle Space key selection", () => {
    vi.useFakeTimers();

    renderHook(() =>
      usePauseMenuNavigation({
        menuItems,
        onSelect: mockOnSelect,
        onEscape: mockOnEscape,
      }),
    );

    // Activate navigation
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Space should trigger onSelect with current index
    act(() => {
      dispatchKeyboardEvent(" ");
    });
    expect(mockOnSelect).toHaveBeenCalledWith(0);

    vi.useRealTimers();
  });

  it("should handle Escape key", () => {
    vi.useFakeTimers();

    renderHook(() =>
      usePauseMenuNavigation({
        menuItems,
        onSelect: mockOnSelect,
        onEscape: mockOnEscape,
      }),
    );

    // Activate navigation
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Escape should trigger onEscape
    act(() => {
      dispatchKeyboardEvent("Escape");
    });
    expect(mockOnEscape).toHaveBeenCalledOnce();

    vi.useRealTimers();
  });

  it("should provide correct focus props", () => {
    vi.useFakeTimers();

    const { result } = renderHook(() =>
      usePauseMenuNavigation({
        menuItems,
        onSelect: mockOnSelect,
        onEscape: mockOnEscape,
      }),
    );

    // Activate navigation
    act(() => {
      vi.advanceTimersByTime(100);
    });

    const focusProps0 = result.current.getFocusProps(0);
    const focusProps1 = result.current.getFocusProps(1);

    expect(focusProps0).toEqual({
      "data-focused": true,
      "aria-selected": true,
      tabIndex: 0,
    });

    expect(focusProps1).toEqual({
      "data-focused": false,
      "aria-selected": false,
      tabIndex: -1,
    });

    vi.useRealTimers();
  });

  it("should not respond to keys when navigation is inactive", () => {
    const { result } = renderHook(() =>
      usePauseMenuNavigation({
        menuItems,
        onSelect: mockOnSelect,
        onEscape: mockOnEscape,
      }),
    );

    // Navigation is not active yet
    expect(result.current.isNavigationActive).toBe(false);

    // Key events should not affect focused index
    act(() => {
      dispatchKeyboardEvent("ArrowDown");
      dispatchKeyboardEvent("Enter");
      dispatchKeyboardEvent("Escape");
    });

    expect(result.current.focusedIndex).toBe(0); // Still at initial value
    expect(mockOnSelect).not.toHaveBeenCalled();
    expect(mockOnEscape).not.toHaveBeenCalled();
  });

  it("should manually activate and deactivate navigation", () => {
    const { result } = renderHook(() =>
      usePauseMenuNavigation({
        menuItems,
        onSelect: mockOnSelect,
        onEscape: mockOnEscape,
      }),
    );

    expect(result.current.isNavigationActive).toBe(false);

    act(() => {
      result.current.activateNavigation();
    });
    expect(result.current.isNavigationActive).toBe(true);

    act(() => {
      result.current.deactivateNavigation();
    });
    expect(result.current.isNavigationActive).toBe(false);
  });

  it("should handle selectItem method", () => {
    const { result } = renderHook(() =>
      usePauseMenuNavigation({
        menuItems,
        onSelect: mockOnSelect,
        onEscape: mockOnEscape,
      }),
    );

    act(() => {
      result.current.selectItem(2);
    });

    expect(mockOnSelect).toHaveBeenCalledWith(2);
  });
});
