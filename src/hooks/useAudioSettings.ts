import { useCallback, useMemo } from "react";
import { useUIStore } from "../stores/uiStore";
import { linearToLogarithmic } from "../stores/uiStore";

type AudioDevice = "master" | "sfx" | "bgm";

type SetAudioVolumeFn = (value: number) => void;

type ToggleFn = (enabled: boolean) => void;

type AudioSettingsHook = {
  masterVolume: number;
  sfxVolume: number;
  bgmVolume: number;
  audioEnabled: boolean;
  soundEnabled: boolean;
  musicEnabled: boolean;
  setMasterVolume: SetAudioVolumeFn;
  setSfxVolume: SetAudioVolumeFn;
  setBgmVolume: SetAudioVolumeFn;
  setAudioEnabled: ToggleFn;
  setSoundEnabled: ToggleFn;
  setMusicEnabled: ToggleFn;
  getLogVolume: (device: AudioDevice) => number;
};

const clamp = (value: number): number => Math.max(0, Math.min(1, value));

export const useAudioSettings = (): AudioSettingsHook => {
  const {
    settings,
    setMasterVolume,
    setSfxVolume,
    setBgmVolume,
    setAudioEnabled,
    updateSettings,
  } = useUIStore();

  const setSoundEnabled = useCallback<ToggleFn>(
    (enabled) => updateSettings({ soundEnabled: enabled }),
    [updateSettings],
  );

  const setMusicEnabled = useCallback<ToggleFn>(
    (enabled) => updateSettings({ musicEnabled: enabled }),
    [updateSettings],
  );

  const getLogVolume = useCallback(
    (device: AudioDevice): number => {
      if (!settings.audioEnabled) return 0;

      switch (device) {
        case "master":
          return linearToLogarithmic(settings.masterVolume);
        case "sfx":
          return settings.soundEnabled
            ? linearToLogarithmic(clamp(settings.sfxVolume * settings.masterVolume))
            : 0;
        case "bgm":
          return settings.musicEnabled
            ? linearToLogarithmic(clamp(settings.bgmVolume * settings.masterVolume))
            : 0;
        default:
          return 0;
      }
    },
    [settings.audioEnabled, settings.masterVolume, settings.sfxVolume, settings.bgmVolume, settings.soundEnabled, settings.musicEnabled],
  );

  return useMemo(
    () => ({
      masterVolume: settings.masterVolume,
      sfxVolume: settings.sfxVolume,
      bgmVolume: settings.bgmVolume,
      audioEnabled: settings.audioEnabled,
      soundEnabled: settings.soundEnabled,
      musicEnabled: settings.musicEnabled,
      setMasterVolume,
      setSfxVolume,
      setBgmVolume,
      setAudioEnabled,
      setSoundEnabled,
      setMusicEnabled,
      getLogVolume,
    }),
    [
      settings.audioEnabled,
      settings.soundEnabled,
      settings.musicEnabled,
      settings.masterVolume,
      settings.sfxVolume,
      settings.bgmVolume,
      setMasterVolume,
      setSfxVolume,
      setBgmVolume,
      setAudioEnabled,
      setSoundEnabled,
      setMusicEnabled,
      getLogVolume,
    ],
  );
};

export default useAudioSettings;
