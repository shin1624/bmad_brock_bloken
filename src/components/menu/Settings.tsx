import React from "react";
import { useUIStore } from "../../stores/uiStore";

/**
 * 設定画面コンポーネント
 * パドルコントロール設定、入力感度調整、その他ゲーム設定を管理
 */
export const Settings: React.FC = () => {
  const {
    settings,
    updateSettings,
    setInputSensitivity,
    setControls,
    closeSettings,
    setMasterVolume,
    setSfxVolume,
    setBgmVolume,
    setAudioEnabled,
  } = useUIStore();

  const handleInputSensitivityChange = (
    device: "keyboard" | "mouse" | "touch",
    value: number,
  ) => {
    setInputSensitivity(device, value);
  };

  const handleControlsChange = (controls: "keyboard" | "mouse" | "touch") => {
    setControls(controls);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">設定</h2>
          <button
            onClick={closeSettings}
            className="text-gray-500 hover:text-gray-700 text-xl"
            aria-label="設定を閉じる"
          >
            ×
          </button>
        </div>

        <div className="space-y-6">
          {/* 入力コントロール設定 */}
          <section>
            <h3 className="text-lg font-semibold text-gray-700 mb-3">
              コントロール設定
            </h3>

            {/* 入力モード選択 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-600 mb-2">
                入力モード
              </label>
              <div className="flex space-x-2">
                {["keyboard", "mouse", "touch"].map((mode) => (
                  <button
                    key={mode}
                    onClick={() =>
                      handleControlsChange(
                        mode as "keyboard" | "mouse" | "touch",
                      )
                    }
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      settings.controls === mode
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    {mode === "keyboard"
                      ? "キーボード"
                      : mode === "mouse"
                        ? "マウス"
                        : "タッチ"}
                  </button>
                ))}
              </div>
            </div>

            {/* 入力感度調整 */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-600">入力感度</h4>

              {/* キーボード感度 */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-sm text-gray-600">キーボード</label>
                  <span className="text-sm text-gray-500">
                    {settings.inputSensitivity.keyboard.toFixed(1)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="2.0"
                  step="0.1"
                  value={settings.inputSensitivity.keyboard}
                  onChange={(e) =>
                    handleInputSensitivityChange(
                      "keyboard",
                      parseFloat(e.target.value),
                    )
                  }
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>

              {/* マウス感度 */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-sm text-gray-600">マウス</label>
                  <span className="text-sm text-gray-500">
                    {settings.inputSensitivity.mouse.toFixed(1)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="2.0"
                  step="0.1"
                  value={settings.inputSensitivity.mouse}
                  onChange={(e) =>
                    handleInputSensitivityChange(
                      "mouse",
                      parseFloat(e.target.value),
                    )
                  }
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>

              {/* タッチ感度 */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-sm text-gray-600">タッチ</label>
                  <span className="text-sm text-gray-500">
                    {settings.inputSensitivity.touch.toFixed(1)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="2.0"
                  step="0.1"
                  value={settings.inputSensitivity.touch}
                  onChange={(e) =>
                    handleInputSensitivityChange(
                      "touch",
                      parseFloat(e.target.value),
                    )
                  }
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>
            </div>
          </section>

          {/* その他のゲーム設定 */}
          <section>
            <h3 className="text-lg font-semibold text-gray-700 mb-3">
              ゲーム設定
            </h3>

            {/* オーディオ有効化 */}
            <div className="mb-4">
              <label className="flex items-center space-x-2 text-sm font-medium text-gray-600">
                <input
                  type="checkbox"
                  checked={settings.audioEnabled}
                  onChange={() => setAudioEnabled(!settings.audioEnabled)}
                  className="form-checkbox"
                />
                <span>オーディオを有効化</span>
              </label>
            </div>

            {/* マスターボリューム */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <label
                  className="text-sm font-medium text-gray-600"
                  htmlFor="settings-master-volume"
                >
                  マスターボリューム
                </label>
                <span className="text-sm text-gray-500">
                  {Math.round(settings.masterVolume * 100)}%
                </span>
              </div>
              <input
                id="settings-master-volume"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.masterVolume}
                onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                disabled={!settings.audioEnabled}
              />
            </div>

            {/* 効果音ボリューム */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <label
                  className="text-sm font-medium text-gray-600"
                  htmlFor="settings-sfx-volume"
                >
                  効果音ボリューム
                </label>
                <span className="text-sm text-gray-500">
                  {Math.round(settings.sfxVolume * 100)}%
                </span>
              </div>
              <input
                id="settings-sfx-volume"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.sfxVolume}
                onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                disabled={!settings.audioEnabled || !settings.soundEnabled}
              />
              <label className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
                <input
                  type="checkbox"
                  checked={settings.soundEnabled}
                  onChange={() =>
                    updateSettings({ soundEnabled: !settings.soundEnabled })
                  }
                  className="form-checkbox"
                />
                <span>効果音を有効化</span>
              </label>
            </div>

            {/* BGMボリューム */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <label
                  className="text-sm font-medium text-gray-600"
                  htmlFor="settings-bgm-volume"
                >
                  BGMボリューム
                </label>
                <span className="text-sm text-gray-500">
                  {Math.round(settings.bgmVolume * 100)}%
                </span>
              </div>
              <input
                id="settings-bgm-volume"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.bgmVolume}
                onChange={(e) => setBgmVolume(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                disabled={!settings.audioEnabled || !settings.musicEnabled}
              />
              <label className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
                <input
                  type="checkbox"
                  checked={settings.musicEnabled}
                  onChange={() =>
                    updateSettings({ musicEnabled: !settings.musicEnabled })
                  }
                  className="form-checkbox"
                />
                <span>BGMを有効化</span>
              </label>
            </div>

            {/* 難易度設定 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-600 mb-2">
                難易度
              </label>
              <div className="flex space-x-2">
                {["easy", "normal", "hard"].map((level) => (
                  <button
                    key={level}
                    onClick={() =>
                      updateSettings({
                        difficulty: level as "easy" | "normal" | "hard",
                      })
                    }
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      settings.difficulty === level
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    {level === "easy"
                      ? "簡単"
                      : level === "normal"
                        ? "普通"
                        : "難しい"}
                  </button>
                ))}
              </div>
            </div>

            {/* テーマ設定 */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                テーマ
              </label>
              <div className="flex space-x-2">
                {["light", "dark"].map((theme) => (
                  <button
                    key={theme}
                    onClick={() => updateSettings({ theme: theme as unknown })}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      settings.theme === theme
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    {theme === "light" ? "ライト" : "ダーク"}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* アクションボタン */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                // デフォルト設定に戻す
                updateSettings({
                  volume: 0.7,
                  masterVolume: 0.7,
                  sfxVolume: 0.7,
                  bgmVolume: 0.6,
                  audioEnabled: true,
                  soundEnabled: true,
                  musicEnabled: true,
                  difficulty: "normal",
                  theme: "light",
                  controls: "keyboard",
                  inputSensitivity: {
                    keyboard: 1.0,
                    mouse: 1.0,
                    touch: 1.0,
                  },
                });
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
            >
              デフォルトに戻す
            </button>
            <button
              onClick={closeSettings}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 transition-colors"
            >
              完了
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
