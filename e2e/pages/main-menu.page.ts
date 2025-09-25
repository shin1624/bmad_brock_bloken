import { Page } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Main Menu Page Object Model
 * Handles interactions with the main menu and navigation
 */
export class MainMenuPage extends BasePage {
  // Selectors
  private readonly selectors = {
    mainMenu: '.main-menu',
    startButton: 'button[data-testid="start-game"]',
    settingsButton: 'button[data-testid="settings"]',
    highScoresButton: 'button[data-testid="high-scores"]',
    levelSelectButton: 'button[data-testid="level-select"]',
    exitButton: 'button[data-testid="exit"]',
    logo: '.game-logo',
    version: '.game-version'
  };

  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to main menu
   */
  async gotoMainMenu() {
    await this.goto('/');
    await this.waitForMainMenu();
  }

  /**
   * Wait for main menu to be visible
   */
  async waitForMainMenu() {
    await this.waitForVisible(this.selectors.mainMenu);
  }

  /**
   * Click Start Game button
   */
  async clickStartGame() {
    await this.click(this.selectors.startButton);
  }

  /**
   * Click Settings button
   */
  async clickSettings() {
    await this.click(this.selectors.settingsButton);
  }

  /**
   * Click High Scores button
   */
  async clickHighScores() {
    await this.click(this.selectors.highScoresButton);
  }

  /**
   * Click Level Select button
   */
  async clickLevelSelect() {
    await this.click(this.selectors.levelSelectButton);
  }

  /**
   * Click Exit button
   */
  async clickExit() {
    await this.click(this.selectors.exitButton);
  }

  /**
   * Check if main menu is visible
   */
  async isMainMenuVisible(): Promise<boolean> {
    return await this.isVisible(this.selectors.mainMenu);
  }

  /**
   * Get game version
   */
  async getGameVersion(): Promise<string> {
    return await this.getText(this.selectors.version);
  }

  /**
   * Check if all menu buttons are visible
   */
  async areAllButtonsVisible(): Promise<boolean> {
    const checks = await Promise.all([
      this.isVisible(this.selectors.startButton),
      this.isVisible(this.selectors.settingsButton),
      this.isVisible(this.selectors.highScoresButton),
      this.isVisible(this.selectors.levelSelectButton)
    ]);
    return checks.every(visible => visible === true);
  }

  /**
   * Navigate to game from menu
   */
  async navigateToGame() {
    await this.clickStartGame();
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Navigate to settings from menu
   */
  async navigateToSettings() {
    await this.clickSettings();
    await this.page.waitForSelector('.settings-panel');
  }

  /**
   * Navigate to high scores from menu
   */
  async navigateToHighScores() {
    await this.clickHighScores();
    await this.page.waitForSelector('.high-scores-panel');
  }

  /**
   * Navigate to level select from menu
   */
  async navigateToLevelSelect() {
    await this.clickLevelSelect();
    await this.page.waitForSelector('.level-select-panel');
  }
}