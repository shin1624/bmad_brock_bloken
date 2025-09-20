/**
 * Tests for Neon Theme Configuration
 */
import { describe, it, expect } from "vitest";
import { neonTheme } from "./neon";
import type { ThemeConfig } from "../types/ui.types";

describe("Neon Theme", () => {
  it("should export a valid ThemeConfig", () => {
    expect(neonTheme).toBeDefined();
    expect(neonTheme.id).toBe("neon");
    expect(neonTheme.name).toBe("neon");
    expect(neonTheme.displayName).toBe("Neon");
    expect(neonTheme.colors).toBeDefined();
    expect(neonTheme.colors.primary).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});
