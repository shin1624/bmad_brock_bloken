import React, { useState, useEffect, useCallback } from 'react';

// Power-Up types enumeration
export enum PowerUpType {
  MultiBall = 'multiball',
  PaddleSize = 'paddlesize', 
  BallSpeed = 'ballspeed',
  Penetration = 'penetration',
  Magnet = 'magnet'
}

// Active power-up interface
export interface ActivePowerUp {
  id: string;
  type: PowerUpType;
  duration: number;         // 残り時間（ミリ秒）
  maxDuration: number;      // 最大持続時間（ミリ秒）
  icon: string;
  color: string;
  name: string;
}

interface PowerUpStatusProps {
  powerUps: ActivePowerUp[];
  onPowerUpExpire?: (powerUpId: string) => void;
  onPowerUpActivate?: (powerUp: ActivePowerUp) => void;
  maxDisplayCount?: number;
}

const PowerUpStatus: React.FC<PowerUpStatusProps> = ({
  powerUps = [],
  onPowerUpExpire,
  onPowerUpActivate,
  maxDisplayCount = 4
}) => {
  const [animatingPowerUps, setAnimatingPowerUps] = useState<Set<string>>(new Set());
  const [expiredPowerUps, setExpiredPowerUps] = useState<Set<string>>(new Set());

  // Handle power-up expiration
  const handleExpiration = useCallback((powerUpId: string) => {
    setExpiredPowerUps(prev => new Set([...prev, powerUpId]));
    if (onPowerUpExpire) {
      onPowerUpExpire(powerUpId);
    }
  }, [onPowerUpExpire]);

  // Handle power-up activation animations
  useEffect(() => {
    powerUps.forEach(powerUp => {
      if (!animatingPowerUps.has(powerUp.id)) {
        setAnimatingPowerUps(prev => new Set([...prev, powerUp.id]));
        
        // Trigger activation callback
        if (onPowerUpActivate) {
          onPowerUpActivate(powerUp);
        }
        
        // Remove animation state after animation completes
        setTimeout(() => {
          setAnimatingPowerUps(prev => {
            const newSet = new Set(prev);
            newSet.delete(powerUp.id);
            return newSet;
          });
        }, 600);
      }
    });
  }, [powerUps, animatingPowerUps, onPowerUpActivate]);

  // Get power-up icon based on type
  const getPowerUpIcon = (type: PowerUpType): string => {
    const iconMap: Record<PowerUpType, string> = {
      [PowerUpType.MultiBall]: '⚡',
      [PowerUpType.PaddleSize]: '🏓',
      [PowerUpType.BallSpeed]: '💨',
      [PowerUpType.Penetration]: '🎯',
      [PowerUpType.Magnet]: '🧲'
    };
    return iconMap[type] || '❓';
  };

  // Get power-up color based on type
  const getPowerUpColor = (type: PowerUpType): string => {
    const colorMap: Record<PowerUpType, string> = {
      [PowerUpType.MultiBall]: '#ff6b6b',
      [PowerUpType.PaddleSize]: '#4ecdc4', 
      [PowerUpType.BallSpeed]: '#45b7d1',
      [PowerUpType.Penetration]: '#96ceb4',
      [PowerUpType.Magnet]: '#feca57'
    };
    return colorMap[type] || '#999999';
  };

  // Calculate progress percentage
  const getProgress = (powerUp: ActivePowerUp): number => {
    return (powerUp.duration / powerUp.maxDuration) * 100;
  };

  // Format remaining time
  const formatTime = (milliseconds: number): string => {
    const seconds = Math.ceil(milliseconds / 1000);
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Container styles
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    alignItems: 'flex-end',
    minWidth: '120px'
  };

  // Single power-up item styles
  const powerUpItemStyle = (powerUp: ActivePowerUp): React.CSSProperties => {
    const progress = getProgress(powerUp);
    const isExpiring = progress < 20;
    const isAnimating = animatingPowerUps.has(powerUp.id);
    const color = getPowerUpColor(powerUp.type);

    return {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 8px',
      borderRadius: '16px',
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      border: `1px solid ${color}`,
      color: '#ffffff',
      fontSize: '12px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontWeight: 500,
      textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
      userSelect: 'none',
      minWidth: '100px',
      transform: isAnimating ? 'scale(1.1)' : 'scale(1)',
      transition: 'all 0.3s ease-out',
      animation: isExpiring ? 'powerUpExpiring 0.5s infinite alternate' : 'none',
      boxShadow: isExpiring 
        ? `0 0 8px ${color}` 
        : `0 0 4px rgba(0, 0, 0, 0.3)`,
      opacity: expiredPowerUps.has(powerUp.id) ? 0 : 1
    };
  };

  // Icon styles  
  const iconStyle = (powerUp: ActivePowerUp): React.CSSProperties => ({
    fontSize: '16px',
    color: getPowerUpColor(powerUp.type),
    textShadow: `0 0 6px ${getPowerUpColor(powerUp.type)}`
  });

  // Timer bar styles
  const timerBarStyle: React.CSSProperties = {
    width: '60px',
    height: '3px',
    backgroundColor: '#333333',
    borderRadius: '2px',
    overflow: 'hidden'
  };

  const timerFillStyle = (powerUp: ActivePowerUp): React.CSSProperties => {
    const progress = getProgress(powerUp);
    return {
      width: `${progress}%`,
      height: '100%',
      backgroundColor: progress < 20 ? '#ff4757' : getPowerUpColor(powerUp.type),
      transition: 'width 0.1s linear, background-color 0.3s ease-out',
      borderRadius: '2px'
    };
  };

  // Display limited number of power-ups
  const visiblePowerUps = powerUps.slice(0, maxDisplayCount);

  if (visiblePowerUps.length === 0) {
    return null;
  }

  return (
    <div style={containerStyle}>
      {visiblePowerUps.map((powerUp) => (
        <div key={powerUp.id} style={powerUpItemStyle(powerUp)}>
          <span style={iconStyle(powerUp)}>
            {getPowerUpIcon(powerUp.type)}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '10px', marginBottom: '1px' }}>
              {powerUp.name || powerUp.type}
            </div>
            <div style={timerBarStyle}>
              <div style={timerFillStyle(powerUp)} />
            </div>
          </div>
          <span style={{ fontSize: '10px' }}>
            {formatTime(powerUp.duration)}
          </span>
        </div>
      ))}
      
      {powerUps.length > maxDisplayCount && (
        <div style={{
          fontSize: '10px',
          color: '#999999',
          textAlign: 'right',
          marginTop: '2px'
        }}>
          +{powerUps.length - maxDisplayCount} more
        </div>
      )}

      <style>{`
        @keyframes powerUpExpiring {
          0% { opacity: 1; }
          100% { opacity: 0.5; }
        }
        
        @keyframes powerUpActivate {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default PowerUpStatus;