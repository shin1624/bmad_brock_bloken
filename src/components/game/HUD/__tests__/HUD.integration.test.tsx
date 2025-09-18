import { render, screen } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { HUD } from "../index";
import { useHUD } from "../../../../hooks/useHUD";

// Mock the useHUD hook
vi.mock("../../../../hooks/useHUD");

describe("HUD Integration Tests", () => {
  const mockUseHUD = vi.mocked(useHUD);

  beforeEach(() => {
    mockUseHUD.mockReturnValue({
      hudState: {
        score: 1500,
        lives: 3,
        level: 2,
        powerUps: [],
        combo: { count: 0, multiplier: 1, streak: 0, timeRemaining: 0 },
        isVisible: true,
        isAnimating: false,
        notifications: [],
        lastUpdateTime: performance.now(),
        renderCount: 1,
      },
      isLoaded: true,
      error: null,
      updatePowerUps: vi.fn(),
      updateCombo: vi.fn(),
      setAnimating: vi.fn(),
      setVisible: vi.fn(),
      resetHUD: vi.fn(),
      addNotification: vi.fn(),
      removeNotification: vi.fn(),
      gameState: {
        isPlaying: true,
        isPaused: false,
        score: 1500,
        level: 2,
        lives: 3,
        gameTime: 30000,
      },
      gameControls: {
        startGame: vi.fn(),
        pauseGame: vi.fn(),
        resumeGame: vi.fn(),
        resetGame: vi.fn(),
        endGame: vi.fn(),
      },
      saveHUDState: vi.fn(),
      loadHUDState: vi.fn(),
      getPerformanceMetrics: vi.fn(() => ({
        averageRenderTime: 5,
        currentFPS: 60,
        renderCount: 1,
        lastUpdateTime: performance.now(),
        isWithinTarget: true,
      })),
      config: {
        enableAnimations: true,
        animationDuration: 600,
        notificationTimeout: 3000,
        maxNotifications: 5,
        persistState: true,
        performanceMode: false,
      },
      clearError: vi.fn(),
      isGameActive: true,
      canPlay: false,
    });
  });

  it("should integrate with useHUD hook for real-time updates", () => {
    const mockHudState = {
      score: 2500,
      lives: 2,
      level: 3,
      maxLives: 3,
    };

    render(<HUD hudState={mockHudState} />);

    expect(screen.getByText("2,500")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Level 3")).toBeInTheDocument();
  });

  it("should handle score updates with animations", () => {
    const mockOnScoreChange = vi.fn();
    const { rerender } = render(
      <HUD
        hudState={{ score: 1000, lives: 3, level: 1 }}
        onScoreChange={mockOnScoreChange}
      />,
    );

    rerender(
      <HUD
        hudState={{ score: 1500, lives: 3, level: 1 }}
        onScoreChange={mockOnScoreChange}
      />,
    );

    expect(mockOnScoreChange).toHaveBeenCalledWith(1500, 1000);
  });

  it("should handle lives updates with game over callback", () => {
    const mockOnLifeChange = vi.fn();
    const mockOnGameOver = vi.fn();

    render(
      <HUD
        hudState={{ score: 1000, lives: 0, level: 1 }}
        onLifeChange={mockOnLifeChange}
        onGameOver={mockOnGameOver}
      />,
    );

    expect(mockOnGameOver).toHaveBeenCalled();
  });

  it("should synchronize state between components", () => {
    const hudState = {
      score: 3000,
      lives: 1,
      level: 4,
    };

    render(<HUD hudState={hudState} />);

    // Verify all components display synchronized data
    expect(screen.getByText("3,000")).toBeInTheDocument(); // Score
    expect(screen.getByText("1")).toBeInTheDocument(); // Lives
    expect(screen.getByText("Level 4")).toBeInTheDocument(); // Level
  });

  it("should handle performance optimization requirements", () => {
    const startTime = performance.now();

    render(<HUD hudState={{ score: 1000, lives: 3, level: 1 }} />);

    const renderTime = performance.now() - startTime;

    // Should render within 8ms for 60FPS compliance
    expect(renderTime).toBeLessThan(8);
  });

  it("should handle multiple rapid state updates efficiently", () => {
    const { rerender } = render(
      <HUD hudState={{ score: 1000, lives: 3, level: 1 }} />,
    );

    const startTime = performance.now();

    // Simulate rapid score updates
    for (let i = 0; i < 10; i++) {
      rerender(
        <HUD hudState={{ score: 1000 + i * 100, lives: 3, level: 1 }} />,
      );
    }

    const totalTime = performance.now() - startTime;
    const averageTime = totalTime / 10;

    // Each update should be within performance target
    expect(averageTime).toBeLessThan(8);
  });

  it("should maintain accessibility compliance", () => {
    render(<HUD hudState={{ score: 1500, lives: 2, level: 3 }} />);

    const hudContainer = screen.getByTestId("hud-overlay");

    // Should have proper accessibility attributes
    expect(hudContainer).toBeInTheDocument();
    expect(hudContainer).toHaveClass("hud-overlay");

    // Text should be readable by screen readers
    expect(screen.getByText("1,500")).toBeInTheDocument();
    expect(screen.getByText("Level 3")).toBeInTheDocument();
  });
});
