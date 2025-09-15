import React from "react";
import { useHighScores } from "../../../hooks/useHighScores";
import { ScoreList } from "./ScoreList";

export interface HighScoresProps {
  onClose?: () => void;
  className?: string;
}

export const HighScores: React.FC<HighScoresProps> = () => {
  const { statistics, scores, error } = useHighScores();

  return (
    <div>
      <h2>ハイスコア</h2>
      {error ? (
        <div>{error}</div>
      ) : (
        <>
          <div>
            <span>最高スコア</span>
            <span>{statistics.bestScore.toLocaleString()}</span>
          </div>
          <ScoreList scores={scores} />
        </>
      )}
    </div>
  );
};
