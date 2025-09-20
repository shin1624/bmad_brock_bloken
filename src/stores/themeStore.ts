/**
 * Theme Store for managing theme state
 */
import { create } from "zustand";

export const useThemeStore = create(() => ({
  // MVP: Single theme implementation - neon theme only
  currentTheme: "neon",
  theme: "neon", // Simplified property name for MVP
  reset: () => {},
}));
