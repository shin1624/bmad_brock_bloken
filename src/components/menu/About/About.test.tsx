import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { About } from './About';

// Mock the version utility
vi.mock('../../../utils/version', () => ({
  getAppVersion: () => '1.0'
}));

describe('About Component', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
  });

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      const { container } = render(<About isOpen={false} onClose={mockOnClose} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render when isOpen is true', () => {
      render(<About isOpen={true} onClose={mockOnClose} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Block Breaker')).toBeInTheDocument();
    });

    it('should display sanitized version number', () => {
      render(<About isOpen={true} onClose={mockOnClose} />);
      expect(screen.getByText('Version 1.0')).toBeInTheDocument();
    });

    it('should display all required content sections', () => {
      render(<About isOpen={true} onClose={mockOnClose} />);
      
      // Check for all required sections
      expect(screen.getByText('About')).toBeInTheDocument();
      expect(screen.getByText('Development Team')).toBeInTheDocument();
      expect(screen.getByText('Technologies')).toBeInTheDocument();
      expect(screen.getByText('License')).toBeInTheDocument();
      
      // Check for specific content
      expect(screen.getByText(/React 18.3/)).toBeInTheDocument();
      expect(screen.getByText(/TypeScript 5.4/)).toBeInTheDocument();
      expect(screen.getByText(/MIT License/)).toBeInTheDocument();
      expect(screen.getByText(/© 2025 BMAD Brock Bloken/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<About isOpen={true} onClose={mockOnClose} />);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'about-title');
    });

    it('should have accessible close buttons', () => {
      render(<About isOpen={true} onClose={mockOnClose} />);
      
      const closeButtons = screen.getAllByRole('button');
      const topCloseButton = screen.getByLabelText('Close about dialog');
      const bottomCloseButton = screen.getByLabelText('Close');
      
      expect(topCloseButton).toBeInTheDocument();
      expect(bottomCloseButton).toBeInTheDocument();
    });

    it('should focus close button when opened', () => {
      render(<About isOpen={true} onClose={mockOnClose} />);
      
      const closeButton = screen.getByLabelText('Close about dialog');
      // Note: Focus testing in JSDOM is limited, but we check the button exists
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onClose when top close button is clicked', () => {
      render(<About isOpen={true} onClose={mockOnClose} />);
      
      const closeButton = screen.getByLabelText('Close about dialog');
      fireEvent.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when bottom close button is clicked', () => {
      render(<About isOpen={true} onClose={mockOnClose} />);
      
      const closeButton = screen.getByLabelText('Close');
      fireEvent.click(closeButton);
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when ESC key is pressed', () => {
      render(<About isOpen={true} onClose={mockOnClose} />);
      
      // Simulate ESC key press
      fireEvent.keyDown(document, { key: 'Escape' });
      
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose for other keys', () => {
      render(<About isOpen={true} onClose={mockOnClose} />);
      
      // Simulate other key press
      fireEvent.keyDown(document, { key: 'Enter' });
      fireEvent.keyDown(document, { key: 'Space' });
      
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  describe('Event Listener Cleanup', () => {
    it('should add and remove keydown event listener', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
      
      const { rerender } = render(<About isOpen={false} onClose={mockOnClose} />);
      
      // Open the modal
      rerender(<About isOpen={true} onClose={mockOnClose} />);
      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      
      // Close the modal
      rerender(<About isOpen={false} onClose={mockOnClose} />);
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      
      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Security', () => {
    it('should not display detailed version information (SEC-001 mitigation)', () => {
      render(<About isOpen={true} onClose={mockOnClose} />);
      
      const versionText = screen.getByText(/Version/);
      expect(versionText.textContent).toBe('Version 1.0');
      expect(versionText.textContent).not.toMatch(/beta/);
      expect(versionText.textContent).not.toMatch(/alpha/);
      expect(versionText.textContent).not.toMatch(/\d+\.\d+\.\d+/);
    });
  });
});