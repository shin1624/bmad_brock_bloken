import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import LevelDisplay from "../LevelDisplay";

describe("LevelDisplay Component", () => {
  it("should display current level", () => {
    render(<LevelDisplay level={3} />);

    expect(screen.getByText("Level 3")).toBeInTheDocument();
  });

  it("should display level counter with total levels", () => {
    render(<LevelDisplay level={5} totalLevels={20} />);

    expect(screen.getByText("5 / 20")).toBeInTheDocument();
  });

  it("should display progress bar when progress is provided", () => {
    render(<LevelDisplay level={2} progress={75} />);

    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  it("should hide progress text when progress is 0", () => {
    render(<LevelDisplay level={1} progress={0} />);

    // Progress text should not be visible when progress is 0
    expect(screen.queryByText("0%")).toHaveStyle({ opacity: "0" });
  });

  it("should call onLevelTransition when level changes", () => {
    const mockLevelTransition = vi.fn();
    const { rerender } = render(
      <LevelDisplay level={1} onLevelTransition={mockLevelTransition} />
    );
    
    rerender(<LevelDisplay level={2} onLevelTransition={mockLevelTransition} />);
    
    expect(mockLevelTransition).toHaveBeenCalledWith(2, 1);
  });

  it("should call onLevelComplete when progress reaches 100%", () => {
    const mockLevelComplete = vi.fn();
    render(
      <LevelDisplay level={3} progress={100} onLevelComplete={mockLevelComplete} />
    );
    
    expect(mockLevelComplete).toHaveBeenCalledWith(3);
  });

  it("should handle different progress values", () => {
    const { rerender } = render(<LevelDisplay level={1} progress={25} />);
    expect(screen.getByText("25%")).toBeInTheDocument();
    
    rerender(<LevelDisplay level={1} progress={90} />);
    expect(screen.getByText("90%")).toBeInTheDocument();
  });

  it("should use default total levels when not specified", () => {
    render(<LevelDisplay level={7} />);

    expect(screen.getByText("7 / 99")).toBeInTheDocument();
  });
});