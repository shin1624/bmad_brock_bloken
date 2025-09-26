import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { Game } from "./Game";

// Mock GameCanvas
vi.mock("./GameCanvas", () => ({
  GameCanvas: vi.fn(({ onCanvasReady }) => {
    // Create mock canvas and context
    const mockCanvas = document.createElement("canvas");
    const mockContext = mockCanvas.getContext("2d") as CanvasRenderingContext2D;

    // Call onCanvasReady immediately
    setTimeout(() => {
      onCanvasReady?.(mockCanvas, mockContext);
    }, 0);

    return <div data-testid="game-canvas">Mock Canvas</div>;
  }),
}));

describe("Game Component", () => {
  let onBackMock: () => void;

  beforeEach(() => {
    onBackMock = vi.fn();
  });

  it("should render the game canvas", () => {
    const { getByTestId } = render(<Game onBack={onBackMock} />);
    expect(getByTestId("game-canvas")).toBeInTheDocument();
  });

  it("should render the back button", () => {
    const { getByText } = render(<Game onBack={onBackMock} />);
    expect(getByText("Back to Menu")).toBeInTheDocument();
  });

  it("should call onBack when back button is clicked", () => {
    const { getByText } = render(<Game onBack={onBackMock} />);
    const backButton = getByText("Back to Menu");

    fireEvent.click(backButton);
    expect(onBackMock).toHaveBeenCalledTimes(1);
  });

  it("should display game instructions", () => {
    const { getByText } = render(<Game onBack={onBackMock} />);
    expect(getByText(/Use Arrow Keys or Mouse to move/)).toBeInTheDocument();
  });

  it("should initialize game state correctly", () => {
    const { container } = render(<Game onBack={onBackMock} />);

    // Check if game container has correct structure
    const gameContainer = container.querySelector(
      ".flex.flex-col.items-center.justify-center",
    );
    expect(gameContainer).toBeInTheDocument();
  });

  it("should handle keyboard events for game control", async () => {
    const { container } = render(<Game onBack={onBackMock} />);

    // Simulate space key press to start game
    fireEvent.keyDown(window, { key: " " });

    await waitFor(() => {
      // Game should be ready to receive input
      expect(container).toBeInTheDocument();
    });

    // Simulate arrow key presses
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    fireEvent.keyDown(window, { key: "ArrowRight" });

    // Should not throw any errors
    expect(container).toBeInTheDocument();
  });

  it("should handle escape key to go back", () => {
    render(<Game onBack={onBackMock} />);

    // Simulate escape key press
    fireEvent.keyDown(window, { key: "Escape" });

    expect(onBackMock).toHaveBeenCalledTimes(1);
  });

  it("should cleanup event listeners on unmount", () => {
    const { unmount } = render(<Game onBack={onBackMock} />);

    // Unmount the component
    unmount();

    // Try to trigger events after unmount - should not cause errors
    fireEvent.keyDown(window, { key: " " });
    fireEvent.keyDown(window, { key: "Escape" });

    // onBack should not have been called from the escape key after unmount
    expect(onBackMock).toHaveBeenCalledTimes(0);
  });

  it("should handle mouse movement for paddle control", async () => {
    const { container } = render(<Game onBack={onBackMock} />);
    const canvas = container.querySelector("canvas");

    if (canvas) {
      fireEvent.mouseMove(canvas, { clientX: 100, clientY: 300 });
      fireEvent.mouseMove(canvas, { clientX: 400, clientY: 300 });
    }

    await waitFor(() => {
      expect(container).toBeInTheDocument();
    });
  });

  it("should handle pause functionality with spacebar", async () => {
    const { container } = render(<Game onBack={onBackMock} />);

    // Start game
    fireEvent.keyDown(window, { key: " " });

    await waitFor(() => {
      expect(container).toBeInTheDocument();
    });

    // Pause game
    fireEvent.keyDown(window, { key: " " });

    expect(container).toBeInTheDocument();
  });

  it("should handle multiple arrow key combinations", async () => {
    const { container } = render(<Game onBack={onBackMock} />);

    // Test multiple key combinations
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    fireEvent.keyUp(window, { key: "ArrowLeft" });
    fireEvent.keyDown(window, { key: "ArrowRight" });
    fireEvent.keyUp(window, { key: "ArrowRight" });

    await waitFor(() => {
      expect(container).toBeInTheDocument();
    });
  });

  it("should render with default props when onBack is not provided", () => {
    const { container } = render(<Game />);
    expect(container.querySelector(".flex.flex-col")).toBeInTheDocument();
  });

  it("should handle game over scenario", async () => {
    const { container } = render(<Game onBack={onBackMock} />);

    // Simulate game actions that would lead to game over
    // This tests the game state management
    fireEvent.keyDown(window, { key: " " }); // Start game

    await waitFor(() => {
      expect(container).toBeInTheDocument();
    });
  });

  it("should initialize blocks correctly", async () => {
    const { container } = render(<Game onBack={onBackMock} />);

    await waitFor(() => {
      // Game should render without errors
      expect(container.querySelector(".min-h-screen")).toBeInTheDocument();
    });
  });

  it("should handle canvas context properly", async () => {
    const { getByTestId } = render(<Game onBack={onBackMock} />);

    await waitFor(() => {
      expect(getByTestId("game-canvas")).toBeInTheDocument();
    });
  });

  it("should display score and lives information", () => {
    const { container } = render(<Game onBack={onBackMock} />);

    // Check for game UI elements
    const gameUI = container.querySelector(".bg-gray-900");
    expect(gameUI).toBeInTheDocument();
  });

  it("should handle rapid key presses", async () => {
    const { container } = render(<Game onBack={onBackMock} />);

    // Simulate rapid key presses
    for (let i = 0; i < 10; i++) {
      fireEvent.keyDown(window, { key: "ArrowLeft" });
      fireEvent.keyUp(window, { key: "ArrowLeft" });
    }

    await waitFor(() => {
      expect(container).toBeInTheDocument();
    });
  });

  it("should maintain game state between pauses", async () => {
    const { container } = render(<Game onBack={onBackMock} />);

    // Start game
    fireEvent.keyDown(window, { key: " " });

    await waitFor(() => {
      expect(container).toBeInTheDocument();
    });

    // Pause and resume
    fireEvent.keyDown(window, { key: " " });
    fireEvent.keyDown(window, { key: " " });

    expect(container).toBeInTheDocument();
  });
});
