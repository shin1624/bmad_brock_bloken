import { Page } from "@playwright/test";
import { BasePage } from "./base.page";

/**
 * Main Menu Page Object Model
 * Story 7.2: E2E Testing Implementation
 */

export class MainMenuPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Selectors - updated to match actual UI
  private readonly selectors = {
    title: "h1",
    playButton: 'button[aria-label="Start new game"]',
    settingsButton: 'button[aria-label="Settings"]',
    levelEditorButton: 'button[aria-label="Level Editor"]',
    highScoresButton: 'button[aria-label="High Scores"]',
    aboutButton: 'button[aria-label="About"]',
    settingsModal: '[data-testid="settings-modal"]',
    volumeSlider: 'input[aria-label="Volume"]',
    soundToggle: 'input[aria-label="Sound Effects"]',
    musicToggle: 'input[aria-label="Background Music"]',
    themeSelector: 'select[aria-label="Theme"]',
    difficultySelector: 'select[aria-label="Difficulty"]',
    saveSettingsButton: 'button[aria-label="Save Settings"]',
    cancelSettingsButton: 'button[aria-label="Cancel"]',
    highScoresModal: '[data-testid="high-scores-modal"]',
    highScoresList: '[data-testid="high-scores-list"]',
    aboutModal: '[data-testid="about-modal"]',
    version: '[data-testid="version"]',
  };

  /**
   * Navigate to main menu
   */
  async goto() {
    await super.goto("/");
    await this.waitForMainMenu();
  }

  /**
   * Wait for main menu to be ready
   */
  async waitForMainMenu() {
    await this.waitForVisible(this.selectors.playButton);
  }

  /**
   * Start a new game
   */
  async startNewGame() {
    await this.clickWithRetry(this.selectors.playButton);
    await this.waitForNavigation();
  }

  /**
   * Open settings
   */
  async openSettings() {
    await this.clickWithRetry(this.selectors.settingsButton);
    await this.waitForVisible(this.selectors.settingsModal);
  }

  /**
   * Open level editor
   */
  async openLevelEditor() {
    await this.clickWithRetry(this.selectors.levelEditorButton);
    await this.waitForNavigation();
  }

  /**
   * Open high scores
   */
  async openHighScores() {
    await this.clickWithRetry(this.selectors.highScoresButton);
    await this.waitForVisible(this.selectors.highScoresModal);
  }

  /**
   * Open about dialog
   */
  async openAbout() {
    await this.clickWithRetry(this.selectors.aboutButton);
    await this.waitForVisible(this.selectors.aboutModal);
  }

  /**
   * Set volume
   */
  async setVolume(value: number) {
    const slider = await this.page.locator(this.selectors.volumeSlider);
    await slider.fill(value.toString());
  }

  /**
   * Toggle sound effects
   */
  async toggleSoundEffects() {
    await this.page.locator(this.selectors.soundToggle).click();
  }

  /**
   * Toggle background music
   */
  async toggleBackgroundMusic() {
    await this.page.locator(this.selectors.musicToggle).click();
  }

  /**
   * Select theme
   */
  async selectTheme(theme: string) {
    await this.page.locator(this.selectors.themeSelector).selectOption(theme);
  }

  /**
   * Select difficulty
   */
  async selectDifficulty(difficulty: "easy" | "normal" | "hard") {
    await this.page
      .locator(this.selectors.difficultySelector)
      .selectOption(difficulty);
  }

  /**
   * Save settings
   */
  async saveSettings() {
    await this.clickWithRetry(this.selectors.saveSettingsButton);
    await this.page.waitForSelector(this.selectors.settingsModal, {
      state: "hidden",
    });
  }

  /**
   * Cancel settings
   */
  async cancelSettings() {
    await this.clickWithRetry(this.selectors.cancelSettingsButton);
    await this.page.waitForSelector(this.selectors.settingsModal, {
      state: "hidden",
    });
  }

  /**
   * Get high scores list
   */
  async getHighScores(): Promise<
    Array<{ rank: number; name: string; score: number }>
  > {
    const scoreElements = await this.page
      .locator(`${this.selectors.highScoresList} li`)
      .all();
    const scores = [];

    for (const element of scoreElements) {
      const text = await element.textContent();
      if (text) {
        const match = text.match(/(\d+)\.\s*(.+?)\s*-\s*(\d+)/);
        if (match) {
          scores.push({
            rank: parseInt(match[1], 10),
            name: match[2],
            score: parseInt(match[3], 10),
          });
        }
      }
    }

    return scores;
  }

  /**
   * Close modal
   */
  async closeModal() {
    await this.page.keyboard.press("Escape");
  }

  /**
   * Get version
   */
  async getVersion(): Promise<string> {
    return await this.getText(this.selectors.version);
  }

  /**
   * Check if settings are persisted
   */
  async areSettingsPersisted(): Promise<boolean> {
    await this.openSettings();

    const volume = await this.page
      .locator(this.selectors.volumeSlider)
      .inputValue();
    const soundEnabled = await this.page
      .locator(this.selectors.soundToggle)
      .isChecked();
    const musicEnabled = await this.page
      .locator(this.selectors.musicToggle)
      .isChecked();

    await this.cancelSettings();

    // Reload page
    await this.reload();

    await this.openSettings();

    const newVolume = await this.page
      .locator(this.selectors.volumeSlider)
      .inputValue();
    const newSoundEnabled = await this.page
      .locator(this.selectors.soundToggle)
      .isChecked();
    const newMusicEnabled = await this.page
      .locator(this.selectors.musicToggle)
      .isChecked();

    await this.cancelSettings();

    return (
      volume === newVolume &&
      soundEnabled === newSoundEnabled &&
      musicEnabled === newMusicEnabled
    );
  }

  /**
   * Navigate using keyboard
   */
  async navigateWithKeyboard(times: number = 1) {
    for (let i = 0; i < times; i++) {
      await this.page.keyboard.press("Tab");
      await this.page.waitForTimeout(100);
    }
  }

  /**
   * Activate focused button
   */
  async activateFocusedButton() {
    await this.page.keyboard.press("Enter");
  }

  /**
   * Check if button is focused
   */
  async isButtonFocused(selector: string): Promise<boolean> {
    return await this.page
      .locator(selector)
      .evaluate((el) => el === document.activeElement);
  }
}
