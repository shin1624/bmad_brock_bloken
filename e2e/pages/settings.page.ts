import { Page } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Settings Page Object Model
 * Story 7.5: E2E Button Test Coverage
 */
export class SettingsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Updated selectors matching actual UI
  private readonly selectors = {
    modal: '[data-testid="settings-modal"]',
    title: 'h2:has-text("Settings")',
    volumeSlider: 'input[aria-label="Volume"]',
    soundToggle: 'input[aria-label="Sound Effects"]',
    musicToggle: 'input[aria-label="Background Music"]',
    themeSelector: 'select[aria-label="Theme"]',
    difficultySelector: 'select[aria-label="Difficulty"]',
    saveButton: 'button[aria-label="Save Settings"]',
    cancelButton: 'button[aria-label="Cancel"]',
    closeButton: 'button[aria-label="Close Settings"]'
  };

  /**
   * Open settings modal from main menu
   */
  async open() {
    await this.clickWithRetry('button[aria-label="Settings"]');
    await this.waitForVisible(this.selectors.modal);
  }

  /**
   * Close settings modal
   */
  async close() {
    await this.clickWithRetry(this.selectors.closeButton);
    await this.waitForHidden(this.selectors.modal);
  }

  /**
   * Save settings
   */
  async save() {
    await this.clickWithRetry(this.selectors.saveButton);
    await this.waitForHidden(this.selectors.modal);
  }

  /**
   * Cancel settings changes
   */
  async cancel() {
    await this.clickWithRetry(this.selectors.cancelButton);
    await this.waitForHidden(this.selectors.modal);
  }

  /**
   * Set volume level
   */
  async setVolume(value: number) {
    await this.page.locator(this.selectors.volumeSlider).fill(value.toString());
  }

  /**
   * Get current volume level
   */
  async getVolume(): Promise<number> {
    const value = await this.page.locator(this.selectors.volumeSlider).inputValue();
    return parseInt(value, 10);
  }

  /**
   * Toggle sound effects
   */
  async toggleSoundEffects() {
    await this.clickWithRetry(this.selectors.soundToggle);
  }

  /**
   * Check if sound effects are enabled
   */
  async isSoundEnabled(): Promise<boolean> {
    return await this.page.locator(this.selectors.soundToggle).isChecked();
  }

  /**
   * Toggle background music
   */
  async toggleMusic() {
    await this.clickWithRetry(this.selectors.musicToggle);
  }

  /**
   * Check if music is enabled
   */
  async isMusicEnabled(): Promise<boolean> {
    return await this.page.locator(this.selectors.musicToggle).isChecked();
  }

  /**
   * Select theme
   */
  async selectTheme(theme: 'retro' | 'neon' | 'classic') {
    await this.page.locator(this.selectors.themeSelector).selectOption(theme);
  }

  /**
   * Get current theme
   */
  async getCurrentTheme(): Promise<string> {
    return await this.page.locator(this.selectors.themeSelector).inputValue();
  }

  /**
   * Select difficulty
   */
  async selectDifficulty(difficulty: 'easy' | 'normal' | 'hard') {
    await this.page.locator(this.selectors.difficultySelector).selectOption(difficulty);
  }

  /**
   * Get current difficulty
   */
  async getCurrentDifficulty(): Promise<string> {
    return await this.page.locator(this.selectors.difficultySelector).inputValue();
  }

  /**
   * Wait for hidden helper
   */
  private async waitForHidden(selector: string) {
    await this.page.locator(selector).waitFor({ state: 'hidden' });
  }
}