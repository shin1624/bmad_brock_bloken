import type { PropsWithChildren } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { DndProvider } from "react-dnd";
import { TestBackend } from "react-dnd-test-backend";
import { beforeEach, describe, expect, it } from "vitest";

import BlockPalette from "./BlockPalette";
import { editorActions, useEditorStore } from "../../../stores/editorStore";
import { BlockType } from "../../../types/editor.types";

const createDndWrapper = () => {
  return ({ children }: PropsWithChildren) => (
    <DndProvider backend={TestBackend} options={{ rootElement: document }}>
      {children}
    </DndProvider>
  );
};

describe("BlockPalette", () => {
  beforeEach(() => {
    editorActions.resetEditor();
  });

  it("renders grouped block categories", () => {
    render(<BlockPalette />, { wrapper: createDndWrapper() });

    expect(screen.getByRole("heading", { name: "Core Blocks" })).toBeInTheDocument();
    const coreGroup = screen.getByTestId("block-group-core");
    const powerGroup = screen.getByTestId("block-group-power");

    expect(within(coreGroup).getByText("Normal Block")).toBeInTheDocument();
    expect(within(powerGroup).getByText("Power-Up Block")).toBeInTheDocument();
  });

  it("updates selected block when clicking palette option", () => {
    render(<BlockPalette />, { wrapper: createDndWrapper() });

    const powerUpButton = screen.getByRole("button", { name: /Power-Up Block/i });
    fireEvent.click(powerUpButton);

    expect(useEditorStore.getState().selectedBlockType).toBe(BlockType.POWER);
    expect(powerUpButton).toHaveAttribute("aria-pressed", "true");
  });

  it("updates preview panel when hovering over a block", () => {
    render(<BlockPalette />, { wrapper: createDndWrapper() });

    const hardBlockButton = screen.getByRole("button", { name: /Hard Block/i });
    fireEvent.mouseEnter(hardBlockButton);

    expect(screen.getByTestId("block-preview")).toHaveTextContent("Hard Block");
  });

  it("displays tooltip metadata while hovering", () => {
    render(<BlockPalette />, { wrapper: createDndWrapper() });

    const specialBlockButton = screen.getByRole("button", { name: /Special Block/i });
    fireEvent.mouseEnter(specialBlockButton);

    const tooltip = screen.getByTestId("block-tooltip-special");
    expect(tooltip.dataset.visible).toBe("true");
    expect(tooltip).toHaveTextContent("Durability");
  });
});
