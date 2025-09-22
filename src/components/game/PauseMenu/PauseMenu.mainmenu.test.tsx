import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { PauseMenu } from "./PauseMenu";
import { GameStateManager } from "../../../game/core/GameState";

// Create mock functions
const mockResumeGame = vi.fn();

// Mock the hooks and stores
vi.mock("../../../hooks/usePauseInput", () => ({
  usePauseInput: () => ({
    resumeGame: mockResumeGame,
    isPaused: true,
    pauseGame: vi.fn(),
    togglePause: vi.fn(),
  }),
}));

vi.mock("../../../stores/uiStore", () => ({
  useIsPaused: vi.fn(() => true),
  useIsPauseMenuOpen: vi.fn(() => true),
  useUIStore: vi.fn(() => ({
    settings: {
      soundEnabled: true,
      musicEnabled: true,
      volume: 0.7,
      theme: "dark" as const,
      difficulty: "normal" as const,
      controls: "keyboard" as const,
      inputSensitivity: {
        mouse: 1.0,
        keyboard: 1.0,
        touch: 1.0,
      },
      accessibility: {
        highContrast: false,
        reduceMotion: false,
        screenReader: false,
        largeText: false,
      },
    },
    updateSettings: vi.fn(),
  })),
}));

// Mock createPortal
vi.mock("react-dom", async () => {
  const actual = await vi.importActual("react-dom");
  return {
    ...actual,
    createPortal: (children: React.ReactNode) => children,
  };
});

describe("PauseMenu - Main Menu Navigation", () => {
  const mockOnMainMenu = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should reset game state when confirming main menu navigation", async () => {
    // Create mock GameStateManager
    const mockGameStateManager = new GameStateManager();
    vi.spyOn(mockGameStateManager, "reset");
    vi.spyOn(mockGameStateManager, "setGameStatus");

    // Attach to window for global access
    window.gameStateManager = mockGameStateManager;

    render(<PauseMenu onMainMenu={mockOnMainMenu} />);

    // Click main menu button
    const mainMenuButton = screen.getByText("メインメニュー");
    fireEvent.click(mainMenuButton);

    // Wait for confirmation dialog
    await waitFor(() => {
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
      expect(
        screen.getByText(
          "ゲームを終了してメインメニューに戻りますか？現在の進行状況は失われます。",
        ),
      ).toBeInTheDocument();
    });

    // Confirm navigation - use the button with aria-label
    const confirmButton = screen.getByRole("button", {
      name: "メインメニューに戻る",
    });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      // Verify game state cleanup
      expect(mockGameStateManager.reset).toHaveBeenCalledOnce();
      expect(mockGameStateManager.setGameStatus).toHaveBeenCalledWith("idle");

      // Verify game is resumed before navigation
      expect(mockResumeGame).toHaveBeenCalledOnce();

      // Verify navigation callback
      expect(mockOnMainMenu).toHaveBeenCalledOnce();
    });

    // Cleanup
    delete window.gameStateManager;
  });

  it("should handle navigation when no gameStateManager is available", async () => {
    // Don't attach gameStateManager to window
    render(<PauseMenu onMainMenu={mockOnMainMenu} />);

    // Click main menu button
    const mainMenuButton = screen.getByText("メインメニュー");
    fireEvent.click(mainMenuButton);

    // Wait for confirmation dialog
    await waitFor(() => {
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    });

    // Confirm navigation
    const confirmButton = screen.getByRole("button", {
      name: "メインメニューに戻る",
    });
    fireEvent.click(confirmButton);

    // Should still call onMainMenu even without gameStateManager
    await waitFor(() => {
      expect(mockOnMainMenu).toHaveBeenCalledOnce();
      expect(mockResumeGame).toHaveBeenCalledOnce();
    });
  });
});
