import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { DndProvider } from "react-dnd";
import { TestBackend } from "react-dnd-test-backend";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { editorActions } from "../../../stores/editorStore";
import { LevelService } from "../../../services/LevelService";
import EditorWorkspace from "./EditorWorkspace";

vi.mock("../EditorProvider", () => ({
  EditorProvider: ({ children }: { children: ReactNode }) => (
    <DndProvider backend={TestBackend}>{children}</DndProvider>
  ),
}));

describe("EditorWorkspace", () => {
  beforeEach(() => {
    editorActions.resetEditor();
    LevelService.clearAll();
    localStorage.clear();
  });

  it("saves a level and shows status message", async () => {
    render(<EditorWorkspace />);

    const input = screen.getByLabelText("レベル名");
    fireEvent.change(input, { target: { value: "Demo Level" } });

    const saveButton = screen.getByRole("button", { name: "レベルを保存" });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText("レベルを保存しました")).toBeInTheDocument();
    });

    expect(LevelService.listLevels()).toHaveLength(1);
  });
});
