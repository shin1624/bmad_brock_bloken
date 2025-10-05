import { Page } from '@playwright/test';

/**
 * Canvas interaction utilities for E2E testing
 * Story 7.2: E2E Testing Implementation
 */

export class CanvasHelpers {
  constructor(private page: Page) {}

  /**
   * Wait for the game engine to be ready
   */
  async waitForGameReady() {
    await this.page.waitForFunction(
      () => {
        const gameEngine = (window as any).gameEngine;
        return gameEngine?.isReady === true;
      },
      { timeout: 10000 }
    );
  }

  /**
   * Get the current game state
   */
  async getGameState() {
    return await this.page.evaluate(() => {
      const gameEngine = (window as any).gameEngine;
      return gameEngine?.getState ? gameEngine.getState() : null;
    });
  }

  /**
   * Get canvas image data for visual comparison
   */
  async getCanvasImageData() {
    return await this.page.evaluate(() => {
      const canvas = document.querySelector('canvas#game-canvas') as HTMLCanvasElement;
      if (!canvas) return null;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      
      return ctx.getImageData(0, 0, canvas.width, canvas.height);
    });
  }

  /**
   * Simulate paddle movement at specific coordinates
   */
  async movePaddle(x: number) {
    const canvas = await this.page.locator('canvas#game-canvas');
    const box = await canvas.boundingBox();
    
    if (box) {
      await this.page.mouse.move(box.x + x, box.y + 550);
    }
  }

  /**
   * Click at specific canvas coordinates
   */
  async clickCanvas(x: number, y: number) {
    const canvas = await this.page.locator('canvas#game-canvas');
    await canvas.click({ position: { x, y } });
  }

  /**
   * Simulate keyboard input for game controls
   */
  async pressGameKey(key: string) {
    await this.page.keyboard.press(key);
  }

  /**
   * Get current score from game state
   */
  async getScore(): Promise<number> {
    return await this.page.evaluate(() => {
      const gameEngine = (window as any).gameEngine;
      return gameEngine?.state?.score || 0;
    });
  }

  /**
   * Get current lives from game state
   */
  async getLives(): Promise<number> {
    return await this.page.evaluate(() => {
      const gameEngine = (window as any).gameEngine;
      return gameEngine?.state?.lives || 0;
    });
  }

  /**
   * Get current level from game state
   */
  async getLevel(): Promise<number> {
    return await this.page.evaluate(() => {
      const gameEngine = (window as any).gameEngine;
      return gameEngine?.state?.level || 1;
    });
  }

  /**
   * Check if game is paused
   */
  async isGamePaused(): Promise<boolean> {
    return await this.page.evaluate(() => {
      const gameEngine = (window as any).gameEngine;
      return gameEngine?.state?.isPaused || false;
    });
  }

  /**
   * Check if game is over
   */
  async isGameOver(): Promise<boolean> {
    return await this.page.evaluate(() => {
      const gameEngine = (window as any).gameEngine;
      return gameEngine?.state?.isGameOver || false;
    });
  }

  /**
   * Wait for specific game state
   */
  async waitForState(statePredicate: string, timeout = 5000) {
    await this.page.waitForFunction(
      (pred) => {
        const gameEngine = (window as any).gameEngine;
        if (!gameEngine) return false;
        
        // Execute predicate in page context
        return eval(pred);
      },
      { timeout },
      statePredicate
    );
  }

  /**
   * Take a screenshot of the canvas only
   */
  async takeCanvasScreenshot(path: string) {
    const canvas = await this.page.locator('canvas#game-canvas');
    await canvas.screenshot({ path });
  }

  /**
   * Get FPS from performance monitor
   */
  async getFPS(): Promise<number> {
    return await this.page.evaluate(() => {
      const gameEngine = (window as any).gameEngine;
      return gameEngine?.performanceMonitor?.fps || 0;
    });
  }

  /**
   * Get memory usage
   */
  async getMemoryUsage(): Promise<number> {
    return await this.page.evaluate(() => {
      if ((performance as any).memory) {
        return (performance as any).memory.usedJSHeapSize / 1048576; // Convert to MB
      }
      return 0;
    });
  }

  /**
   * Wait for animation frame
   */
  async waitForAnimationFrame() {
    await this.page.evaluate(() => {
      return new Promise(resolve => requestAnimationFrame(resolve));
    });
  }

  /**
   * Simulate touch input for mobile testing
   */
  async touchCanvas(x: number, y: number) {
    const canvas = await this.page.locator('canvas#game-canvas');
    await canvas.tap({ position: { x, y } });
  }

  /**
   * Drag gesture for paddle control on mobile
   */
  async dragPaddle(fromX: number, toX: number) {
    const canvas = await this.page.locator('canvas#game-canvas');
    const box = await canvas.boundingBox();
    
    if (box) {
      const y = box.y + 550;
      await this.page.mouse.move(box.x + fromX, y);
      await this.page.mouse.down();
      await this.page.mouse.move(box.x + toX, y);
      await this.page.mouse.up();
    }
  }
}