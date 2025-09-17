import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface PauseOverlayProps {
  children: React.ReactNode;
  className?: string;
  onBackdropClick?: () => void;
}

/**
 * PauseOverlay - Modal overlay with backdrop blur for pause menu
 * Story 3.3 AC2: 一時停止メニュー表示
 */
export const PauseOverlay: React.FC<PauseOverlayProps> = ({
  children,
  className = '',
  onBackdropClick,
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onBackdropClick?.();
    }
  };

  // Prevent body scroll when overlay is open
  useEffect(() => {
    const originalStyle = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  // Focus trap within overlay
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    const focusableElements = overlay.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    overlay.addEventListener('keydown', handleTabKey);

    return () => {
      overlay.removeEventListener('keydown', handleTabKey);
    };
  }, []);

  const overlayContent = (
    <div
      ref={overlayRef}
      className={className}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-menu-title"
    >
      {children}
    </div>
  );

  // Render as portal to body to ensure proper z-index layering
  return createPortal(overlayContent, document.body);
};