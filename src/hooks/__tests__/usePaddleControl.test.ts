import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  usePaddleControl,
  usePaddlePosition,
  usePaddleMovement,
  usePaddleBounds,
} from "../usePaddleControl.js";
import { PaddleState } from "../../types/game.types.js";

// Mock dependencies
vi.mock("../../game/entities/Paddle.js", () => ({
  Paddle: vi.fn().mockImplementation(() => ({
    position: { x: 350, y: 560 },
    velocity: { x: 0, y: 0 },
    size: { x: 100, y: 20 },
    getState: vi.fn(() => ({
      position: { x: 350, y: 560 },
      velocity: { x: 0, y: 0 },
      size: { x: 100, y: 20 },
      active: true,
    })),
    updateConfig: vi.fn(),
    update: vi.fn(),
  })),
}));

vi.mock("../../game/systems/PaddleController.js", () => ({
  PaddleController: vi.fn().mockImplementation(() => ({
    update: vi.fn(),
    updateConfig: vi.fn(),
    destroy: vi.fn(),
  })),
}));

vi.mock("../useGameInput.js", () => ({
  useGameInput: vi.fn(() => ({
    inputState: {
      device: "keyboard",
      keyboard: { left: false, right: false },
      mouse: { x: null, y: null },
      touch: { x: null, y: null },
    },
    inputManager: {},
    isReady: true,
    updateConfig: vi.fn(),
  })),
}));

describe("usePaddleControl", () => {
  let mockCanvas: HTMLCanvasElement;
  let canvasRef: React.RefObject<HTMLCanvasElement>;

  beforeEach(() => {
    mockCanvas = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      getBoundingClientRect: vi.fn(() => ({
        left: 0,
        top: 0,
        width: 800,
        height: 600,
      })),
    } as unknown as HTMLCanvasElement;

    canvasRef = { current: mockCanvas };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Hook Initialization", () => {
    it("should initialize with paddle configuration", () => {
      const { result } = renderHook(() =>
        usePaddleControl({
          paddleConfig: {
            width: 100,
            height: 20,
            speed: 8,
            color: "#ffffff",
            maxX: 800,
          },
          canvasRef,
        }),
      );

      expect(result.current.paddleState).toBeDefined();
      expect(result.current.paddleState.size).toEqual({ x: 100, y: 20 });
      expect(result.current.isReady).toBe(true);
    });

    it("should handle missing input manager", () => {
      vi.doMock("../useGameInput.js", () => ({
        useGameInput: vi.fn(() => ({
          inputManager: null,
          isReady: false,
        })),
      }));

      const { result } = renderHook(() =>
        usePaddleControl({
          paddleConfig: {
            width: 100,
            height: 20,
            speed: 8,
            color: "#ffffff",
            maxX: 800,
          },
          canvasRef,
        }),
      );

      expect(result.current.isReady).toBe(false);
      expect(result.current.paddle).toBe(null);
      expect(result.current.paddleController).toBe(null);
    });
  });

  describe("Update Function", () => {
    it("should update paddle state when update is called", () => {
      const { result } = renderHook(() =>
        usePaddleControl({
          paddleConfig: {
            width: 100,
            height: 20,
            speed: 8,
            color: "#ffffff",
            maxX: 800,
          },
          canvasRef,
        }),
      );

      act(() => {
        result.current.update(1.0);
      });

      expect(result.current.paddleController?.update).toHaveBeenCalledWith(1.0);
    });

    it("should not update when not ready", () => {
      vi.doMock("../useGameInput.js", () => ({
        useGameInput: vi.fn(() => ({
          inputManager: null,
          isReady: false,
        })),
      }));

      const { result } = renderHook(() =>
        usePaddleControl({
          paddleConfig: {
            width: 100,
            height: 20,
            speed: 8,
            color: "#ffffff",
            maxX: 800,
          },
          canvasRef,
        }),
      );

      act(() => {
        result.current.update(1.0);
      });

      // Should not crash and should handle gracefully
      expect(result.current.isReady).toBe(false);
    });
  });

  describe("Configuration Updates", () => {
    it("should update paddle configuration", () => {
      const { result } = renderHook(() =>
        usePaddleControl({
          paddleConfig: {
            width: 100,
            height: 20,
            speed: 8,
            color: "#ffffff",
            maxX: 800,
          },
          canvasRef,
        }),
      );

      act(() => {
        result.current.updatePaddleConfig({ width: 120 });
      });

      expect(result.current.paddle?.updateConfig).toHaveBeenCalledWith({
        width: 120,
      });
    });

    it("should update controller configuration", () => {
      const { result } = renderHook(() =>
        usePaddleControl({
          paddleConfig: {
            width: 100,
            height: 20,
            speed: 8,
            color: "#ffffff",
            maxX: 800,
          },
          canvasRef,
        }),
      );

      act(() => {
        result.current.updateControllerConfig({
          enableLinearInterpolation: false,
        });
      });

      expect(
        result.current.paddleController?.updateConfig,
      ).toHaveBeenCalledWith({
        enableLinearInterpolation: false,
      });
    });
  });

  describe("Cleanup", () => {
    it("should cleanup on unmount", () => {
      const { result, unmount } = renderHook(() =>
        usePaddleControl({
          paddleConfig: {
            width: 100,
            height: 20,
            speed: 8,
            color: "#ffffff",
            maxX: 800,
          },
          canvasRef,
        }),
      );

      const controller = result.current.paddleController;

      unmount();

      expect(controller?.destroy).toHaveBeenCalled();
    });
  });
});

describe("usePaddlePosition", () => {
  it("should calculate paddle position values", () => {
    const paddleState: PaddleState = {
      position: { x: 100, y: 200 },
      velocity: { x: 0, y: 0 },
      size: { x: 80, y: 20 },
      active: true,
    };

    const { result } = renderHook(() => usePaddlePosition(paddleState));

    expect(result.current.x).toBe(100);
    expect(result.current.y).toBe(200);
    expect(result.current.centerX).toBe(140); // 100 + 80/2
    expect(result.current.centerY).toBe(210); // 200 + 20/2
  });
});

describe("usePaddleMovement", () => {
  it("should calculate movement state for moving paddle", () => {
    const paddleState: PaddleState = {
      position: { x: 100, y: 200 },
      velocity: { x: 8, y: 0 },
      size: { x: 80, y: 20 },
      active: true,
    };

    const { result } = renderHook(() => usePaddleMovement(paddleState));

    expect(result.current.velocity).toEqual({ x: 8, y: 0 });
    expect(result.current.isMoving).toBe(true);
    expect(result.current.isMovingLeft).toBe(false);
    expect(result.current.isMovingRight).toBe(true);
    expect(result.current.speed).toBe(8);
  });

  it("should detect left movement", () => {
    const paddleState: PaddleState = {
      position: { x: 100, y: 200 },
      velocity: { x: -8, y: 0 },
      size: { x: 80, y: 20 },
      active: true,
    };

    const { result } = renderHook(() => usePaddleMovement(paddleState));

    expect(result.current.isMovingLeft).toBe(true);
    expect(result.current.isMovingRight).toBe(false);
  });

  it("should detect stationary paddle", () => {
    const paddleState: PaddleState = {
      position: { x: 100, y: 200 },
      velocity: { x: 0, y: 0 },
      size: { x: 80, y: 20 },
      active: true,
    };

    const { result } = renderHook(() => usePaddleMovement(paddleState));

    expect(result.current.isMoving).toBe(false);
    expect(result.current.speed).toBe(0);
  });
});

describe("usePaddleBounds", () => {
  it("should calculate paddle bounds", () => {
    const paddleState: PaddleState = {
      position: { x: 100, y: 200 },
      velocity: { x: 0, y: 0 },
      size: { x: 80, y: 20 },
      active: true,
    };

    const { result } = renderHook(() => usePaddleBounds(paddleState));

    expect(result.current.left).toBe(100);
    expect(result.current.right).toBe(180); // 100 + 80
    expect(result.current.top).toBe(200);
    expect(result.current.bottom).toBe(220); // 200 + 20
    expect(result.current.width).toBe(80);
    expect(result.current.height).toBe(20);
  });
});
