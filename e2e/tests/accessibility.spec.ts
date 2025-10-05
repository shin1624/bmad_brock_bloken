import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';
import { MainMenuPage } from '../pages/main-menu.page';
import { GamePage } from '../pages/game.page';

/**
 * Accessibility E2E Tests
 * Story 7.2: E2E Testing Implementation
 */

test.describe('Accessibility Tests', () => {
  test('main menu should be accessible', async ({ page }) => {
    const mainMenu = new MainMenuPage(page);
    await mainMenu.goto();
    
    await injectAxe(page);
    await checkA11y(page, undefined, {
      detailedReport: true,
      detailedReportOptions: {
        html: true
      }
    });
  });

  test('should support keyboard navigation', async ({ page }) => {
    const mainMenu = new MainMenuPage(page);
    await mainMenu.goto();
    
    // Tab through all buttons
    const buttons = ['Play Game', 'Settings', 'Level Editor', 'High Scores', 'About'];
    
    for (const buttonText of buttons) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => {
        return document.activeElement?.getAttribute('aria-label');
      });
      expect(buttons).toContain(focused);
    }
  });

  test('should have proper ARIA labels', async ({ page }) => {
    const mainMenu = new MainMenuPage(page);
    await mainMenu.goto();
    
    // Check for ARIA labels
    const playButton = page.locator('button[aria-label="Play Game"]');
    expect(await playButton.getAttribute('aria-label')).toBe('Play Game');
    
    const settingsButton = page.locator('button[aria-label="Settings"]');
    expect(await settingsButton.getAttribute('aria-label')).toBe('Settings');
  });

  test('game should be playable with keyboard only', async ({ page }) => {
    const mainMenu = new MainMenuPage(page);
    const game = new GamePage(page);
    
    await mainMenu.goto();
    
    // Navigate to play button with keyboard
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    
    await game.startGame();
    
    // Control paddle with keyboard
    await game.movePaddleWithKeyboard('left', 500);
    await game.movePaddleWithKeyboard('right', 500);
    
    // Pause with keyboard
    await page.keyboard.press('Escape');
    expect(await game.isPauseMenuVisible()).toBe(true);
  });

  test('should have sufficient color contrast', async ({ page }) => {
    const mainMenu = new MainMenuPage(page);
    await mainMenu.goto();
    
    await injectAxe(page);
    await checkA11y(page, undefined, {
      rules: {
        'color-contrast': { enabled: true }
      }
    });
  });

  test('should provide focus indicators', async ({ page }) => {
    const mainMenu = new MainMenuPage(page);
    await mainMenu.goto();
    
    // Focus on button
    await page.keyboard.press('Tab');
    
    // Check for focus outline
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      const styles = window.getComputedStyle(el);
      return {
        outline: styles.outline,
        outlineWidth: styles.outlineWidth,
        boxShadow: styles.boxShadow
      };
    });
    
    // Should have visible focus indicator
    expect(
      focusedElement.outline !== 'none' || 
      focusedElement.boxShadow !== 'none'
    ).toBe(true);
  });
});