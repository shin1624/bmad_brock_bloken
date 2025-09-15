import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ComboDisplay, { type ComboState } from "../ComboDisplay";

describe("ComboDisplay Component", () => {
  const mockCombo: ComboState = {
    count: 5,
    multiplier: 2.0,
    streak: 3,
    timeRemaining: 3000
  };

  it("should render nothing when combo count is 0", () => {
    const emptyCombo = { ...mockCombo, count: 0 };
    const { container } = render(<ComboDisplay combo={emptyCombo} />);
    expect(container.firstChild).toBeNull();
  });

  it("should display combo count", () => {
    render(<ComboDisplay combo={mockCombo} />);
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("should display formatted multiplier", () => {
    render(<ComboDisplay combo={mockCombo} />);
    expect(screen.getByText("x2.0")).toBeInTheDocument();
  });

  it("should format multiplier with one decimal place", () => {
    const comboWithDecimal = { ...mockCombo, multiplier: 3.5 };
    render(<ComboDisplay combo={comboWithDecimal} />);
    expect(screen.getByText("x3.5")).toBeInTheDocument();
  });

  it("should show streak level for high streaks", () => {
    const highStreakCombo = { ...mockCombo, streak: 10 };
    render(<ComboDisplay combo={highStreakCombo} />);
    expect(screen.getByText("AMAZING")).toBeInTheDocument();
  });

  it("should show different streak levels", () => {
    const streakLevels = [
      { streak: 5, expected: "GREAT" },
      { streak: 10, expected: "AMAZING" },
      { streak: 15, expected: "EPIC" },
      { streak: 25, expected: "LEGENDARY" }
    ];

    streakLevels.forEach(({ streak, expected }) => {
      const { rerender } = render(<ComboDisplay combo={{ ...mockCombo, streak }} />);
      expect(screen.getByText(expected)).toBeInTheDocument();
      rerender(<div />); // Clear for next test
    });
  });

  it("should not show streak level for low streaks", () => {
    const lowStreakCombo = { ...mockCombo, streak: 3 };
    render(<ComboDisplay combo={lowStreakCombo} />);
    expect(screen.queryByText("GREAT")).not.toBeInTheDocument();
  });

  it("should call onComboExtend when combo increases", () => {
    const mockExtend = vi.fn();
    const { rerender } = render(
      <ComboDisplay combo={mockCombo} onComboExtend={mockExtend} />
    );
    
    const extendedCombo = { ...mockCombo, count: 6 };
    rerender(<ComboDisplay combo={extendedCombo} onComboExtend={mockExtend} />);
    
    expect(mockExtend).toHaveBeenCalledWith(extendedCombo);
  });

  it("should call onComboBreak when combo resets to 0", () => {
    const mockBreak = vi.fn();
    const { rerender } = render(
      <ComboDisplay combo={mockCombo} onComboBreak={mockBreak} />
    );
    
    const brokenCombo = { ...mockCombo, count: 0 };
    rerender(<ComboDisplay combo={brokenCombo} onComboBreak={mockBreak} />);
    
    expect(mockBreak).toHaveBeenCalledWith(mockCombo);
  });

  it("should call onStreakAchieved when streak increases", () => {
    const mockStreak = vi.fn();
    const { rerender } = render(
      <ComboDisplay combo={mockCombo} onStreakAchieved={mockStreak} />
    );
    
    const higherStreakCombo = { ...mockCombo, count: 6, streak: 4 };
    rerender(<ComboDisplay combo={higherStreakCombo} onStreakAchieved={mockStreak} />);
    
    expect(mockStreak).toHaveBeenCalledWith(4);
  });

  it("should handle zero time remaining", () => {
    const expiredCombo = { ...mockCombo, timeRemaining: 0 };
    render(<ComboDisplay combo={expiredCombo} />);
    
    // Should still display combo count
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("should handle high multiplier values", () => {
    const highMultiplierCombo = { ...mockCombo, multiplier: 10.7 };
    render(<ComboDisplay combo={highMultiplierCombo} />);
    expect(screen.getByText("x10.7")).toBeInTheDocument();
  });
});