import React, { useState, useEffect, useCallback } from 'react';

interface ScoreDisplayProps {
  score: number;
  onScoreChange?: (newScore: number, previousScore: number) => void;
}

const ScoreDisplay: React.FC<ScoreDisplayProps> = ({ score, onScoreChange }) => {
  const [prevScore, setPrevScore] = useState(score);
  const [isAnimating, setIsAnimating] = useState(false);
  const [scoreDiff, setScoreDiff] = useState(0);

  const formatScore = useCallback((score: number): string => {
    return score.toLocaleString();
  }, []);

  useEffect(() => {
    if (score !== prevScore) {
      const diff = score - prevScore;
      setScoreDiff(diff);
      setIsAnimating(true);
      
      // Call optional callback
      if (onScoreChange) {
        onScoreChange(score, prevScore);
      }

      // Animation duration
      const animationDuration = 600;
      const timer = setTimeout(() => {
        setIsAnimating(false);
        setPrevScore(score);
        setScoreDiff(0);
      }, animationDuration);

      return () => clearTimeout(timer);
    }
  }, [score, prevScore, onScoreChange]);

  const scoreStyle: React.CSSProperties = {
    color: isAnimating ? '#00ff88' : '#ffffff',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '18px',
    fontWeight: 600,
    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.7)',
    userSelect: 'none',
    transition: 'transform 0.3s ease-out, color 0.3s ease-out',
    transform: isAnimating ? 'scale(1.1)' : 'scale(1)'
  };

  const diffStyle: React.CSSProperties = {
    position: 'absolute',
    top: '-20px',
    left: '50%',
    transform: isAnimating 
      ? 'translateX(-50%) translateY(-10px)' 
      : 'translateX(-50%) translateY(0px)',
    color: scoreDiff > 0 ? '#00ff88' : '#ff4444',
    fontSize: '14px',
    fontWeight: 'bold',
    opacity: isAnimating ? 1 : 0,
    transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
    pointerEvents: 'none'
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div style={scoreStyle}>
        {formatScore(score)}
      </div>
      {isAnimating && scoreDiff !== 0 && (
        <div style={diffStyle}>
          {scoreDiff > 0 ? '+' : ''}{formatScore(scoreDiff)}
        </div>
      )}
    </div>
  );
};

export default ScoreDisplay;