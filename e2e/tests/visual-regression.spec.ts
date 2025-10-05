import { test, expect } from '@playwright/test';
import { MainMenuPage } from '../pages/main-menu.page';
import { GamePage } from '../pages/game.page';

/**
 * Visual Regression E2E Tests
 * Story 7.2: E2E Testing Implementation
 */

test.describe('Visual Regression', () => {
  test('main menu visual test', async ({ page }) => {
    const mainMenu = new MainMenuPage(page);
    await mainMenu.goto();
    
    await expect(page).toHaveScreenshot('main-menu.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('game screen visual test', async ({ page }) => {
    const mainMenu = new MainMenuPage(page);
    const game = new GamePage(page);
    
    await mainMenu.goto();
    await mainMenu.startNewGame();
    await game.startGame();
    
    // Wait for game to stabilize
    await page.waitForTimeout(1000);
    
    await expect(page.locator('canvas#game-canvas')).toHaveScreenshot('game-canvas.png');
  });

  test('settings modal visual test', async ({ page }) => {
    const mainMenu = new MainMenuPage(page);
    await mainMenu.goto();
    await mainMenu.openSettings();
    
    await expect(page.locator('[data-testid="settings-modal"]')).toHaveScreenshot('settings-modal.png');
  });

  test('pause menu visual test', async ({ page }) => {
    const mainMenu = new MainMenuPage(page);
    const game = new GamePage(page);
    
    await mainMenu.goto();
    await mainMenu.startNewGame();
    await game.startGame();
    await game.pauseGame();
    
    await expect(page.locator('[data-testid="pause-menu"]')).toHaveScreenshot('pause-menu.png');
  });

  test('game over screen visual test', async ({ page }) => {
    const mainMenu = new MainMenuPage(page);
    const game = new GamePage(page);
    
    await mainMenu.goto();
    await mainMenu.startNewGame();
    await game.startGame();
    
    // Simulate game over
    await page.evaluate(() => {
      const gameEngine = (window as any).gameEngine;
      if (gameEngine?.state) {
        gameEngine.state.lives = 0;
        gameEngine.state.isGameOver = true;
      }
    });
    
    await expect(page.locator('[data-testid="game-over-screen"]')).toHaveScreenshot('game-over.png');
  });
});