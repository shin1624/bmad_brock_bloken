/**
 * Tests for Theme Plugin System
 */
import { describe, it, expect, beforeEach } from "vitest";
import { ThemePlugin } from "./ThemePlugin";
import { neonTheme } from "../../themes/neon";

describe("ThemePlugin", () => {
  let themePlugin: ThemePlugin;
  let mockCanvas: HTMLCanvasElement;
  let mockContext: CanvasRenderingContext2D;

  beforeEach(() => {
    // Create mock canvas and context
    mockCanvas = document.createElement("canvas");
    mockContext = mockCanvas.getContext("2d") as CanvasRenderingContext2D;

    themePlugin = new ThemePlugin(neonTheme);
  });

  it("should implement Plugin interface", () => {
    expect(themePlugin.name).toBe("theme-neon");
    expect(themePlugin.version).toBeDefined();
    expect(typeof themePlugin.init).toBe("function");
    expect(typeof themePlugin.destroy).toBe("function");
  });

  it("should apply theme to canvas context", () => {
    expect(typeof themePlugin.applyToCanvas).toBe("function");
    themePlugin.applyToCanvas(mockContext);
    // Canvas context should have theme applied
    expect(mockContext.fillStyle).toBeDefined();
  });
});
