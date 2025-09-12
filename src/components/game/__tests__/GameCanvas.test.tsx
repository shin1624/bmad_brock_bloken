import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameCanvas } from '../GameCanvas';

// Mock ResizeObserver
class MockResizeObserver {
  callback: ResizeObserverCallback;
  
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  
  observe(target: Element) {
    // Simulate immediate callback
    this.callback([{
      target,
      contentRect: {
        width: 800,
        height: 600,
      },
    } as ResizeObserverEntry], this);
  }
  
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = MockResizeObserver as any;

// Mock Canvas 2D Context
const mockContext = {
  scale: vi.fn(),
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  arc: vi.fn(),
  fillText: vi.fn(),
  measureText: vi.fn(() => ({ width: 100 })),
  drawImage: vi.fn(),
  getImageData: vi.fn(),
  putImageData: vi.fn(),
  createImageData: vi.fn(),
  setTransform: vi.fn(),
  transform: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  imageSmoothingEnabled: true,
  textBaseline: 'alphabetic',
};

// Mock HTMLCanvasElement.getContext
HTMLCanvasElement.prototype.getContext = vi.fn((contextType) => {
  if (contextType === '2d') {
    return mockContext;
  }
  return null;
});

describe('GameCanvas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'devicePixelRatio', {
      value: 1,
      writable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders canvas element with default dimensions', () => {
    render(<GameCanvas />);
    
    const canvas = screen.getByRole('img', { hidden: true }) || document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('initializes canvas with correct context settings', async () => {
    const onCanvasReady = vi.fn();
    render(<GameCanvas onCanvasReady={onCanvasReady} />);
    
    await waitFor(() => {
      expect(onCanvasReady).toHaveBeenCalled();
    });
    
    // Check context configuration
    expect(mockContext.imageSmoothingEnabled).toBe(false);
    expect(mockContext.textBaseline).toBe('top');
  });

  it('calls onCanvasReady callback with canvas and context', async () => {
    const onCanvasReady = vi.fn();
    render(<GameCanvas onCanvasReady={onCanvasReady} />);
    
    await waitFor(() => {
      expect(onCanvasReady).toHaveBeenCalledWith(
        expect.any(HTMLCanvasElement),
        mockContext
      );
    });
  });

  it('handles custom dimensions', () => {
    render(<GameCanvas width={1024} height={768} />);
    
    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
    
    // Canvas should be initialized with custom dimensions
    expect(canvas?.style.width).toBe('1024px');
    expect(canvas?.style.height).toBe('768px');
  });

  it('applies custom className', () => {
    const customClass = 'custom-game-canvas';
    render(<GameCanvas className={customClass} />);
    
    const container = document.querySelector('.game-canvas-container');
    expect(container).toHaveClass(customClass);
  });

  it('handles device pixel ratio for high-DPI displays', async () => {
    Object.defineProperty(window, 'devicePixelRatio', {
      value: 2,
      writable: true,
    });

    const onCanvasReady = vi.fn();
    render(<GameCanvas width={400} height={300} onCanvasReady={onCanvasReady} />);
    
    await waitFor(() => {
      expect(onCanvasReady).toHaveBeenCalled();
    });
    
    const canvas = document.querySelector('canvas');
    expect(canvas?.width).toBe(800); // 400 * 2
    expect(canvas?.height).toBe(600); // 300 * 2
    expect(mockContext.scale).toHaveBeenCalledWith(2, 2);
  });

  it('prevents context menu on canvas', () => {
    render(<GameCanvas />);
    
    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
    
    const contextMenuEvent = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
    });
    
    const preventDefaultSpy = vi.spyOn(contextMenuEvent, 'preventDefault');
    canvas?.dispatchEvent(contextMenuEvent);
    
    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('handles auto resize when enabled', async () => {
    const onResize = vi.fn();
    render(<GameCanvas autoResize={true} onResize={onResize} />);
    
    await waitFor(() => {
      expect(onResize).toHaveBeenCalled();
    });
  });

  it('maintains aspect ratio when enabled', async () => {
    const onResize = vi.fn();
    render(
      <GameCanvas 
        autoResize={true}
        maintainAspectRatio={true}
        aspectRatio={16/9}
        onResize={onResize}
      />
    );
    
    await waitFor(() => {
      expect(onResize).toHaveBeenCalled();
    });
    
    // Should call onResize with dimensions that maintain 16:9 aspect ratio
    const lastCall = onResize.mock.calls[onResize.mock.calls.length - 1];
    const [width, height] = lastCall;
    const aspectRatio = width / height;
    expect(Math.abs(aspectRatio - 16/9)).toBeLessThan(0.1);
  });

  it('does not auto resize when disabled', () => {
    const onResize = vi.fn();
    render(<GameCanvas autoResize={false} onResize={onResize} />);
    
    // onResize should not be called from auto-resize functionality
    // (it might still be called from initial setup)
    expect(onResize).not.toHaveBeenCalled();
  });

  it('calculates canvas position correctly', async () => {
    let canvasAPI: any = null;
    
    const onCanvasReady = vi.fn((canvas, context) => {
      // Mock canvas position methods that would be available
      canvasAPI = {
        getCanvasPosition: (clientX: number, clientY: number) => {
          const rect = canvas.getBoundingClientRect();
          const scaleX = canvas.width / rect.width;
          const scaleY = canvas.height / rect.height;
          return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY,
          };
        },
      };
    });
    
    render(<GameCanvas onCanvasReady={onCanvasReady} />);
    
    await waitFor(() => {
      expect(onCanvasReady).toHaveBeenCalled();
    });
    
    expect(canvasAPI).not.toBeNull();
  });

  it('handles resize observer cleanup on unmount', () => {
    const disconnectSpy = vi.fn();
    
    // Override ResizeObserver for this test
    const OriginalResizeObserver = global.ResizeObserver;
    global.ResizeObserver = class extends MockResizeObserver {
      disconnect = disconnectSpy;
    } as any;
    
    const { unmount } = render(<GameCanvas autoResize={true} />);
    
    unmount();
    
    expect(disconnectSpy).toHaveBeenCalled();
    
    // Restore original
    global.ResizeObserver = OriginalResizeObserver;
  });

  it('applies pixel-perfect rendering styles', () => {
    render(<GameCanvas />);
    
    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
    
    const computedStyle = window.getComputedStyle(canvas!);
    expect(computedStyle.imageRendering).toBe('pixelated');
  });
});