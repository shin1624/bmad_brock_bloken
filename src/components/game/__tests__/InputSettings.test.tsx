import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { InputSettings } from "../InputSettings";
import { useUIStore } from "../../../stores/uiStore";

// UIStoreのモック
vi.mock("../../../stores/uiStore", () => ({
  useUIStore: vi.fn(),
}));

describe("InputSettings", () => {
  const mockSetControls = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // デフォルトのモック実装
    (useUIStore as any).mockReturnValue({
      settings: {
        controls: "keyboard",
        inputSensitivity: {
          keyboard: 1.0,
          mouse: 1.0,
          touch: 1.0,
        },
      },
      setControls: mockSetControls,
    });
  });

  it("should render input settings component", () => {
    render(<InputSettings />);
    expect(screen.getByText("入力設定")).toBeInTheDocument();
  });

  it("should display control mode options", () => {
    render(<InputSettings />);
    expect(screen.getByText("キーボード")).toBeInTheDocument();
    expect(screen.getByText("マウス")).toBeInTheDocument();
    expect(screen.getByText("タッチ")).toBeInTheDocument();
  });

  it("should highlight selected control mode", () => {
    render(<InputSettings />);
    const keyboardButton = screen.getByLabelText("キーボードモードに切り替え");
    expect(keyboardButton).toHaveAttribute("aria-pressed", "true");
  });

  it("should call setControls when control mode is changed", () => {
    render(<InputSettings />);
    const mouseButton = screen.getByLabelText("マウスモードに切り替え");

    fireEvent.click(mouseButton);
    expect(mockSetControls).toHaveBeenCalledWith("mouse");
  });

  it("should display sensitivity sliders", () => {
    render(<InputSettings />);
    expect(
      screen.getByLabelText("キーボード感度調整スライダー"),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("マウス感度調整スライダー"),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("タッチ感度調整スライダー"),
    ).toBeInTheDocument();
  });
});
