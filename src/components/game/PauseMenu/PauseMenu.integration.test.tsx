import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { PauseMenu } from "./PauseMenu";

// Mock all dependencies
vi.mock("../../../hooks/usePauseInput", () => ({
  usePauseInput: () => ({
    resumeGame: vi.fn(),
  }),
}));

vi.mock("../../../stores/uiStore", () => ({
  useIsPaused: vi.fn(),
  useIsPauseMenuOpen: vi.fn(),
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

vi.mock("react-dom", async () => {
  const actual = await vi.importActual("react-dom");
  return {
    ...actual,
    createPortal: (children: React.ReactNode) => children,
  };
});

// Mock SettingsPanel
vi.mock("../../menu/Settings/SettingsPanel", () => ({
  SettingsPanel: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="settings-panel">
      <button onClick={onClose} data-testid="close-settings">
        Close Settings
      </button>
    </div>
  ),
}));

describe("PauseMenu Integration Tests", () => {
  const mockOnResume = vi.fn();
  const mockOnSettings = vi.fn();
  const mockOnMainMenu = vi.fn();
  const user = userEvent.setup();

  beforeEach(async () => {
    vi.clearAllMocks();

    // Import and mock the store hooks
    const { useIsPaused, useIsPauseMenuOpen } = await import(
      "../../../stores/uiStore"
    );
    vi.mocked(useIsPaused).mockReturnValue(true);
    vi.mocked(useIsPauseMenuOpen).mockReturnValue(true);
  });

  describe("Keyboard Navigation Accessibility", () => {
    it("should support Tab navigation through menu items", async () => {
      render(
        <PauseMenu
          onResume={mockOnResume}
          onSettings={mockOnSettings}
          onMainMenu={mockOnMainMenu}
        />,
      );

      const resumeButton = screen.getByText("再開");
      const settingsButton = screen.getByText("設定");
      const mainMenuButton = screen.getByText("メインメニュー");

      // Tab navigation should work
      await user.tab();
      expect(resumeButton).toHaveFocus();

      await user.tab();
      expect(settingsButton).toHaveFocus();

      await user.tab();
      expect(mainMenuButton).toHaveFocus();

      // Shift+Tab should go backwards
      await user.tab({ shift: true });
      expect(settingsButton).toHaveFocus();
    });

    it("should support arrow key navigation", async () => {
      render(
        <PauseMenu
          onResume={mockOnResume}
          onSettings={mockOnSettings}
          onMainMenu={mockOnMainMenu}
        />,
      );

      // Arrow keys should change focus
      await user.keyboard("{ArrowDown}");
      await user.keyboard("{ArrowDown}");

      // Enter should activate focused item
      await user.keyboard("{Enter}");

      // Should open main menu confirmation
      await waitFor(() => {
        expect(screen.getByText("メインメニューに戻る")).toBeInTheDocument();
      });
    });

    it("should support Enter and Space key activation", async () => {
      render(
        <PauseMenu
          onResume={mockOnResume}
          onSettings={mockOnSettings}
          onMainMenu={mockOnMainMenu}
        />,
      );

      const settingsButton = screen.getByText("設定");
      settingsButton.focus();

      // Enter should activate
      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(screen.getByText("Game Settings")).toBeInTheDocument();
      });
    });

    it("should handle ESC key to close menu", async () => {
      render(
        <PauseMenu
          onResume={mockOnResume}
          onSettings={mockOnSettings}
          onMainMenu={mockOnMainMenu}
        />,
      );

      // ESC should resume game
      await user.keyboard("{Escape}");
      expect(mockOnResume).toHaveBeenCalledOnce();
    });
  });

  describe("Settings Integration", () => {
    it("should open and close settings overlay", async () => {
      render(
        <PauseMenu
          onResume={mockOnResume}
          onSettings={mockOnSettings}
          onMainMenu={mockOnMainMenu}
        />,
      );

      // Open settings
      const settingsButton = screen.getByText("設定");
      await user.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByText("Game Settings")).toBeInTheDocument();
        expect(screen.getByTestId("settings-panel")).toBeInTheDocument();
      });

      // Close settings
      const closeButton = screen.getByTestId("close-settings");
      await user.click(closeButton);

      await waitFor(
        () => {
          expect(screen.queryByText("Game Settings")).not.toBeInTheDocument();
        },
        { timeout: 300 },
      );
    });

    it("should maintain pause state during settings interaction", async () => {
      render(
        <PauseMenu
          onResume={mockOnResume}
          onSettings={mockOnSettings}
          onMainMenu={mockOnMainMenu}
        />,
      );

      // Open settings
      await user.click(screen.getByText("設定"));

      // Verify pause menu is still rendered
      expect(screen.getByText("ゲーム一時停止")).toBeInTheDocument();
      expect(screen.getByText("Game Settings")).toBeInTheDocument();
    });
  });

  describe("Main Menu Navigation", () => {
    it("should show confirmation dialog for main menu navigation", async () => {
      render(
        <PauseMenu
          onResume={mockOnResume}
          onSettings={mockOnSettings}
          onMainMenu={mockOnMainMenu}
        />,
      );

      // Click main menu button
      await user.click(screen.getByText("メインメニュー"));

      // Should show confirmation dialog
      await waitFor(() => {
        expect(screen.getByText("メインメニューに戻る")).toBeInTheDocument();
        expect(
          screen.getByText(/現在の進行状況は失われます/),
        ).toBeInTheDocument();
      });
    });

    it("should handle main menu confirmation", async () => {
      render(
        <PauseMenu
          onResume={mockOnResume}
          onSettings={mockOnSettings}
          onMainMenu={mockOnMainMenu}
        />,
      );

      // Open confirmation
      await user.click(screen.getByText("メインメニュー"));

      // Confirm navigation
      const confirmButton = screen.getByText("メインメニューに戻る");
      await user.click(confirmButton);

      expect(mockOnMainMenu).toHaveBeenCalledOnce();
    });

    it("should handle main menu cancellation", async () => {
      render(
        <PauseMenu
          onResume={mockOnResume}
          onSettings={mockOnSettings}
          onMainMenu={mockOnMainMenu}
        />,
      );

      // Open confirmation
      await user.click(screen.getByText("メインメニュー"));

      // Cancel navigation
      await user.click(screen.getByText("キャンセル"));

      expect(mockOnMainMenu).not.toHaveBeenCalled();

      // Dialog should close
      await waitFor(() => {
        expect(
          screen.queryByText("メインメニューに戻る"),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("Accessibility Compliance", () => {
    it("should have proper ARIA attributes", () => {
      render(
        <PauseMenu
          onResume={mockOnResume}
          onSettings={mockOnSettings}
          onMainMenu={mockOnMainMenu}
        />,
      );

      // Main menu should have proper attributes
      const menu = screen.getByRole("menu");
      expect(menu).toHaveAttribute("aria-labelledby", "pause-menu-title");

      // Buttons should have proper attributes
      const buttons = screen.getAllByRole("button");
      buttons.forEach((button) => {
        expect(button).toHaveAttribute("aria-selected");
        expect(button).toHaveAttribute("data-focused");
      });
    });

    it("should support screen reader announcements", () => {
      render(
        <PauseMenu
          onResume={mockOnResume}
          onSettings={mockOnSettings}
          onMainMenu={mockOnMainMenu}
        />,
      );

      // Title should be accessible
      const title = screen.getByText("ゲーム一時停止");
      expect(title).toHaveAttribute("id", "pause-menu-title");

      // Menu should reference title
      const menu = screen.getByRole("menu");
      expect(menu).toHaveAttribute("aria-labelledby", "pause-menu-title");
    });

    it("should maintain focus management", async () => {
      render(
        <PauseMenu
          onResume={mockOnResume}
          onSettings={mockOnSettings}
          onMainMenu={mockOnMainMenu}
        />,
      );

      // First button should have auto focus
      const resumeButton = screen.getByText("再開");
      expect(resumeButton).toHaveAttribute("data-focused", "true");
    });

    it("should handle high contrast mode", () => {
      // Mock high contrast media query
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
          matches: query.includes("prefers-contrast: high"),
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      render(
        <PauseMenu
          onResume={mockOnResume}
          onSettings={mockOnSettings}
          onMainMenu={mockOnMainMenu}
        />,
      );

      // Component should render without errors in high contrast
      expect(screen.getByText("ゲーム一時停止")).toBeInTheDocument();
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should not render when not paused", async () => {
      const { useIsPaused } = await import("../../../stores/uiStore");
      vi.mocked(useIsPaused).mockReturnValue(false);

      render(
        <PauseMenu
          onResume={mockOnResume}
          onSettings={mockOnSettings}
          onMainMenu={mockOnMainMenu}
        />,
      );

      expect(screen.queryByText("ゲーム一時停止")).not.toBeInTheDocument();
    });

    it("should not render when menu is not open", async () => {
      const { useIsPauseMenuOpen } = await import("../../../stores/uiStore");
      vi.mocked(useIsPauseMenuOpen).mockReturnValue(false);

      render(
        <PauseMenu
          onResume={mockOnResume}
          onSettings={mockOnSettings}
          onMainMenu={mockOnMainMenu}
        />,
      );

      expect(screen.queryByText("ゲーム一時停止")).not.toBeInTheDocument();
    });

    it("should handle missing callback props gracefully", async () => {
      render(<PauseMenu />);

      // Should render without callbacks
      expect(screen.getByText("ゲーム一時停止")).toBeInTheDocument();

      // Clicks should not throw errors
      await user.click(screen.getByText("再開"));
      await user.click(screen.getByText("設定"));
    });
  });
});
