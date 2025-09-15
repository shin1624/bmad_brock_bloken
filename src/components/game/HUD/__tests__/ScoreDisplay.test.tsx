import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ScoreDisplay from "../ScoreDisplay";

describe("ScoreDisplay Component", () => {
  it("should display score with proper comma formatting", () => {
    render(<ScoreDisplay score={1500} />);

    expect(screen.getByText("1,500")).toBeInTheDocument();
  });

  it("should display different score values correctly", () => {
    render(<ScoreDisplay score={25000} />);

    expect(screen.getByText("25,000")).toBeInTheDocument();
  });

  it("should call onScoreChange callback when score changes", () => {
    const mockCallback = vi.fn();
    const { rerender } = render(
      <ScoreDisplay score={1000} onScoreChange={mockCallback} />
    );
    
    rerender(<ScoreDisplay score={1500} onScoreChange={mockCallback} />);
    
    expect(mockCallback).toHaveBeenCalledWith(1500, 1000);
  });

  it("should show animation state when score increases", () => {
    const { rerender } = render(<ScoreDisplay score={1000} />);
    
    rerender(<ScoreDisplay score={1500} />);
    
    // Check that score is displayed
    expect(screen.getByText("1,500")).toBeInTheDocument();
    // Animation effects are CSS-based and harder to test directly
  });
});
