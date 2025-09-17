import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { PauseMenu } from "./PauseMenu";

// Mock functions must be declared before vi.mock calls for hoisting
const mockResumeGame = vi.fn();

// Mock the hooks and stores
vi.mock("../../../hooks/usePauseInput", () => ({
  usePauseInput: () => ({
    resumeGame: mockResumeGame,
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

// Mock createPortal for PauseOverlay
vi.mock("react-dom", async () => {
  const actual = await vi.importActual("react-dom");
  return {
    ...actual,
    createPortal: (children: React.ReactNode) => children,
  };
});

describe("PauseMenu", () => {
  const mockOnResume = vi.fn();
  const mockOnSettings = vi.fn();
  const mockOnMainMenu = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();

    // Import and mock the store hooks
    const { useIsPaused, useIsPauseMenuOpen } = await import(
      "../../../stores/uiStore"
    );
    vi.mocked(useIsPaused).mockReturnValue(true);
    vi.mocked(useIsPauseMenuOpen).mockReturnValue(true);
  });

  it("should render pause menu when paused and menu is open", () => {
    render(
      <PauseMenu
        onResume={mockOnResume}
        onSettings={mockOnSettings}
        onMainMenu={mockOnMainMenu}
      />,
    );

    expect(screen.getByText("ゲーム一時停止")).toBeInTheDocument();
    expect(screen.getByText("再開")).toBeInTheDocument();
    expect(screen.getByText("設定")).toBeInTheDocument();
    expect(screen.getByText("メインメニュー")).toBeInTheDocument();
  });

  it("should not render when not paused", async () => {
    const { useIsPaused } = await import("../../../stores/uiStore");
    vi.mocked(useIsPaused).mockReturnValue(false);

    const { container } = render(<PauseMenu />);
    expect(container.firstChild).toBeNull();
  });

  it("should not render when pause menu is not open", async () => {
    const { useIsPauseMenuOpen } = await import("../../../stores/uiStore");
    vi.mocked(useIsPauseMenuOpen).mockReturnValue(false);

    const { container } = render(<PauseMenu />);
    expect(container.firstChild).toBeNull();
  });

  it("should call resumeGame and onResume when resume button is clicked", () => {
    render(<PauseMenu onResume={mockOnResume} />);

    const resumeButton = screen.getByText("再開");
    fireEvent.click(resumeButton);

    expect(mockResumeGame).toHaveBeenCalledOnce();
    expect(mockOnResume).toHaveBeenCalledOnce();
  });

  it("should call onSettings when settings button is clicked", () => {
    render(<PauseMenu onSettings={mockOnSettings} />);

    const settingsButton = screen.getByText("設定");
    fireEvent.click(settingsButton);

    expect(mockOnSettings).toHaveBeenCalledOnce();
  });

  it("should show confirmation dialog when main menu button is clicked", () => {
    render(<PauseMenu onMainMenu={mockOnMainMenu} />);

    const mainMenuButton = screen.getByText("メインメニュー");
    fireEvent.click(mainMenuButton);

    // Confirmation dialog should appear - use ID selector for title
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(
      screen.getByText(
        "ゲームを終了してメインメニューに戻りますか？現在の進行状況は失われます。",
      ),
    ).toBeInTheDocument();
  });

  it("should call onMainMenu when confirmation dialog is confirmed", () => {
    render(<PauseMenu onMainMenu={mockOnMainMenu} />);

    // Open confirmation dialog first
    const mainMenuButton = screen.getByText("メインメニュー");
    fireEvent.click(mainMenuButton);

    // Confirm the action using aria-label
    const confirmButton = screen.getByRole("button", {
      name: "メインメニューに戻る",
    });
    fireEvent.click(confirmButton);

    expect(mockOnMainMenu).toHaveBeenCalledOnce();
  });

  it("should have proper accessibility attributes", () => {
    render(<PauseMenu />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "pause-menu-title");

    const title = screen.getByText("ゲーム一時停止");
    expect(title).toHaveAttribute("id", "pause-menu-title");
  });

  it("should apply custom className", () => {
    const customClass = "custom-pause-menu";
    render(<PauseMenu className={customClass} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveClass(customClass);
  });
});
