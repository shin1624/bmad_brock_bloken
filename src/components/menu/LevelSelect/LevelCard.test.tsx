import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LevelCard } from "./LevelCard";

describe("LevelCard", () => {
  it("renders level card with basic info", () => {
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

    const mockOnClick = vi.fn();
    render(
      <LevelCard level={mockLevel} status="available" onClick={mockOnClick} />,
    );

    expect(screen.getByText("Level 1")).toBeInTheDocument();
    expect(screen.getByText("Easy")).toBeInTheDocument();
  });
});
