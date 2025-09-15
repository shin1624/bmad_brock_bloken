import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SettingsPanel } from '../SettingsPanel';
import { useSettings } from '../../../../hooks/useSettings';

// Mock the useSettings hook
vi.mock('../../../../hooks/useSettings');

const mockUseSettings = vi.mocked(useSettings);

const mockSettingsReturn = {
  settings: {
    soundEnabled: true,
    musicEnabled: true,
    volume: 0.7,
    theme: 'light' as const,
    difficulty: 'normal' as const,
    controls: 'keyboard' as const,
    inputSensitivity: {
      keyboard: 1.0,
      mouse: 1.0,
      touch: 1.0,
    },
  },
  updateSettings: vi.fn(),
  resetSettings: vi.fn(),
  saveSettings: vi.fn(),
  loadSettings: vi.fn(),
  isLoading: false,
  hasUnsavedChanges: false,
};

describe('SettingsPanel Component', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockUseSettings.mockReturnValue(mockSettingsReturn);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render settings panel with all sections', () => {
    render(<SettingsPanel onClose={mockOnClose} />);
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Audio Settings')).toBeInTheDocument();
    expect(screen.getByText('Appearance & Difficulty')).toBeInTheDocument();
    expect(screen.getByText('Controls & Accessibility')).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    render(<SettingsPanel onClose={mockOnClose} />);
    
    const closeButton = screen.getByLabelText('Close settings');
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should call onClose when cancel button is clicked', () => {
    render(<SettingsPanel onClose={mockOnClose} />);
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should handle save settings correctly', async () => {
    mockUseSettings.mockReturnValue({
      ...mockSettingsReturn,
      hasUnsavedChanges: true,
      saveSettings: vi.fn().mockResolvedValue(undefined),
    });

    render(<SettingsPanel onClose={mockOnClose} />);
    
    const saveButton = screen.getByText('Save Settings');
    expect(saveButton).not.toBeDisabled();
    
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(mockSettingsReturn.saveSettings).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should handle reset settings with confirmation', () => {
    // Mock window.confirm
    const mockConfirm = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<SettingsPanel onClose={mockOnClose} />);
    
    const resetButton = screen.getByText('Reset to Defaults');
    fireEvent.click(resetButton);
    
    expect(mockConfirm).toHaveBeenCalledWith('Reset all settings to default values?');
    expect(mockSettingsReturn.resetSettings).toHaveBeenCalled();

    mockConfirm.mockRestore();
  });

  it('should not reset settings if user cancels confirmation', () => {
    // Mock window.confirm
    const mockConfirm = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<SettingsPanel onClose={mockOnClose} />);
    
    const resetButton = screen.getByText('Reset to Defaults');
    fireEvent.click(resetButton);
    
    expect(mockConfirm).toHaveBeenCalled();
    expect(mockSettingsReturn.resetSettings).not.toHaveBeenCalled();

    mockConfirm.mockRestore();
  });

  it('should show loading state correctly', () => {
    mockUseSettings.mockReturnValue({
      ...mockSettingsReturn,
      isLoading: true,
    });

    render(<SettingsPanel onClose={mockOnClose} />);
    
    const saveButton = screen.getByText('Saving...');
    expect(saveButton).toBeDisabled();
    
    const resetButton = screen.getByText('Reset to Defaults');
    expect(resetButton).toBeDisabled();
  });

  it('should show unsaved changes indicator', () => {
    mockUseSettings.mockReturnValue({
      ...mockSettingsReturn,
      hasUnsavedChanges: true,
    });

    render(<SettingsPanel onClose={mockOnClose} />);
    
    expect(screen.getByText('You have unsaved changes')).toBeInTheDocument();
  });

  it('should disable save button when no unsaved changes', () => {
    mockUseSettings.mockReturnValue({
      ...mockSettingsReturn,
      hasUnsavedChanges: false,
    });

    render(<SettingsPanel onClose={mockOnClose} />);
    
    const saveButton = screen.getByText('Save Settings');
    expect(saveButton).toBeDisabled();
  });

  it('should have proper accessibility attributes', () => {
    render(<SettingsPanel onClose={mockOnClose} />);
    
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby', 'settings-title');
    
    const title = screen.getByText('Settings');
    expect(title).toHaveAttribute('id', 'settings-title');
    
    const statusIndicator = screen.queryByRole('status');
    if (statusIndicator) {
      expect(statusIndicator).toHaveAttribute('aria-live', 'polite');
    }
  });

  it('should apply custom className when provided', () => {
    const { container } = render(
      <SettingsPanel onClose={mockOnClose} className="custom-settings" />
    );
    
    const settingsPanel = container.querySelector('.settings-panel');
    expect(settingsPanel).toHaveClass('custom-settings');
  });
});