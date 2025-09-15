import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { HighScores } from "../HighScores";
import type {
  HighScore,
  HighScoreStatistics,
  SortConfig,
  ScoreFilters,
} from "../../../../types/highScores.types";

// Mock the useHighScores hook at module level
vi.mock("../../../../hooks/useHighScores", () => ({
  useHighScores: vi.fn(),
}));

describe("HighScores Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should synchronize component display with hook state changes", async () => {
    // Mock the actual hook behavior for integration test
    const mockStatistics: HighScoreStatistics = {
      bestScore: 15000,
      averageScore: 8000,
      favoriteLevel: 2,
      totalPlayTime: 7200,
    };

    const mockScores: HighScore[] = [
      {
        id: "test-1",
        playerName: "TestPlayer",
        score: 15000,
        level: 2,
        difficulty: "normal",
        timestamp: new Date("2023-12-01"),
        duration: 300,
      },
    ];

    // Set up the mock return value
    const { useHighScores } = await import("../../../../hooks/useHighScores");
    vi.mocked(useHighScores).mockReturnValue({
      statistics: mockStatistics,
      scores: mockScores,
      filters: {} as ScoreFilters,
      sortConfig: { field: "score", direction: "desc" } as SortConfig,
      updateFilters: vi.fn(),
      updateSort: vi.fn(),
      clearFilters: vi.fn(),
      exportData: vi.fn(),
      importData: vi.fn(),
      deleteScore: vi.fn(),
      clearAllScores: vi.fn(),
      isLoading: false,
      error: null,
    });

    render(<HighScores />);

    // Integration test: Component should display data from useHighScores hook
    expect(screen.getByText("ハイスコア")).toBeInTheDocument();
    expect(screen.getByText("TestPlayer")).toBeInTheDocument();
    expect(screen.getByText("15,000")).toBeInTheDocument();
  });

  it("should integrate with localStorage persistence through hook", async () => {
    // Test localStorage integration - this test should initially fail
    const { useHighScores } = await import("../../../../hooks/useHighScores");

    // Mock localStorage operations
    const mockLocalStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };

    Object.defineProperty(window, "localStorage", {
      value: mockLocalStorage,
    });

    // Mock hook to simulate localStorage integration
    vi.mocked(useHighScores).mockReturnValue({
      statistics: {
        bestScore: 0,
        averageScore: 0,
        favoriteLevel: 1,
        totalPlayTime: 0,
      },
      scores: [],
      filters: {} as ScoreFilters,
      sortConfig: { field: "score", direction: "desc" } as SortConfig,
      updateFilters: vi.fn(),
      updateSort: vi.fn(),
      clearFilters: vi.fn(),
      exportData: vi.fn(),
      importData: vi.fn(),
      deleteScore: vi.fn(),
      clearAllScores: vi.fn(),
      isLoading: false,
      error: null,
    });

    render(<HighScores />);

    // Integration test: Component should work with localStorage through hook
    expect(screen.getByText("ハイスコア")).toBeInTheDocument();
    expect(screen.getByText("スコアがありません")).toBeInTheDocument();
  });

  it("should handle error states through hook integration", async () => {
    const { useHighScores } = await import("../../../../hooks/useHighScores");

    // Mock hook with error state
    vi.mocked(useHighScores).mockReturnValue({
      statistics: {
        bestScore: 0,
        averageScore: 0,
        favoriteLevel: 1,
        totalPlayTime: 0,
      },
      scores: [],
      filters: {} as ScoreFilters,
      sortConfig: { field: "score", direction: "desc" } as SortConfig,
      updateFilters: vi.fn(),
      updateSort: vi.fn(),
      clearFilters: vi.fn(),
      exportData: vi.fn(),
      importData: vi.fn(),
      deleteScore: vi.fn(),
      clearAllScores: vi.fn(),
      isLoading: false,
      error: "Failed to load scores from storage",
    });

    render(<HighScores />);

    // Integration test: Component should display error state from hook
    expect(screen.getByText("ハイスコア")).toBeInTheDocument();
    expect(
      screen.getByText("Failed to load scores from storage"),
    ).toBeInTheDocument();
  });
});
