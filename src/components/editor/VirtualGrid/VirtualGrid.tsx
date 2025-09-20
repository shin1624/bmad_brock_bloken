import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { DEFAULT_EDITOR_CONFIG, GridPosition, BlockData } from '../../../types/editor.types';
import styles from './VirtualGrid.module.css';

interface VirtualGridProps {
  grid: (BlockData | null)[][];
  cellSize?: number;
  onCellClick?: (position: GridPosition) => void;
  onCellHover?: (position: GridPosition | null) => void;
  renderCell: (position: GridPosition, data: BlockData | null) => React.ReactNode;
  viewportWidth: number;
  viewportHeight: number;
}

export const VirtualGrid: React.FC<VirtualGridProps> = ({
  grid,
  cellSize = DEFAULT_EDITOR_CONFIG.cellSize,
  onCellClick,
  onCellHover,
  renderCell,
  viewportWidth,
  viewportHeight,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState({ x: 0, y: 0 });
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  const gridHeight = grid.length;
  const gridWidth = grid[0]?.length || 0;

  // Calculate visible range with buffer
  const visibleRange = useMemo(() => {
    const buffer = DEFAULT_EDITOR_CONFIG.virtualScrollBuffer;
    const startRow = Math.max(0, Math.floor(scrollPosition.y / cellSize) - buffer);
    const endRow = Math.min(
      gridHeight,
      Math.ceil((scrollPosition.y + viewportHeight) / cellSize) + buffer
    );
    const startCol = Math.max(0, Math.floor(scrollPosition.x / cellSize) - buffer);
    const endCol = Math.min(
      gridWidth,
      Math.ceil((scrollPosition.x + viewportWidth) / cellSize) + buffer
    );

    return { startRow, endRow, startCol, endCol };
  }, [scrollPosition, cellSize, viewportWidth, viewportHeight, gridHeight, gridWidth]);

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    setScrollPosition({
      x: target.scrollLeft,
      y: target.scrollTop,
    });

    // Set scrolling flag for performance optimization
    setIsScrolling(true);
    clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);
  }, []);

  // Calculate total grid size
  const totalSize = useMemo(() => ({
    width: gridWidth * cellSize,
    height: gridHeight * cellSize,
  }), [gridWidth, gridHeight, cellSize]);

  // Render only visible cells
  const visibleCells = useMemo(() => {
    const cells = [];
    const { startRow, endRow, startCol, endCol } = visibleRange;

    for (let row = startRow; row < endRow; row++) {
      for (let col = startCol; col < endCol; col++) {
        const position = { x: col, y: row };
        const cellData = grid[row]?.[col] || null;

        cells.push(
          <div
            key={`${row}-${col}`}
            className={styles.cell}
            style={{
              position: 'absolute',
              left: col * cellSize,
              top: row * cellSize,
              width: cellSize,
              height: cellSize,
              pointerEvents: isScrolling ? 'none' : 'auto',
            }}
            onClick={() => !isScrolling && onCellClick?.(position)}
            onMouseEnter={() => !isScrolling && onCellHover?.(position)}
            onMouseLeave={() => !isScrolling && onCellHover?.(null)}
          >
            {renderCell(position, cellData)}
          </div>
        );
      }
    }

    return cells;
  }, [visibleRange, grid, cellSize, isScrolling, renderCell, onCellClick, onCellHover]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={styles.container}
      style={{
        width: viewportWidth,
        height: viewportHeight,
        overflow: 'auto',
        position: 'relative',
      }}
      onScroll={handleScroll}
    >
      {/* Virtual spacer to maintain scrollbar */}
      <div
        style={{
          width: totalSize.width,
          height: totalSize.height,
          position: 'relative',
        }}
      >
        {/* Render only visible cells */}
        {visibleCells}

        {/* Grid lines (optional, can be optimized further) */}
        {!isScrolling && (
          <svg
            className={styles.gridLines}
            style={{
              position: 'absolute',
              left: visibleRange.startCol * cellSize,
              top: visibleRange.startRow * cellSize,
              width: (visibleRange.endCol - visibleRange.startCol) * cellSize,
              height: (visibleRange.endRow - visibleRange.startRow) * cellSize,
              pointerEvents: 'none',
            }}
          >
            {/* Vertical lines */}
            {Array.from({ length: visibleRange.endCol - visibleRange.startCol + 1 }).map((_, i) => (
              <line
                key={`v-${i}`}
                x1={i * cellSize}
                y1={0}
                x2={i * cellSize}
                y2={(visibleRange.endRow - visibleRange.startRow) * cellSize}
                stroke="#e0e0e0"
                strokeWidth="1"
              />
            ))}
            {/* Horizontal lines */}
            {Array.from({ length: visibleRange.endRow - visibleRange.startRow + 1 }).map((_, i) => (
              <line
                key={`h-${i}`}
                x1={0}
                y1={i * cellSize}
                x2={(visibleRange.endCol - visibleRange.startCol) * cellSize}
                y2={i * cellSize}
                stroke="#e0e0e0"
                strokeWidth="1"
              />
            ))}
          </svg>
        )}
      </div>
    </div>
  );
};
