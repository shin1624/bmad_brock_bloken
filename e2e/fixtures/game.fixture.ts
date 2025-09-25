import { test as base, expect } from '@playwright/test';
import { GamePage } from '../pages/game.page';
import { MainMenuPage } from '../pages/main-menu.page';
import { SettingsPage } from '../pages/settings.page';
import { LevelEditorPage } from '../pages/level-editor.page';

/**
 * E2E Test Fixtures
 * Provides page objects and utilities for game testing
 */

// Define custom fixtures
type GameFixtures = {
  gamePage: GamePage;
  mainMenuPage: MainMenuPage;
  settingsPage: SettingsPage;
  levelEditorPage: LevelEditorPage;
  gameHelpers: GameHelpers;
};

// Game helper utilities
class GameHelpers {
  constructor(private page: any) {}

  async waitForGameLoad() {
    await this.page.waitForSelector('#game-canvas', { state: 'visible' });
    await this.page.waitForTimeout(500); // Allow game to initialize
  }

  async takeGameScreenshot(name: string) {
    return await this.page.screenshot({ 
      path: `e2e/screenshots/${name}.png`,
      fullPage: false 
    });
  }

  async getGameState() {
    return await this.page.evaluate(() => {
      // Access game state from window object
      return (window as any).gameState;
    });
  }

  async simulateKeyPress(key: string, duration = 100) {
    await this.page.keyboard.down(key);
    await this.page.waitForTimeout(duration);
    await this.page.keyboard.up(key);
  }

  async waitForAnimation() {
    await this.page.waitForTimeout(100);
  }

  async clearLocalStorage() {
    await this.page.evaluate(() => localStorage.clear());
  }

  async setGameSpeed(speed: number) {
    await this.page.evaluate((s) => {
      (window as any).gameSpeed = s;
    }, speed);
  }
}

// Extend base test with custom fixtures
export const test = base.extend<GameFixtures>({
  gamePage: async ({ page }, use) => {
    const gamePage = new GamePage(page);
    await use(gamePage);
  },

  mainMenuPage: async ({ page }, use) => {
    const mainMenuPage = new MainMenuPage(page);
    await use(mainMenuPage);
  },

  settingsPage: async ({ page }, use) => {
    const settingsPage = new SettingsPage(page);
    await use(settingsPage);
  },

  levelEditorPage: async ({ page }, use) => {
    const levelEditorPage = new LevelEditorPage(page);
    await use(levelEditorPage);
  },

  gameHelpers: async ({ page }, use) => {
    const helpers = new GameHelpers(page);
    // Clear storage before each test
    await helpers.clearLocalStorage();
    await use(helpers);
  },
});

export { expect };