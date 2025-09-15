import React from 'react';
import { UIState } from '../../../stores/uiStore';

export interface AudioSettingsProps {
  settings: UIState['settings'];
  onUpdateSettings: (settings: Partial<UIState['settings']>) => void;
  disabled?: boolean;
}

export const AudioSettings: React.FC<AudioSettingsProps> = ({
  settings,
  onUpdateSettings,
  disabled = false
}) => {
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const volume = parseFloat(e.target.value);
    onUpdateSettings({ volume });
  };

  const handleSoundToggle = () => {
    onUpdateSettings({ soundEnabled: !settings.soundEnabled });
  };

  const handleMusicToggle = () => {
    onUpdateSettings({ musicEnabled: !settings.musicEnabled });
  };

  return (
    <div className="audio-settings">
      <h3 className="settings-section-title">Audio Settings</h3>

      <div className="setting-group">
        <div className="setting-item">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={settings.soundEnabled}
              onChange={handleSoundToggle}
              disabled={disabled}
              className="toggle-input"
            />
            <span className="toggle-slider"></span>
            <span className="toggle-text">Sound Effects</span>
          </label>
        </div>

        <div className="setting-item">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={settings.musicEnabled}
              onChange={handleMusicToggle}
              disabled={disabled}
              className="toggle-input"
            />
            <span className="toggle-slider"></span>
            <span className="toggle-text">Background Music</span>
          </label>
        </div>

        <div className="setting-item">
          <label className="slider-label" htmlFor="volume-slider">
            Master Volume
          </label>
          <div className="volume-control">
            <span className="volume-icon">🔇</span>
            <input
              id="volume-slider"
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.volume}
              onChange={handleVolumeChange}
              disabled={disabled}
              className="volume-slider"
              aria-label={`Volume: ${Math.round(settings.volume * 100)}%`}
            />
            <span className="volume-icon">🔊</span>
          </div>
          <div className="volume-display">
            {Math.round(settings.volume * 100)}%
          </div>
        </div>
      </div>
    </div>
  );
};