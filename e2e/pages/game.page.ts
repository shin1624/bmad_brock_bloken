import { Page, Locator } from '@playwright/test';

/**
 * Game Page Object Model
 * Encapsulates game canvas interactions and game state queries
 */
export class GamePage {
  readonly page: Page;
  readonly gameCanvas: Locator;
  readonly scoreDisplay: Locator;
  readonly livesDisplay: Locator;
  readonly levelDisplay: Locator;
  readonly pauseButton: Locator;
  readonly gameOverDialog: Locator;
  readonly winDialog: Locator;

  constructor(page: Page) {
    this.page = page;
    this.gameCanvas = page.locator('#game-canvas');
    this.scoreDisplay = page.locator('[data-testid="score-display"]');
    this.livesDisplay = page.locator('[data-testid="lives-display"]');
    this.levelDisplay = page.locator('[data-testid="level-display"]');
    this.pauseButton = page.locator('[data-testid="pause-button"]');
    this.gameOverDialog = page.locator('[data-testid="game-over-dialog"]');
    this.winDialog = page.locator('[data-testid="win-dialog"]');
  }

  async goto() {
    await this.page.goto('/game');
  }

  async startGame() {
    await this.page.keyboard.press('Space');
  }

  async pauseGame() {
    await this.pauseButton.click();
  }

  async resumeGame() {
    await this.page.keyboard.press('Escape');
  }

  async movePaddleLeft(duration = 100) {
    await this.page.keyboard.down('ArrowLeft');
    await this.page.waitForTimeout(duration);
    await this.page.keyboard.up('ArrowLeft');
  }

  async movePaddleRight(duration = 100) {
    await this.page.keyboard.down('ArrowRight');
    await this.page.waitForTimeout(duration);
    await this.page.keyboard.up('ArrowRight');
  }

  async movePaddleToPosition(x: number) {
    await this.gameCanvas.click({ position: { x, y: 550 } });
  }

  async getScore(): Promise<number> {
    const text = await this.scoreDisplay.textContent();
    return parseInt(text?.replace(/\D/g, '') || '0');
  }

  async getLives(): Promise<number> {
    const text = await this.livesDisplay.textContent();
    return parseInt(text?.replace(/\D/g, '') || '0');
  }

  async getLevel(): Promise<number> {
    const text = await this.levelDisplay.textContent();
    return parseInt(text?.replace(/\D/g, '') || '0');
  }

  async isGameOver(): Promise<boolean> {
    return await this.gameOverDialog.isVisible();
  }

  async isGameWon(): Promise<boolean> {
    return await this.winDialog.isVisible();
  }

  async restartGame() {
    if (await this.isGameOver() || await this.isGameWon()) {
      await this.page.keyboard.press('Enter');
    }
  }

  async waitForBallLaunch() {
    await this.page.waitForTimeout(1000);
  }
}