import React, { useState } from "react";
import { usePauseInput } from "../../../hooks/usePauseInput";
import { usePauseMenuNavigation } from "../../../hooks/usePauseMenuNavigation";
import { useIsPaused, useIsPauseMenuOpen } from "../../../stores/uiStore";
import { PauseOverlay } from "./PauseOverlay";
import { MenuButton } from "./MenuButton";
import { PauseMenuSettings } from "./PauseMenuSettings";
import { ConfirmationDialog } from "./ConfirmationDialog";
import styles from "./PauseMenu.module.css";

export interface PauseMenuProps {
  onResume?: () => void;
  onSettings?: () => void;
  onMainMenu?: () => void;
  className?: string;
}

/**
 * PauseMenu - Main pause menu container component
 * Story 3.3 AC2, AC3, AC4, AC5: 一時停止メニュー表示、再開オプション、メインメニューへ戻る、設定へのアクセス
 */
export const PauseMenu: React.FC<PauseMenuProps> = ({
  onResume,
  onSettings,
  onMainMenu,
  className = "",
}) => {
  const isPaused = useIsPaused();
  const isPauseMenuOpen = useIsPauseMenuOpen();
  const { resumeGame } = usePauseInput();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMainMenuConfirmOpen, setIsMainMenuConfirmOpen] = useState(false);

  // Don't render if not paused or menu not open
  if (!isPaused || !isPauseMenuOpen) {
    return null;
  }

  const menuItems = ["resume", "settings", "mainMenu"];

  const handleMenuSelect = (index: number) => {
    switch (index) {
      case 0:
        handleResume();
        break;
      case 1:
        handleSettings();
        break;
      case 2:
        handleMainMenu();
        break;
    }
  };

  const navigation = usePauseMenuNavigation({
    menuItems,
    onSelect: handleMenuSelect,
    onEscape: resumeGame,
    initialFocusIndex: 0,
  });

  const handleResume = () => {
    resumeGame();
    onResume?.();
  };

  const handleSettings = () => {
    setIsSettingsOpen(true);
    onSettings?.();
  };

  const handleSettingsClose = () => {
    setIsSettingsOpen(false);
  };

  const handleMainMenu = () => {
    setIsMainMenuConfirmOpen(true);
  };

  const handleMainMenuConfirm = () => {
    setIsMainMenuConfirmOpen(false);

    // Clean up game state when returning to main menu
    // This will reset scores, lives, etc.
    if (typeof window !== "undefined" && (window as any).gameStateManager) {
      const gameStateManager = (window as any).gameStateManager;
      gameStateManager.reset();
      gameStateManager.setGameStatus("idle");
    }

    // Resume game (unpause) before navigation
    resumeGame();

    // Navigate to main menu
    onMainMenu?.();
  };

  const handleMainMenuCancel = () => {
    setIsMainMenuConfirmOpen(false);
  };

  return (
    <>
      <PauseOverlay className={`${styles.pauseOverlay} ${className}`}>
        <div
          className={styles.pauseMenu}
          ref={navigation.menuRef}
          role="menu"
          aria-labelledby="pause-menu-title"
        >
          <div className={styles.pauseMenuHeader}>
            <h2 id="pause-menu-title" className={styles.pauseMenuTitle}>
              ゲーム一時停止
            </h2>
          </div>

          <div className={styles.pauseMenuContent}>
            <div className={styles.pauseMenuButtons} role="group">
              <MenuButton
                {...navigation.getFocusProps(0)}
                onClick={handleResume}
                variant="primary"
                icon="play"
                autoFocus={navigation.focusedIndex === 0}
                className={
                  navigation.focusedIndex === 0 ? styles.focusedButton : ""
                }
              >
                再開
              </MenuButton>

              <MenuButton
                {...navigation.getFocusProps(1)}
                onClick={handleSettings}
                variant="secondary"
                icon="settings"
                autoFocus={navigation.focusedIndex === 1}
                className={
                  navigation.focusedIndex === 1 ? styles.focusedButton : ""
                }
              >
                設定
              </MenuButton>

              <MenuButton
                {...navigation.getFocusProps(2)}
                onClick={handleMainMenu}
                variant="secondary"
                icon="home"
                autoFocus={navigation.focusedIndex === 2}
                className={
                  navigation.focusedIndex === 2 ? styles.focusedButton : ""
                }
              >
                メインメニュー
              </MenuButton>
            </div>
          </div>
        </div>
      </PauseOverlay>

      <PauseMenuSettings
        isOpen={isSettingsOpen}
        onClose={handleSettingsClose}
      />

      <ConfirmationDialog
        isOpen={isMainMenuConfirmOpen}
        title="メインメニューに戻る"
        message="ゲームを終了してメインメニューに戻りますか？現在の進行状況は失われます。"
        confirmText="メインメニューに戻る"
        cancelText="キャンセル"
        onConfirm={handleMainMenuConfirm}
        onCancel={handleMainMenuCancel}
        variant="warning"
      />
    </>
  );
};

export default PauseMenu;
