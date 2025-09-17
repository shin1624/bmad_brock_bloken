import React, { forwardRef } from 'react';
import styles from './PauseMenu.module.css';

export interface MenuButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  icon?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
}

/**
 * MenuButton - Individual menu action buttons for pause menu
 * Story 3.3 AC3, AC4, AC5: 再開オプション、メインメニューへ戻る、設定へのアクセス
 */
export const MenuButton = forwardRef<HTMLButtonElement, MenuButtonProps>(
  (
    {
      children,
      onClick,
      variant = 'secondary',
      size = 'medium',
      icon,
      disabled = false,
      autoFocus = false,
      className = '',
    },
    ref
  ) => {
    const baseClasses = [
      styles.menuButton,
      styles[`menuButton${variant.charAt(0).toUpperCase() + variant.slice(1)}`],
      styles[`menuButton${size.charAt(0).toUpperCase() + size.slice(1)}`],
      disabled && styles.menuButtonDisabled,
      className,
    ].filter(Boolean).join(' ');

    const handleClick = () => {
      if (!disabled) {
        onClick();
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    };

    return (
      <button
        ref={ref}
        type="button"
        className={baseClasses}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        autoFocus={autoFocus}
        aria-label={typeof children === 'string' ? children : undefined}
      >
        {icon && (
          <span className={styles.menuButtonIcon} aria-hidden="true">
            {getIconContent(icon)}
          </span>
        )}
        <span className={styles.menuButtonText}>{children}</span>
      </button>
    );
  }
);

MenuButton.displayName = 'MenuButton';

/**
 * Get icon content based on icon name
 * Using simple Unicode symbols for now, can be replaced with icon library later
 */
function getIconContent(icon: string): string {
  const icons: Record<string, string> = {
    play: '▶',
    pause: '⏸',
    settings: '⚙',
    home: '🏠',
    exit: '✕',
    back: '◀',
  };

  return icons[icon] || '';
}

export default MenuButton;