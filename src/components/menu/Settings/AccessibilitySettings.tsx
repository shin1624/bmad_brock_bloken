import React from 'react';
import { UIState } from '../../../stores/uiStore';

export interface AccessibilitySettingsProps {
  settings: UIState['settings'];
  onUpdateSettings: (settings: Partial<UIState['settings']>) => void;
  disabled?: boolean;
}

const CONTROLS = [
  { value: 'keyboard', label: 'Keyboard', icon: '⌨️', description: 'Arrow keys and spacebar' },
  { value: 'mouse', label: 'Mouse', icon: '🖱️', description: 'Mouse movement and clicks' },
  { value: 'touch', label: 'Touch', icon: '👆', description: 'Touch gestures (mobile)' },
] as const;

export const AccessibilitySettings: React.FC<AccessibilitySettingsProps> = ({
  settings,
  onUpdateSettings,
  disabled = false
}) => {
  const handleControlsChange = (controls: UIState['settings']['controls']) => {
    onUpdateSettings({ controls });
  };

  const handleSensitivityChange = (
    device: keyof UIState['settings']['inputSensitivity'],
    value: number
  ) => {
    onUpdateSettings({
      inputSensitivity: {
        ...settings.inputSensitivity,
        [device]: value
      }
    });
  };

  return (
    <div className="accessibility-settings">
      <h3 className="settings-section-title">Controls & Accessibility</h3>

      <div className="setting-group">
        <div className="setting-item">
          <label className="setting-label">Primary Control Method</label>
          <div className="controls-options">
            {CONTROLS.map((control) => (
              <button
                key={control.value}
                className={`control-option ${settings.controls === control.value ? 'active' : ''}`}
                onClick={() => handleControlsChange(control.value)}
                disabled={disabled}
                type="button"
                aria-pressed={settings.controls === control.value}
              >
                <span className="control-icon">{control.icon}</span>
                <div className="control-info">
                  <span className="control-label">{control.label}</span>
                  <span className="control-description">{control.description}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="setting-item">
          <label className="setting-label">Input Sensitivity</label>
          
          <div className="sensitivity-controls">
            {Object.entries(settings.inputSensitivity).map(([device, sensitivity]) => (
              <div key={device} className="sensitivity-item">
                <label className="sensitivity-label" htmlFor={`${device}-sensitivity`}>
                  {device.charAt(0).toUpperCase() + device.slice(1)} Sensitivity
                </label>
                <div className="sensitivity-control">
                  <span className="sensitivity-value">Slow</span>
                  <input
                    id={`${device}-sensitivity`}
                    type="range"
                    min="0.1"
                    max="2.0"
                    step="0.1"
                    value={sensitivity}
                    onChange={(e) => handleSensitivityChange(
                      device as keyof UIState['settings']['inputSensitivity'],
                      parseFloat(e.target.value)
                    )}
                    disabled={disabled}
                    className="sensitivity-slider"
                    aria-label={`${device} sensitivity: ${sensitivity.toFixed(1)}`}
                  />
                  <span className="sensitivity-value">Fast</span>
                </div>
                <div className="sensitivity-display">
                  {sensitivity.toFixed(1)}x
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="setting-item">
          <div className="accessibility-info">
            <h4 className="info-title">Accessibility Features</h4>
            <ul className="info-list">
              <li>Keyboard navigation support throughout the game</li>
              <li>Screen reader compatible with ARIA labels</li>
              <li>High contrast mode detection</li>
              <li>Reduced motion support for animations</li>
              <li>Customizable input sensitivity</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};