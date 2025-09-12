import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DebugInfoPanel } from '../DebugInfoPanel';
import type { PerformanceMetrics } from '../../../types/game.types';

// Mock import.meta.env for development environment testing
const mockImportMeta = {
  env: {
    DEV: true,
  },
};

vi.stubGlobal('import', {
  meta: mockImportMeta,
});

describe('DebugInfoPanel', () => {
  const mockPerformanceMetrics: PerformanceMetrics = {
    fps: 60,
    averageFps: 58.5,
    deltaTime: 0.0167, // ~16.67ms for 60fps
    frameCount: 1234,
    lastFrameTime: 20567.89,
  };

  const mockPoorPerformanceMetrics: PerformanceMetrics = {
    fps: 30,
    averageFps: 32.1,
    deltaTime: 0.0333, // ~33.33ms for 30fps
    frameCount: 567,
    lastFrameTime: 15000,
  };

  beforeEach(() => {
    mockImportMeta.env.DEV = true;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders debug panel in development environment', () => {
    render(<DebugInfoPanel performanceMetrics={mockPerformanceMetrics} />);
    
    expect(screen.getByText('Performance Debug')).toBeInTheDocument();
    expect(screen.getByText('60')).toBeInTheDocument(); // FPS
    expect(screen.getByText('58.5')).toBeInTheDocument(); // Average FPS
    expect(screen.getByText('16.7ms')).toBeInTheDocument(); // Frame time
  });

  it('does not render in production environment', () => {
    mockImportMeta.env.DEV = false;
    
    render(<DebugInfoPanel performanceMetrics={mockPerformanceMetrics} />);
    
    expect(screen.queryByText('Performance Debug')).not.toBeInTheDocument();
  });

  it('displays performance metrics correctly', () => {
    render(<DebugInfoPanel performanceMetrics={mockPerformanceMetrics} />);
    
    // Check FPS display
    expect(screen.getByText('60')).toBeInTheDocument();
    expect(screen.getByText('58.5')).toBeInTheDocument();
    
    // Check frame time
    expect(screen.getByText('16.7ms')).toBeInTheDocument();
    
    // Check efficiency calculation (~100% for 60fps target)
    expect(screen.getByText(/100%/)).toBeInTheDocument();
    
    // Check frame count
    expect(screen.getByText('1,234')).toBeInTheDocument();
  });

  it('shows correct performance status colors for good performance', () => {
    render(<DebugInfoPanel performanceMetrics={mockPerformanceMetrics} />);
    
    expect(screen.getByText('excellent')).toBeInTheDocument();
  });

  it('shows correct performance status colors for poor performance', () => {
    render(<DebugInfoPanel performanceMetrics={mockPoorPerformanceMetrics} />);
    
    expect(screen.getByText('poor')).toBeInTheDocument();
  });

  it('toggles visibility with F3 key', () => {
    render(<DebugInfoPanel performanceMetrics={mockPerformanceMetrics} />);
    
    // Panel should be visible initially
    expect(screen.getByText('Performance Debug')).toBeInTheDocument();
    
    // Press F3 to hide
    fireEvent.keyDown(window, { key: 'F3' });
    
    // Panel should be hidden (component will unmount due to conditional rendering)
    expect(screen.queryByText('Performance Debug')).not.toBeInTheDocument();
  });

  it('toggles detailed view with F4 key', () => {
    render(<DebugInfoPanel performanceMetrics={mockPerformanceMetrics} />);
    
    // Detailed metrics should not be visible initially
    expect(screen.queryByText('Detailed Metrics')).not.toBeInTheDocument();
    
    // Press F4 to show detailed view
    fireEvent.keyDown(window, { key: 'F4' });
    
    // Detailed metrics should now be visible
    expect(screen.getByText('Detailed Metrics')).toBeInTheDocument();
    expect(screen.getByText('Runtime:')).toBeInTheDocument();
    expect(screen.getByText('Target:')).toBeInTheDocument();
    expect(screen.getByText('Delta:')).toBeInTheDocument();
  });

  it('displays keyboard shortcuts help text', () => {
    render(<DebugInfoPanel performanceMetrics={mockPerformanceMetrics} />);
    
    expect(screen.getByText('F3: Toggle | F4: Details')).toBeInTheDocument();
  });

  it('applies custom className prop', () => {
    const customClass = 'custom-debug-panel';
    const { container } = render(
      <DebugInfoPanel 
        performanceMetrics={mockPerformanceMetrics} 
        className={customClass}
      />
    );
    
    const debugPanel = container.querySelector('.custom-debug-panel');
    expect(debugPanel).toBeInTheDocument();
  });

  it('calculates efficiency correctly', () => {
    // Test with perfect 60fps (16.67ms frame time)
    const perfectMetrics: PerformanceMetrics = {
      ...mockPerformanceMetrics,
      deltaTime: 0.01667, // exactly 16.67ms
    };
    
    render(<DebugInfoPanel performanceMetrics={perfectMetrics} />);
    
    // Should show 100% efficiency
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('shows performance bar in detailed view', () => {
    render(<DebugInfoPanel performanceMetrics={mockPerformanceMetrics} />);
    
    // Toggle detailed view
    fireEvent.keyDown(window, { key: 'F4' });
    
    expect(screen.getByText('Performance')).toBeInTheDocument();
    
    // Check for performance bar elements
    const performanceBar = screen.getByText('Performance').parentElement;
    expect(performanceBar?.querySelector('.bg-gray-700')).toBeInTheDocument();
  });
});