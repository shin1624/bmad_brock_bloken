/**
 * Theme Selector Component
 */
import React from "react";
// MVP: Props removed for single theme implementation

/**
 * Theme Display Component - MVP Version (Single Theme)
 */
export const ThemeSelector: React.FC = () => {
  return (
    <div className="theme-display">
      <div className="current-theme">
        <span className="theme-label">Current Theme:</span>
        <span className="theme-name">Neon</span>
      </div>
      <div className="theme-description">
        Default theme optimized for retro gaming experience
      </div>
    </div>
  );
};
