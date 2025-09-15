import React from 'react';

export interface StartButtonProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export const StartButton: React.FC<StartButtonProps> = ({ 
  onClick, 
  disabled = false, 
  className = '' 
}) => {
  return (
    <button
      className={`start-button menu-button primary ${className}`}
      onClick={onClick}
      disabled={disabled}
      aria-label="Start new game"
      type="button"
    >
      <span className="button-icon">▶️</span>
      <span className="button-text">Start Game</span>
      <span className="button-glow"></span>
    </button>
  );
};