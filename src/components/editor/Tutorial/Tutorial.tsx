import React, { useEffect, useCallback } from 'react';
import { useTutorialStore } from '../../../stores/tutorialStore';
import { TutorialTooltip } from './TutorialTooltip';
import { TutorialOverlay } from './TutorialOverlay';
import styles from './Tutorial.module.css';

interface TutorialProps {
  onComplete?: () => void;
}

export const Tutorial: React.FC<TutorialProps> = ({ onComplete }) => {
  const {
    isActive,
    currentStep,
    steps,
    completed,
    hasSeenBefore,
    startTutorial,
    nextStep,
    previousStep,
    skipTutorial,
    completeTutorial,
  } = useTutorialStore();

  // Auto-start tutorial for first-time users
  useEffect(() => {
    if (!hasSeenBefore && !completed && !isActive) {
      const timer = setTimeout(() => {
        startTutorial();
      }, 500); // Small delay to ensure UI is ready
      
      return () => clearTimeout(timer);
    }
  }, [hasSeenBefore, completed, isActive, startTutorial]);

  // Handle step validation
  const handleNext = useCallback(() => {
    const step = steps[currentStep];
    
    // If there's a validation function, check it
    if (step.validationFn && !step.validationFn()) {
      // Show validation error (could enhance with toast notification)
      console.log('Please complete the required action before proceeding');
      return;
    }
    
    if (currentStep === steps.length - 1) {
      completeTutorial();
      if (onComplete) {
        onComplete();
      }
    } else {
      nextStep();
    }
  }, [currentStep, steps, nextStep, completeTutorial, onComplete]);

  const handleSkip = useCallback(() => {
    if (window.confirm('チュートリアルをスキップしますか？後でヘルプメニューから再度実行できます。')) {
      skipTutorial();
    }
  }, [skipTutorial]);

  // Handle click events for steps that require click action
  useEffect(() => {
    if (!isActive) return;
    
    const currentStepData = steps[currentStep];
    if (currentStepData.requiredAction === 'click') {
      const handleClick = (e: MouseEvent) => {
        // If there's a target element, check if click is on it
        if (currentStepData.targetElement) {
          const target = document.querySelector(currentStepData.targetElement);
          if (target && target.contains(e.target as Node)) {
            handleNext();
          }
        } else {
          // No specific target, any click advances
          handleNext();
        }
      };

      // Add delay to prevent immediate trigger
      const timer = setTimeout(() => {
        document.addEventListener('click', handleClick);
      }, 300);

      return () => {
        clearTimeout(timer);
        document.removeEventListener('click', handleClick);
      };
    }
  }, [isActive, currentStep, steps, handleNext]);

  if (!isActive) {
    return null;
  }

  const currentStepData = steps[currentStep];

  return (
    <div className={styles.tutorialContainer}>
      <TutorialOverlay
        targetElement={currentStepData.targetElement}
        isActive={isActive}
      />
      
      <TutorialTooltip
        title={currentStepData.title}
        description={currentStepData.description}
        targetElement={currentStepData.targetElement}
        position={currentStepData.tooltipPosition}
        onNext={currentStepData.requiredAction !== 'click' ? handleNext : undefined}
        onPrevious={currentStep > 0 ? previousStep : undefined}
        onSkip={currentStepData.allowSkip !== false ? handleSkip : undefined}
        hasNext={currentStep < steps.length - 1 || currentStep === steps.length - 1}
        hasPrevious={currentStep > 0}
        allowSkip={currentStepData.allowSkip !== false}
        stepNumber={currentStep + 1}
        totalSteps={steps.length}
      />
    </div>
  );
};