import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SettingsPanel } from "../SettingsPanel";

describe("SettingsPanel Integration - Persistence", () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("should save settings to localStorage when Save button is clicked", async () => {
    render(<SettingsPanel onClose={mockOnClose} />);

    // Make a change to enable save button
    const volumeSlider = screen.getByLabelText(/master volume/i);
    fireEvent.change(volumeSlider, { target: { value: "0.5" } });

    const saveButton = screen.getByText("Save Settings");
    fireEvent.click(saveButton);

    await waitFor(() => {
      const saved = localStorage.getItem("game-settings");
      expect(saved).toBeDefined();
      const parsed = JSON.parse(saved!);
      expect(parsed.volume).toBe(0.5);
      expect(parsed.masterVolume).toBe(0.5);
    });
  });
});
