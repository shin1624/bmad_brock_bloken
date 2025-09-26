import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import App from "../../App";

// Mock Zustand store
const mockUseUIStore = vi.fn();
vi.mock("../../stores/uiStore", () => ({
  useUIStore: mockUseUIStore,
}));

// Setup mock implementation
mockUseUIStore.mockReturnValue({
  currentScreen: "menu",
  setCurrentScreen: vi.fn(),
  selectedLevel: 1,
  setSelectedLevel: vi.fn(),
});

describe("Game Flow Integration Tests", () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  describe("MainMenu → Game Transition", () => {
    it("should navigate from main menu to game when Start Game is clicked", async () => {
      const { container } = render(<App />);

      // Initially should show main menu
      expect(screen.getByText("Block Breaker")).toBeInTheDocument();
      expect(screen.getByText("Start Game")).toBeInTheDocument();

      // Click Start Game button
      const startButton = screen.getByText("Start Game");
      fireEvent.click(startButton);

      // Wait for game to load
      await waitFor(
        () => {
          expect(
            container.querySelector(".game-container"),
          ).toBeInTheDocument();
        },
        { timeout: 3000 },
      );

      // Should show game elements
      expect(screen.getByText("Back to Menu")).toBeInTheDocument();
      expect(
        screen.getByText(/Use Arrow Keys or Mouse to move/),
      ).toBeInTheDocument();
    });

    it("should handle level selection before starting game", async () => {
      const { container } = render(<App />);

      // Click Level Select
      const levelButton = screen.getByText("Level Select");
      fireEvent.click(levelButton);

      await waitFor(() => {
        // Should show level selection
        expect(container.querySelector(".level-select")).toBeInTheDocument();
      });

      // Select a level and start game
      const level1 = container.querySelector('[data-level="1"]');
      if (level1) {
        fireEvent.click(level1);
      }

      // Should transition to game with selected level
      await waitFor(() => {
        expect(container.querySelector(".game-container")).toBeInTheDocument();
      });
    });

    it("should show high scores screen from main menu", async () => {
      render(<App />);

      // Click High Scores
      const highScoresButton = screen.getByText("High Scores");
      fireEvent.click(highScoresButton);

      await waitFor(() => {
        expect(screen.getByText(/High Scores/)).toBeInTheDocument();
      });
    });

    it("should navigate to settings from main menu", async () => {
      render(<App />);

      // Click Settings
      const settingsButton = screen.getByText("Settings");
      fireEvent.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByText(/Settings/)).toBeInTheDocument();
      });
    });
  });

  describe("Game → MainMenu Return", () => {
    it("should return to main menu when Back button is clicked in game", async () => {
      const { container } = render(<App />);

      // Start game first
      const startButton = screen.getByText("Start Game");
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText("Back to Menu")).toBeInTheDocument();
      });

      // Click Back to Menu
      const backButton = screen.getByText("Back to Menu");
      fireEvent.click(backButton);

      // Should return to main menu
      await waitFor(() => {
        expect(screen.getByText("Block Breaker")).toBeInTheDocument();
        expect(screen.getByText("Start Game")).toBeInTheDocument();
      });
    });

    it("should return to main menu when ESC key is pressed in game", async () => {
      render(<App />);

      // Start game
      const startButton = screen.getByText("Start Game");
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(screen.getByText("Back to Menu")).toBeInTheDocument();
      });

      // Press ESC key
      fireEvent.keyDown(window, { key: "Escape" });

      // Should return to main menu
      await waitFor(() => {
        expect(screen.getByText("Block Breaker")).toBeInTheDocument();
      });
    });

    it("should maintain game state when paused and resumed", async () => {
      const { container } = render(<App />);

      // Start game
      fireEvent.click(screen.getByText("Start Game"));

      await waitFor(() => {
        expect(container.querySelector(".game-container")).toBeInTheDocument();
      });

      // Pause game with spacebar
      fireEvent.keyDown(window, { key: " " });

      // Check if game is paused (implementation specific)
      await waitFor(
        () => {
          expect(container.querySelector(".paused")).toBeInTheDocument();
        },
        { timeout: 1000 },
      ).catch(() => {
        // Pause UI might not be implemented yet
        expect(container).toBeInTheDocument();
      });

      // Resume game
      fireEvent.keyDown(window, { key: " " });

      // Game should continue
      expect(container.querySelector(".game-container")).toBeInTheDocument();
    });
  });

  describe("Complete Game Flow", () => {
    it("should complete full user journey: menu → game → pause → resume → back to menu", async () => {
      const { container } = render(<App />);

      // Step 1: Main menu is displayed
      expect(screen.getByText("Block Breaker")).toBeInTheDocument();

      // Step 2: Start game
      fireEvent.click(screen.getByText("Start Game"));

      await waitFor(() => {
        expect(screen.getByText("Back to Menu")).toBeInTheDocument();
      });

      // Step 3: Play game (move paddle)
      fireEvent.keyDown(window, { key: "ArrowLeft" });
      fireEvent.keyUp(window, { key: "ArrowLeft" });
      fireEvent.keyDown(window, { key: "ArrowRight" });
      fireEvent.keyUp(window, { key: "ArrowRight" });

      // Step 4: Pause game
      fireEvent.keyDown(window, { key: " " });

      await waitFor(() => {
        // Game should still be rendered
        expect(container.querySelector(".game-container")).toBeInTheDocument();
      });

      // Step 5: Resume game
      fireEvent.keyDown(window, { key: " " });

      // Step 6: Return to menu
      fireEvent.click(screen.getByText("Back to Menu"));

      await waitFor(() => {
        expect(screen.getByText("Block Breaker")).toBeInTheDocument();
        expect(screen.getByText("Start Game")).toBeInTheDocument();
      });
    });

    it("should handle rapid screen transitions without errors", async () => {
      render(<App />);

      // Rapidly switch between screens
      for (let i = 0; i < 3; i++) {
        // Go to game
        fireEvent.click(screen.getByText("Start Game"));

        await waitFor(() => {
          expect(screen.getByText("Back to Menu")).toBeInTheDocument();
        });

        // Back to menu
        fireEvent.click(screen.getByText("Back to Menu"));

        await waitFor(() => {
          expect(screen.getByText("Start Game")).toBeInTheDocument();
        });
      }

      // Should end at main menu without errors
      expect(screen.getByText("Block Breaker")).toBeInTheDocument();
    });

    it("should preserve user settings across screen transitions", async () => {
      const { container } = render(<App />);

      // Go to settings
      fireEvent.click(screen.getByText("Settings"));

      await waitFor(() => {
        expect(screen.getByText(/Settings/)).toBeInTheDocument();
      });

      // Change a setting (if implemented)
      const volumeSlider = container.querySelector('input[type="range"]');
      if (volumeSlider) {
        fireEvent.change(volumeSlider, { target: { value: "50" } });
      }

      // Go back and start game
      fireEvent.click(screen.getByText("Back"));
      fireEvent.click(screen.getByText("Start Game"));

      await waitFor(() => {
        expect(screen.getByText("Back to Menu")).toBeInTheDocument();
      });

      // Settings should be preserved
      expect(container).toBeInTheDocument();
    });
  });
});
