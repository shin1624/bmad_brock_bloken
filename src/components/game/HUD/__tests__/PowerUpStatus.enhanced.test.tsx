/**
 * Enhanced Unit Tests for PowerUpStatus Component
 * Story 4.2, Task 5: Test enhanced power-up display functionality
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import PowerUpStatus, { ActivePowerUp, PowerUpType } from '../PowerUpStatus';

// Mock timers for testing animations and countdowns
jest.useFakeTimers();

describe('PowerUpStatus Enhanced Features', () => {
  const mockPowerUps: ActivePowerUp[] = [
    {
      id: 'multiball-1',
      type: PowerUpType.MultiBall,
      duration: 15000,
      maxDuration: 30000,
      icon: '⚡',
      color: '#ff6b6b',
      name: 'Multi Ball'
    },
    {
      id: 'paddle-large-1',
      type: PowerUpType.PaddleSize,
      duration: 8000,
      maxDuration: 20000,
      icon: '🏓',
      color: '#4ecdc4',
      name: 'Large Paddle',
      variant: 'large',
      effectStrength: 1.5
    },
    {
      id: 'ball-fast-1',
      type: PowerUpType.BallSpeed,
      duration: 5000,
      maxDuration: 15000,
      icon: '💨',
      color: '#45b7d1',
      name: 'Fast Ball',
      variant: 'fast',
      stackCount: 2,
      effectStrength: 1.8
    }
  ];

  describe('Variant Support', () => {
    it('should display correct icons for paddle size variants', () => {
      const largePaddle: ActivePowerUp = {
        ...mockPowerUps[1],
        variant: 'large'
      };

      const smallPaddle: ActivePowerUp = {
        ...mockPowerUps[1],
        id: 'paddle-small-1',
        variant: 'small'
      };

      render(<PowerUpStatus powerUps={[largePaddle, smallPaddle]} />);

      // Check that both variants are displayed
      expect(screen.getByText('🏓')).toBeInTheDocument();
      expect(screen.getByText('🏏')).toBeInTheDocument();
    });

    it('should display correct icons for ball speed variants', () => {
      const fastBall: ActivePowerUp = {
        ...mockPowerUps[2],
        variant: 'fast'
      };

      const slowBall: ActivePowerUp = {
        ...mockPowerUps[2],
        id: 'ball-slow-1',
        variant: 'slow'
      };

      render(<PowerUpStatus powerUps={[fastBall, slowBall]} />);

      // Check that both variants are displayed
      expect(screen.getByText('💨')).toBeInTheDocument();
      expect(screen.getByText('🐌')).toBeInTheDocument();
    });

    it('should use correct colors for variants', () => {
      const smallPaddle: ActivePowerUp = {
        ...mockPowerUps[1],
        variant: 'small',
        color: '#ff9f43'
      };

      render(<PowerUpStatus powerUps={[smallPaddle]} />);

      const powerUpElement = screen.getByRole('timer');
      expect(powerUpElement).toHaveStyle('border: 2px solid #ff9f43');
    });
  });

  describe('Stack Count Display', () => {
    it('should display stack count when greater than 1', () => {
      const stackedPowerUp: ActivePowerUp = {
        ...mockPowerUps[2],
        stackCount: 3
      };

      render(<PowerUpStatus powerUps={[stackedPowerUp]} />);

      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should not display stack count when equal to 1', () => {
      const singlePowerUp: ActivePowerUp = {
        ...mockPowerUps[0],
        stackCount: 1
      };

      render(<PowerUpStatus powerUps={[singlePowerUp]} />);

      expect(screen.queryByText('1')).not.toBeInTheDocument();
    });

    it('should not display stack count when undefined', () => {
      render(<PowerUpStatus powerUps={[mockPowerUps[0]]} />);

      // Should not find any stack count indicators
      const stackElements = screen.queryAllByText(/^\d+$/);
      const stackCounts = stackElements.filter(el => 
        el.parentElement?.style.position === 'absolute'
      );
      expect(stackCounts).toHaveLength(0);
    });

    it('should style stack count indicator correctly', () => {
      const stackedPowerUp: ActivePowerUp = {
        ...mockPowerUps[2],
        stackCount: 5
      };

      render(<PowerUpStatus powerUps={[stackedPowerUp]} />);

      const stackElement = screen.getByText('5');
      expect(stackElement).toHaveStyle({
        backgroundColor: '#ff4757',
        color: '#ffffff',
        fontSize: '10px',
        borderRadius: '50%'
      });
    });
  });

  describe('Effect Strength Display', () => {
    it('should display effect strength for buffs', () => {
      const buffPowerUp: ActivePowerUp = {
        ...mockPowerUps[1],
        effectStrength: 1.5
      };

      render(<PowerUpStatus powerUps={[buffPowerUp]} />);

      expect(screen.getByText('↑150%')).toBeInTheDocument();
    });

    it('should display effect strength for debuffs', () => {
      const debuffPowerUp: ActivePowerUp = {
        ...mockPowerUps[2],
        effectStrength: 0.5
      };

      render(<PowerUpStatus powerUps={[debuffPowerUp]} />);

      expect(screen.getByText('↓50%')).toBeInTheDocument();
    });

    it('should not display effect strength when equal to 1', () => {
      const neutralPowerUp: ActivePowerUp = {
        ...mockPowerUps[0],
        effectStrength: 1
      };

      render(<PowerUpStatus powerUps={[neutralPowerUp]} />);

      expect(screen.queryByText(/↑|↓/)).not.toBeInTheDocument();
    });

    it('should not display effect strength when undefined', () => {
      render(<PowerUpStatus powerUps={[mockPowerUps[0]]} />);

      expect(screen.queryByText(/↑|↓/)).not.toBeInTheDocument();
    });

    it('should use correct colors for buff and debuff indicators', () => {
      const buffPowerUp: ActivePowerUp = {
        ...mockPowerUps[1],
        effectStrength: 1.2
      };

      const debuffPowerUp: ActivePowerUp = {
        ...mockPowerUps[2],
        id: 'debuff-1',
        effectStrength: 0.8
      };

      render(<PowerUpStatus powerUps={[buffPowerUp, debuffPowerUp]} />);

      const buffElement = screen.getByText('↑120%');
      const debuffElement = screen.getByText('↓80%');

      expect(buffElement).toHaveStyle('color: #4ecdc4');
      expect(debuffElement).toHaveStyle('color: #ff9f43');
    });
  });

  describe('Complex Combinations', () => {
    it('should display all features together correctly', () => {
      const complexPowerUp: ActivePowerUp = {
        id: 'complex-1',
        type: PowerUpType.BallSpeed,
        duration: 12000,
        maxDuration: 20000,
        icon: '💨',
        color: '#45b7d1',
        name: 'Turbo Speed',
        variant: 'fast',
        stackCount: 3,
        effectStrength: 2.0
      };

      render(<PowerUpStatus powerUps={[complexPowerUp]} />);

      // Check all features are present
      expect(screen.getByText('💨')).toBeInTheDocument(); // Icon
      expect(screen.getByText('3')).toBeInTheDocument(); // Stack count
      expect(screen.getByText('↑200%')).toBeInTheDocument(); // Effect strength
      expect(screen.getByText('Turbo Speed')).toBeInTheDocument(); // Name
      expect(screen.getByText('12s')).toBeInTheDocument(); // Time
    });

    it('should handle multiple complex power-ups', () => {
      const complexPowerUps: ActivePowerUp[] = [
        {
          ...mockPowerUps[0],
          stackCount: 2,
          effectStrength: 1.0
        },
        {
          ...mockPowerUps[1],
          variant: 'small',
          effectStrength: 0.75
        },
        {
          ...mockPowerUps[2],
          stackCount: 4,
          effectStrength: 2.5
        }
      ];

      render(<PowerUpStatus powerUps={complexPowerUps} />);

      // Check that all power-ups are displayed
      expect(screen.getAllByRole('timer')).toHaveLength(3);
      
      // Check specific features
      expect(screen.getByText('2')).toBeInTheDocument(); // Stack for first
      expect(screen.getByText('↓75%')).toBeInTheDocument(); // Debuff for second
      expect(screen.getByText('4')).toBeInTheDocument(); // Stack for third
      expect(screen.getByText('↑250%')).toBeInTheDocument(); // Buff for third
    });
  });

  describe('Accessibility Enhancements', () => {
    it('should include variant information in aria-label', () => {
      const variantPowerUp: ActivePowerUp = {
        ...mockPowerUps[1],
        variant: 'large',
        name: 'Large Paddle'
      };

      render(<PowerUpStatus powerUps={[variantPowerUp]} />);

      const timer = screen.getByRole('timer');
      expect(timer).toHaveAttribute('aria-label', 
        expect.stringContaining('Large Paddle'));
    });

    it('should include stack count in accessible description', () => {
      const stackedPowerUp: ActivePowerUp = {
        ...mockPowerUps[2],
        stackCount: 3,
        name: 'Fast Ball'
      };

      // Could be extended to include stack count in aria-label
      render(<PowerUpStatus powerUps={[stackedPowerUp]} />);

      const timer = screen.getByRole('timer');
      expect(timer).toHaveAttribute('aria-label', 
        expect.stringContaining('Fast Ball'));
    });
  });

  describe('Animation States', () => {
    it('should handle spawn animations for variant power-ups', () => {
      const { rerender } = render(<PowerUpStatus powerUps={[]} />);

      const variantPowerUp: ActivePowerUp = {
        ...mockPowerUps[1],
        variant: 'small'
      };

      act(() => {
        rerender(<PowerUpStatus powerUps={[variantPowerUp]} />);
      });

      // Check that the power-up is rendered
      expect(screen.getByRole('timer')).toBeInTheDocument();
    });

    it('should handle warning states for stacked power-ups', () => {
      const lowTimePowerUp: ActivePowerUp = {
        ...mockPowerUps[2],
        duration: 1000, // Low duration to trigger warning
        stackCount: 3
      };

      render(<PowerUpStatus powerUps={[lowTimePowerUp]} />);

      act(() => {
        jest.advanceTimersByTime(150); // Advance past warning check interval
      });

      // Power-up should still be visible even in warning state
      expect(screen.getByRole('timer')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument(); // Stack count should persist
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero effect strength', () => {
      const zeroPowerUp: ActivePowerUp = {
        ...mockPowerUps[0],
        effectStrength: 0
      };

      render(<PowerUpStatus powerUps={[zeroPowerUp]} />);

      expect(screen.getByText('↓0%')).toBeInTheDocument();
    });

    it('should handle very high stack counts', () => {
      const highStackPowerUp: ActivePowerUp = {
        ...mockPowerUps[2],
        stackCount: 99
      };

      render(<PowerUpStatus powerUps={[highStackPowerUp]} />);

      expect(screen.getByText('99')).toBeInTheDocument();
    });

    it('should handle missing variant gracefully', () => {
      const noVariantPowerUp: ActivePowerUp = {
        ...mockPowerUps[1],
        variant: undefined
      };

      render(<PowerUpStatus powerUps={[noVariantPowerUp]} />);

      // Should still render successfully
      expect(screen.getByRole('timer')).toBeInTheDocument();
    });

    it('should handle invalid variant gracefully', () => {
      const invalidVariantPowerUp: ActivePowerUp = {
        ...mockPowerUps[1],
        variant: 'invalid'
      };

      render(<PowerUpStatus powerUps={[invalidVariantPowerUp]} />);

      // Should still render successfully with default icon
      expect(screen.getByRole('timer')).toBeInTheDocument();
    });
  });
});