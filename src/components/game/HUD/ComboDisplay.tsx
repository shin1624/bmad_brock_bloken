import React, { useState, useEffect, useCallback } from 'react';

// Combo state interface
export interface ComboState {
  count: number;            // 現在のコンボ数
  multiplier: number;       // スコア倍率
  streak: number;           // 連続ヒット数
  timeRemaining: number;    // コンボ終了までの時間（ミリ秒）
}

interface ComboDisplayProps {
  combo: ComboState;
  maxComboTime?: number;    // 最大コンボ継続時間（ミリ秒）
  onComboBreak?: (finalCombo: ComboState) => void;
  onComboExtend?: (newCombo: ComboState) => void;
  onStreakAchieved?: (streak: number) => void;
}

const ComboDisplay: React.FC<ComboDisplayProps> = ({
  combo,
  maxComboTime = 5000,
  onComboBreak,
  onComboExtend,
  onStreakAchieved
}) => {
  const [prevCombo, setPrevCombo] = useState(combo);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isHighStreak, setIsHighStreak] = useState(false);
  const [isComboExpiring, setIsComboExpiring] = useState(false);

  // Handle combo changes and animations
  useEffect(() => {
    // Detect combo increase
    if (combo.count > prevCombo.count) {
      setIsAnimating(true);
      
      // Trigger extend callback
      if (onComboExtend) {
        onComboExtend(combo);
      }
      
      // Check for streak achievements
      if (combo.streak > prevCombo.streak && onStreakAchieved) {
        onStreakAchieved(combo.streak);
      }
      
      // Animation duration
      setTimeout(() => {
        setIsAnimating(false);
        setPrevCombo(combo);
      }, 600);
    }
    
    // Detect combo break (count drops to 0)
    if (combo.count === 0 && prevCombo.count > 0) {
      if (onComboBreak) {
        onComboBreak(prevCombo);
      }
      setPrevCombo(combo);
    }
    
    // Update previous combo if other properties change
    if (combo.count === prevCombo.count && 
        (combo.multiplier !== prevCombo.multiplier || 
         combo.streak !== prevCombo.streak || 
         combo.timeRemaining !== prevCombo.timeRemaining)) {
      setPrevCombo(combo);
    }
  }, [combo, prevCombo, onComboBreak, onComboExtend, onStreakAchieved]);

  // Handle high streak and expiring states
  useEffect(() => {
    setIsHighStreak(combo.streak >= 10);
    setIsComboExpiring(combo.timeRemaining < maxComboTime * 0.3 && combo.count > 0);
  }, [combo.streak, combo.timeRemaining, combo.count, maxComboTime]);

  // Calculate time progress percentage
  const getTimeProgress = (): number => {
    return (combo.timeRemaining / maxComboTime) * 100;
  };

  // Format combo multiplier
  const formatMultiplier = (multiplier: number): string => {
    return `x${multiplier.toFixed(1)}`;
  };

  // Get streak level description
  const getStreakLevel = (streak: number): string => {
    if (streak >= 25) return 'LEGENDARY';
    if (streak >= 15) return 'EPIC';
    if (streak >= 10) return 'AMAZING';
    if (streak >= 5) return 'GREAT';
    return '';
  };

  // Don't render if no active combo
  if (combo.count === 0) {
    return null;
  }

  // Container styles
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    padding: '8px 12px',
    borderRadius: '12px',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    border: `2px solid ${isHighStreak ? '#ffd700' : '#00ff88'}`,
    color: '#ffffff',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontWeight: 600,
    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
    userSelect: 'none',
    minWidth: '90px',
    transform: isAnimating ? 'scale(1.1)' : 'scale(1)',
    transition: 'all 0.3s ease-out',
    animation: isComboExpiring ? 'comboExpiring 0.5s infinite alternate' : 
               isHighStreak ? 'comboGlow 1s ease-in-out infinite alternate' : 'none',
    boxShadow: isHighStreak 
      ? '0 0 15px #ffd700, 0 0 25px rgba(255, 215, 0, 0.5)' 
      : '0 0 10px #00ff88, 0 0 20px rgba(0, 255, 136, 0.3)'
  };

  // Combo count styles
  const comboCountStyle: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: 700,
    color: isHighStreak ? '#ffd700' : '#00ff88',
    textShadow: `0 0 8px ${isHighStreak ? '#ffd700' : '#00ff88'}`,
    lineHeight: 1
  };

  // Multiplier styles
  const multiplierStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#ffffff',
    opacity: 0.9
  };

  // Streak label styles
  const streakLabelStyle: React.CSSProperties = {
    fontSize: '8px',
    color: isHighStreak ? '#ffd700' : '#cccccc',
    fontWeight: 700,
    letterSpacing: '0.5px',
    marginTop: '2px'
  };

  // Time bar container styles
  const timeBarStyle: React.CSSProperties = {
    width: '70px',
    height: '3px',
    backgroundColor: '#333333',
    borderRadius: '2px',
    overflow: 'hidden',
    marginTop: '4px'
  };

  // Time bar fill styles
  const timeFillStyle: React.CSSProperties = {
    width: `${getTimeProgress()}%`,
    height: '100%',
    backgroundColor: isComboExpiring ? '#ff4757' : isHighStreak ? '#ffd700' : '#00ff88',
    transition: 'width 0.1s linear, background-color 0.3s ease-out',
    borderRadius: '2px'
  };

  return (
    <div style={containerStyle}>
      <div style={comboCountStyle}>
        {combo.count}
      </div>
      
      <div style={multiplierStyle}>
        {formatMultiplier(combo.multiplier)}
      </div>
      
      {combo.streak >= 5 && (
        <div style={streakLabelStyle}>
          {getStreakLevel(combo.streak)}
        </div>
      )}
      
      <div style={timeBarStyle}>
        <div style={timeFillStyle} />
      </div>

      <style>{`
        @keyframes comboGlow {
          0% { 
            box-shadow: 0 0 15px #ffd700, 0 0 25px rgba(255, 215, 0, 0.5);
            transform: scale(1);
          }
          100% { 
            box-shadow: 0 0 20px #ffd700, 0 0 35px rgba(255, 215, 0, 0.7);
            transform: scale(1.02);
          }
        }
        
        @keyframes comboExpiring {
          0% { 
            opacity: 1;
            border-color: #ff4757;
          }
          100% { 
            opacity: 0.7;
            border-color: #ff6b6b;
          }
        }
        
        @keyframes comboIncrease {
          0% { transform: scale(1); }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default ComboDisplay;