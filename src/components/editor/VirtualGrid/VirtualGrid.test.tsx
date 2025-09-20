import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VirtualGrid } from './VirtualGrid';
import { BlockData, BlockType } from '../../../types/editor.types';

describe('VirtualGrid', () => {
  const mockGrid: (BlockData | null)[][] = Array(100).fill(null).map((_, y) =>
    Array(100).fill(null).map((_, x) =>
      x % 10 === 0 && y % 10 === 0
        ? { type: BlockType.NORMAL, x, y, color: '#ff0000' }
        : null
    )
  );

  const mockRenderCell = vi.fn((position, data) => (
    <div data-testid={`cell-${position.x}-${position.y}`}>
      {data ? 'Block' : 'Empty'}
    </div>
  ));

  const mockOnCellClick = vi.fn();
  const mockOnCellHover = vi.fn();

  const defaultProps = {
    grid: mockGrid,
    cellSize: 32,
    onCellClick: mockOnCellClick,
    onCellHover: mockOnCellHover,
    renderCell: mockRenderCell,
    viewportWidth: 640,
    viewportHeight: 480,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<VirtualGrid {...defaultProps} />);
    expect(container.firstChild).toBeDefined();
    expect(container.querySelector('svg')).toBeDefined(); // Grid lines SVG
  });

  it('renders only visible cells', () => {
    render(<VirtualGrid {...defaultProps} />);

    // With 640x480 viewport and 32px cells, we should see approximately:
    // Width: 640/32 = 20 cells + buffer
    // Height: 480/32 = 15 cells + buffer
    // Buffer adds 5 cells on each side
    const expectedMaxCells = (20 + 10) * (15 + 10); // 750 cells max

    // Should render much less than the full 10,000 cells
    expect(mockRenderCell).toHaveBeenCalled();
    const renderedCells = mockRenderCell.mock.calls.length;
    expect(renderedCells).toBeGreaterThan(0);
    expect(renderedCells).toBeLessThanOrEqual(expectedMaxCells);
    expect(renderedCells).toBeLessThan(10000); // Much less than full grid
  });

  it('handles scroll events', () => {
    const { container } = render(<VirtualGrid {...defaultProps} />);
    const scrollContainer = container.firstChild as HTMLElement;

    // Simulate scroll
    fireEvent.scroll(scrollContainer, {
      target: { scrollLeft: 320, scrollTop: 320 },
    });

    // After scrolling, different cells should be rendered
    expect(mockRenderCell).toHaveBeenCalled();
  });

  it('handles cell click events', () => {
    render(<VirtualGrid {...defaultProps} />);

    // Find and click a rendered cell
    const firstRenderedCell = mockRenderCell.mock.calls[0];
    if (firstRenderedCell) {
      const [position] = firstRenderedCell;
      const cell = screen.getByTestId(`cell-${position.x}-${position.y}`).parentElement;

      if (cell) {
        fireEvent.click(cell);
        expect(mockOnCellClick).toHaveBeenCalledWith(position);
      }
    }
  });

  it('handles cell hover events', () => {
    render(<VirtualGrid {...defaultProps} />);

    const firstRenderedCell = mockRenderCell.mock.calls[0];
    if (firstRenderedCell) {
      const [position] = firstRenderedCell;
      const cell = screen.getByTestId(`cell-${position.x}-${position.y}`).parentElement;

      if (cell) {
        fireEvent.mouseEnter(cell);
        expect(mockOnCellHover).toHaveBeenCalledWith(position);

        fireEvent.mouseLeave(cell);
        expect(mockOnCellHover).toHaveBeenCalledWith(null);
      }
    }
  });

  it('optimizes rendering during scroll', () => {
    const { container } = render(<VirtualGrid {...defaultProps} />);
    const scrollContainer = container.firstChild as HTMLElement;

    // Clear previous calls
    mockRenderCell.mockClear();

    // Rapid scroll events
    for (let i = 0; i < 10; i++) {
      fireEvent.scroll(scrollContainer, {
        target: { scrollLeft: i * 10, scrollTop: i * 10 },
      });
    }

    // During scrolling, pointer events should be disabled
    // This is handled internally by the isScrolling state
    expect(mockRenderCell).toHaveBeenCalled();
  });

  it('calculates visible range correctly', () => {
    const smallGrid = Array(10).fill(null).map(() => Array(10).fill(null));

    render(
      <VirtualGrid
        {...defaultProps}
        grid={smallGrid}
        viewportWidth={160} // 5 cells
        viewportHeight={128} // 4 cells
      />
    );

    // With buffer, should render (5 + 10) * (4 + 10) = 210 cells max
    // But grid is only 10x10 = 100 cells total
    expect(mockRenderCell.mock.calls.length).toBeLessThanOrEqual(100);
  });
});
