import { Page } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Settings Page Object Model
 * Handles interactions with game settings
 */
export class SettingsPage extends BasePage {
  // Selectors
  private readonly selectors = {
    settingsPanel: '.settings-panel',
    closeButton: 'button[data-testid="close-settings"]',
    saveButton: 'button[data-testid="save-settings"]',
    resetButton: 'button[data-testid="reset-settings"]',
    
    // Audio settings
    masterVolumeSlider: 'input[data-testid="master-volume"]',
    sfxVolumeSlider: 'input[data-testid="sfx-volume"]',
    musicVolumeSlider: 'input[data-testid="music-volume"]',
    muteCheckbox: 'input[data-testid="mute-all"]',
    
    // Visual settings
    themeSelect: 'select[data-testid="theme-select"]',
    particlesToggle: 'input[data-testid="particles-toggle"]',
    fpsCounterToggle: 'input[data-testid="fps-counter-toggle"]',
    fullscreenToggle: 'input[data-testid="fullscreen-toggle"]',
    
    // Control settings
    controlSchemeRadio: 'input[name="control-scheme"]',
    keyboardOption: 'input[data-testid="keyboard-control"]',
    mouseOption: 'input[data-testid="mouse-control"]',
    touchOption: 'input[data-testid="touch-control"]',
    sensitivitySlider: 'input[data-testid="sensitivity"]'
  };

  constructor(page: Page) {
    super(page);
  }

  /**
   * Open settings panel
   */
  async openSettings() {
    await this.click('button[data-testid="settings"]');
    await this.waitForSettingsPanel();
  }

  /**
   * Wait for settings panel to be visible
   */
  async waitForSettingsPanel() {
    await this.waitForVisible(this.selectors.settingsPanel);
  }

  /**
   * Close settings panel
   */
  async closeSettings() {
    await this.click(this.selectors.closeButton);
  }

  /**
   * Save settings
   */
  async saveSettings() {
    await this.click(this.selectors.saveButton);
  }

  /**
   * Reset settings to defaults
   */
  async resetSettings() {
    await this.click(this.selectors.resetButton);
  }

  /**
   * Set master volume
   */
  async setMasterVolume(value: number) {
    await this.page.fill(this.selectors.masterVolumeSlider, value.toString());
  }

  /**
   * Set SFX volume
   */
  async setSFXVolume(value: number) {
    await this.page.fill(this.selectors.sfxVolumeSlider, value.toString());
  }

  /**
   * Set music volume
   */
  async setMusicVolume(value: number) {
    await this.page.fill(this.selectors.musicVolumeSlider, value.toString());
  }

  /**
   * Toggle mute all
   */
  async toggleMuteAll() {
    await this.click(this.selectors.muteCheckbox);
  }

  /**
   * Select theme
   */
  async selectTheme(theme: 'neon' | 'pixel' | 'synthwave' | 'minimal') {
    await this.page.selectOption(this.selectors.themeSelect, theme);
  }

  /**
   * Toggle particles
   */
  async toggleParticles() {
    await this.click(this.selectors.particlesToggle);
  }

  /**
   * Toggle FPS counter
   */
  async toggleFPSCounter() {
    await this.click(this.selectors.fpsCounterToggle);
  }

  /**
   * Toggle fullscreen
   */
  async toggleFullscreen() {
    await this.click(this.selectors.fullscreenToggle);
  }

  /**
   * Select control scheme
   */
  async selectControlScheme(scheme: 'keyboard' | 'mouse' | 'touch') {
    const selector = {
      keyboard: this.selectors.keyboardOption,
      mouse: this.selectors.mouseOption,
      touch: this.selectors.touchOption
    }[scheme];
    
    await this.click(selector);
  }

  /**
   * Set control sensitivity
   */
  async setControlSensitivity(value: number) {
    await this.page.fill(this.selectors.sensitivitySlider, value.toString());
  }

  /**
   * Get current settings values
   */
  async getCurrentSettings() {
    return {
      masterVolume: await this.page.inputValue(this.selectors.masterVolumeSlider),
      sfxVolume: await this.page.inputValue(this.selectors.sfxVolumeSlider),
      musicVolume: await this.page.inputValue(this.selectors.musicVolumeSlider),
      isMuted: await this.page.isChecked(this.selectors.muteCheckbox),
      theme: await this.page.inputValue(this.selectors.themeSelect),
      particlesEnabled: await this.page.isChecked(this.selectors.particlesToggle),
      fpsCounterEnabled: await this.page.isChecked(this.selectors.fpsCounterToggle),
      fullscreenEnabled: await this.page.isChecked(this.selectors.fullscreenToggle),
      sensitivity: await this.page.inputValue(this.selectors.sensitivitySlider)
    };
  }

  /**
   * Verify settings are persisted
   */
  async verifySettingsPersisted(expectedSettings: any) {
    // Reload page
    await this.page.reload();
    await this.openSettings();
    
    const currentSettings = await this.getCurrentSettings();
    
    return Object.keys(expectedSettings).every(
      key => currentSettings[key] === expectedSettings[key]
    );
  }
}