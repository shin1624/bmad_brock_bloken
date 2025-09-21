import type { PropsWithChildren } from "react";
import { act, render, waitFor } from "@testing-library/react";
import { DndProvider } from "react-dnd";
import { TestBackend } from "react-dnd-test-backend";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { editorActions } from "../../../stores/editorStore";
import { BlockType, EditorTool } from "../../../types/editor.types";
import EditorCanvas from "./EditorCanvas";

const createDndWrapper = () => {
  return ({ children }: PropsWithChildren) => (
    <DndProvider backend={TestBackend} options={{ rootElement: document }}>
      {children}
    </DndProvider>
  );
};

type CanvasContextSpy = ReturnType<typeof createMockContext>;

const originalGetContext = HTMLCanvasElement.prototype.getContext;

type MockFn = ReturnType<typeof vi.fn>;

type MockCanvasContext = CanvasRenderingContext2D & {
  fillRect: MockFn;
  strokeRect: MockFn;
  setLineDash: MockFn;
  save: MockFn;
  restore: MockFn;
  beginPath: MockFn;
  moveTo: MockFn;
  lineTo: MockFn;
  stroke: MockFn;
  scale: MockFn;
  resetTransform: MockFn;
  clearRect: MockFn;
  lineWidth: number;
};

const createMockContext = () => {
  const fillRect = vi.fn();
  const strokeRect = vi.fn();
  const setLineDash = vi.fn();
  const save = vi.fn();
  const restore = vi.fn();
  const beginPath = vi.fn();
  const moveTo = vi.fn();
  const lineTo = vi.fn();
  const stroke = vi.fn();
  const scale = vi.fn();
  const resetTransform = vi.fn();
  const arc = vi.fn();
  const fill = vi.fn();

  const state = {
    fillStyleAssignments: [] as string[],
    strokeStyleAssignments: [] as string[],
    globalAlphaAssignments: [] as number[],
  };

  const context = {
    fillRect,
    strokeRect,
    setLineDash,
    save,
    restore,
    beginPath,
    moveTo,
    lineTo,
    stroke,
    scale,
    resetTransform,
    arc,
    fill,
    clearRect: vi.fn(),
    lineWidth: 0,
  } as MockCanvasContext;

  Object.defineProperty(context, "fillStyle", {
    configurable: true,
    get: () => state.fillStyleAssignments.at(-1) ?? "",
    set: (value: unknown) => {
      state.fillStyleAssignments.push(String(value));
    },
  });

  Object.defineProperty(context, "strokeStyle", {
    configurable: true,
    get: () => state.strokeStyleAssignments.at(-1) ?? "",
    set: (value: unknown) => {
      state.strokeStyleAssignments.push(String(value));
    },
  });

  Object.defineProperty(context, "globalAlpha", {
    configurable: true,
    get: () => state.globalAlphaAssignments.at(-1) ?? 1,
    set: (value: unknown) => {
      state.globalAlphaAssignments.push(Number(value));
    },
  });

  return {
    context,
    state,
    fillRect,
    strokeRect,
    setLineDash,
    save,
    restore,
    arc,
    fill,
  };
};

describe("EditorCanvas placement preview", () => {
  let mockContext: CanvasContextSpy;

  beforeEach(() => {
    editorActions.resetEditor();
    mockContext = createMockContext();
    HTMLCanvasElement.prototype.getContext = vi.fn(() => mockContext.context);
    Object.defineProperty(window, "devicePixelRatio", {
      value: 1,
      writable: true,
    });
  });

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    vi.clearAllMocks();
    act(() => {
      editorActions.resetEditor();
    });
  });

  it("renders ghost preview using selected block visuals when placing", async () => {
    render(<EditorCanvas />, { wrapper: createDndWrapper() });

    act(() => {
      editorActions.setSelectedTool(EditorTool.PLACE);
      editorActions.setSelectedBlockType(BlockType.POWER);
      editorActions.setHoveredCell({ row: 0, col: 0 });
    });

    await waitFor(() => {
      expect(mockContext.fillRect).toHaveBeenCalledWith(2, 2, 28, 28);
    });

    expect(mockContext.state.fillStyleAssignments).toContain("#facc15");
    expect(mockContext.state.strokeStyleAssignments).toContain("#fde047");
    expect(mockContext.setLineDash).toHaveBeenCalledWith([4, 3]);
    expect(mockContext.save).toHaveBeenCalled();
    expect(mockContext.restore).toHaveBeenCalled();
  });

  it("draws dashed removal outline when erasing", async () => {
    render(<EditorCanvas />, { wrapper: createDndWrapper() });

    act(() => {
      editorActions.setSelectedTool(EditorTool.ERASE);
      editorActions.setHoveredCell({ row: 1, col: 1 });
    });

    await waitFor(() => {
      expect(mockContext.setLineDash).toHaveBeenCalledWith([6, 4]);
    });

    expect(mockContext.fillRect).not.toHaveBeenCalledWith(3, 3, 26, 26);
  });

  it("draws selection outline when cells are selected", async () => {
    render(<EditorCanvas />, { wrapper: createDndWrapper() });

    act(() => {
      editorActions.placeBlock(1, 1, BlockType.NORMAL);
      editorActions.selectSingleCell({ row: 1, col: 1 });
    });

    await waitFor(() => {
      expect(mockContext.state.strokeStyleAssignments).toContain("#38bdf8");
    });

    expect(mockContext.strokeRect).toHaveBeenCalledWith(33, 33, 30, 30);
  });

  it("renders paddle and ball when preview mode is enabled", async () => {
    render(<EditorCanvas />, { wrapper: createDndWrapper() });

    act(() => {
      editorActions.setPreviewMode(true);
    });

    await waitFor(() => {
      expect(mockContext.fillRect).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
      );
      expect(mockContext.arc).toHaveBeenCalled();
      expect(mockContext.fill).toHaveBeenCalled();
    });
  });
});
