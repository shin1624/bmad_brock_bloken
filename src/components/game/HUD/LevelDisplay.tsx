import React, { useState, useEffect } from "react";

interface LevelDisplayProps {
  level: number;
  progress?: number; // 0-100, レベル完了進捗
  totalLevels?: number;
  onLevelComplete?: (level: number) => void;
  onLevelTransition?: (newLevel: number, previousLevel: number) => void;
}

const LevelDisplay: React.FC<LevelDisplayProps> = ({
  level,
  progress = 0,
  totalLevels = 99,
  onLevelComplete,
  onLevelTransition,
}) => {
  const [prevLevel, setPrevLevel] = useState(level);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isNearComplete, setIsNearComplete] = useState(false);

  // Level transition effect
  useEffect(() => {
    if (level !== prevLevel) {
      setIsTransitioning(true);

      // Trigger level transition callback
      if (onLevelTransition) {
        onLevelTransition(level, prevLevel);
      }

      // Animation duration
      const transitionDuration = 800;
      const timer = setTimeout(() => {
        setIsTransitioning(false);
        setPrevLevel(level);
      }, transitionDuration);

      return () => clearTimeout(timer);
    }
  }, [level, prevLevel, onLevelTransition]);

  // Progress-based effects
  useEffect(() => {
    setIsNearComplete(progress >= 80);

    // Level completion detection
    if (progress >= 100 && onLevelComplete) {
      onLevelComplete(level);
    }
  }, [progress, level, onLevelComplete]);

  const containerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
    color: "#ffffff",
    fontFamily: "system-ui, -apple-system, sans-serif",
    fontSize: "16px",
    fontWeight: 600,
    textShadow: "2px 2px 4px rgba(0, 0, 0, 0.7)",
    userSelect: "none",
    minWidth: "80px",
  };

  const levelNumberStyle: React.CSSProperties = {
    fontSize: "18px",
    fontWeight: 700,
    color: isTransitioning ? "#00ff88" : "#ffffff",
    transform: isTransitioning ? "scale(1.2)" : "scale(1)",
    transition: "all 0.8s ease-out",
    textShadow: isTransitioning
      ? "0 0 12px #00ff88, 2px 2px 4px rgba(0, 0, 0, 0.7)"
      : "2px 2px 4px rgba(0, 0, 0, 0.7)",
  };

  const progressBarStyle: React.CSSProperties = {
    width: "60px",
    height: "4px",
    backgroundColor: "#333333",
    borderRadius: "2px",
    overflow: "hidden",
    position: "relative",
    boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.3)",
  };

  const progressFillStyle: React.CSSProperties = {
    width: `${Math.min(progress, 100)}%`,
    height: "100%",
    backgroundColor: isNearComplete ? "#ff6b6b" : "#00ff88",
    transition: "width 0.3s ease-out, background-color 0.3s ease-out",
    borderRadius: "2px",
    boxShadow: isNearComplete ? "0 0 8px #ff6b6b" : "0 0 4px #00ff88",
  };

  const progressTextStyle: React.CSSProperties = {
    fontSize: "10px",
    color: "#cccccc",
    marginTop: "2px",
    opacity: progress > 0 ? 1 : 0,
    transition: "opacity 0.3s ease-out",
  };

  const levelCounterStyle: React.CSSProperties = {
    fontSize: "11px",
    color: "#999999",
    marginTop: "2px",
  };

  return (
    <div style={containerStyle}>
      <div>
        <span style={levelNumberStyle}>Level {level}</span>
      </div>

      {progress > 0 && (
        <div style={progressBarStyle}>
          <div style={progressFillStyle} />
        </div>
      )}

      <div style={progressTextStyle}>{Math.round(progress)}%</div>

      <div style={levelCounterStyle}>
        {level} / {totalLevels}
      </div>

      <style>{`
        @keyframes levelTransition {
          0% { transform: scale(1); }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
        
        @keyframes progressPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
};

export default LevelDisplay;
