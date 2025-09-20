import React, { useRef, useEffect, useState, useCallback } from "react";

interface GameCanvasProps {
  width?: number;
  height?: number;
  className?: string;
  onCanvasReady?: (
    canvas: HTMLCanvasElement,
    context: CanvasRenderingContext2D,
  ) => void;
  onResize?: (width: number, height: number) => void;
  autoResize?: boolean;
  maintainAspectRatio?: boolean;
  aspectRatio?: number;
}

/**
 * GameCanvas component that provides a managed Canvas element for game rendering
 * Handles canvas initialization, context setup, and responsive resizing
 */
export function GameCanvas({
  width = 800,
  height = 600,
  className = "",
  onCanvasReady,
  onResize,
  autoResize = true,
  maintainAspectRatio = false,
  aspectRatio = 16 / 9,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width, height });
  const [isReady, setIsReady] = useState(false);

  // Update canvas size and handle pixel ratio for crisp rendering
  const updateCanvasSize = useCallback(
    (newWidth: number, newHeight: number) => {
      const canvas = canvasRef.current;
      const context = contextRef.current;
      if (!canvas || !context) return;

      // Get device pixel ratio for high-DPI displays
      const devicePixelRatio = window.devicePixelRatio || 1;

      // Set actual canvas size in memory
      canvas.width = newWidth * devicePixelRatio;
      canvas.height = newHeight * devicePixelRatio;

      // Set display size using CSS
      canvas.style.width = `${newWidth}px`;
      canvas.style.height = `${newHeight}px`;

      // Scale the drawing context to match device pixel ratio
      context.scale(devicePixelRatio, devicePixelRatio);

      // Restore context settings after resize
      context.imageSmoothingEnabled = false;
      context.textBaseline = "top";

      setCanvasSize({ width: newWidth, height: newHeight });

      // Notify parent of size change
      if (onResize) {
        onResize(newWidth, newHeight);
      }
    },
    [onResize],
  );

  // Initialize canvas and context
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Get 2D rendering context
    const context = canvas.getContext("2d");
    if (!context) {
      console.error("Failed to get 2D rendering context");
      return;
    }

    contextRef.current = context;

    // Configure context for optimal game rendering
    context.imageSmoothingEnabled = false; // Crisp pixel art rendering
    context.textBaseline = "top";

    // Set initial canvas size
    updateCanvasSize(canvasSize.width, canvasSize.height);

    setIsReady(true);

    // Notify parent component that canvas is ready
    if (onCanvasReady) {
      onCanvasReady(canvas, context);
    }
  }, [canvasSize.width, canvasSize.height, onCanvasReady, updateCanvasSize]);

  // Handle window resize for responsive canvas
  useEffect(() => {
    if (!autoResize) return;

    const handleResize = () => {
      const container = containerRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      let newWidth = containerRect.width;
      let newHeight = containerRect.height;

      // Maintain aspect ratio if requested
      if (maintainAspectRatio) {
        const containerAspectRatio = newWidth / newHeight;

        if (containerAspectRatio > aspectRatio) {
          // Container is wider than target aspect ratio
          newWidth = newHeight * aspectRatio;
        } else {
          // Container is taller than target aspect ratio
          newHeight = newWidth / aspectRatio;
        }
      }

      updateCanvasSize(Math.floor(newWidth), Math.floor(newHeight));
    };

    // Set up resize observer for more accurate resize detection
    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Initial resize
    handleResize();

    return () => {
      resizeObserver.disconnect();
    };
  }, [autoResize, maintainAspectRatio, aspectRatio, updateCanvasSize]);

  // Prevent context menu on canvas (common for games)
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  // Get canvas position for mouse/touch event handling
  const getCanvasPosition = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);

  // Expose useful methods via ref (using imperativeHandle if needed)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const canvasApi = {
    getCanvas: () => canvasRef.current,
    getContext: () => contextRef.current,
    getCanvasPosition,
    updateSize: updateCanvasSize,
    isReady,
    size: canvasSize,
  };

  return (
    <div
      ref={containerRef}
      className={`game-canvas-container ${className}`}
      style={{
        width: autoResize ? "100%" : `${width}px`,
        height: autoResize ? "100%" : `${height}px`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <canvas
        ref={canvasRef}
        className="game-canvas"
        onContextMenu={handleContextMenu}
        style={{
          display: "block",
          imageRendering: "pixelated", // For pixel art games and crisp edges
        }}
      />
    </div>
  );
}

// Export canvas API type for TypeScript
export type GameCanvasAPI = {
  getCanvas: () => HTMLCanvasElement | null;
  getContext: () => CanvasRenderingContext2D | null;
  getCanvasPosition: (
    clientX: number,
    clientY: number,
  ) => { x: number; y: number };
  updateSize: (width: number, height: number) => void;
  isReady: boolean;
  size: { width: number; height: number };
};

export default GameCanvas;
