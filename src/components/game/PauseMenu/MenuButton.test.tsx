import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MenuButton } from './MenuButton';

describe('MenuButton', () => {
  const mockOnClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render button with text', () => {
    render(<MenuButton onClick={mockOnClick}>Test Button</MenuButton>);
    
    expect(screen.getByRole('button')).toHaveTextContent('Test Button');
  });

  it('should call onClick when clicked', () => {
    render(<MenuButton onClick={mockOnClick}>Click Me</MenuButton>);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(mockOnClick).toHaveBeenCalledOnce();
  });

  it('should call onClick when Enter key is pressed', () => {
    render(<MenuButton onClick={mockOnClick}>Press Enter</MenuButton>);
    
    const button = screen.getByRole('button');
    fireEvent.keyDown(button, { key: 'Enter' });
    
    expect(mockOnClick).toHaveBeenCalledOnce();
  });

  it('should call onClick when Space key is pressed', () => {
    render(<MenuButton onClick={mockOnClick}>Press Space</MenuButton>);
    
    const button = screen.getByRole('button');
    fireEvent.keyDown(button, { key: ' ' });
    
    expect(mockOnClick).toHaveBeenCalledOnce();
  });

  it('should not call onClick when disabled', () => {
    render(<MenuButton onClick={mockOnClick} disabled>Disabled Button</MenuButton>);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(mockOnClick).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
  });

  it('should render with icon when provided', () => {
    render(<MenuButton onClick={mockOnClick} icon="play">Play</MenuButton>);
    
    const button = screen.getByRole('button');
    const icon = button.querySelector('[aria-hidden="true"]');
    
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveTextContent('▶');
  });

  it('should apply variant classes correctly', () => {
    const { rerender } = render(
      <MenuButton onClick={mockOnClick} variant="primary">Primary</MenuButton>
    );
    
    let button = screen.getByRole('button');
    expect(button.className).toContain('menuButtonPrimary');

    rerender(<MenuButton onClick={mockOnClick} variant="secondary">Secondary</MenuButton>);
    button = screen.getByRole('button');
    expect(button.className).toContain('menuButtonSecondary');

    rerender(<MenuButton onClick={mockOnClick} variant="danger">Danger</MenuButton>);
    button = screen.getByRole('button');
    expect(button.className).toContain('menuButtonDanger');
  });

  it('should apply size classes correctly', () => {
    const { rerender } = render(
      <MenuButton onClick={mockOnClick} size="small">Small</MenuButton>
    );
    
    let button = screen.getByRole('button');
    expect(button.className).toContain('menuButtonSmall');

    rerender(<MenuButton onClick={mockOnClick} size="medium">Medium</MenuButton>);
    button = screen.getByRole('button');
    expect(button.className).toContain('menuButtonMedium');

    rerender(<MenuButton onClick={mockOnClick} size="large">Large</MenuButton>);
    button = screen.getByRole('button');
    expect(button.className).toContain('menuButtonLarge');
  });

  it('should set autoFocus when specified', () => {
    render(<MenuButton onClick={mockOnClick} autoFocus>Auto Focus</MenuButton>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveFocus();
  });

  it('should apply custom className', () => {
    const customClass = 'custom-button';
    render(<MenuButton onClick={mockOnClick} className={customClass}>Custom</MenuButton>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass(customClass);
  });

  it('should have proper accessibility attributes', () => {
    render(<MenuButton onClick={mockOnClick}>Accessible Button</MenuButton>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Accessible Button');
  });

  it('should not set aria-label for non-string children', () => {
    render(
      <MenuButton onClick={mockOnClick}>
        <span>Complex Content</span>
      </MenuButton>
    );
    
    const button = screen.getByRole('button');
    expect(button).not.toHaveAttribute('aria-label');
  });

  it('should ignore unknown keys', () => {
    render(<MenuButton onClick={mockOnClick}>Key Test</MenuButton>);
    
    const button = screen.getByRole('button');
    fireEvent.keyDown(button, { key: 'Escape' });
    
    expect(mockOnClick).not.toHaveBeenCalled();
  });

  it('should render all supported icons', () => {
    const icons = ['play', 'pause', 'settings', 'home', 'exit', 'back'];
    
    icons.forEach(iconName => {
      render(<MenuButton onClick={mockOnClick} icon={iconName}>{iconName}</MenuButton>);
      const icon = screen.getByLabelText(iconName).querySelector('[aria-hidden="true"]');
      expect(icon).toBeInTheDocument();
    });
  });

  it('should handle unknown icons gracefully', () => {
    render(<MenuButton onClick={mockOnClick} icon="unknown">Unknown Icon</MenuButton>);
    
    const icon = screen.getByRole('button').querySelector('[aria-hidden="true"]');
    expect(icon).toHaveTextContent('');
  });
});