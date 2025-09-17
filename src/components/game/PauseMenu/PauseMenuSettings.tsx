import React, { useState } from "react";
import { SettingsPanel } from "../../menu/Settings/SettingsPanel";
import styles from "./PauseMenuSettings.module.css";

export interface PauseMenuSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

/**
 * PauseMenuSettings - Settings overlay within pause menu context
 * Story 3.3 Task 5: Settings Integration
 * Connects to existing Settings component from Story 3.1
 */
export const PauseMenuSettings: React.FC<PauseMenuSettingsProps> = ({
  isOpen,
  onClose,
  className = "",
}) => {
  const [isClosing, setIsClosing] = useState(false);

  if (!isOpen) {
    return null;
  }

  const handleClose = () => {
    setIsClosing(true);
    // Delay to allow closing animation
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  };

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  };

  return (
    <div
      className={`${styles.settingsOverlay} ${isClosing ? styles.closing : ""} ${className}`}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-settings-title"
    >
      <div
        className={`${styles.settingsContainer} ${isClosing ? styles.slideOut : styles.slideIn}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.settingsHeader}>
          <h2 id="pause-settings-title" className={styles.settingsTitle}>
            Game Settings
          </h2>
          <p className={styles.settingsSubtitle}>
            Settings will be saved when you return to the game
          </p>
        </div>

        <div className={styles.settingsContent}>
          <SettingsPanel
            onClose={handleClose}
            className={styles.embeddedSettings}
          />
        </div>
      </div>
    </div>
  );
};

export default PauseMenuSettings;
