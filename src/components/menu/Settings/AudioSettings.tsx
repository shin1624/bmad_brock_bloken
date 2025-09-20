import React from 'react';
import { UIState } from '../../../stores/uiStore';

export interface AudioSettingsProps {
  settings: UIState['settings'];
  onUpdateSettings: (settings: Partial<UIState['settings']>) => void;
  disabled?: boolean;
}

const clamp = (value: number) => Math.max(0, Math.min(1, value));

export const AudioSettings: React.FC<AudioSettingsProps> = ({
  settings,
  onUpdateSettings,
  disabled = false,
}) => {
  const handleMasterVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = clamp(parseFloat(event.target.value));
    onUpdateSettings({ masterVolume: value, volume: value });
  };

  const handleSfxVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateSettings({ sfxVolume: clamp(parseFloat(event.target.value)) });
  };

  const handleBgmVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateSettings({ bgmVolume: clamp(parseFloat(event.target.value)) });
  };

  const handleAudioToggle = () => {
    onUpdateSettings({ audioEnabled: !settings.audioEnabled });
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
          <label className="toggle-label" htmlFor="audio-enabled-toggle">
            <input
              id="audio-enabled-toggle"
              type="checkbox"
              checked={settings.audioEnabled}
              onChange={handleAudioToggle}
              disabled={disabled}
              className="toggle-input"
            />
            <span className="toggle-slider"></span>
            <span className="toggle-text">Enable Audio</span>
          </label>
        </div>

        <div className="setting-item">
          <label className="slider-label" htmlFor="audio-master-volume">
            Master Volume
          </label>
          <div className="volume-control">
            <span className="volume-icon">🔇</span>
            <input
              id="audio-master-volume"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.masterVolume}
              onChange={handleMasterVolumeChange}
              disabled={disabled || !settings.audioEnabled}
              className="volume-slider"
              aria-label={`Master volume: ${Math.round(settings.masterVolume * 100)}%`}
            />
            <span className="volume-icon">🔊</span>
          </div>
          <div className="volume-display">
            {Math.round(settings.masterVolume * 100)}%
          </div>
        </div>

        <div className="setting-item">
          <label className="toggle-label" htmlFor="audio-sfx-toggle">
            <input
              id="audio-sfx-toggle"
              type="checkbox"
              checked={settings.soundEnabled}
              onChange={handleSoundToggle}
              disabled={disabled || !settings.audioEnabled}
              className="toggle-input"
            />
            <span className="toggle-slider"></span>
            <span className="toggle-text">Sound Effects</span>
          </label>
        </div>

        <div className="setting-item">
          <label className="slider-label" htmlFor="audio-sfx-volume">
            SFX Volume
          </label>
          <div className="volume-control">
            <span className="volume-icon">🎯</span>
            <input
              id="audio-sfx-volume"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.sfxVolume}
              onChange={handleSfxVolumeChange}
              disabled={disabled || !settings.audioEnabled || !settings.soundEnabled}
              className="volume-slider"
              aria-label={`SFX volume: ${Math.round(settings.sfxVolume * 100)}%`}
            />
            <span className="volume-icon">💥</span>
          </div>
          <div className="volume-display">
            {Math.round(settings.sfxVolume * 100)}%
          </div>
        </div>

        <div className="setting-item">
          <label className="toggle-label" htmlFor="audio-bgm-toggle">
            <input
              id="audio-bgm-toggle"
              type="checkbox"
              checked={settings.musicEnabled}
              onChange={handleMusicToggle}
              disabled={disabled || !settings.audioEnabled}
              className="toggle-input"
            />
            <span className="toggle-slider"></span>
            <span className="toggle-text">Background Music</span>
          </label>
        </div>

        <div className="setting-item">
          <label className="slider-label" htmlFor="audio-bgm-volume">
            BGM Volume
          </label>
          <div className="volume-control">
            <span className="volume-icon">🎵</span>
            <input
              id="audio-bgm-volume"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.bgmVolume}
              onChange={handleBgmVolumeChange}
              disabled={disabled || !settings.audioEnabled || !settings.musicEnabled}
              className="volume-slider"
              aria-label={`Music volume: ${Math.round(settings.bgmVolume * 100)}%`}
            />
            <span className="volume-icon">🎶</span>
          </div>
          <div className="volume-display">
            {Math.round(settings.bgmVolume * 100)}%
          </div>
        </div>
      </div>
    </div>
  );
};
