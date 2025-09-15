import React, { useState, useEffect, useCallback } from 'react';

interface LivesDisplayProps {
  lives: number;
  maxLives?: number;
  onLifeChange?: (newLives: number, previousLives: number) => void;
  onGameOver?: () => void;
}

const LivesDisplay: React.FC<LivesDisplayProps> = ({ 
  lives, 
  maxLives = 3,
  onLifeChange,
  onGameOver 
}) => {
  const [prevLives, setPrevLives] = useState(lives);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLowHealth, setIsLowHealth] = useState(false);

  useEffect(() => {
    // Check for low health (1 life remaining)
    setIsLowHealth(lives === 1);
    
    // Check for game over condition
    if (lives === 0 && onGameOver) {
      onGameOver();
    }

    if (lives !== prevLives) {
      setIsAnimating(true);
      
      // Call optional callback
      if (onLifeChange) {
        onLifeChange(lives, prevLives);
      }

      // Animation duration
      const animationDuration = 800;
      const timer = setTimeout(() => {
        setIsAnimating(false);
        setPrevLives(lives);
      }, animationDuration);

      return () => clearTimeout(timer);
    }
  }, [lives, prevLives, onLifeChange, onGameOver]);

  const renderHearts = useCallback(() => {
    const hearts = [];
    
    for (let i = 0; i < maxLives; i++) {
      const isActive = i < lives;
      const heartStyle: React.CSSProperties = {
        display: 'inline-block',
        margin: '0 2px',
        fontSize: '20px',
        color: isActive ? '#ff4757' : '#333333',
        textShadow: isActive ? '0 0 8px #ff4757' : 'none',
        transform: isAnimating && !isActive ? 'scale(0.5)' : 'scale(1)',
        transition: 'all 0.8s ease-out',
        filter: isAnimating && !isActive ? 'grayscale(100%)' : 'grayscale(0%)'
      };
      
      hearts.push(
        <span key={i} style={heartStyle}>
          {isActive ? '❤️' : '🤍'}
        </span>
      );
    }
    
    return hearts;
  }, [lives, maxLives, isAnimating]);

  const containerStyle: React.CSSProperties = {
    color: '#ffffff',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '16px',
    fontWeight: 600,
    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.7)',
    userSelect: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    animation: isLowHealth ? 'pulse 1s infinite' : 'none',
    filter: isLowHealth ? 'drop-shadow(0 0 8px #ff4757)' : 'none'
  };

  const warningStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#ff4757',
    fontWeight: 'bold',
    marginLeft: '8px',
    opacity: isLowHealth ? 1 : 0,
    transition: 'opacity 0.3s ease-out'
  };

  return (
    <div style={containerStyle}>
      <span>Lives:</span>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {renderHearts()}
        <span style={{ marginLeft: '8px', fontSize: '14px' }}>
          {lives}
        </span>
      </div>
      <span style={warningStyle}>
        {isLowHealth && 'LOW!'}
      </span>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default LivesDisplay;