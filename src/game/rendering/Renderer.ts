/**
 * Renderer - Basic Canvas 2D rendering system with viewport management
 */
export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;

  // Viewport properties
  private viewportX: number = 0;
  private viewportY: number = 0;
  private viewportScale: number = 1;

  // Background color
  private backgroundColor: string = '#000000';

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Could not get 2D rendering context');
    }

    this.ctx = context;
    this.width = canvas.width;
    this.height = canvas.height;

    // Set default rendering properties
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
  }

  /**
   * Clear the entire canvas
   */
  clear(): void {
    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  /**
   * Set background color
   */
  setBackgroundColor(color: string): void {
    this.backgroundColor = color;
  }

  /**
   * Update canvas size (called on resize)
   */
  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
  }

  /**
   * Set viewport position and scale
   */
  setViewport(x: number, y: number, scale: number = 1): void {
    this.viewportX = x;
    this.viewportY = y;
    this.viewportScale = scale;
  }

  /**
   * Transform world coordinates to screen coordinates
   */
  private transformToScreen(x: number, y: number): { x: number; y: number } {
    return {
      x: (x - this.viewportX) * this.viewportScale,
      y: (y - this.viewportY) * this.viewportScale,
    };
  }

  /**
   * Draw a filled rectangle
   */
  fillRect(
    x: number,
    y: number,
    width: number,
    height: number,
    color: string
  ): void {
    const screenPos = this.transformToScreen(x, y);
    const screenWidth = width * this.viewportScale;
    const screenHeight = height * this.viewportScale;

    this.ctx.fillStyle = color;
    this.ctx.fillRect(screenPos.x, screenPos.y, screenWidth, screenHeight);
  }

  /**
   * Draw a stroked rectangle
   */
  strokeRect(
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
    lineWidth: number = 1
  ): void {
    const screenPos = this.transformToScreen(x, y);
    const screenWidth = width * this.viewportScale;
    const screenHeight = height * this.viewportScale;

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
    this.ctx.strokeRect(screenPos.x, screenPos.y, screenWidth, screenHeight);
  }

  /**
   * Draw a filled circle
   */
  fillCircle(x: number, y: number, radius: number, color: string): void {
    const screenPos = this.transformToScreen(x, y);
    const screenRadius = radius * this.viewportScale;

    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(screenPos.x, screenPos.y, screenRadius, 0, 2 * Math.PI);
    this.ctx.fill();
  }

  /**
   * Draw a stroked circle
   */
  strokeCircle(
    x: number,
    y: number,
    radius: number,
    color: string,
    lineWidth: number = 1
  ): void {
    const screenPos = this.transformToScreen(x, y);
    const screenRadius = radius * this.viewportScale;

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
    this.ctx.beginPath();
    this.ctx.arc(screenPos.x, screenPos.y, screenRadius, 0, 2 * Math.PI);
    this.ctx.stroke();
  }

  /**
   * Draw a line between two points
   */
  drawLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    lineWidth: number = 1
  ): void {
    const screenPos1 = this.transformToScreen(x1, y1);
    const screenPos2 = this.transformToScreen(x2, y2);

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
    this.ctx.beginPath();
    this.ctx.moveTo(screenPos1.x, screenPos1.y);
    this.ctx.lineTo(screenPos2.x, screenPos2.y);
    this.ctx.stroke();
  }

  /**
   * Draw text
   */
  drawText(
    text: string,
    x: number,
    y: number,
    color: string,
    font: string = '16px Arial'
  ): void {
    const screenPos = this.transformToScreen(x, y);

    this.ctx.fillStyle = color;
    this.ctx.font = font;
    this.ctx.fillText(text, screenPos.x, screenPos.y);
  }

  /**
   * Draw text without viewport transformation (for UI elements)
   */
  drawUIText(
    text: string,
    x: number,
    y: number,
    color: string,
    font: string = '16px Arial'
  ): void {
    this.ctx.fillStyle = color;
    this.ctx.font = font;
    this.ctx.fillText(text, x, y);
  }

  /**
   * Save current rendering state
   */
  save(): void {
    this.ctx.save();
  }

  /**
   * Restore previous rendering state
   */
  restore(): void {
    this.ctx.restore();
  }

  /**
   * Set global alpha (transparency)
   */
  setAlpha(alpha: number): void {
    this.ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  }

  /**
   * Reset global alpha to fully opaque
   */
  resetAlpha(): void {
    this.ctx.globalAlpha = 1.0;
  }

  /**
   * Get canvas dimensions
   */
  getDimensions(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  /**
   * Get viewport information
   */
  getViewport(): { x: number; y: number; scale: number } {
    return {
      x: this.viewportX,
      y: this.viewportY,
      scale: this.viewportScale,
    };
  }

  /**
   * Get raw 2D context for advanced operations
   */
  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  /**
   * Check if point is visible in viewport
   */
  isVisible(
    x: number,
    y: number,
    width: number = 0,
    height: number = 0
  ): boolean {
    const screenPos = this.transformToScreen(x, y);
    const screenWidth = width * this.viewportScale;
    const screenHeight = height * this.viewportScale;

    return (
      screenPos.x + screenWidth >= 0 &&
      screenPos.x <= this.width &&
      screenPos.y + screenHeight >= 0 &&
      screenPos.y <= this.height
    );
  }
}
