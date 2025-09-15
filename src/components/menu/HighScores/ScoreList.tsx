import React from "react";
import { HighScore } from "../../../types/highScores.types";

export interface ScoreListProps {
  scores: HighScore[];
}

export const ScoreList: React.FC<ScoreListProps> = ({ scores }) => {
  if (scores.length === 0) {
    return <div>スコアがありません</div>;
  }

  return (
    <div>
      {scores.map((score) => (
        <div key={score.id}>
          <span>{score.playerName}</span>
        </div>
      ))}
    </div>
  );
};
