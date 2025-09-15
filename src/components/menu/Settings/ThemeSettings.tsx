import React from 'react';
import { UIState } from '../../../stores/uiStore';

export interface ThemeSettingsProps {
  settings: UIState['settings'];
  onUpdateSettings: (settings: Partial<UIState['settings']>) => void;
  disabled?: boolean;
}

const THEMES = [
  { value: 'light', label: 'Light', icon: '☀️' },
  { value: 'dark', label: 'Dark', icon: '🌙' },
] as const;

const DIFFICULTIES = [
  { value: 'easy', label: 'Easy', description: 'Slower ball speed, more lives' },
  { value: 'normal', label: 'Normal', description: 'Balanced gameplay' },
  { value: 'hard', label: 'Hard', description: 'Faster ball speed, fewer lives' },
] as const;

export const ThemeSettings: React.FC<ThemeSettingsProps> = ({
  settings,
  onUpdateSettings,
  disabled = false
}) => {
  const handleThemeChange = (theme: UIState['settings']['theme']) => {
    onUpdateSettings({ theme });
    
    // Apply theme to document root for CSS custom properties
    document.documentElement.setAttribute('data-theme', theme);
  };

  const handleDifficultyChange = (difficulty: UIState['settings']['difficulty']) => {
    onUpdateSettings({ difficulty });
  };

  return (
    <div className="theme-settings">
      <h3 className="settings-section-title">Appearance & Difficulty</h3>

      <div className="setting-group">
        <div className="setting-item">
          <label className="setting-label">Theme</label>
          <div className="theme-options">
            {THEMES.map((theme) => (
              <button
                key={theme.value}
                className={`theme-option ${settings.theme === theme.value ? 'active' : ''}`}
                onClick={() => handleThemeChange(theme.value)}
                disabled={disabled}
                type="button"
                aria-pressed={settings.theme === theme.value}
              >
                <span className="theme-icon">{theme.icon}</span>
                <span className="theme-label">{theme.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="setting-item">
          <label className="setting-label" htmlFor="difficulty-select">
            Game Difficulty
          </label>
          <select
            id="difficulty-select"
            value={settings.difficulty}
            onChange={(e) => handleDifficultyChange(e.target.value as UIState['settings']['difficulty'])}
            disabled={disabled}
            className="difficulty-select"
          >
            {DIFFICULTIES.map((difficulty) => (
              <option key={difficulty.value} value={difficulty.value}>
                {difficulty.label}
              </option>
            ))}
          </select>
          <div className="difficulty-description">
            {DIFFICULTIES.find(d => d.value === settings.difficulty)?.description}
          </div>
        </div>
      </div>
    </div>
  );
};