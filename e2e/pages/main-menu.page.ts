import { Page, Locator } from '@playwright/test';

/**
 * Main Menu Page Object Model
 * Handles main menu navigation and interactions
 */
export class MainMenuPage {
  readonly page: Page;
  readonly playButton: Locator;
  readonly settingsButton: Locator;
  readonly levelEditorButton: Locator;
  readonly highScoresButton: Locator;
  readonly helpButton: Locator;
  readonly title: Locator;

  constructor(page: Page) {
    this.page = page;
    this.playButton = page.locator('[data-testid="play-button"]');
    this.settingsButton = page.locator('[data-testid="settings-button"]');
    this.levelEditorButton = page.locator('[data-testid="level-editor-button"]');
    this.highScoresButton = page.locator('[data-testid="high-scores-button"]');
    this.helpButton = page.locator('[data-testid="help-button"]');
    this.title = page.locator('[data-testid="game-title"]');
  }

  async goto() {
    await this.page.goto('/');
  }

  async clickPlay() {
    await this.playButton.click();
  }

  async clickSettings() {
    await this.settingsButton.click();
  }

  async clickLevelEditor() {
    await this.levelEditorButton.click();
  }

  async clickHighScores() {
    await this.highScoresButton.click();
  }

  async clickHelp() {
    await this.helpButton.click();
  }

  async isVisible(): Promise<boolean> {
    return await this.title.isVisible();
  }
}