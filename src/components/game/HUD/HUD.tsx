import React, { useCallback } from "react";
import ScoreDisplay from "./ScoreDisplay";
import LivesDisplay from "./LivesDisplay";

interface HUDProps {
  hudState: {
    score: number;
    lives: number;
    level: number;
    maxLives?: number;
  };
  onScoreChange?: (newScore: number, previousScore: number) => void;
  onLifeChange?: (newLives: number, previousLives: number) => void;
  onGameOver?: () => void;
}

const HUD: React.FC<HUDProps> = ({ 
  hudState, 
  onScoreChange,
  onLifeChange,
  onGameOver 
}) => {
  const hudOverlayStyle: React.CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    zIndex: 10,
    padding: "16px",
    boxSizing: "border-box",
    display: "grid",
    gridTemplateAreas: `
      "score . level"
      ". . ."
      "lives . combo"
    `,
    gridTemplateColumns: "1fr auto 1fr",
    gridTemplateRows: "auto 1fr auto",
    gap: "16px",
  };

  const scoreStyle: React.CSSProperties = {
    gridArea: "score",
    justifySelf: "start",
    alignSelf: "start",
  };

  const livesStyle: React.CSSProperties = {
    gridArea: "lives",
    justifySelf: "start",
    alignSelf: "end",
  };

  const levelStyle: React.CSSProperties = {
    gridArea: "level",
    justifySelf: "end",
    alignSelf: "start",
    color: "#ffffff",
    fontFamily: "system-ui, -apple-system, sans-serif",
    fontSize: "18px",
    fontWeight: 600,
    textShadow: "2px 2px 4px rgba(0, 0, 0, 0.7)",
    userSelect: "none",
  };

  const handleScoreChange = useCallback((newScore: number, previousScore: number) => {
    if (onScoreChange) {
      onScoreChange(newScore, previousScore);
    }
  }, [onScoreChange]);

  const handleLifeChange = useCallback((newLives: number, previousLives: number) => {
    if (onLifeChange) {
      onLifeChange(newLives, previousLives);
    }
  }, [onLifeChange]);

  const handleGameOver = useCallback(() => {
    if (onGameOver) {
      onGameOver();
    }
  }, [onGameOver]);

  return (
    <div
      data-testid="hud-overlay"
      className="hud-overlay hud-grid-layout"
      style={hudOverlayStyle}
    >
      <div style={scoreStyle}>
        <ScoreDisplay 
          score={hudState.score} 
          onScoreChange={handleScoreChange}
        />
      </div>
      <div style={livesStyle}>
        <LivesDisplay 
          lives={hudState.lives}
          maxLives={hudState.maxLives || 3}
          onLifeChange={handleLifeChange}
          onGameOver={handleGameOver}
        />
      </div>
      <div style={levelStyle}>
        Level {hudState.level}
      </div>
    </div>
  );
};

export default HUD;