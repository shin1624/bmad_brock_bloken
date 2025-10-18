import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Tutorial } from './Tutorial';
import { useTutorialStore } from '../../../stores/tutorialStore';

// Mock the store
vi.mock('../../../stores/tutorialStore');

describe('Tutorial', () => {
  const mockStore = {
    isActive: false,
    currentStep: 0,
    steps: [
      {
        id: 'welcome',
        title: 'Welcome!',
        description: 'Click to continue',
        requiredAction: 'click',
        allowSkip: true,
      },
      {
        id: 'select-block',
        title: 'Select a Block',
        description: 'Choose a block from the palette',
        targetElement: '[data-testid="block-palette"]',
        requiredAction: 'click',
        tooltipPosition: 'right',
      },
    ],
    completed: false,
    hasSeenBefore: false,
    startTutorial: vi.fn(),
    nextStep: vi.fn(),
    previousStep: vi.fn(),
    skipTutorial: vi.fn(),
    completeTutorial: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useTutorialStore as any).mockReturnValue(mockStore);
  });

  describe('Initialization', () => {
    it('should not render when tutorial is not active', () => {
      const { container } = render(<Tutorial />);
      expect(container.firstChild).toBeNull();
    });

    it('should render when tutorial is active', () => {
      (useTutorialStore as any).mockReturnValue({
        ...mockStore,
        isActive: true,
      });

      render(<Tutorial />);
      expect(screen.getByText('Welcome!')).toBeInTheDocument();
    });

    it('should auto-start for first-time users', async () => {
      (useTutorialStore as any).mockReturnValue({
        ...mockStore,
        hasSeenBefore: false,
        completed: false,
        isActive: false,
      });

      render(<Tutorial />);

      await waitFor(() => {
        expect(mockStore.startTutorial).toHaveBeenCalled();
      }, { timeout: 600 });
    });

    it('should not auto-start for returning users', async () => {
      (useTutorialStore as any).mockReturnValue({
        ...mockStore,
        hasSeenBefore: true,
        completed: false,
        isActive: false,
      });

      render(<Tutorial />);

      await waitFor(() => {
        expect(mockStore.startTutorial).not.toHaveBeenCalled();
      }, { timeout: 600 });
    });
  });

  describe('Navigation', () => {
    beforeEach(() => {
      (useTutorialStore as any).mockReturnValue({
        ...mockStore,
        isActive: true,
      });
    });

    it('should show current step content', () => {
      render(<Tutorial />);
      expect(screen.getByText('Welcome!')).toBeInTheDocument();
      expect(screen.getByText('Click to continue')).toBeInTheDocument();
    });

    it('should handle next button click', () => {
      render(<Tutorial />);
      const nextButton = screen.getByText('次へ');
      fireEvent.click(nextButton);
      expect(mockStore.nextStep).toHaveBeenCalled();
    });

    it('should handle previous button when not on first step', () => {
      (useTutorialStore as any).mockReturnValue({
        ...mockStore,
        isActive: true,
        currentStep: 1,
      });

      render(<Tutorial />);
      const prevButton = screen.getByText('前へ');
      fireEvent.click(prevButton);
      expect(mockStore.previousStep).toHaveBeenCalled();
    });

    it('should not show previous button on first step', () => {
      (useTutorialStore as any).mockReturnValue({
        ...mockStore,
        isActive: true,
        currentStep: 0,
      });

      render(<Tutorial />);
      expect(screen.queryByText('前へ')).not.toBeInTheDocument();
    });
  });

  describe('Skip functionality', () => {
    beforeEach(() => {
      (useTutorialStore as any).mockReturnValue({
        ...mockStore,
        isActive: true,
      });
    });

    it('should show skip button when allowed', () => {
      render(<Tutorial />);
      expect(screen.getByText('スキップ')).toBeInTheDocument();
    });

    it('should not show skip button when not allowed', () => {
      (useTutorialStore as any).mockReturnValue({
        ...mockStore,
        isActive: true,
        currentStep: 0,
        steps: [
          {
            ...mockStore.steps[0],
            allowSkip: false,
          },
        ],
      });

      render(<Tutorial />);
      expect(screen.queryByText('スキップ')).not.toBeInTheDocument();
    });

    it('should confirm before skipping', () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      
      render(<Tutorial />);
      const skipButton = screen.getByText('スキップ');
      fireEvent.click(skipButton);

      expect(confirmSpy).toHaveBeenCalledWith(
        'チュートリアルをスキップしますか？後でヘルプメニューから再度実行できます。'
      );
      expect(mockStore.skipTutorial).toHaveBeenCalled();

      confirmSpy.mockRestore();
    });

    it('should not skip if user cancels confirmation', () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      
      render(<Tutorial />);
      const skipButton = screen.getByText('スキップ');
      fireEvent.click(skipButton);

      expect(mockStore.skipTutorial).not.toHaveBeenCalled();

      confirmSpy.mockRestore();
    });
  });

  describe('Completion', () => {
    it('should complete tutorial on last step', () => {
      const onComplete = vi.fn();
      
      (useTutorialStore as any).mockReturnValue({
        ...mockStore,
        isActive: true,
        currentStep: 1, // Last step in our mock
      });

      render(<Tutorial onComplete={onComplete} />);
      const nextButton = screen.getByText('次へ');
      fireEvent.click(nextButton);

      expect(mockStore.completeTutorial).toHaveBeenCalled();
      expect(onComplete).toHaveBeenCalled();
    });
  });

  describe('Click action steps', () => {
    it('should advance on click for click-required steps', async () => {
      (useTutorialStore as any).mockReturnValue({
        ...mockStore,
        isActive: true,
        currentStep: 0,
      });

      render(<Tutorial />);

      // Wait for click handler to be attached
      await waitFor(() => {}, { timeout: 400 });

      // Simulate a click anywhere on document
      fireEvent.click(document.body);

      await waitFor(() => {
        expect(mockStore.nextStep).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      (useTutorialStore as any).mockReturnValue({
        ...mockStore,
        isActive: true,
      });
    });

    it('should have proper ARIA labels', () => {
      render(<Tutorial />);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText('次のステップへ')).toBeInTheDocument();
      expect(screen.getByLabelText('チュートリアルをスキップ')).toBeInTheDocument();
    });

    it('should show step progress', () => {
      render(<Tutorial />);
      expect(screen.getByText('ステップ 1 / 2')).toBeInTheDocument();
    });
  });
});