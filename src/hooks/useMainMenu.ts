import { useCallback, useState, useEffect } from "react";
import { useUIStore } from "../stores/uiStore";

export interface MenuState {
  currentMenu: "main" | "settings" | "highScores" | "levelSelect";
  navigationHistory: string[];
  isAnimating: boolean;
}

export interface UseMainMenuReturn {
  menuState: MenuState;
  isLoading: boolean;
  startGame: (level: number) => void;
  openSettings: () => void;
  openHighScores: () => void;
  openLevelSelect: () => void;
  goBack: () => void;
}

export const useMainMenu = (): UseMainMenuReturn => {
  const { setCurrentScreen } = useUIStore();
  const [menuState, setMenuState] = useState<MenuState>({
    currentMenu: "main",
    navigationHistory: [],
    isAnimating: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  const startGame = useCallback(
    (level: number) => {
      setIsLoading(true);
      // Level can be used for future implementation
      console.log(`Starting game with level: ${level}`);

      // Simulate game initialization delay
      setTimeout(() => {
        setCurrentScreen("game");
        setIsLoading(false);
      }, 100);
    },
    [setCurrentScreen],
  );

  const openSettings = useCallback(() => {
    setMenuState((prev) => ({
      ...prev,
      currentMenu: "settings",
      navigationHistory: [...prev.navigationHistory, prev.currentMenu],
      isAnimating: true,
    }));
  }, []);

  const openHighScores = useCallback(() => {
    setMenuState((prev) => ({
      ...prev,
      currentMenu: "highScores",
      navigationHistory: [...prev.navigationHistory, prev.currentMenu],
      isAnimating: true,
    }));
  }, []);

  const openLevelSelect = useCallback(() => {
    setMenuState((prev) => ({
      ...prev,
      currentMenu: "levelSelect",
      navigationHistory: [...prev.navigationHistory, prev.currentMenu],
      isAnimating: true,
    }));
  }, []);

  const goBack = useCallback(() => {
    setMenuState((prev) => {
      const history = [...prev.navigationHistory];
      const previousMenu = history.pop() || "main";

      return {
        ...prev,
        currentMenu: previousMenu as MenuState["currentMenu"],
        navigationHistory: history,
        isAnimating: true,
      };
    });
  }, []);

  // Reset animation state after transition
  useEffect(() => {
    if (menuState.isAnimating) {
      const timer = setTimeout(() => {
        setMenuState((prev) => ({ ...prev, isAnimating: false }));
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [menuState.isAnimating]);

  return {
    menuState,
    isLoading,
    startGame,
    openSettings,
    openHighScores,
    openLevelSelect,
    goBack,
  };
};
