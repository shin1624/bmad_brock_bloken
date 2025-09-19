/**
 * Tests for UI and Theme types
 */
import { describe, it, expect } from "vitest";
import type { ThemeConfig, ThemeColors } from "./ui.types";

describe("ThemeConfig Interface", () => {
  it("should define basic theme configuration structure", () => {
    const mockThemeConfig: ThemeConfig = {
      id: "neon",
      name: "neon",
      displayName: "Neon Theme",
      description: "Bright neon colors with glowing effects",
      colors: {
        primary: "#00ff00",
        secondary: "#ff00ff",
        accent: "#00ffff",
        background: "#000000",
        backgroundSecondary: "#111111",
        paddle: "#00ff00",
        ball: "#ffffff",
        blockNormal: "#ff0080",
        blockHard: "#ffff00",
        blockIndestructible: "#ff8000",
        text: "#ffffff",
        textSecondary: "#cccccc",
        border: "#00ff00",
        success: "#00ff00",
        warning: "#ffff00",
        error: "#ff0000",
        particleDefault: "#ffffff",
        particleDestroy: "#ff0080",
        particlePowerUp: "#00ffff",
      },
    };

    expect(mockThemeConfig.id).toBe("neon");
    expect(mockThemeConfig.name).toBe("neon");
    expect(mockThemeConfig.displayName).toBe("Neon Theme");
  });

  it("should validate theme colors interface completeness", () => {
    const mockColors: ThemeColors = {
      primary: "#ff0000",
      secondary: "#00ff00",
      accent: "#0000ff",
      background: "#000000",
      backgroundSecondary: "#111111",
      paddle: "#ffffff",
      ball: "#ffff00",
      blockNormal: "#ff8000",
      blockHard: "#800080",
      blockIndestructible: "#808080",
      text: "#ffffff",
      textSecondary: "#cccccc",
      border: "#444444",
      success: "#00ff00",
      warning: "#ffff00",
      error: "#ff0000",
      particleDefault: "#ffffff",
      particleDestroy: "#ff0000",
      particlePowerUp: "#00ff00",
    };

    expect(mockColors).toHaveProperty("primary");
    expect(mockColors).toHaveProperty("paddle");
    expect(mockColors).toHaveProperty("ball");
    expect(mockColors).toHaveProperty("blockNormal");
    expect(typeof mockColors.primary).toBe("string");
  });
});
