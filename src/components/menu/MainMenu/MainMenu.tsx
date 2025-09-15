import React from "react";
import { StartButton } from "./StartButton";
import { MenuNavigation } from "./MenuNavigation";
import { useMainMenu } from "../../../hooks/useMainMenu";
import "./MainMenu.css";

export interface MainMenuProps {
  className?: string;
}

export const MainMenu: React.FC<MainMenuProps> = ({ className = "" }) => {
  const {
    startGame,
    openSettings,
    openHighScores,
    openLevelSelect,
    isLoading,
  } = useMainMenu();

  if (isLoading) {
    return (
      <div className={`main-menu loading ${className}`}>
        <div className="loading-spinner" aria-label="Loading menu">
          <div className="spinner-ring"></div>
        </div>
      </div>
    );
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
              onClick={() => startGame(1)}
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
          </MenuNavigation>
        </nav>
      </div>
    </div>
  );
};
