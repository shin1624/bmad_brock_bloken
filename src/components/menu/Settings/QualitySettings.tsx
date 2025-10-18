import React from 'react';
import {
  useQualitySettingsStore,
  QualityLevel,
  QUALITY_PRESETS,
} from '../../../stores/qualitySettingsStore';

export const QualitySettings: React.FC = () => {
  const { settings, setQualityLevel, setSettings } = useQualitySettingsStore();

  const handleQualityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const level = e.target.value as QualityLevel;
    setQualityLevel(level);
  };

  const handleAutoAdjustToggle = () => {
    setSettings({ autoAdjust: !settings.autoAdjust });
  };

  const getQualityDescription = (level: QualityLevel): string => {
    const preset = QUALITY_PRESETS[level];
    return `${preset.targetFPS}FPS target, ${Math.round(preset.particleDensity * 100)}% particles, ${preset.maxActiveProjectiles} projectiles`;
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label
          htmlFor="quality-level"
          className="block text-sm font-medium text-gray-300"
        >
          Quality Level
        </label>
        <select
          id="quality-level"
          value={settings.level}
          onChange={handleQualityChange}
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value={QualityLevel.LOW}>
            Low - {getQualityDescription(QualityLevel.LOW)}
          </option>
          <option value={QualityLevel.MEDIUM}>
            Medium - {getQualityDescription(QualityLevel.MEDIUM)}
          </option>
          <option value={QualityLevel.HIGH}>
            High - {getQualityDescription(QualityLevel.HIGH)}
          </option>
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Adjust graphics quality based on your device performance
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <label
              htmlFor="auto-adjust"
              className="block text-sm font-medium text-gray-300"
            >
              Auto-Adjust Quality
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Automatically adjust quality based on FPS performance
            </p>
          </div>
          <button
            id="auto-adjust"
            onClick={handleAutoAdjustToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
              settings.autoAdjust ? 'bg-blue-600' : 'bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.autoAdjust ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-4 space-y-3">
        <h4 className="text-sm font-medium text-gray-300">Current Settings</h4>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-gray-500">Particle Density:</span>
            <span className="text-white ml-2">
              {Math.round(settings.particleDensity * 100)}%
            </span>
          </div>
          <div>
            <span className="text-gray-500">Max Projectiles:</span>
            <span className="text-white ml-2">
              {settings.maxActiveProjectiles}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Visual Effects:</span>
            <span className="text-white ml-2">
              {settings.visualEffects ? 'On' : 'Off'}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Glow Effects:</span>
            <span className="text-white ml-2">
              {settings.glowEffects ? 'On' : 'Off'}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Target FPS:</span>
            <span className="text-white ml-2">{settings.targetFPS}</span>
          </div>
          <div>
            <span className="text-gray-500">Auto-Adjust:</span>
            <span className="text-white ml-2">
              {settings.autoAdjust ? 'On' : 'Off'}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <svg
            className="w-5 h-5 text-blue-400 mt-0.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <div className="flex-1 text-xs text-gray-400">
            <p>
              <strong className="text-blue-400">Tip:</strong> Enable
              auto-adjust to let the game automatically optimize quality for
              smooth gameplay. The system will downgrade quality if FPS drops
              below target and upgrade when performance allows.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
