import { GameLoop } from './GameLoop';
import { Debug } from './Debug';
import { Renderer } from '../rendering/Renderer';

/**
 * GameEngine - Main game engine class managing the game loop, rendering, and systems
 */
export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gameLoop: GameLoop;
  private renderer: Renderer;
  private debug: Debug;
  private isRunning: boolean = false;
  private isInitialized: boolean = false;

  // Event callbacks
  private onStateChangeCallback: ((state: any) => void) | null = null;
  private onFpsUpdateCallback: ((fps: number) => void) | null = null;

  // Game state placeholder (will be expanded in future stories)
  private gameState: any = {
    isPaused: false,
    isDebugMode: false,
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    // Get 2D context
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not get 2D rendering context from canvas');
    }
    this.ctx = context;

    // Initialize subsystems
    this.gameLoop = new GameLoop();
    this.renderer = new Renderer(canvas);
    this.debug = new Debug();

    // Set up dependencies
    this.debug.setRenderer(this.renderer);

    // Bind callbacks
    this.gameLoop.onUpdate(this.update.bind(this));
    this.gameLoop.onRender(this.render.bind(this));
    this.gameLoop.onFpsUpdate((fps: number) => {
      this.debug.update(fps, 16.67); // Approximate delta time
      if (this.onFpsUpdateCallback) {
        this.onFpsUpdateCallback(fps);
      }
    });

    // Handle canvas resize
    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);

    this.isInitialized = true;
    this.debug.log('GameEngine initialized');
  }

  /**
   * Start the game engine
   */
  start(): void {
    if (this.isRunning) {
      this.debug.warn('GameEngine is already running');
      return;
    }

    if (!this.isInitialized) {
      throw new Error('GameEngine not properly initialized');
    }

    this.isRunning = true;
    this.gameState.isPaused = false;

    this.debug.log('Starting game engine');
    this.gameLoop.start();

    this.notifyStateChange();
  }

  /**
   * Stop the game engine
   */
  stop(): void {
    if (!this.isRunning) {
      this.debug.warn('GameEngine is not running');
      return;
    }

    this.isRunning = false;
    this.debug.log('Stopping game engine');
    this.gameLoop.stop();

    this.notifyStateChange();
  }

  /**
   * Pause the game engine
   */
  pause(): void {
    if (!this.isRunning) {
      this.debug.warn('Cannot pause - GameEngine is not running');
      return;
    }

    this.gameState.isPaused = true;
    this.debug.log('Pausing game engine');
    this.gameLoop.pause();

    this.notifyStateChange();
  }

  /**
   * Resume the game engine
   */
  resume(): void {
    if (!this.isRunning) {
      this.debug.warn('Cannot resume - GameEngine is not running');
      return;
    }

    this.gameState.isPaused = false;
    this.debug.log('Resuming game engine');
    this.gameLoop.resume();

    this.notifyStateChange();
  }

  /**
   * Toggle debug mode
   */
  toggleDebug(): void {
    this.gameState.isDebugMode = !this.gameState.isDebugMode;
    this.debug.setEnabled(this.gameState.isDebugMode);
    this.debug.log(
      `Debug mode ${this.gameState.isDebugMode ? 'enabled' : 'disabled'}`
    );

    this.notifyStateChange();
  }

  /**
   * Update game logic (called by game loop)
   */
  private update(deltaTime: number): void {
    if (this.gameState.isPaused) return;

    // TODO: Update game entities and systems here
    // This will be expanded in future stories

    // Check for performance issues
    this.debug.checkPerformance();
  }

  /**
   * Render game (called by game loop)
   */
  private render(interpolation: number): void {
    // Clear the canvas
    this.renderer.clear();

    // TODO: Render game entities here
    // This will be expanded in future stories

    // For now, render a simple test pattern to verify the engine is working
    this.renderTestPattern();

    // Render debug information
    if (this.gameState.isDebugMode) {
      this.debug.render();
    }
  }

  /**
   * Render a test pattern to verify the engine is working
   */
  private renderTestPattern(): void {
    const time = performance.now() * 0.001;

    // Animated background rectangles
    for (let i = 0; i < 5; i++) {
      const x = 100 + Math.sin(time + i * 0.5) * 50;
      const y = 100 + i * 80;
      const hue = (time * 50 + i * 60) % 360;

      this.renderer.fillRect(x, y, 60, 60, `hsl(${hue}, 70%, 50%)`);
    }

    // Animated circle
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const radius = 30 + Math.sin(time * 2) * 10;

    this.renderer.fillCircle(centerX, centerY, radius, '#ffffff');

    // FPS display
    const fps = this.gameLoop.getFps();
    this.renderer.drawUIText(
      `Canvas Game Engine - ${fps} FPS`,
      20,
      20,
      '#ffffff',
      '24px Arial'
    );

    this.renderer.drawUIText(
      'Press D to toggle debug mode',
      20,
      50,
      '#cccccc',
      '16px Arial'
    );
  }

  /**
   * Handle canvas resize
   */
  private handleResize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Set actual canvas size
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;

    // Scale context to match device pixel ratio
    this.ctx.scale(dpr, dpr);

    // Update renderer
    this.renderer.resize(this.canvas.width, this.canvas.height);

    this.debug.log(
      `Canvas resized to ${this.canvas.width}x${this.canvas.height}`
    );
  }

  /**
   * Set callback for state changes
   */
  onStateChange(callback: (state: any) => void): void {
    this.onStateChangeCallback = callback;
  }

  /**
   * Set callback for FPS updates
   */
  onFpsUpdate(callback: (fps: number) => void): void {
    this.onFpsUpdateCallback = callback;
  }

  /**
   * Notify listeners of state change
   */
  private notifyStateChange(): void {
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback({
        isRunning: this.isRunning,
        isPaused: this.gameState.isPaused,
        isDebugMode: this.gameState.isDebugMode,
        fps: this.gameLoop.getFps(),
      });
    }
  }

  /**
   * Get current game state
   */
  getState(): any {
    return {
      isRunning: this.isRunning,
      isPaused: this.gameState.isPaused,
      isDebugMode: this.gameState.isDebugMode,
      fps: this.gameLoop.getFps(),
      fpsStats: this.gameLoop.getFpsStats(),
    };
  }

  /**
   * Handle keyboard input (basic implementation)
   */
  handleKeyDown(key: string): void {
    switch (key.toLowerCase()) {
      case 'd':
        this.toggleDebug();
        break;
      case ' ':
      case 'space':
        if (this.isRunning) {
          if (this.gameState.isPaused) {
            this.resume();
          } else {
            this.pause();
          }
        }
        break;
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): any {
    return {
      fps: this.gameLoop.getFpsStats(),
      debug: this.debug.getPerformanceStats(),
      memory: this.debug.exportPerformanceData(),
    };
  }

  /**
   * Clean up resources and destroy the engine
   */
  destroy(): void {
    this.debug.log('Destroying game engine');

    // Stop the game loop first to prevent further operations
    this.stop();

    // Remove event listeners
    window.removeEventListener('resize', this.handleResize);

    // Clean up subsystems in reverse order of creation
    this.gameLoop.destroy();

    // Clear renderer state (prevents context reference retention)
    if (this.renderer) {
      this.renderer
        .getContext()
        .clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Clear callbacks to break potential circular references
    this.onStateChangeCallback = null;
    this.onFpsUpdateCallback = null;

    // Clear canvas context and references
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Mark as destroyed
    this.isInitialized = false;
    this.debug.log('Game engine destroyed - all resources cleaned');
  }

  /**
   * Check if engine is running
   */
  isEngineRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Check if engine is paused
   */
  isEnginePaused(): boolean {
    return this.gameState.isPaused;
  }
}
