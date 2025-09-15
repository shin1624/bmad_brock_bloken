import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LevelPreview } from "./LevelPreview";

describe("LevelPreview", () => {
  it("renders level preview with level name", () => {
    const mockLevel = {
      id: 1,
      name: "Level 1",
      difficulty: "easy" as const,
      unlocked: true,
      rows: 3,
      cols: 5,
      blockLayout: [],
      requiredScore: 1000,
    };

    const mockOnStart = vi.fn();
    const mockOnBack = vi.fn();

    render(
      <LevelPreview
        level={mockLevel}
        onStart={mockOnStart}
        onBack={mockOnBack}
      />,
    );

    expect(screen.getByText("Level 1")).toBeInTheDocument();
  });
});
