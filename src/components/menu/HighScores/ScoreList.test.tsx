import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScoreList } from "./ScoreList";

describe("ScoreList", () => {
  it("renders empty state when no scores provided", () => {
    render(<ScoreList scores={[]} />);
    expect(screen.getByText("スコアがありません")).toBeInTheDocument();
  });

  it("renders score data when scores provided", () => {
    const mockScores = [
      {
        id: "1",
        playerName: "Player1",
        score: 10000,
        level: 3,
        difficulty: "normal" as const,
        timestamp: new Date("2023-01-01"),
        duration: 300,
      },
    ];
    render(<ScoreList scores={mockScores} />);
    expect(screen.getByText("Player1")).toBeInTheDocument();
  });
});
