import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { MainMenu } from "../MainMenu";
import { useMainMenu } from "../../../../hooks/useMainMenu";

// Mock the useMainMenu hook
vi.mock("../../../../hooks/useMainMenu");

const mockUseMainMenu = vi.mocked(useMainMenu);

const mockMenuReturn = {
  menuState: {
    currentMenu: "main" as const,
    navigationHistory: [],
    isAnimating: false,
  },
  isLoading: false,
  startGame: vi.fn(),
  openSettings: vi.fn(),
  openHighScores: vi.fn(),
  openLevelSelect: vi.fn(),
  goBack: vi.fn(),
};

describe("MainMenu Component", () => {
  beforeEach(() => {
    mockUseMainMenu.mockReturnValue(mockMenuReturn);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should render all navigation buttons", () => {
    render(<MainMenu />);

    expect(
      screen.getByRole("button", { name: /start new game/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /select game level/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /view high scores/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /open game settings/i }),
    ).toBeInTheDocument();
  });

  it("should display game title and subtitle", () => {
    render(<MainMenu />);

    expect(screen.getByText("Block Breaker")).toBeInTheDocument();
    expect(screen.getByText("Experience the Classic")).toBeInTheDocument();
  });

  it("should call startGame when Start Game button is clicked", () => {
    render(<MainMenu />);

    const startButton = screen.getByRole("button", { name: /start new game/i });
    fireEvent.click(startButton);

    expect(mockMenuReturn.startGame).toHaveBeenCalledWith(1);
  });

  it("should call openLevelSelect when Level Select button is clicked", () => {
    render(<MainMenu />);

    const levelSelectButton = screen.getByRole("button", {
      name: /select game level/i,
    });
    fireEvent.click(levelSelectButton);

    expect(mockMenuReturn.openLevelSelect).toHaveBeenCalled();
  });

  it("should call openHighScores when High Scores button is clicked", () => {
    render(<MainMenu />);

    const highScoresButton = screen.getByRole("button", {
      name: /view high scores/i,
    });
    fireEvent.click(highScoresButton);

    expect(mockMenuReturn.openHighScores).toHaveBeenCalled();
  });

  it("should call openSettings when Settings button is clicked", () => {
    render(<MainMenu />);

    const settingsButton = screen.getByRole("button", {
      name: /open game settings/i,
    });
    fireEvent.click(settingsButton);

    expect(mockMenuReturn.openSettings).toHaveBeenCalled();
  });

  it("should display loading state when isLoading is true", () => {
    mockUseMainMenu.mockReturnValue({
      ...mockMenuReturn,
      isLoading: true,
    });

    render(<MainMenu />);

    expect(screen.getByLabelText(/loading menu/i)).toBeInTheDocument();
    expect(screen.queryByText("Block Breaker")).not.toBeInTheDocument();
  });

  it("should disable buttons when loading", () => {
    mockUseMainMenu.mockReturnValue({
      ...mockMenuReturn,
      isLoading: true,
    });

    render(<MainMenu />);

    // Should show loading state, buttons not visible
    expect(screen.getByLabelText(/loading menu/i)).toBeInTheDocument();
  });

  it("should have proper accessibility attributes", () => {
    render(<MainMenu />);

    const mainElement = screen.getByRole("main");
    expect(mainElement).toHaveAttribute("aria-label", "Main Menu");

    const navigation = screen.getByRole("navigation");
    expect(navigation).toHaveAttribute("aria-label", "Main navigation");
  });

  it("should apply custom className when provided", () => {
    const { container } = render(<MainMenu className="custom-class" />);

    const mainMenu = container.querySelector(".main-menu");
    expect(mainMenu).toHaveClass("custom-class");
  });

  it("should have correct button icons and text", () => {
    render(<MainMenu />);

    // Start button
    const startButton = screen.getByRole("button", { name: /start new game/i });
    expect(startButton).toHaveTextContent("▶️");
    expect(startButton).toHaveTextContent("Start Game");

    // Level select button
    const levelButton = screen.getByRole("button", {
      name: /select game level/i,
    });
    expect(levelButton).toHaveTextContent("🎯");
    expect(levelButton).toHaveTextContent("Level Select");

    // High scores button
    const scoresButton = screen.getByRole("button", {
      name: /view high scores/i,
    });
    expect(scoresButton).toHaveTextContent("🏆");
    expect(scoresButton).toHaveTextContent("High Scores");

    // Settings button
    const settingsButton = screen.getByRole("button", {
      name: /open game settings/i,
    });
    expect(settingsButton).toHaveTextContent("⚙️");
    expect(settingsButton).toHaveTextContent("Settings");
  });
});
