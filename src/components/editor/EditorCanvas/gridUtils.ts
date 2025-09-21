import { GridCell } from "../../../types/editor.types";

type GridLines = {
  horizontal: number[];
  vertical: number[];
};

const clamp = (value: number, min: number, max: number): number => {
  if (value < min) {
    return min;
  }

  if (value > max) {
    return max;
  }

  return value;
};

export const calculateGridLines = (
  rows: number,
  cols: number,
  cellSize: number,
): GridLines => {
  const safeRows = Math.max(1, rows);
  const safeCols = Math.max(1, cols);
  const safeCellSize = Math.max(1, cellSize);

  const horizontal: number[] = [];
  const vertical: number[] = [];

  for (let row = 0; row <= safeRows; row += 1) {
    horizontal.push(row * safeCellSize);
  }

  for (let col = 0; col <= safeCols; col += 1) {
    vertical.push(col * safeCellSize);
  }

  return { horizontal, vertical };
};

export const pointToCell = (
  x: number,
  y: number,
  rows: number,
  cols: number,
  cellSize: number,
): GridCell | null => {
  if (cellSize <= 0) {
    return null;
  }

  const col = Math.floor(x / cellSize);
  const row = Math.floor(y / cellSize);

  if (row < 0 || col < 0 || row >= rows || col >= cols) {
    return null;
  }

  return { row, col };
};

export const getCellBounds = (
  row: number,
  col: number,
  cellSize: number,
): { x: number; y: number; size: number } => {
  const safeSize = Math.max(1, cellSize);
  const safeRow = clamp(row, 0, Number.MAX_SAFE_INTEGER);
  const safeCol = clamp(col, 0, Number.MAX_SAFE_INTEGER);

  return {
    x: safeCol * safeSize,
    y: safeRow * safeSize,
    size: safeSize,
  };
};
