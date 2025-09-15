import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import HUD from "../HUD";

describe("HUD Component", () => {
  it("should render HUD overlay with proper positioning", () => {
    const mockHUDState = {
      score: 1500,
      lives: 3,
      level: 2,
    };

    render(<HUD hudState={mockHUDState} />);

    const hudContainer = screen.getByTestId("hud-overlay");
    expect(hudContainer).toBeInTheDocument();
    expect(hudContainer).toHaveClass("hud-overlay");
  });

  it("should use CSS Grid layout for responsive design", () => {
    const mockHUDState = {
      score: 1500,
      lives: 3,
      level: 2,
    };

    render(<HUD hudState={mockHUDState} />);

    const hudContainer = screen.getByTestId("hud-overlay");
    expect(hudContainer).toHaveClass("hud-grid-layout");
  });

  it("should display integrated score and lives components", () => {
    const mockHUDState = {
      score: 2500,
      lives: 2,
      level: 3,
    };

    render(<HUD hudState={mockHUDState} />);

    // Check that score is displayed with formatting
    expect(screen.getByText("2,500")).toBeInTheDocument();
    // Check that lives count is displayed
    expect(screen.getByText("2")).toBeInTheDocument();
    // Check that level is displayed
    expect(screen.getByText("Level 3")).toBeInTheDocument();
  });

  it("should call callbacks when provided", () => {
    const mockScoreChange = vi.fn();
    const mockLifeChange = vi.fn();
    const mockGameOver = vi.fn();
    
    const mockHUDState = {
      score: 1000,
      lives: 0,
      level: 1,
    };

    render(
      <HUD 
        hudState={mockHUDState}
        onScoreChange={mockScoreChange}
        onLifeChange={mockLifeChange}
        onGameOver={mockGameOver}
      />
    );

    // Game over should be called when lives = 0
    expect(mockGameOver).toHaveBeenCalled();
  });

  it("should display level information correctly", () => {
    const mockHUDState = {
      score: 1000,
      lives: 3,
      level: 5,
    };

    render(<HUD hudState={mockHUDState} />);
    
    expect(screen.getByText("Level 5")).toBeInTheDocument();
  });
});
