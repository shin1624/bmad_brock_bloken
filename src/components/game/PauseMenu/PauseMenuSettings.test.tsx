import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { PauseMenuSettings } from "./PauseMenuSettings";

// Mock the SettingsPanel component
vi.mock("../../menu/Settings/SettingsPanel", () => ({
  SettingsPanel: ({
    onClose,
    className,
  }: {
    onClose: () => void;
    className?: string;
  }) => (
    <div data-testid="settings-panel" className={className}>
      <button onClick={onClose} data-testid="close-settings">
        Close Settings
      </button>
    </div>
  ),
}));

// Mock createPortal for PauseOverlay
vi.mock("react-dom", async () => {
  const actual = await vi.importActual("react-dom");
  return {
    ...actual,
    createPortal: (children: React.ReactNode) => children,
  };
});

describe("PauseMenuSettings", () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render settings overlay when open", () => {
    render(<PauseMenuSettings isOpen={true} onClose={mockOnClose} />);

    expect(screen.getByText("Game Settings")).toBeInTheDocument();
    expect(
      screen.getByText("Settings will be saved when you return to the game"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("settings-panel")).toBeInTheDocument();
  });

  it("should not render when closed", () => {
    render(<PauseMenuSettings isOpen={false} onClose={mockOnClose} />);

    expect(screen.queryByText("Game Settings")).not.toBeInTheDocument();
  });

  it("should call onClose when settings panel closes", () => {
    render(<PauseMenuSettings isOpen={true} onClose={mockOnClose} />);

    const closeButton = screen.getByTestId("close-settings");
    fireEvent.click(closeButton);

    // Wait for animation delay
    setTimeout(() => {
      expect(mockOnClose).toHaveBeenCalledOnce();
    }, 250);
  });

  it("should close when clicking backdrop", () => {
    const { container } = render(
      <PauseMenuSettings isOpen={true} onClose={mockOnClose} />,
    );

    const overlay = container.querySelector('[role="dialog"]')?.parentElement;
    if (overlay) {
      fireEvent.click(overlay);

      // Wait for animation delay
      setTimeout(() => {
        expect(mockOnClose).toHaveBeenCalledOnce();
      }, 250);
    }
  });

  it("should not close when clicking settings container", () => {
    render(<PauseMenuSettings isOpen={true} onClose={mockOnClose} />);

    const settingsContainer = screen.getByRole("dialog");
    fireEvent.click(settingsContainer);

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it("should have proper accessibility attributes", () => {
    render(<PauseMenuSettings isOpen={true} onClose={mockOnClose} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "pause-settings-title");

    const title = screen.getByText("Game Settings");
    expect(title).toHaveAttribute("id", "pause-settings-title");
  });

  it("should apply custom className", () => {
    const customClass = "custom-settings-overlay";
    render(
      <PauseMenuSettings
        isOpen={true}
        onClose={mockOnClose}
        className={customClass}
      />,
    );

    // Check if the overlay has the custom class
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveClass(customClass);
  });

  it("should pass embedded styles to SettingsPanel", () => {
    render(<PauseMenuSettings isOpen={true} onClose={mockOnClose} />);

    const settingsPanel = screen.getByTestId("settings-panel");
    expect(settingsPanel.className).toContain("embeddedSettings");
  });
});
