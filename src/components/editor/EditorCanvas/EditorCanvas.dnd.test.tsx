import type { PropsWithChildren } from "react";
import { useEffect } from "react";
import { act, render, waitFor } from "@testing-library/react";
import type { Identifier } from "dnd-core";
import { DndProvider, useDrag, useDragDropManager } from "react-dnd";
import { TestBackend } from "react-dnd-test-backend";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import EditorCanvas from "./EditorCanvas";
import { editorActions, useEditorStore } from "../../../stores/editorStore";
import { BlockType, EditorTool } from "../../../types/editor.types";

type DragSourceProps = {
  onReady: (id: Identifier | null) => void;
};

const DragSource = ({ onReady }: DragSourceProps): JSX.Element => {
  const [{ handlerId }, dragRef] = useDrag(() => ({
    type: "block",
    item: {
      type: "block",
      blockType: BlockType.POWER,
      fromPalette: true,
    },
    collect: (monitor) => ({
      handlerId: monitor.getHandlerId() ?? null,
    }),
  }));

  useEffect(() => {
    onReady(handlerId ?? null);
  }, [handlerId, onReady]);

  return <div ref={dragRef} data-testid="drag-source" />;
};

type DndHarness = {
  Wrapper: (props: PropsWithChildren) => JSX.Element;
  getBackend: () => TestBackend | null;
};

const BackendObserver = ({
  onReady,
}: {
  onReady: (backend: TestBackend) => void;
}): JSX.Element => {
  const manager = useDragDropManager();

  useEffect(() => {
    const backend = manager.getBackend();

    if (backend) {
      onReady(backend as TestBackend);
    }
  }, [manager, onReady]);

  return null;
};

const createHarness = (): DndHarness => {
  let backend: TestBackend | null = null;

  const Wrapper = ({ children }: PropsWithChildren): JSX.Element => (
    <DndProvider backend={TestBackend} options={{ rootElement: document }}>
      <BackendObserver onReady={(instance) => {
        backend = instance;
      }} />
      {children}
    </DndProvider>
  );

  return {
    Wrapper,
    getBackend: () => backend,
  };
};

describe("EditorCanvas drag and drop integration", () => {
  beforeEach(() => {
    editorActions.resetEditor();
  });

  afterEach(() => {
    editorActions.resetEditor();
    vi.restoreAllMocks();
  });

  it("places palette block onto canvas when dropped", async () => {
    const harness = createHarness();
    let sourceId: Identifier | null = null;
    let targetId: Identifier | null = null;

    const rectSpy = vi
      .spyOn(HTMLCanvasElement.prototype, "getBoundingClientRect")
      .mockReturnValue({
        left: 0,
        top: 0,
        right: 640,
        bottom: 640,
        width: 640,
        height: 640,
        x: 0,
        y: 0,
        toJSON: () => {},
      } as DOMRect);

    render(
      <harness.Wrapper>
        <DragSource onReady={(id) => {
          sourceId = id;
        }} />
        <EditorCanvas
          onDropTargetReady={(id) => {
            targetId = id;
          }}
        />
      </harness.Wrapper>,
    );

    await waitFor(() => {
      expect(sourceId).not.toBeNull();
      expect(targetId).not.toBeNull();
      expect(harness.getBackend()).not.toBeNull();
    });

    const backend = harness.getBackend();

    if (!backend) {
      throw new Error("Test backend not initialized");
    }

    const pointer = { x: 96, y: 96 };

    act(() => {
      backend.simulateBeginDrag([sourceId!], {
        clientOffset: pointer,
        getSourceClientOffset: () => pointer,
      });
      backend.simulateHover([targetId!], { clientOffset: pointer });
      backend.simulateDrop();
      backend.simulateEndDrag();
    });

    const state = useEditorStore.getState();
    expect(state.grid[3][3]?.type).toBe(BlockType.POWER);
    expect(state.hoveredCell).toBeNull();
    expect(state.selectedTool).toBe(EditorTool.PLACE);

    rectSpy.mockRestore();
  });
});
