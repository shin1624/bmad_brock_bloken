import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { HighScores } from "./HighScores";

// Mock the useHighScores hook
vi.mock("../../../hooks/useHighScores", () => ({
  useHighScores: vi.fn(),
}));

describe("HighScores", () => {
  const mockUseHighScores = {
    statistics: {
      bestScore: 10000,
      averageScore: 5000,
      favoriteLevel: 3,
      totalPlayTime: 3600,
    },
    scores: [],
    filters: {},
    sortConfig: { field: "score", direction: "desc" as const },
    updateFilters: vi.fn(),
    updateSort: vi.fn(),
    clearFilters: vi.fn(),
    exportData: vi.fn(),
    importData: vi.fn(),
    deleteScore: vi.fn(),
    clearAllScores: vi.fn(),
    isLoading: false,
    error: null,
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const { useHighScores } = await import("../../../hooks/useHighScores");
    vi.mocked(useHighScores).mockReturnValue(mockUseHighScores);
  });
  it("renders high scores title", () => {
    render(<HighScores />);
    expect(screen.getByText("ハイスコア")).toBeInTheDocument();
  });

  it("renders statistics when provided", () => {
    render(<HighScores />);
    expect(screen.getByText("最高スコア")).toBeInTheDocument();
  });

  it("displays correct statistical values", () => {
    render(<HighScores />);
    expect(screen.getByText("10,000")).toBeInTheDocument();
  });

  it("renders ScoreList when scores are available", async () => {
    const mockUseHighScoresWithScores = {
      ...mockUseHighScores,
      scores: [
        {
          id: "1",
          playerName: "Player1",
          score: 5000,
          level: 2,
          difficulty: "easy" as const,
          timestamp: new Date("2023-01-01"),
          duration: 200,
        },
      ],
    };

    const { useHighScores } = await import("../../../hooks/useHighScores");
    vi.mocked(useHighScores).mockReturnValue(mockUseHighScoresWithScores);

    render(<HighScores />);
    expect(screen.getByText("Player1")).toBeInTheDocument();
  });
});
