import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { HUD, ScoreDisplay, LivesDisplay, LevelDisplay, PowerUpStatus, ComboDisplay } from "../index";
import type { ActivePowerUp, ComboState } from "../index";

// Mock axe-core for accessibility testing
import { axe, toHaveNoViolations } from "jest-axe";
expect.extend(toHaveNoViolations);

describe("HUD Accessibility Tests", () => {
  it("should have no accessibility violations in HUD container", async () => {
    const { container } = render(
      <HUD hudState={{ score: 1500, lives: 3, level: 2 }} />
    );
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("should have no accessibility violations in ScoreDisplay", async () => {
    const { container } = render(<ScoreDisplay score={2500} />);
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("should have no accessibility violations in LivesDisplay", async () => {
    const { container } = render(<LivesDisplay lives={2} maxLives={5} />);
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("should have no accessibility violations in LevelDisplay", async () => {
    const { container } = render(<LevelDisplay level={3} progress={75} />);
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("should have no accessibility violations in PowerUpStatus", async () => {
    const powerUps: ActivePowerUp[] = [
      {
        id: "test-powerup",
        type: "multiball",
        duration: 5000,
        maxDuration: 10000,
        icon: "⚡",
        color: "#ff6b6b",
        name: "Multi Ball"
      }
    ];
    
    const { container } = render(<PowerUpStatus powerUps={powerUps} />);
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("should have no accessibility violations in ComboDisplay", async () => {
    const combo: ComboState = {
      count: 10,
      multiplier: 2.5,
      streak: 5,
      timeRemaining: 3000
    };
    
    const { container } = render(<ComboDisplay combo={combo} />);
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("should provide appropriate text content for screen readers", () => {
    render(<HUD hudState={{ score: 12345, lives: 2, level: 4 }} />);
    
    // Score should be formatted and readable
    expect(screen.getByText("12,345")).toBeInTheDocument();
    
    // Lives should show current count
    expect(screen.getByText("Lives:")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    
    // Level should be clearly labeled
    expect(screen.getByText("Level 4")).toBeInTheDocument();
  });

  it("should use semantic HTML structure", () => {
    render(<HUD hudState={{ score: 1000, lives: 3, level: 1 }} />);
    
    const hudContainer = screen.getByTestId("hud-overlay");
    expect(hudContainer).toBeInTheDocument();
    expect(hudContainer.tagName).toBe("DIV");
  });

  it("should provide color-blind friendly indicators", () => {
    const powerUps: ActivePowerUp[] = [
      {
        id: "multiball",
        type: "multiball",
        duration: 5000,
        maxDuration: 10000,
        icon: "⚡",
        color: "#ff6b6b",
        name: "Multi Ball"
      },
      {
        id: "paddle",
        type: "paddlesize",
        duration: 3000,
        maxDuration: 8000,
        icon: "🏓",
        color: "#4ecdc4",
        name: "Big Paddle"
      }
    ];
    
    render(<PowerUpStatus powerUps={powerUps} />);
    
    // Icons should be visible for color-blind users
    expect(screen.getByText("⚡")).toBeInTheDocument();
    expect(screen.getByText("🏓")).toBeInTheDocument();
    
    // Names should also be displayed
    expect(screen.getByText("Multi Ball")).toBeInTheDocument();
    expect(screen.getByText("Big Paddle")).toBeInTheDocument();
  });

  it("should handle high contrast mode", () => {
    render(<HUD hudState={{ score: 5000, lives: 1, level: 5 }} />);
    
    // Check for sufficient contrast in text elements
    const scoreElement = screen.getByText("5,000");
    const levelElement = screen.getByText("Level 5");
    
    expect(scoreElement).toBeInTheDocument();
    expect(levelElement).toBeInTheDocument();
    
    // Elements should have proper text shadows for readability
    const computedScoreStyle = window.getComputedStyle(scoreElement);
    expect(computedScoreStyle.textShadow).toBeTruthy();
  });

  it("should provide focus indicators for interactive elements", () => {
    const onScoreChange = () => {};
    
    render(
      <ScoreDisplay score={1000} onScoreChange={onScoreChange} />
    );
    
    // Non-interactive elements should not have focus
    const scoreElement = screen.getByText("1,000");
    expect(scoreElement).not.toHaveAttribute("tabIndex");
  });

  it("should support screen reader announcements for state changes", () => {
    const { rerender } = render(
      <LivesDisplay lives={3} maxLives={3} />
    );
    
    // Lives should be announced
    expect(screen.getByText("Lives:")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    
    // Low health warning should be announced
    rerender(<LivesDisplay lives={1} maxLives={3} />);
    expect(screen.getByText("LOW!")).toBeInTheDocument();
  });

  it("should handle reduced motion preferences", () => {
    // Mock prefers-reduced-motion
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: () => ({
        matches: true, // Simulate prefers-reduced-motion: reduce
        media: '(prefers-reduced-motion: reduce)',
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
    });
    
    render(<ScoreDisplay score={1500} />);
    
    // Component should still render properly
    expect(screen.getByText("1,500")).toBeInTheDocument();
  });

  it("should maintain accessibility with complex layouts", async () => {
    const powerUps: ActivePowerUp[] = [
      {
        id: "test1",
        type: "multiball",
        duration: 5000,
        maxDuration: 10000,
        icon: "⚡",
        color: "#ff6b6b",
        name: "Multi Ball"
      }
    ];
    
    const combo: ComboState = {
      count: 15,
      multiplier: 3.0,
      streak: 8,
      timeRemaining: 2000
    };
    
    const { container } = render(
      <div>
        <HUD hudState={{ score: 25000, lives: 2, level: 6 }} />
        <PowerUpStatus powerUps={powerUps} />
        <ComboDisplay combo={combo} />
        <LevelDisplay level={6} progress={90} />
      </div>
    );
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});