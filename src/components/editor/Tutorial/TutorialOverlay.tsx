import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './TutorialOverlay.module.css';

interface TutorialOverlayProps {
  targetElement?: string;
  isActive: boolean;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  targetElement,
  isActive,
}) => {
  const [spotlight, setSpotlight] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!isActive || !targetElement) {
      setSpotlight(null);
      return;
    }

    const updateSpotlight = () => {
      const target = document.querySelector(targetElement);
      if (target) {
        const rect = target.getBoundingClientRect();
        // Add padding around the target element
        setSpotlight({
          x: rect.x - 10,
          y: rect.y - 10,
          width: rect.width + 20,
          height: rect.height + 20,
          top: rect.top - 10,
          right: rect.right + 10,
          bottom: rect.bottom + 10,
          left: rect.left - 10,
          toJSON: rect.toJSON,
        });
      }
    };

    updateSpotlight();
    
    // Update on window resize
    window.addEventListener('resize', updateSpotlight);
    window.addEventListener('scroll', updateSpotlight);

    return () => {
      window.removeEventListener('resize', updateSpotlight);
      window.removeEventListener('scroll', updateSpotlight);
    };
  }, [targetElement, isActive]);

  if (!isActive) return null;

  const content = (
    <div className={styles.overlay}>
      {spotlight && (
        <>
          {/* Top overlay */}
          <div
            className={styles.overlaySection}
            style={{
              top: 0,
              left: 0,
              right: 0,
              height: spotlight.top,
            }}
          />
          
          {/* Left overlay */}
          <div
            className={styles.overlaySection}
            style={{
              top: spotlight.top,
              left: 0,
              width: spotlight.left,
              height: spotlight.height,
            }}
          />
          
          {/* Right overlay */}
          <div
            className={styles.overlaySection}
            style={{
              top: spotlight.top,
              right: 0,
              left: spotlight.right,
              height: spotlight.height,
            }}
          />
          
          {/* Bottom overlay */}
          <div
            className={styles.overlaySection}
            style={{
              top: spotlight.bottom,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
          
          {/* Spotlight border */}
          <div
            className={styles.spotlight}
            style={{
              top: spotlight.top,
              left: spotlight.left,
              width: spotlight.width,
              height: spotlight.height,
            }}
          />
        </>
      )}
      
      {!spotlight && (
        <div className={styles.fullOverlay} />
      )}
    </div>
  );

  return createPortal(content, document.body);
};