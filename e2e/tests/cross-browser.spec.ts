import { test, expect, devices } from '@playwright/test';
import { MainMenuPage } from '../pages/main-menu.page';
import { GamePage } from '../pages/game.page';

/**
 * Cross-Browser E2E Tests
 * Story 7.2: E2E Testing Implementation
 */

test.describe('Cross-Browser Compatibility', () => {
  test('should work in Chrome', async ({ browserName, page }) => {
    test.skip(browserName !== 'chromium', 'Chrome-specific test');
    
    const mainMenu = new MainMenuPage(page);
    await mainMenu.goto();
    await mainMenu.startNewGame();
    
    const game = new GamePage(page);
    await game.startGame();
    
    const state = await game.canvas.getGameState();
    expect(state).toBeTruthy();
  });

  test('should work in Firefox', async ({ browserName, page }) => {
    test.skip(browserName !== 'firefox', 'Firefox-specific test');
    
    const mainMenu = new MainMenuPage(page);
    await mainMenu.goto();
    await mainMenu.startNewGame();
    
    const game = new GamePage(page);
    await game.startGame();
    
    const state = await game.canvas.getGameState();
    expect(state).toBeTruthy();
  });

  test('should work in Safari', async ({ browserName, page }) => {
    test.skip(browserName !== 'webkit', 'Safari-specific test');
    
    const mainMenu = new MainMenuPage(page);
    await mainMenu.goto();
    await mainMenu.startNewGame();
    
    const game = new GamePage(page);
    await game.startGame();
    
    const state = await game.canvas.getGameState();
    expect(state).toBeTruthy();
  });

  test('should work on mobile devices', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile-specific test');
    
    const mainMenu = new MainMenuPage(page);
    await mainMenu.goto();
    
    expect(await mainMenu.isVisible('button[aria-label="Play Game"]')).toBe(true);
  });
});