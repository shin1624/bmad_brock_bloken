import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './TutorialTooltip.module.css';

interface TutorialTooltipProps {
  title: string;
  description: string;
  targetElement?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  onNext?: () => void;
  onPrevious?: () => void;
  onSkip?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
  allowSkip?: boolean;
  stepNumber?: number;
  totalSteps?: number;
}

export const TutorialTooltip: React.FC<TutorialTooltipProps> = ({
  title,
  description,
  targetElement,
  position = 'bottom',
  onNext,
  onPrevious,
  onSkip,
  hasNext = true,
  hasPrevious = false,
  allowSkip = true,
  stepNumber,
  totalSteps,
}) => {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const positionTooltip = () => {
      if (!targetElement) {
        // Center the tooltip if no target element
        setTooltipPosition({
          top: window.innerHeight / 2,
          left: window.innerWidth / 2,
        });
        setIsVisible(true);
        return;
      }

      const target = document.querySelector(targetElement);
      if (!target || !tooltipRef.current) return;

      const targetRect = target.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      
      let top = 0;
      let left = 0;

      switch (position) {
        case 'top':
          top = targetRect.top - tooltipRect.height - 20;
          left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
          break;
        case 'bottom':
          top = targetRect.bottom + 20;
          left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
          break;
        case 'left':
          top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
          left = targetRect.left - tooltipRect.width - 20;
          break;
        case 'right':
          top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
          left = targetRect.right + 20;
          break;
      }

      // Ensure tooltip stays within viewport
      top = Math.max(10, Math.min(top, window.innerHeight - tooltipRect.height - 10));
      left = Math.max(10, Math.min(left, window.innerWidth - tooltipRect.width - 10));

      setTooltipPosition({ top, left });
      setIsVisible(true);

      // Add highlight to target element
      target.classList.add('tutorial-highlight');
    };

    // Delay positioning to ensure DOM is ready
    const timer = setTimeout(positionTooltip, 100);
    
    // Reposition on window resize
    window.addEventListener('resize', positionTooltip);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', positionTooltip);
      
      // Remove highlight from target element
      if (targetElement) {
        const target = document.querySelector(targetElement);
        if (target) {
          target.classList.remove('tutorial-highlight');
        }
      }
    };
  }, [targetElement, position]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && allowSkip && onSkip) {
      onSkip();
    } else if (e.key === 'Enter' && hasNext && onNext) {
      onNext();
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasNext, allowSkip, onNext, onSkip]);

  const content = (
    <div
      ref={tooltipRef}
      className={`${styles.tooltip} ${isVisible ? styles.visible : ''}`}
      style={{
        top: `${tooltipPosition.top}px`,
        left: `${tooltipPosition.left}px`,
      }}
      role="dialog"
      aria-labelledby="tutorial-title"
      aria-describedby="tutorial-description"
    >
      {stepNumber && totalSteps && (
        <div className={styles.progress}>
          ステップ {stepNumber} / {totalSteps}
        </div>
      )}
      
      <h3 id="tutorial-title" className={styles.title}>{title}</h3>
      <p id="tutorial-description" className={styles.description}>{description}</p>
      
      <div className={styles.actions}>
        {hasPrevious && onPrevious && (
          <button
            onClick={onPrevious}
            className={styles.previousButton}
            aria-label="前のステップへ"
          >
            前へ
          </button>
        )}
        
        <div className={styles.rightActions}>
          {allowSkip && onSkip && (
            <button
              onClick={onSkip}
              className={styles.skipButton}
              aria-label="チュートリアルをスキップ"
            >
              スキップ
            </button>
          )}
          
          {hasNext && onNext && (
            <button
              onClick={onNext}
              className={`${styles.nextButton} ${styles.primary}`}
              aria-label="次のステップへ"
            >
              次へ
            </button>
          )}
        </div>
      </div>
      
      {targetElement && (
        <div className={`${styles.arrow} ${styles[`arrow-${position}`]}`} />
      )}
    </div>
  );

  // Use portal to render tooltip at root level
  return createPortal(content, document.body);
};