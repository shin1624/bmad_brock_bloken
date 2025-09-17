import React from 'react';
import { PauseOverlay } from './PauseOverlay';
import { MenuButton } from './MenuButton';
import styles from './ConfirmationDialog.module.css';

export interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'warning' | 'danger' | 'info';
  className?: string;
}

/**
 * ConfirmationDialog - Reusable confirmation dialog component
 * Story 3.3 Task 6: Used for "Return to Main Menu" confirmation
 */
export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = '確認',
  cancelText = 'キャンセル',
  onConfirm,
  onCancel,
  variant = 'warning',
  className = '',
}) => {
  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onCancel();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
    }
  };

  return (
    <PauseOverlay 
      className={`${styles.confirmationOverlay} ${className}`}
      onClick={handleBackdropClick}
    >
      <div 
        className={`${styles.confirmationDialog} ${styles[variant]}`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmation-title"
        aria-describedby="confirmation-message"
        tabIndex={-1}
      >
        <div className={styles.dialogHeader}>
          <div className={styles.iconContainer}>
            {variant === 'warning' && (
              <span className={styles.warningIcon} aria-hidden="true">⚠️</span>
            )}
            {variant === 'danger' && (
              <span className={styles.dangerIcon} aria-hidden="true">⚠️</span>
            )}
            {variant === 'info' && (
              <span className={styles.infoIcon} aria-hidden="true">ℹ️</span>
            )}
          </div>
          <h2 id="confirmation-title" className={styles.dialogTitle}>
            {title}
          </h2>
        </div>

        <div className={styles.dialogContent}>
          <p id="confirmation-message" className={styles.dialogMessage}>
            {message}
          </p>
        </div>

        <div className={styles.dialogActions}>
          <MenuButton
            onClick={onCancel}
            variant="secondary"
            size="medium"
            autoFocus
          >
            {cancelText}
          </MenuButton>
          
          <MenuButton
            onClick={onConfirm}
            variant={variant === 'danger' ? 'danger' : 'primary'}
            size="medium"
          >
            {confirmText}
          </MenuButton>
        </div>
      </div>
    </PauseOverlay>
  );
};

export default ConfirmationDialog;