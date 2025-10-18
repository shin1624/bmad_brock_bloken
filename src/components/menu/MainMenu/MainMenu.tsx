import React, { useState } from "react";
import { StartButton } from "./StartButton";
import { MenuNavigation } from "./MenuNavigation";
import { useMainMenu } from "../../../hooks/useMainMenu";
import { About } from "../About";
import { SettingsPanel } from "../Settings/SettingsPanel";
import "./MainMenu.css";

export interface MainMenuProps {
  className?: string;
  onStartGame?: () => void;
  onOpenEditor?: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  className = "",
  onStartGame,
  onOpenEditor,
}) => {
  const {
    menuState,
    startGame,
    openSettings,
    openHighScores,
    openLevelSelect,
    goBack,
    isLoading,
  } = useMainMenu();

  const [isAboutOpen, setIsAboutOpen] = useState(false);

  const handleStartGame = () => {
    if (onStartGame) {
      onStartGame();
    } else {
      startGame(1);
    }
  };

  if (isLoading) {
    return (
      <div className={`main-menu loading ${className}`}>
        <div className="loading-spinner" aria-label="Loading menu">
          <div className="spinner-ring"></div>
        </div>
      </div>
    );
  }

  // Render Settings Panel if settings menu is active
  if (menuState.currentMenu === "settings") {
    return <SettingsPanel onClose={goBack} className={className} />;
  }

  return (
    <div
      className={`main-menu ${className}`}
      role="main"
      aria-label="Main Menu"
    >
      <div className="menu-container">
        <header className="menu-header">
          <h1 className="game-title">Block Breaker</h1>
          <p className="game-subtitle">Experience the Classic</p>
        </header>

        <nav
          className="menu-navigation"
          role="navigation"
          aria-label="Main navigation"
        >
          <MenuNavigation>
            <StartButton
              onClick={handleStartGame}
              disabled={isLoading}
              className="menu-item-enter"
            />

            <button
              className="menu-button menu-item-enter"
              onClick={openLevelSelect}
              disabled={isLoading}
              aria-label="Select game level"
            >
              <span className="button-icon">🎯</span>
              <span className="button-text">Level Select</span>
            </button>

            <button
              className="menu-button menu-item-enter"
              onClick={openHighScores}
              disabled={isLoading}
              aria-label="View high scores"
            >
              <span className="button-icon">🏆</span>
              <span className="button-text">High Scores</span>
            </button>

            <button
              className="menu-button menu-item-enter"
              onClick={openSettings}
              disabled={isLoading}
              aria-label="Open game settings"
            >
              <span className="button-icon">⚙️</span>
              <span className="button-text">Settings</span>
            </button>

            <button
              className="menu-button menu-item-enter"
              onClick={() => setIsAboutOpen(true)}
              disabled={isLoading}
              aria-label="About the game"
            >
              <span className="button-icon">ℹ️</span>
              <span className="button-text">About</span>
            </button>
          </MenuNavigation>
        </nav>
      </div>

      <About isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </div>
  );
};
