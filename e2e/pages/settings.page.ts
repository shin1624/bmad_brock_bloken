import { Page, Locator } from '@playwright/test';

/**
 * Settings Page Object Model
 * Manages settings panel interactions
 */
export class SettingsPage {
  readonly page: Page;
  readonly settingsPanel: Locator;
  readonly masterVolumeSlider: Locator;
  readonly sfxVolumeSlider: Locator;
  readonly musicVolumeSlider: Locator;
  readonly themeSelector: Locator;
  readonly difficultySelector: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly resetButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.settingsPanel = page.locator('[data-testid="settings-panel"]');
    this.masterVolumeSlider = page.locator('[data-testid="master-volume"]');
    this.sfxVolumeSlider = page.locator('[data-testid="sfx-volume"]');
    this.musicVolumeSlider = page.locator('[data-testid="music-volume"]');
    this.themeSelector = page.locator('[data-testid="theme-selector"]');
    this.difficultySelector = page.locator('[data-testid="difficulty-selector"]');
    this.saveButton = page.locator('[data-testid="save-settings"]');
    this.cancelButton = page.locator('[data-testid="cancel-settings"]');
    this.resetButton = page.locator('[data-testid="reset-settings"]');
  }

  async setMasterVolume(value: number) {
    await this.masterVolumeSlider.fill(value.toString());
  }

  async setSfxVolume(value: number) {
    await this.sfxVolumeSlider.fill(value.toString());
  }

  async setMusicVolume(value: number) {
    await this.musicVolumeSlider.fill(value.toString());
  }

  async selectTheme(theme: string) {
    await this.themeSelector.selectOption(theme);
  }

  async selectDifficulty(difficulty: string) {
    await this.difficultySelector.selectOption(difficulty);
  }

  async saveSettings() {
    await this.saveButton.click();
  }

  async cancelSettings() {
    await this.cancelButton.click();
  }

  async resetToDefaults() {
    await this.resetButton.click();
  }

  async isVisible(): Promise<boolean> {
    return await this.settingsPanel.isVisible();
  }
}