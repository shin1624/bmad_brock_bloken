import { Page } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Game Page Object Model
 * Story 7.2: E2E Testing Implementation
 */

export class GamePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Selectors
  private readonly selectors = {
    gameCanvas: 'canvas#game-canvas',
    scoreDisplay: '[data-testid="score-display"]',
    livesDisplay: '[data-testid="lives-display"]',
    levelDisplay: '[data-testid="level-display"]',
    pauseButton: 'button[aria-label="Pause Game"]',
    pauseMenu: '[data-testid="pause-menu"]',
    resumeButton: 'button[aria-label="Resume Game"]',
    restartButton: 'button[aria-label="Restart Game"]',
    quitButton: 'button[aria-label="Quit to Menu"]',
    gameOverScreen: '[data-testid="game-over-screen"]',
    finalScore: '[data-testid="final-score"]',
    highScore: '[data-testid="high-score"]',
    playAgainButton: 'button[aria-label="Play Again"]',
    fpsCounter: '[data-testid="fps-counter"]',
    debugInfo: '[data-testid="debug-info"]'
  };

  /**
   * Start a new game
   */
  async startGame() {
    await this.canvas.waitForGameReady();
    await this.canvas.waitForAnimationFrame();
  }

  /**
   * Pause the game
   */
  async pauseGame() {
    await this.clickWithRetry(this.selectors.pauseButton);
    await this.waitForVisible(this.selectors.pauseMenu);
  }

  /**
   * Resume the game
   */
  async resumeGame() {
    await this.clickWithRetry(this.selectors.resumeButton);
    await this.page.waitForSelector(this.selectors.pauseMenu, { state: 'hidden' });
  }

  /**
   * Restart the game
   */
  async restartGame() {
    await this.clickWithRetry(this.selectors.restartButton);
    await this.canvas.waitForGameReady();
  }

  /**
   * Quit to main menu
   */
  async quitToMenu() {
    await this.clickWithRetry(this.selectors.quitButton);
    await this.waitForNavigation();
  }

  /**
   * Move paddle using keyboard
   */
  async movePaddleWithKeyboard(direction: 'left' | 'right', duration = 100) {
    const key = direction === 'left' ? 'ArrowLeft' : 'ArrowRight';
    await this.page.keyboard.down(key);
    await this.page.waitForTimeout(duration);
    await this.page.keyboard.up(key);
  }

  /**
   * Move paddle using mouse
   */
  async movePaddleWithMouse(x: number) {
    await this.canvas.movePaddle(x);
  }

  /**
   * Move paddle using WASD keys
   */
  async movePaddleWithWASD(direction: 'left' | 'right', duration = 100) {
    const key = direction === 'left' ? 'a' : 'd';
    await this.page.keyboard.down(key);
    await this.page.waitForTimeout(duration);
    await this.page.keyboard.up(key);
  }

  /**
   * Get current score
   */
  async getScore(): Promise<number> {
    const scoreText = await this.getText(this.selectors.scoreDisplay);
    return parseInt(scoreText.replace(/\D/g, '') || '0', 10);
  }

  /**
   * Get current lives
   */
  async getLives(): Promise<number> {
    const livesText = await this.getText(this.selectors.livesDisplay);
    return parseInt(livesText.replace(/\D/g, '') || '0', 10);
  }

  /**
   * Get current level
   */
  async getLevel(): Promise<number> {
    const levelText = await this.getText(this.selectors.levelDisplay);
    return parseInt(levelText.replace(/\D/g, '') || '1', 10);
  }

  /**
   * Check if game is over
   */
  async isGameOver(): Promise<boolean> {
    return await this.isVisible(this.selectors.gameOverScreen);
  }

  /**
   * Get final score from game over screen
   */
  async getFinalScore(): Promise<number> {
    const scoreText = await this.getText(this.selectors.finalScore);
    return parseInt(scoreText.replace(/\D/g, '') || '0', 10);
  }

  /**
   * Get high score
   */
  async getHighScore(): Promise<number> {
    const scoreText = await this.getText(this.selectors.highScore);
    return parseInt(scoreText.replace(/\D/g, '') || '0', 10);
  }

  /**
   * Click play again button
   */
  async playAgain() {
    await this.clickWithRetry(this.selectors.playAgainButton);
    await this.canvas.waitForGameReady();
  }

  /**
   * Wait for specific score
   */
  async waitForScore(targetScore: number, timeout = 30000) {
    await this.page.waitForFunction(
      (target) => {
        const scoreElement = document.querySelector('[data-testid="score-display"]');
        if (!scoreElement) return false;
        const score = parseInt(scoreElement.textContent?.replace(/\D/g, '') || '0', 10);
        return score >= target;
      },
      { timeout },
      targetScore
    );
  }

  /**
   * Wait for level change
   */
  async waitForLevelChange(fromLevel: number, timeout = 30000) {
    await this.page.waitForFunction(
      (currentLevel) => {
        const levelElement = document.querySelector('[data-testid="level-display"]');
        if (!levelElement) return false;
        const level = parseInt(levelElement.textContent?.replace(/\D/g, '') || '1', 10);
        return level > currentLevel;
      },
      { timeout },
      fromLevel
    );
  }

  /**
   * Check if pause menu is visible
   */
  async isPauseMenuVisible(): Promise<boolean> {
    return await this.isVisible(this.selectors.pauseMenu);
  }

  /**
   * Get FPS counter value
   */
  async getFPS(): Promise<number> {
    if (await this.isVisible(this.selectors.fpsCounter)) {
      const fpsText = await this.getText(this.selectors.fpsCounter);
      return parseInt(fpsText.replace(/\D/g, '') || '0', 10);
    }
    return await this.canvas.getFPS();
  }

  /**
   * Toggle debug info
   */
  async toggleDebugInfo() {
    await this.page.keyboard.press('F12');
  }

  /**
   * Check if debug info is visible
   */
  async isDebugInfoVisible(): Promise<boolean> {
    return await this.isVisible(this.selectors.debugInfo);
  }

  /**
   * Simulate power-up collection
   */
  async collectPowerUp() {
    // This would need to be coordinated with game state
    // For testing, we might trigger a power-up spawn via debug command
    await this.page.keyboard.press('p'); // Assuming 'p' spawns a power-up in debug mode
    await this.canvas.waitForAnimationFrame();
  }

  /**
   * Wait for game to be paused
   */
  async waitForPaused(timeout = 5000) {
    await this.page.waitForFunction(
      () => {
        const gameEngine = (window as any).gameEngine;
        return gameEngine?.state?.isPaused === true;
      },
      { timeout }
    );
  }

  /**
   * Wait for game to be unpaused
   */
  async waitForUnpaused(timeout = 5000) {
    await this.page.waitForFunction(
      () => {
        const gameEngine = (window as any).gameEngine;
        return gameEngine?.state?.isPaused === false;
      },
      { timeout }
    );
  }

  /**
   * Take game screenshot
   */
  async takeGameScreenshot(name: string) {
    await this.canvas.takeCanvasScreenshot(`e2e/screenshots/game-${name}.png`);
  }

  /**
   * Verify game is running at target FPS
   */
  async verifyFPS(targetFPS = 60, tolerance = 5): Promise<boolean> {
    const fps = await this.getFPS();
    return Math.abs(fps - targetFPS) <= tolerance;
  }

  /**
   * Get memory usage
   */
  async getMemoryUsage(): Promise<number> {
    return await this.canvas.getMemoryUsage();
  }

  /**
   * Simulate losing a life
   */
  async loseLive() {
    // Let the ball fall off screen by not moving the paddle
    await this.page.waitForTimeout(5000);
    await this.canvas.waitForState('gameEngine.state.lives < 3');
  }
}