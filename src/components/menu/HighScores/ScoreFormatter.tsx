import React from "react";

export interface ScoreFormatterProps {
  score: number;
}

export const ScoreFormatter: React.FC<ScoreFormatterProps> = ({ score }) => {
  return <span>{score.toLocaleString()}</span>;
};
