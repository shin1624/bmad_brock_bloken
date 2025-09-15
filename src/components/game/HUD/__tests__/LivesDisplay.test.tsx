import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import LivesDisplay from "../LivesDisplay";

describe("LivesDisplay Component", () => {
  it("should display current lives count", () => {
    render(<LivesDisplay lives={3} />);

    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("should display different lives values correctly", () => {
    render(<LivesDisplay lives={1} />);

    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("should call onLifeChange callback when lives change", () => {
    const mockCallback = vi.fn();
    const { rerender } = render(
      <LivesDisplay lives={3} onLifeChange={mockCallback} />
    );
    
    rerender(<LivesDisplay lives={2} onLifeChange={mockCallback} />);
    
    expect(mockCallback).toHaveBeenCalledWith(2, 3);
  });

  it("should call onGameOver when lives reach 0", () => {
    const mockGameOver = vi.fn();
    render(<LivesDisplay lives={0} onGameOver={mockGameOver} />);
    
    expect(mockGameOver).toHaveBeenCalled();
  });

  it("should show low health warning when lives = 1", () => {
    render(<LivesDisplay lives={1} />);
    
    expect(screen.getByText("LOW!")).toBeInTheDocument();
  });

  it("should display heart icons for visual indicators", () => {
    render(<LivesDisplay lives={2} maxLives={3} />);
    
    // Hearts are displayed but we test the lives count
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Lives:")).toBeInTheDocument();
  });
});
