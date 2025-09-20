/**
 * Tests for Theme Store
 */
import { describe, it, expect, beforeEach } from "vitest";
import { useThemeStore } from "./themeStore";

describe("Theme Store", () => {
  beforeEach(() => {
    // Reset store state before each test
    useThemeStore.getState().reset();
  });

  it("should have default neon theme", () => {
    const state = useThemeStore.getState();
    expect(state.currentTheme).toBe("neon");
    expect(state.theme).toBe("neon");
  });

  it("should maintain consistent theme state for MVP", () => {
    const state = useThemeStore.getState();
    // MVP: Single theme only - no theme switching
    expect(state.currentTheme).toBe("neon");
    expect(state.theme).toBe("neon");
  });
});
