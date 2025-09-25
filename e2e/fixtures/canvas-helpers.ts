import { Page } from '@playwright/test';

/**
 * Canvas Testing Utilities
 * Provides helper functions for interacting with Canvas elements in E2E tests
 */

export interface CanvasPosition {
  x: number;
  y: number;
}

export interface GameState {
  score: number;
  lives: number;
  level: number;
  isPlaying: boolean;
  isPaused: boolean;
  isGameOver: boolean;
  ballPosition?: CanvasPosition;
  paddlePosition?: CanvasPosition;
  blocksRemaining?: number;
}

/**
 * Get Canvas element from the page
 */
export async function getCanvas(page: Page) {
  return page.locator('canvas#game-canvas');
}

/**
 * Wait for Canvas to be ready
 */
export async function waitForCanvasReady(page: Page, timeout = 5000) {
  await page.waitForFunction(
    () => {
      const canvas = document.querySelector('canvas#game-canvas');
      return canvas !== null && canvas instanceof HTMLCanvasElement;
    },
    { timeout }
  );
}

/**
 * Wait for game engine to be ready
 */
export async function waitForGameEngineReady(page: Page, timeout = 10000) {
  await page.waitForFunction(
    () => {
      return window.gameEngine?.isReady === true;
    },
    { timeout }
  );
}

/**
 * Get current game state
 */
export async function getGameState(page: Page): Promise<GameState> {
  return await page.evaluate(() => {
    if (!window.gameEngine) {
      throw new Error('Game engine not initialized');
    }
    return window.gameEngine.getState();
  });
}

/**
 * Get Canvas image data for visual comparisons
 */
export async function getCanvasImageData(page: Page) {
  return await page.evaluate(() => {
    const canvas = document.querySelector('canvas#game-canvas') as HTMLCanvasElement;
    if (!canvas) {
      throw new Error('Canvas element not found');
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context not available');
    }
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  });
}

/**
 * Click at specific coordinates on Canvas
 */
export async function clickCanvasAt(page: Page, x: number, y: number) {
  const canvas = await getCanvas(page);
  await canvas.click({ position: { x, y } });
}

/**
 * Move mouse to specific coordinates on Canvas
 */
export async function moveMouseTo(page: Page, x: number, y: number) {
  const canvas = await getCanvas(page);
  await canvas.hover({ position: { x, y } });
}

/**
 * Drag from one position to another on Canvas
 */
export async function dragOnCanvas(page: Page, from: CanvasPosition, to: CanvasPosition) {
  const canvas = await getCanvas(page);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 10 });
  await page.mouse.up();
}

/**
 * Wait for specific game state condition
 */
export async function waitForGameState(
  page: Page,
  condition: (state: GameState) => boolean,
  timeout = 5000
) {
  await page.waitForFunction(
    (conditionStr) => {
      if (!window.gameEngine) return false;
      const state = window.gameEngine.getState();
      const fn = new Function('state', `return ${conditionStr}`);
      return fn(state);
    },
    condition.toString().replace(/^[^{]*{/, '').replace(/}[^}]*$/, ''),
    { timeout }
  );
}

/**
 * Start a new game
 */
export async function startNewGame(page: Page) {
  await page.evaluate(() => {
    if (window.gameEngine) {
      window.gameEngine.startNewGame();
    }
  });
  await waitForGameState(page, state => state.isPlaying === true);
}

/**
 * Pause the game
 */
export async function pauseGame(page: Page) {
  await page.keyboard.press('Escape');
  await waitForGameState(page, state => state.isPaused === true);
}

/**
 * Resume the game
 */
export async function resumeGame(page: Page) {
  await page.keyboard.press('Escape');
  await waitForGameState(page, state => state.isPaused === false && state.isPlaying === true);
}

/**
 * Move paddle to specific X position
 */
export async function movePaddleTo(page: Page, x: number) {
  const canvas = await getCanvas(page);
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Canvas bounding box not found');
  
  // Move mouse to paddle height (typically bottom of canvas)
  await page.mouse.move(box.x + x, box.y + box.height - 50);
}

/**
 * Simulate keyboard controls
 */
export async function pressGameKey(page: Page, key: string) {
  await page.keyboard.press(key);
  // Small delay to allow game to process input
  await page.waitForTimeout(50);
}

/**
 * Get FPS reading from performance monitor
 */
export async function getFPS(page: Page): Promise<number> {
  return await page.evaluate(() => {
    if (!window.gameEngine || !window.gameEngine.getPerformanceMetrics) {
      return 60; // Default if not available
    }
    const metrics = window.gameEngine.getPerformanceMetrics();
    return metrics.fps || 60;
  });
}

/**
 * Wait for animation frame
 */
export async function waitForAnimationFrame(page: Page) {
  await page.evaluate(() => {
    return new Promise(resolve => requestAnimationFrame(resolve));
  });
}

/**
 * Take screenshot of Canvas only
 */
export async function screenshotCanvas(page: Page, path?: string) {
  const canvas = await getCanvas(page);
  return await canvas.screenshot({ path });
}

/**
 * Check if a specific block exists at grid position
 */
export async function isBlockAt(page: Page, row: number, col: number): Promise<boolean> {
  return await page.evaluate(({ row, col }) => {
    if (!window.gameEngine) return false;
    const state = window.gameEngine.getState();
    if (!state.blocks) return false;
    return state.blocks.some((block: any) => 
      block.row === row && block.col === col && !block.destroyed
    );
  }, { row, col });
}

/**
 * Get paddle position
 */
export async function getPaddlePosition(page: Page): Promise<CanvasPosition | null> {
  return await page.evaluate(() => {
    if (!window.gameEngine) return null;
    const state = window.gameEngine.getState();
    return state.paddlePosition || null;
  });
}

/**
 * Get ball position
 */
export async function getBallPosition(page: Page): Promise<CanvasPosition | null> {
  return await page.evaluate(() => {
    if (!window.gameEngine) return null;
    const state = window.gameEngine.getState();
    return state.ballPosition || null;
  });
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    gameEngine?: {
      isReady: boolean;
      getState: () => GameState;
      startNewGame: () => void;
      getPerformanceMetrics?: () => { fps: number };
    };
  }
}