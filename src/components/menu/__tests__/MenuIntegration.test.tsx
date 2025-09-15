import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MainMenu } from "../MainMenu/MainMenu";
import { useMainMenu } from "../../../hooks/useMainMenu";

// Mock all necessary hooks
vi.mock("../../../hooks/useMainMenu");

describe("Menu Component Integration Tests", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();

    // Setup default mock using ES6 import style
    const mockUseMainMenu = vi.mocked(useMainMenu);
    mockUseMainMenu.mockReturnValue({
      menuState: {
        currentMenu: "main",
        navigationHistory: [],
        isAnimating: false,
      },
      isLoading: false,
      startGame: vi.fn(),
      openSettings: vi.fn(),
      openHighScores: vi.fn(),
      openLevelSelect: vi.fn(),
      goBack: vi.fn(),
    });
  });

  describe("Navigation Flow Integration", () => {
    it("should handle complete menu navigation workflow", async () => {
      // Test user journey: MainMenu → Settings interaction
      render(<MainMenu />);
      expect(screen.getByText("Block Breaker")).toBeInTheDocument();

      // Navigate to settings
      const settingsButton = screen.getByLabelText(/open game settings/i);
      fireEvent.click(settingsButton);

      // Verify settings function was called
      const mockUseMainMenu = vi.mocked(useMainMenu);
      expect(mockUseMainMenu().openSettings).toHaveBeenCalled();
    });
  });
});
