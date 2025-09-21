import { useCallback, useEffect, useRef } from "react";
import { useDrop, type XYCoord } from "react-dnd";
import type { Identifier } from "dnd-core";

import { BLOCK_COLORS, getBlockDefinition } from "../../../game/blocks/blockCatalog";
import { useEditorStore } from "../../../stores/editorStore";
import type { DragItem } from "../../../types/editor.types";
import {
  EditorTool,
  GridCell,
} from "../../../types/editor.types";
import { calculateGridLines, getCellBounds, pointToCell } from "./gridUtils";
import styles from "./EditorCanvas.module.css";

interface EditorCanvasProps {
  onDropTargetReady?: (id: Identifier | null) => void;
}

const setLineDashSafe = (
  context: CanvasRenderingContext2D,
  segments: number[],
): void => {
  if (typeof context.setLineDash === "function") {
    context.setLineDash(segments);
  }
};

const getPointerCell = (
  event: React.PointerEvent<HTMLCanvasElement>,
  rows: number,
  cols: number,
  cellSize: number,
): GridCell | null => {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  return pointToCell(x, y, rows, cols, cellSize);
};

const EditorCanvas = ({ onDropTargetReady }: EditorCanvasProps = {}): JSX.Element => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const grid = useEditorStore((state) => state.grid);
  const dimensions = useEditorStore((state) => state.dimensions);
  const hoveredCell = useEditorStore((state) => state.hoveredCell);
  const selectedCells = useEditorStore((state) => state.selectedCells);
  const selectedTool = useEditorStore((state) => state.selectedTool);
  const selectedBlockType = useEditorStore((state) => state.selectedBlockType);
  const setHoveredCell = useEditorStore((state) => state.setHoveredCell);
  const setFocusedCell = useEditorStore((state) => state.setFocusedCell);
  const setSelectionAnchor = useEditorStore((state) => state.setSelectionAnchor);
  const selectSingleCell = useEditorStore((state) => state.selectSingleCell);
  const selectRegion = useEditorStore((state) => state.selectRegion);
  const clearSelection = useEditorStore((state) => state.clearSelection);
  const placeBlock = useEditorStore((state) => state.placeBlock);
  const removeBlock = useEditorStore((state) => state.removeBlock);
  const setSelectedBlockType = useEditorStore((state) => state.setSelectedBlockType);
  const setSelectedTool = useEditorStore((state) => state.setSelectedTool);
  const previewMode = useEditorStore((state) => state.previewMode);
  const previewPlaying = useEditorStore((state) => state.previewPlaying);
  const stopPreview = useEditorStore((state) => state.stopPreview);
  const recentAction = useEditorStore((state) => state.recentAction);

  const dragStateRef = useRef(false);
  const selectionAnchorRef = useRef<GridCell | null>(null);
  const selectionPointerIdRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const previewBallRef = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const previewPaddleRef = useRef<{ x: number; width: number } | null>(null);

  const convertOffsetToCell = useCallback(
    (offset: XYCoord | null): GridCell | null => {
      if (!offset) {
        return null;
      }

      const canvas = canvasRef.current;

      if (!canvas) {
        return null;
      }

      const rect = canvas.getBoundingClientRect();
      const x = offset.x - rect.left;
      const y = offset.y - rect.top;

      return pointToCell(
        x,
        y,
        dimensions.rows,
        dimensions.cols,
        dimensions.cellSize,
      );
    },
    [dimensions.cellSize, dimensions.cols, dimensions.rows],
  );

  const [{ isOver: isDragOver, isDragging: isDnDDragging, handlerId }, dropRef] =
    useDrop<DragItem, void, { isOver: boolean; isDragging: boolean; handlerId: Identifier | null }>(
      () => ({
        accept: "block",
        hover: (item, monitor) => {
          if (previewMode) {
            return;
          }
          dragStateRef.current = true;
          const offset = monitor.getClientOffset() ?? monitor.getSourceClientOffset();
          const cell = convertOffsetToCell(offset);
          setHoveredCell(cell);
        },
        drop: (item, monitor) => {
          if (previewMode) {
            return;
          }
          dragStateRef.current = false;

          if (monitor.didDrop()) {
            return;
          }

          const offset = monitor.getClientOffset() ?? monitor.getSourceClientOffset();
          const targetCell = convertOffsetToCell(offset);
          setHoveredCell(null);

          if (!targetCell) {
            return;
          }

          const { row, col } = targetCell;

          if (item.fromGrid) {
            const { y: sourceRow, x: sourceCol } = item.fromGrid;

            if (sourceRow !== row || sourceCol !== col) {
              removeBlock(sourceRow, sourceCol);
            }
          }

          placeBlock(row, col, item.blockType);
          setFocusedCell(targetCell);
          selectSingleCell(targetCell);
          setSelectedBlockType(item.blockType);
          setSelectedTool(EditorTool.PLACE);
        },
        collect: (monitor) => ({
          isOver: monitor.isOver({ shallow: true }),
          isDragging: Boolean(monitor.getItem()),
          handlerId: monitor.getHandlerId() ?? null,
        }),
      }),
      [
        convertOffsetToCell,
        placeBlock,
        removeBlock,
        setFocusedCell,
        setHoveredCell,
        selectSingleCell,
        setSelectedBlockType,
        setSelectedTool,
        previewMode,
      ],
    );

  useEffect(() => {
    onDropTargetReady?.(handlerId ?? null);
  }, [handlerId, onDropTargetReady]);

  useEffect(() => {
    if (!isDragOver && !isDnDDragging && dragStateRef.current) {
      dragStateRef.current = false;
      setHoveredCell(null);
    }
  }, [isDragOver, isDnDDragging, setHoveredCell]);

  useEffect(() => {
    if (previewMode) {
      setHoveredCell(null);
      setSelectionAnchor(null);
      selectionAnchorRef.current = null;
      selectionPointerIdRef.current = null;
      if (previewPaddleRef.current === null) {
        const paddleWidth = Math.max(3, Math.floor(dimensions.cols / 5));
        const paddleX = (dimensions.cols - paddleWidth) / 2;
        previewPaddleRef.current = {
          x: paddleX,
          width: paddleWidth,
        };
      }
      previewBallRef.current = {
        x: dimensions.cols / 2,
        y: dimensions.rows - 4,
        vx: 0.12,
        vy: -0.18,
      };
    } else {
      stopPreview();
      previewBallRef.current = null;
    }
  }, [
    dimensions.cols,
    dimensions.rows,
    previewMode,
    setHoveredCell,
    setSelectionAnchor,
    stopPreview,
  ]);

  const assignCanvasRef = useCallback(
    (node: HTMLCanvasElement | null) => {
      canvasRef.current = node;
      dropRef(node);
    },
    [dropRef],
  );

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const { rows, cols, cellSize } = dimensions;
    const pixelRatio = window.devicePixelRatio ?? 1;

    canvas.width = cols * cellSize * pixelRatio;
    canvas.height = rows * cellSize * pixelRatio;
    canvas.style.width = `${cols * cellSize}px`;
    canvas.style.height = `${rows * cellSize}px`;

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    if (typeof context.resetTransform === "function") {
      context.resetTransform();
    } else if (typeof context.setTransform === "function") {
      context.setTransform(1, 0, 0, 1, 0, 0);
    }
    if (typeof context.scale === "function") {
      context.scale(pixelRatio, pixelRatio);
    }

    context.fillStyle = "#0f172a";
    context.fillRect(0, 0, cols * cellSize, rows * cellSize);

    const { horizontal, vertical } = calculateGridLines(rows, cols, cellSize);
    context.strokeStyle = "rgba(148, 163, 184, 0.35)";
    context.lineWidth = 1;

    const previewDefinition = getBlockDefinition(selectedBlockType);

    horizontal.forEach((y) => {
      context.beginPath();
      context.moveTo(0, y + 0.5);
      context.lineTo(cols * cellSize, y + 0.5);
      context.stroke();
    });

    vertical.forEach((x) => {
      context.beginPath();
      context.moveTo(x + 0.5, 0);
      context.lineTo(x + 0.5, rows * cellSize);
      context.stroke();
    });

    grid.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        if (!cell) {
          return;
        }

        const { x, y, size } = getCellBounds(rowIndex, colIndex, cellSize);
        context.fillStyle = BLOCK_COLORS[cell.type];
        context.fillRect(x + 1, y + 1, size - 2, size - 2);
      });
    });

    if (recentAction && Date.now() - recentAction.timestamp < 240) {
      const elapsed = Date.now() - recentAction.timestamp;
      const fade = 1 - elapsed / 240;
      const { x, y, size } = getCellBounds(recentAction.row, recentAction.col, cellSize);
      context.save();
      context.globalAlpha = Math.max(0, fade);
      context.fillStyle = recentAction.action === "place" ? "#38bdf8" : "#f87171";
      context.fillRect(x + 1, y + 1, size - 2, size - 2);
      context.restore();
    }

    if (selectedCells.length > 0) {
      context.save();
      context.strokeStyle = "#38bdf8";
      context.lineWidth = 2;
      setLineDashSafe(context, [6, 4]);

      selectedCells.forEach((cell) => {
        const { x, y, size } = getCellBounds(cell.row, cell.col, cellSize);
        context.strokeRect(x + 1, y + 1, size - 2, size - 2);
      });

      setLineDashSafe(context, []);
      context.restore();
    }

    if (hoveredCell && !previewMode) {
      const { x, y, size } = getCellBounds(
        hoveredCell.row,
        hoveredCell.col,
        cellSize,
      );

      context.save();
      context.strokeStyle = "rgba(148, 163, 184, 0.35)";
      context.lineWidth = 1;
      setLineDashSafe(context, [3, 3]);
      context.strokeRect(0.5, y + 0.5, cols * cellSize - 1, size - 1);
      context.strokeRect(x + 0.5, 0.5, size - 1, rows * cellSize - 1);
      setLineDashSafe(context, []);
      context.restore();

      const occupied = Boolean(grid[hoveredCell.row]?.[hoveredCell.col]);

      if (selectedTool === EditorTool.ERASE) {
        context.strokeStyle = "#f87171";
        context.lineWidth = 2;
        setLineDashSafe(context, [6, 4]);
        context.strokeRect(x + 1, y + 1, size - 2, size - 2);
        setLineDashSafe(context, []);
      } else if (selectedTool === EditorTool.SELECT) {
        context.strokeStyle = "#f8fafc";
        context.lineWidth = 2;
        context.strokeRect(x + 1, y + 1, size - 2, size - 2);
      } else {
        context.save();
        context.globalAlpha = occupied ? 0.25 : 0.45;
        context.fillStyle = occupied ? "#f87171" : previewDefinition.visual.color;
        context.fillRect(x + 2, y + 2, size - 4, size - 4);
        context.restore();

        context.strokeStyle = occupied
          ? "#f87171"
          : previewDefinition.visual.accentColor;
        context.lineWidth = 2;
        setLineDashSafe(context, [4, 3]);
        context.strokeRect(x + 1.5, y + 1.5, size - 3, size - 3);
        setLineDashSafe(context, []);
      }
    }

    if (previewMode) {
      const cellSizePx = cellSize;
      const paddle = previewPaddleRef.current;

      if (paddle) {
        const paddleWidthPx = paddle.width * cellSizePx;
        const paddleHeightPx = Math.max(8, cellSizePx / 4);
        const paddleX = paddle.x * cellSizePx;
        const paddleY = rows * cellSizePx - paddleHeightPx * 2;

        context.fillStyle = "#38bdf8";
        context.fillRect(paddleX, paddleY, paddleWidthPx, paddleHeightPx);
      }

      const ball = previewBallRef.current;

      if (ball) {
        const radius = Math.max(6, cellSizePx * 0.3);
        context.fillStyle = "#facc15";
        context.beginPath();
        context.arc(ball.x * cellSizePx, ball.y * cellSizePx, radius, 0, Math.PI * 2);
        context.fill();
      }
    }
  }, [
    dimensions,
    grid,
    hoveredCell,
    previewMode,
    recentAction,
    selectedCells,
    selectedTool,
    selectedBlockType,
  ]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  useEffect(() => {
    if (!previewMode || !previewPlaying) {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const step = () => {
      const ball = previewBallRef.current;
      const paddle = previewPaddleRef.current;

      if (!ball || !paddle) {
        animationFrameRef.current = requestAnimationFrame(step);
        drawCanvas();
        return;
      }

      const speedScale = dimensions.cellSize / 32;
      ball.x += ball.vx * speedScale;
      ball.y += ball.vy * speedScale;

      const maxX = dimensions.cols - 0.5;
      const minX = 0.5;
      const maxY = dimensions.rows - 0.5;
      const minY = 0.5;

      if (ball.x <= minX || ball.x >= maxX) {
        ball.vx *= -1;
        ball.x = Math.min(Math.max(ball.x, minX), maxX);
      }

      if (ball.y <= minY) {
        ball.vy *= -1;
        ball.y = minY;
      }

      const paddleTop = dimensions.rows - 2;
      const paddleLeft = paddle.x;
      const paddleRight = paddle.x + paddle.width;

      if (ball.y >= paddleTop && ball.x >= paddleLeft && ball.x <= paddleRight) {
        ball.vy = -Math.abs(ball.vy);
        const offset = (ball.x - (paddleLeft + paddle.width / 2)) / (paddle.width / 2);
        ball.vx = offset * 0.2;
        ball.y = paddleTop;
      }

      if (ball.y >= maxY) {
        ball.y = maxY - 1;
        ball.vy = -Math.abs(ball.vy);
      }

      drawCanvas();
      animationFrameRef.current = requestAnimationFrame(step);
    };

    animationFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [dimensions.cellSize, dimensions.cols, dimensions.rows, drawCanvas, previewMode, previewPlaying]);

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (previewMode) {
        return;
      }

      if (dragStateRef.current) {
        return;
      }

      const cell = getPointerCell(
        event,
        dimensions.rows,
        dimensions.cols,
        dimensions.cellSize,
      );

      if (
        selectedTool === EditorTool.SELECT &&
        selectionPointerIdRef.current === event.pointerId &&
        selectionAnchorRef.current &&
        cell
      ) {
        selectRegion(selectionAnchorRef.current, cell);
      }

      setHoveredCell(cell);
    },
    [
      dimensions.cols,
      dimensions.cellSize,
      dimensions.rows,
      previewMode,
      selectRegion,
      selectedTool,
      setHoveredCell,
    ],
  );

  const handlePointerLeave = useCallback(() => {
    if (previewMode || dragStateRef.current) {
      return;
    }

    setHoveredCell(null);
  }, [previewMode, setHoveredCell]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      event.preventDefault();

      if (previewMode) {
        return;
      }

      dragStateRef.current = false;

      const cell = getPointerCell(
        event,
        dimensions.rows,
        dimensions.cols,
        dimensions.cellSize,
      );

      if (!cell) {
        setHoveredCell(null);
        if (selectedTool === EditorTool.SELECT) {
          clearSelection();
          setSelectionAnchor(null);
          selectionAnchorRef.current = null;
          selectionPointerIdRef.current = null;
        }
        return;
      }

      setFocusedCell(cell);
      setHoveredCell(cell);

      if (selectedTool === EditorTool.ERASE) {
        removeBlock(cell.row, cell.col);
        return;
      }

      if (selectedTool === EditorTool.SELECT) {
        event.currentTarget.setPointerCapture(event.pointerId);
        selectionPointerIdRef.current = event.pointerId;
        selectionAnchorRef.current = cell;
        setSelectionAnchor(cell);

        const block = grid[cell.row]?.[cell.col];

        if (block) {
          selectSingleCell(cell);
        } else {
          clearSelection();
        }

        return;
      }

      placeBlock(cell.row, cell.col, selectedBlockType);
    },
    [
      dimensions.rows,
      dimensions.cols,
      dimensions.cellSize,
      clearSelection,
      grid,
      placeBlock,
      removeBlock,
      selectSingleCell,
      selectedTool,
      setSelectionAnchor,
      selectedBlockType,
      setFocusedCell,
      setHoveredCell,
      previewMode,
    ],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (previewMode) {
        return;
      }

      if (
        selectedTool === EditorTool.SELECT &&
        selectionPointerIdRef.current === event.pointerId
      ) {
        event.currentTarget.releasePointerCapture(event.pointerId);
        selectionPointerIdRef.current = null;

        const anchor = selectionAnchorRef.current;
        const cell = getPointerCell(
          event,
          dimensions.rows,
          dimensions.cols,
          dimensions.cellSize,
        );

        selectionAnchorRef.current = null;

        const hasSelection = selectedCells.length > 0;

        if (!cell) {
          if (anchor && grid[anchor.row]?.[anchor.col]) {
            selectSingleCell(anchor);
          } else {
            clearSelection();
          }
        } else if (!grid[cell.row]?.[cell.col] && !hasSelection) {
          if (anchor && grid[anchor.row]?.[anchor.col]) {
            selectSingleCell(anchor);
          } else if (!grid[cell.row]?.[cell.col]) {
            clearSelection();
          }
        }

        setHoveredCell(cell ?? null);
      }

      dragStateRef.current = false;
    },
    [
      clearSelection,
      dimensions.cellSize,
      dimensions.cols,
      dimensions.rows,
      grid,
      selectSingleCell,
      selectedCells,
      selectedTool,
      setHoveredCell,
      previewMode,
    ],
  );

  const handlePointerCancel = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (selectionPointerIdRef.current === event.pointerId) {
        event.currentTarget.releasePointerCapture(event.pointerId);
        selectionPointerIdRef.current = null;
        selectionAnchorRef.current = null;
      }

      dragStateRef.current = false;
    },
    [],
  );

  return (
    <div
      className={styles.canvasWrapper}
      data-testid="editor-canvas-wrapper"
      data-drag-over={isDragOver ? "true" : undefined}
    >
      <canvas
        ref={assignCanvasRef}
        className={styles.canvas}
        role="img"
        aria-label="Level editor canvas"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onContextMenu={(event) => event.preventDefault()}
        data-testid="editor-canvas"
        data-drop-target-id={handlerId ? handlerId.toString() : undefined}
        data-preview-mode={previewMode ? "true" : undefined}
      />
    </div>
  );
};

export default EditorCanvas;
