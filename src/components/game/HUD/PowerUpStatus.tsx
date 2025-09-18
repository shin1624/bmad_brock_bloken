import React, { useState, useEffect, useCallback } from "react";

// Power-Up types enumeration - moved to top level for fast refresh compatibility
// eslint-disable-next-line react-refresh/only-export-components
export enum PowerUpType {
  MultiBall = "multiball",
  PaddleSize = "paddlesize",
  BallSpeed = "ballspeed",
  Penetration = "penetration",
  Magnet = "magnet",
}

// Active power-up interface
export interface ActivePowerUp {
  id: string;
  type: PowerUpType;
  duration: number; // 残り時間（ミリ秒）
  maxDuration: number; // 最大持続時間（ミリ秒）
  icon: string;
  color: string;
  name: string;
  variant?: string; // For power-ups with multiple variants (large/small, fast/slow)
  stackCount?: number; // For stackable power-ups
  effectStrength?: number; // Multiplier strength for display
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
  maxDisplayCount = 4,
}) => {
  const [animatingPowerUps, setAnimatingPowerUps] = useState<Set<string>>(
    new Set(),
  );
  const [expiredPowerUps, setExpiredPowerUps] = useState<Set<string>>(
    new Set(),
  );
  const [spawnAnimations, setSpawnAnimations] = useState<Set<string>>(
    new Set(),
  );
  const [countdownWarnings, setCountdownWarnings] = useState<Set<string>>(
    new Set(),
  );

  // Enhanced expiration handling with animation
  const handleExpiration = useCallback(
    (powerUpId: string) => {
      // Start expiration animation
      setExpiredPowerUps((prev) => new Set([...prev, powerUpId]));

      // Remove from other animation states
      setAnimatingPowerUps((prev) => {
        const newSet = new Set(prev);
        newSet.delete(powerUpId);
        return newSet;
      });

      setCountdownWarnings((prev) => {
        const newSet = new Set(prev);
        newSet.delete(powerUpId);
        return newSet;
      });

      // Call expiration callback
      if (onPowerUpExpire) {
        onPowerUpExpire(powerUpId);
      }

      // Clean up expired state after animation completes
      setTimeout(() => {
        setExpiredPowerUps((prev) => {
          const newSet = new Set(prev);
          newSet.delete(powerUpId);
          return newSet;
        });
      }, 500); // Match expiration animation duration
    },
    [onPowerUpExpire],
  );

  // Enhanced activation animations with spawn effect
  useEffect(() => {
    powerUps.forEach((powerUp) => {
      if (
        !animatingPowerUps.has(powerUp.id) &&
        !spawnAnimations.has(powerUp.id)
      ) {
        // Start spawn animation
        setSpawnAnimations((prev) => new Set([...prev, powerUp.id]));

        // Trigger activation callback
        if (onPowerUpActivate) {
          onPowerUpActivate(powerUp);
        }

        // Transition to normal animation state
        setTimeout(() => {
          setSpawnAnimations((prev) => {
            const newSet = new Set(prev);
            newSet.delete(powerUp.id);
            return newSet;
          });
          setAnimatingPowerUps((prev) => new Set([...prev, powerUp.id]));
        }, 600); // Spawn animation duration

        // Remove from animation state after stabilization
        setTimeout(() => {
          setAnimatingPowerUps((prev) => {
            const newSet = new Set(prev);
            newSet.delete(powerUp.id);
            return newSet;
          });
        }, 1200);
      }
    });
  }, [powerUps, animatingPowerUps, spawnAnimations, onPowerUpActivate]);

  // Monitor countdown warnings
  useEffect(() => {
    const checkCountdowns = () => {
      powerUps.forEach((powerUp) => {
        const progress = getProgress(powerUp);
        const isLowTime = progress < 25; // Show warning when <25% remaining

        if (isLowTime && !countdownWarnings.has(powerUp.id)) {
          setCountdownWarnings((prev) => new Set([...prev, powerUp.id]));
        } else if (!isLowTime && countdownWarnings.has(powerUp.id)) {
          setCountdownWarnings((prev) => {
            const newSet = new Set(prev);
            newSet.delete(powerUp.id);
            return newSet;
          });
        }

        // Auto-expire when time runs out
        if (powerUp.duration <= 0 && !expiredPowerUps.has(powerUp.id)) {
          handleExpiration(powerUp.id);
        }
      });
    };

    const interval = setInterval(checkCountdowns, 100); // Check every 100ms for smooth updates
    return () => clearInterval(interval);
  }, [powerUps, countdownWarnings, expiredPowerUps, handleExpiration]);

  // Get power-up icon based on type with variant support
  const getPowerUpIcon = (type: PowerUpType, variant?: string): string => {
    const iconMap: Record<PowerUpType, string | { [variant: string]: string }> =
      {
        [PowerUpType.MultiBall]: "⚡",
        [PowerUpType.PaddleSize]: {
          large: "🏓",
          small: "🏏",
        },
        [PowerUpType.BallSpeed]: {
          fast: "💨",
          slow: "🐌",
        },
        [PowerUpType.Penetration]: "🎯",
        [PowerUpType.Magnet]: "🧲",
      };

    const mapping = iconMap[type];
    if (typeof mapping === "string") {
      return mapping;
    } else if (mapping && variant && mapping[variant]) {
      return mapping[variant];
    } else if (mapping) {
      // Default to first variant if no specific variant specified
      return Object.values(mapping)[0];
    }

    return "❓";
  };

  // Get power-up color based on type with variant support
  const getPowerUpColor = (type: PowerUpType, variant?: string): string => {
    const colorMap: Record<
      PowerUpType,
      string | { [variant: string]: string }
    > = {
      [PowerUpType.MultiBall]: "#ff6b6b",
      [PowerUpType.PaddleSize]: {
        large: "#4ecdc4",
        small: "#ff9f43",
      },
      [PowerUpType.BallSpeed]: {
        fast: "#45b7d1",
        slow: "#96ceb4",
      },
      [PowerUpType.Penetration]: "#96ceb4",
      [PowerUpType.Magnet]: "#feca57",
    };

    const mapping = colorMap[type];
    if (typeof mapping === "string") {
      return mapping;
    } else if (mapping && variant && mapping[variant]) {
      return mapping[variant];
    } else if (mapping) {
      // Default to first variant if no specific variant specified
      return Object.values(mapping)[0];
    }

    return "#999999";
  };

  // Calculate progress percentage
  const getProgress = (powerUp: ActivePowerUp): number => {
    return Math.max(
      0,
      Math.min(100, (powerUp.duration / powerUp.maxDuration) * 100),
    );
  };

  // Format remaining time with enhanced precision
  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.max(0, milliseconds / 1000);

    if (totalSeconds < 1) {
      return `${Math.ceil(totalSeconds * 10) / 10}s`;
    }

    const seconds = Math.ceil(totalSeconds);
    if (seconds < 60) {
      return `${seconds}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  // Enhanced container styles with better positioning
  const containerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    alignItems: "flex-end",
    minWidth: "140px",
    position: "relative",
    zIndex: 1000,
  };

  // Enhanced power-up item styles with advanced animations
  const powerUpItemStyle = (powerUp: ActivePowerUp): React.CSSProperties => {
    const progress = getProgress(powerUp);
    const isExpiring = progress < 20;
    const isWarning = countdownWarnings.has(powerUp.id);
    const isSpawning = spawnAnimations.has(powerUp.id);
    const isActivating = animatingPowerUps.has(powerUp.id);
    const isExpired = expiredPowerUps.has(powerUp.id);
    const color = getPowerUpColor(powerUp.type, powerUp.variant);

    let transform = "scale(1)";
    let animation = "none";

    if (isSpawning) {
      animation = "powerUpSpawn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
    } else if (isActivating) {
      transform = "scale(1.05)";
    } else if (isExpired) {
      animation = "powerUpExpire 0.5s ease-out forwards";
    } else if (isExpiring || isWarning) {
      animation = "powerUpWarning 0.4s infinite alternate";
    }

    return {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "6px 12px",
      borderRadius: "20px",
      backgroundColor: "rgba(0, 0, 0, 0.85)",
      border: `2px solid ${color}`,
      color: "#ffffff",
      fontSize: "13px",
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontWeight: 600,
      textShadow: "1px 1px 3px rgba(0, 0, 0, 0.9)",
      userSelect: "none",
      minWidth: "120px",
      transform,
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      animation,
      boxShadow: isWarning
        ? `0 0 12px ${color}, inset 0 0 6px rgba(255, 255, 255, 0.1)`
        : `0 0 8px rgba(0, 0, 0, 0.4), inset 0 0 4px rgba(255, 255, 255, 0.1)`,
      backdropFilter: "blur(4px)",
    };
  };

  // Enhanced icon styles with glow effects and stack indicator support
  const iconStyle = (powerUp: ActivePowerUp): React.CSSProperties => {
    const isWarning = countdownWarnings.has(powerUp.id);
    const color = getPowerUpColor(powerUp.type, powerUp.variant);

    return {
      fontSize: "18px",
      color: color,
      textShadow: `0 0 8px ${color}`,
      filter: isWarning ? "brightness(1.3)" : "brightness(1)",
      transition: "all 0.3s ease",
      position: "relative",
      display: "inline-block",
    };
  };

  // Enhanced timer bar with gradient and animations
  const timerBarStyle: React.CSSProperties = {
    width: "70px",
    height: "4px",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: "3px",
    overflow: "hidden",
    position: "relative",
    border: "1px solid rgba(255, 255, 255, 0.1)",
  };

  const timerFillStyle = (powerUp: ActivePowerUp): React.CSSProperties => {
    const progress = getProgress(powerUp);
    const isWarning = progress < 25;
    const color = getPowerUpColor(powerUp.type, powerUp.variant);

    return {
      width: `${progress}%`,
      height: "100%",
      background: isWarning
        ? "linear-gradient(90deg, #ff4757, #ff6b7a)"
        : `linear-gradient(90deg, ${color}, ${color}dd)`,
      transition: "width 0.2s linear, background 0.3s ease-out",
      borderRadius: "2px",
      boxShadow: isWarning ? "0 0 4px #ff4757" : `0 0 3px ${color}`,
      position: "relative",
    };
  };

  // Enhanced text styles with better readability
  const nameStyle: React.CSSProperties = {
    fontSize: "11px",
    fontWeight: 500,
    marginBottom: "2px",
    opacity: 0.9,
    letterSpacing: "0.3px",
  };

  const timeStyle: React.CSSProperties = {
    fontSize: "11px",
    fontWeight: 700,
    minWidth: "30px",
    textAlign: "right",
    opacity: 0.95,
  };

  // Display limited number of power-ups with overflow indicator
  const visiblePowerUps = powerUps.slice(0, maxDisplayCount);
  const hasOverflow = powerUps.length > maxDisplayCount;

  if (visiblePowerUps.length === 0) {
    return null;
  }

  return (
    <div style={containerStyle} role="status" aria-label="Active power-ups">
      {visiblePowerUps.map((powerUp) => (
        <div
          key={powerUp.id}
          style={powerUpItemStyle(powerUp)}
          role="timer"
          aria-label={`${powerUp.name || powerUp.type} - ${formatTime(powerUp.duration)} remaining`}
        >
          <span style={iconStyle(powerUp)}>
            {getPowerUpIcon(powerUp.type, powerUp.variant)}
            {powerUp.stackCount && powerUp.stackCount > 1 && (
              <span
                style={{
                  position: "absolute",
                  top: "-6px",
                  right: "-6px",
                  backgroundColor: "#ff4757",
                  color: "#ffffff",
                  fontSize: "10px",
                  fontWeight: "bold",
                  borderRadius: "50%",
                  minWidth: "16px",
                  height: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid #ffffff",
                  boxShadow: "0 0 4px rgba(0,0,0,0.5)",
                }}
              >
                {powerUp.stackCount}
              </span>
            )}
          </span>
          <div style={{ flex: 1 }}>
            <div style={nameStyle}>
              {powerUp.name || powerUp.type}
              {powerUp.effectStrength && powerUp.effectStrength !== 1 && (
                <span
                  style={{
                    fontSize: "9px",
                    opacity: 0.7,
                    marginLeft: "4px",
                    color: powerUp.effectStrength > 1 ? "#4ecdc4" : "#ff9f43",
                  }}
                >
                  {powerUp.effectStrength > 1 ? "↑" : "↓"}
                  {Math.round(powerUp.effectStrength * 100)}%
                </span>
              )}
            </div>
            <div style={timerBarStyle}>
              <div style={timerFillStyle(powerUp)} />
            </div>
          </div>
          <span style={timeStyle}>{formatTime(powerUp.duration)}</span>
        </div>
      ))}

      {hasOverflow && (
        <div
          style={{
            fontSize: "11px",
            color: "#999999",
            textAlign: "right",
            marginTop: "4px",
            fontWeight: 500,
            opacity: 0.8,
          }}
        >
          +{powerUps.length - maxDisplayCount} more
        </div>
      )}

      <style>{`
        @keyframes powerUpSpawn {
          0% { 
            transform: scale(0.3) translateY(20px); 
            opacity: 0; 
            filter: blur(4px);
          }
          50% { 
            transform: scale(1.2) translateY(-5px); 
            opacity: 0.8; 
            filter: blur(1px);
          }
          100% { 
            transform: scale(1) translateY(0); 
            opacity: 1; 
            filter: blur(0);
          }
        }
        
        @keyframes powerUpExpire {
          0% { 
            transform: scale(1); 
            opacity: 1; 
          }
          50% { 
            transform: scale(1.1); 
            opacity: 0.7; 
          }
          100% { 
            transform: scale(0.8); 
            opacity: 0; 
            filter: blur(2px);
          }
        }
        
        @keyframes powerUpWarning {
          0% { 
            opacity: 1; 
            transform: scale(1);
          }
          100% { 
            opacity: 0.7; 
            transform: scale(1.02);
          }
        }
        
        @keyframes powerUpActivate {
          0% { 
            transform: scale(0.8); 
            opacity: 0; 
          }
          50% { 
            transform: scale(1.3); 
            opacity: 1; 
          }
          100% { 
            transform: scale(1); 
            opacity: 1; 
          }
        }

        /* Pulse effect for timer bars when warning */
        @keyframes timerPulse {
          0%, 100% { box-shadow: 0 0 3px currentColor; }
          50% { box-shadow: 0 0 8px currentColor, 0 0 12px currentColor; }
        }
      `}</style>
    </div>
  );
};

export default PowerUpStatus;
