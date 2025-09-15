import { useUIStore } from "../../stores/uiStore";

export const InputSettings = () => {
  const { settings, setControls, setInputSensitivity } = useUIStore();

  return (
    <div>
      <h2>入力設定</h2>

      <div>
        <button
          aria-label="キーボードモードに切り替え"
          aria-pressed={settings.controls === "keyboard" ? "true" : "false"}
          onClick={() => setControls("keyboard")}
        >
          キーボード
        </button>
        <button
          aria-label="マウスモードに切り替え"
          aria-pressed={settings.controls === "mouse" ? "true" : "false"}
          onClick={() => setControls("mouse")}
        >
          マウス
        </button>
        <button
          aria-label="タッチモードに切り替え"
          aria-pressed={settings.controls === "touch" ? "true" : "false"}
          onClick={() => setControls("touch")}
        >
          タッチ
        </button>
      </div>

      <div>
        <label>
          キーボード感度: {Math.round(settings.inputSensitivity.keyboard * 100)}
          %
          <input
            type="range"
            min="0.1"
            max="2.0"
            step="0.1"
            value={settings.inputSensitivity.keyboard}
            onChange={(e) =>
              setInputSensitivity("keyboard", parseFloat(e.target.value))
            }
            aria-label="キーボード感度調整スライダー"
            disabled={settings.controls !== "keyboard"}
          />
        </label>
        <label>
          マウス感度: {Math.round(settings.inputSensitivity.mouse * 100)}%
          <input
            type="range"
            min="0.1"
            max="2.0"
            step="0.1"
            value={settings.inputSensitivity.mouse}
            onChange={(e) =>
              setInputSensitivity("mouse", parseFloat(e.target.value))
            }
            aria-label="マウス感度調整スライダー"
            disabled={settings.controls !== "mouse"}
          />
        </label>
        <label>
          タッチ感度: {Math.round(settings.inputSensitivity.touch * 100)}%
          <input
            type="range"
            min="0.1"
            max="2.0"
            step="0.1"
            value={settings.inputSensitivity.touch}
            onChange={(e) =>
              setInputSensitivity("touch", parseFloat(e.target.value))
            }
            aria-label="タッチ感度調整スライダー"
            disabled={settings.controls !== "touch"}
          />
        </label>
      </div>

      <div>
        <p>感度を上げると操作が速くなり、下げると操作が遅くなります。</p>
        <p>キーコンフィグ機能は今後のアップデートで追加予定です。</p>
      </div>
    </div>
  );
};
