import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { Settings } from "../Settings";
import { useUIStore } from "../../../stores/uiStore";

// Zustandストアのモック設定
vi.mock("../../../stores/uiStore");

const mockStore = {
  settings: {
    controls: "keyboard" as const,
    inputSensitivity: {
      keyboard: 1.0,
      mouse: 1.0,
      touch: 1.0,
    },
    audioEnabled: true,
    soundEnabled: true,
    musicEnabled: true,
    volume: 0.7,
    masterVolume: 0.7,
    sfxVolume: 0.7,
    bgmVolume: 0.6,
    difficulty: "normal" as const,
    theme: "light" as const,
  },
  updateSettings: vi.fn(),
  setInputSensitivity: vi.fn(),
  setControls: vi.fn(),
  closeSettings: vi.fn(),
  setMasterVolume: vi.fn(),
  setSfxVolume: vi.fn(),
  setBgmVolume: vi.fn(),
  setAudioEnabled: vi.fn(),
};

describe("Settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useUIStore as any).mockReturnValue(mockStore);
  });

  describe("レンダリング", () => {
    it("設定画面が正しく表示される", () => {
      render(<Settings />);

      expect(screen.getByText("設定")).toBeInTheDocument();
      expect(screen.getByText("コントロール設定")).toBeInTheDocument();
      expect(screen.getByText("入力モード")).toBeInTheDocument();
      expect(screen.getByText("入力感度")).toBeInTheDocument();
      expect(screen.getByText("ゲーム設定")).toBeInTheDocument();
    });

    it("入力モードボタンが表示される", () => {
      render(<Settings />);

      expect(screen.getByText("キーボード")).toBeInTheDocument();
      expect(screen.getByText("マウス")).toBeInTheDocument();
      expect(screen.getByText("タッチ")).toBeInTheDocument();
    });

    it("入力感度スライダーが表示される", () => {
      render(<Settings />);

      const keyboardSlider = screen.getByDisplayValue("1");
      const mouseSlider = screen.getAllByDisplayValue("1")[1];
      const touchSlider = screen.getAllByDisplayValue("1")[2];

      expect(keyboardSlider).toBeInTheDocument();
      expect(mouseSlider).toBeInTheDocument();
      expect(touchSlider).toBeInTheDocument();
    });
  });

  describe("入力モード選択", () => {
    it("キーボードモードを選択できる", async () => {
      render(<Settings />);

      const keyboardButton = screen.getByText("キーボード");
      fireEvent.click(keyboardButton);

      await waitFor(() => {
        expect(mockStore.setControls).toHaveBeenCalledWith("keyboard");
      });
    });

    it("マウスモードを選択できる", async () => {
      render(<Settings />);

      const mouseButton = screen.getByText("マウス");
      fireEvent.click(mouseButton);

      await waitFor(() => {
        expect(mockStore.setControls).toHaveBeenCalledWith("mouse");
      });
    });

    it("タッチモードを選択できる", async () => {
      render(<Settings />);

      const touchButton = screen.getByText("タッチ");
      fireEvent.click(touchButton);

      await waitFor(() => {
        expect(mockStore.setControls).toHaveBeenCalledWith("touch");
      });
    });

    it("現在選択中のモードがハイライトされる", () => {
      // キーボードが選択されている状態
      render(<Settings />);

      const keyboardButton = screen.getByText("キーボード");
      expect(keyboardButton).toHaveClass("bg-blue-500", "text-white");
    });
  });

  describe("入力感度調整", () => {
    it("キーボード感度を変更できる", async () => {
      render(<Settings />);

      const keyboardSlider = screen.getByDisplayValue("1");
      fireEvent.change(keyboardSlider, { target: { value: "1.5" } });

      await waitFor(() => {
        expect(mockStore.setInputSensitivity).toHaveBeenCalledWith("keyboard", 1.5);
      });
    });

    it("マウス感度を変更できる", async () => {
      render(<Settings />);

      const mouseSlider = screen.getAllByDisplayValue("1")[1];
      fireEvent.change(mouseSlider, { target: { value: "0.5" } });

      await waitFor(() => {
        expect(mockStore.setInputSensitivity).toHaveBeenCalledWith("mouse", 0.5);
      });
    });

    it("タッチ感度を変更できる", async () => {
      render(<Settings />);

      const touchSlider = screen.getAllByDisplayValue("1")[2];
      fireEvent.change(touchSlider, { target: { value: "2.0" } });

      await waitFor(() => {
        expect(mockStore.setInputSensitivity).toHaveBeenCalledWith("touch", 2.0);
      });
    });

    it("感度値が正しく表示される", () => {
      // 異なる感度値でテスト
      const customStore = {
        ...mockStore,
        settings: {
          ...mockStore.settings,
          inputSensitivity: {
            keyboard: 1.2,
            mouse: 0.8,
            touch: 1.5,
          },
        },
      };
      (useUIStore as any).mockReturnValue(customStore);

      render(<Settings />);

      expect(screen.getByText("1.2")).toBeInTheDocument();
      expect(screen.getByText("0.8")).toBeInTheDocument();
      expect(screen.getByText("1.5")).toBeInTheDocument();
    });
  });

  describe("その他のゲーム設定", () => {
    it("音量を変更できる", async () => {
      render(<Settings />);

      const masterSlider = screen.getByLabelText("マスターボリューム");
      fireEvent.change(masterSlider, { target: { value: "0.5" } });

      await waitFor(() => {
        expect(mockStore.setMasterVolume).toHaveBeenCalledWith(0.5);
      });

      const sfxSlider = screen.getByLabelText("効果音ボリューム");
      fireEvent.change(sfxSlider, { target: { value: "0.4" } });

      await waitFor(() => {
        expect(mockStore.setSfxVolume).toHaveBeenCalledWith(0.4);
      });

      const bgmSlider = screen.getByLabelText("BGMボリューム");
      fireEvent.change(bgmSlider, { target: { value: "0.3" } });

      await waitFor(() => {
        expect(mockStore.setBgmVolume).toHaveBeenCalledWith(0.3);
      });

      const audioToggle = screen.getByLabelText("オーディオを有効化");
      fireEvent.click(audioToggle);

      await waitFor(() => {
        expect(mockStore.setAudioEnabled).toHaveBeenCalledWith(false);
      });

      const sfxToggle = screen.getByLabelText("効果音を有効化");
      fireEvent.click(sfxToggle);

      await waitFor(() => {
        expect(mockStore.updateSettings).toHaveBeenCalledWith({ soundEnabled: false });
      });

      const bgmToggle = screen.getByLabelText("BGMを有効化");
      fireEvent.click(bgmToggle);

      await waitFor(() => {
        expect(mockStore.updateSettings).toHaveBeenCalledWith({ musicEnabled: false });
      });
    });

    it("難易度を変更できる", async () => {
      render(<Settings />);

      const hardButton = screen.getByText("難しい");
      fireEvent.click(hardButton);

      await waitFor(() => {
        expect(mockStore.updateSettings).toHaveBeenCalledWith({ difficulty: "hard" });
      });
    });

    it("テーマを変更できる", async () => {
      render(<Settings />);

      const darkButton = screen.getByText("ダーク");
      fireEvent.click(darkButton);

      await waitFor(() => {
        expect(mockStore.updateSettings).toHaveBeenCalledWith({ theme: "dark" });
      });
    });
  });

  describe("アクションボタン", () => {
    it("デフォルトに戻すボタンが動作する", async () => {
      render(<Settings />);

      const resetButton = screen.getByText("デフォルトに戻す");
      fireEvent.click(resetButton);

      await waitFor(() => {
        expect(mockStore.updateSettings).toHaveBeenCalledWith(
          expect.objectContaining({
            volume: 0.7,
            masterVolume: 0.7,
            sfxVolume: 0.7,
            bgmVolume: 0.6,
            difficulty: "normal",
            theme: "light",
            controls: "keyboard",
            inputSensitivity: {
              keyboard: 1.0,
              mouse: 1.0,
              touch: 1.0,
            },
          }),
        );
      });
    });

    it("完了ボタンで設定を閉じる", async () => {
      render(<Settings />);

      const doneButton = screen.getByText("完了");
      fireEvent.click(doneButton);

      await waitFor(() => {
        expect(mockStore.closeSettings).toHaveBeenCalled();
      });
    });

    it("×ボタンで設定を閉じる", async () => {
      render(<Settings />);

      const closeButton = screen.getByLabelText("設定を閉じる");
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(mockStore.closeSettings).toHaveBeenCalled();
      });
    });
  });

  describe("アクセシビリティ", () => {
    it("適切なaria-labelが設定されている", () => {
      render(<Settings />);

      const closeButton = screen.getByLabelText("設定を閉じる");
      expect(closeButton).toBeInTheDocument();
      expect(screen.getByLabelText("マスターボリューム")).toBeInTheDocument();
      expect(screen.getByLabelText("効果音ボリューム")).toBeInTheDocument();
      expect(screen.getByLabelText("BGMボリューム")).toBeInTheDocument();
    });

    it("スライダーの値が正しくラベル表示される", () => {
      render(<Settings />);

      // 各感度値が表示されていることを確認
      expect(screen.getByText("1.0")).toBeInTheDocument();
      
      // 音量の百分率表示
      expect(screen.getAllByText("70%").length).toBeGreaterThan(0);
      expect(screen.getByText("60%" )).toBeInTheDocument();
    });
  });

  describe("UI状態の反映", () => {
    it("現在の設定値がUIに正しく反映される", () => {
      const customStore = {
        ...mockStore,
        settings: {
          ...mockStore.settings,
          controls: "mouse" as const,
          volume: 0.3,
          masterVolume: 0.3,
          sfxVolume: 0.4,
          bgmVolume: 0.25,
          difficulty: "hard" as const,
          theme: "dark" as const,
        },
      };
      (useUIStore as any).mockReturnValue(customStore);

      render(<Settings />);

      // マウスボタンがアクティブ
      const mouseButton = screen.getByText("マウス");
      expect(mouseButton).toHaveClass("bg-blue-500", "text-white");

      // 音量が30%表示
      expect(screen.getByText("30%")).toBeInTheDocument();

      // ハードモードがアクティブ
      const hardButton = screen.getByText("難しい");
      expect(hardButton).toHaveClass("bg-blue-500", "text-white");

      // ダークテーマがアクティブ  
      const darkButton = screen.getByText("ダーク");
      expect(darkButton).toHaveClass("bg-blue-500", "text-white");
    });
  });
});
