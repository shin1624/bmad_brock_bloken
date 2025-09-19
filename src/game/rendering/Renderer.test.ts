/**
 * Tests for Renderer with theme integration
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { Renderer } from "./Renderer";

describe("Renderer", () => {
  let renderer: Renderer;
  let mockCanvas: HTMLCanvasElement;
  let mockContext: CanvasRenderingContext2D;

  beforeEach(() => {
    mockCanvas = {
      getContext: vi.fn(),
      width: 800,
      height: 600,
    } as any;

    mockContext = {
      fillStyle: "",
      strokeStyle: "",
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
    } as any;

    mockCanvas.getContext = vi.fn().mockReturnValue(mockContext);
    renderer = new Renderer(mockContext);
  });

  it("should initialize with canvas", () => {
    expect(renderer).toBeDefined();
  });

  it("should apply theme colors to entities", () => {
    const neonTheme = {
      id: "neon",
      name: "neon",
      displayName: "Neon",
      description: "Bright neon colors",
      colors: {
        primary: "#00ff00",
        background: "#000a0a",
      },
    };

    renderer.applyTheme(neonTheme);
    expect(mockContext.fillStyle).toBe("#000a0a");
  });
});
