import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { LevelSelect } from "./LevelSelect";

// Mock the useLevelData hook
vi.mock("../../../hooks/useLevelData", () => ({
  useLevelData: vi.fn(),
}));

describe("LevelSelect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders level selection title", async () => {
    const { useLevelData } = await import("../../../hooks/useLevelData");
    vi.mocked(useLevelData).mockReturnValue({
      levels: [],
      progress: {
        currentLevel: 1,
        completedLevels: [],
        levelScores: {},
        totalStars: 0,
      },
      unlockLevel: vi.fn(),
      saveProgress: vi.fn(),
    });

    const mockOnSelectLevel = vi.fn();
    render(<LevelSelect onSelectLevel={mockOnSelectLevel} />);
    expect(screen.getByText("レベル選択")).toBeInTheDocument();
  });

  it("displays level cards when levels are available", async () => {
    const { useLevelData } = await import("../../../hooks/useLevelData");
    vi.mocked(useLevelData).mockReturnValue({
      levels: [
        {
          id: 1,
          name: "Level 1",
          difficulty: "easy",
          unlocked: true,
          rows: 3,
          cols: 5,
          blockLayout: [],
          requiredScore: 1000,
        },
      ],
      progress: {
        currentLevel: 1,
        completedLevels: [],
        levelScores: {},
        totalStars: 0,
      },
      unlockLevel: vi.fn(),
      saveProgress: vi.fn(),
    });

    const mockOnSelectLevel = vi.fn();
    render(<LevelSelect onSelectLevel={mockOnSelectLevel} />);
    expect(screen.getByText("Level 1")).toBeInTheDocument();
  });

  it("shows difficulty indicator for levels", async () => {
    const { useLevelData } = await import("../../../hooks/useLevelData");
    vi.mocked(useLevelData).mockReturnValue({
      levels: [
        {
          id: 1,
          name: "Level 1",
          difficulty: "easy",
          unlocked: true,
          rows: 3,
          cols: 5,
          blockLayout: [],
          requiredScore: 1000,
        },
      ],
      progress: {
        currentLevel: 1,
        completedLevels: [],
        levelScores: {},
        totalStars: 0,
      },
      unlockLevel: vi.fn(),
      saveProgress: vi.fn(),
    });

    const mockOnSelectLevel = vi.fn();
    render(<LevelSelect onSelectLevel={mockOnSelectLevel} />);
    expect(screen.getByText("Easy")).toBeInTheDocument();
  });

  it("shows locked status for locked levels", async () => {
    const { useLevelData } = await import("../../../hooks/useLevelData");
    vi.mocked(useLevelData).mockReturnValue({
      levels: [
        {
          id: 2,
          name: "Level 2",
          difficulty: "normal",
          unlocked: false,
          rows: 4,
          cols: 6,
          blockLayout: [],
          requiredScore: 2000,
        },
      ],
      progress: {
        currentLevel: 1,
        completedLevels: [],
        levelScores: {},
        totalStars: 0,
      },
      unlockLevel: vi.fn(),
      saveProgress: vi.fn(),
    });

    const mockOnSelectLevel = vi.fn();
    render(<LevelSelect onSelectLevel={mockOnSelectLevel} />);
    expect(screen.getByText("🔒")).toBeInTheDocument();
  });

  it("shows completion status for completed levels", async () => {
    const { useLevelData } = await import("../../../hooks/useLevelData");
    vi.mocked(useLevelData).mockReturnValue({
      levels: [
        {
          id: 1,
          name: "Level 1",
          difficulty: "easy",
          unlocked: true,
          rows: 3,
          cols: 5,
          blockLayout: [],
          requiredScore: 1000,
          bestScore: 1500,
        },
      ],
      progress: {
        currentLevel: 2,
        completedLevels: [1],
        levelScores: { 1: 1500 },
        totalStars: 1,
      },
      unlockLevel: vi.fn(),
      saveProgress: vi.fn(),
    });

    const mockOnSelectLevel = vi.fn();
    render(<LevelSelect onSelectLevel={mockOnSelectLevel} />);
    expect(screen.getByText("⭐")).toBeInTheDocument(); // Perfect completion
    expect(screen.getByText("Best: 1,500")).toBeInTheDocument();
  });

  it("shows standard completion for levels with normal scores", async () => {
    const { useLevelData } = await import("../../../hooks/useLevelData");
    vi.mocked(useLevelData).mockReturnValue({
      levels: [
        {
          id: 1,
          name: "Level 1",
          difficulty: "easy",
          unlocked: true,
          rows: 3,
          cols: 5,
          blockLayout: [],
          requiredScore: 1000,
          bestScore: 1200,
        },
      ],
      progress: {
        currentLevel: 2,
        completedLevels: [1],
        levelScores: { 1: 1200 },
        totalStars: 1,
      },
      unlockLevel: vi.fn(),
      saveProgress: vi.fn(),
    });

    const mockOnSelectLevel = vi.fn();
    render(<LevelSelect onSelectLevel={mockOnSelectLevel} />);
    expect(screen.getByText("✅")).toBeInTheDocument(); // Standard completion
  });

  it("sanitizes level names for security", async () => {
    const { useLevelData } = await import("../../../hooks/useLevelData");
    vi.mocked(useLevelData).mockReturnValue({
      levels: [
        {
          id: 1,
          name: "Level <script>alert('xss')</script>",
          difficulty: "easy",
          unlocked: true,
          rows: 3,
          cols: 5,
          blockLayout: [],
          requiredScore: 1000,
        },
      ],
      progress: {
        currentLevel: 1,
        completedLevels: [],
        levelScores: {},
        totalStars: 0,
      },
      unlockLevel: vi.fn(),
      saveProgress: vi.fn(),
    });

    const mockOnSelectLevel = vi.fn();
    render(<LevelSelect onSelectLevel={mockOnSelectLevel} />);
    expect(screen.getByText("Level alert('xss')")).toBeInTheDocument(); // Sanitized
    expect(screen.queryByText("Level <script>alert('xss')</script>")).not.toBeInTheDocument();
  });
});
