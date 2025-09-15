import React from 'react';
import { AudioSettings } from './AudioSettings';
import { ThemeSettings } from './ThemeSettings';
import { AccessibilitySettings } from './AccessibilitySettings';
import { useSettings } from '../../../hooks/useSettings';
import './SettingsPanel.css';

export interface SettingsPanelProps {
  onClose: () => void;
  className?: string;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ 
  onClose, 
  className = '' 
}) => {
  const { 
    settings, 
    updateSettings,
    resetSettings,
    saveSettings,
    isLoading,
    hasUnsavedChanges
  } = useSettings();

  const handleSave = async () => {
    await saveSettings();
    onClose();
  };

  const handleReset = () => {
    if (confirm('Reset all settings to default values?')) {
      resetSettings();
    }
  };

  return (
    <div className={`settings-panel ${className}`} role="dialog" aria-labelledby="settings-title">
      <div className="settings-container">
        <header className="settings-header">
          <h2 id="settings-title" className="settings-title">Settings</h2>
          <button
            className="close-button"
            onClick={onClose}
            aria-label="Close settings"
            type="button"
          >
            ✕
          </button>
        </header>

        <div className="settings-content">
          <section className="settings-section">
            <AudioSettings 
              settings={settings}
              onUpdateSettings={updateSettings}
              disabled={isLoading}
            />
          </section>

          <section className="settings-section">
            <ThemeSettings 
              settings={settings}
              onUpdateSettings={updateSettings}
              disabled={isLoading}
            />
          </section>

          <section className="settings-section">
            <AccessibilitySettings 
              settings={settings}
              onUpdateSettings={updateSettings}
              disabled={isLoading}
            />
          </section>
        </div>

        <footer className="settings-footer">
          <div className="settings-actions">
            <button
              className="button-secondary"
              onClick={handleReset}
              disabled={isLoading}
              type="button"
            >
              Reset to Defaults
            </button>

            <div className="primary-actions">
              <button
                className="button-secondary"
                onClick={onClose}
                disabled={isLoading}
                type="button"
              >
                Cancel
              </button>

              <button
                className="button-primary"
                onClick={handleSave}
                disabled={isLoading || !hasUnsavedChanges}
                type="button"
              >
                {isLoading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>

          {hasUnsavedChanges && (
            <div className="unsaved-indicator" role="status" aria-live="polite">
              You have unsaved changes
            </div>
          )}
        </footer>
      </div>
    </div>
  );
};