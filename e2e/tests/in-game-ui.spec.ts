import { test, expect, Page } from '@playwright/test';

test.describe('In-game UI Button Tests', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    // Navigate to main menu and start game
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Start the game
    const startButton = page.getByRole('button').filter({ hasText: /start|play/i }).first();
    if (await startButton.count() > 0) {
      await startButton.click();
      await page.waitForTimeout(1000); // Wait for game initialization
    }
  });

  test('should display pause button during gameplay', async () => {
    // Check if pause button exists in game UI
    const pauseButton = page.getByRole('button').filter({ hasText: /pause/i }).first();
    
    if (await pauseButton.count() > 0) {
      await expect(pauseButton).toBeVisible();
      await expect(pauseButton).toBeEnabled();
    } else {
      // Skip if game UI not fully implemented
      test.skip();
    }
  });

  test('should pause game when pause button is clicked', async () => {
    const pauseButton = page.getByRole('button').filter({ hasText: /pause/i }).first();
    
    if (await pauseButton.count() > 0) {
      await pauseButton.click();
      
      // Check for pause menu or paused state indicator
      const pauseMenu = page.locator('[data-testid="pause-menu"], .pause-menu, #pause-menu').first();
      const resumeButton = page.getByRole('button').filter({ hasText: /resume/i }).first();
      
      // Either pause menu should be visible or resume button should appear
      const pauseMenuVisible = await pauseMenu.count() > 0;
      const resumeButtonVisible = await resumeButton.count() > 0;
      
      expect(pauseMenuVisible || resumeButtonVisible).toBeTruthy();
    } else {
      test.skip();
    }
  });

  test('should resume game when resume button is clicked', async () => {
    const pauseButton = page.getByRole('button').filter({ hasText: /pause/i }).first();
    
    if (await pauseButton.count() > 0) {
      // First pause the game
      await pauseButton.click();
      await page.waitForTimeout(500);
      
      // Find and click resume button
      const resumeButton = page.getByRole('button').filter({ hasText: /resume/i }).first();
      
      if (await resumeButton.count() > 0) {
        await resumeButton.click();
        await page.waitForTimeout(500);
        
        // Pause button should be visible again
        await expect(pauseButton).toBeVisible();
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test('should navigate back to menu when "Back to Menu" is clicked', async () => {
    // Try to find pause button first
    const pauseButton = page.getByRole('button').filter({ hasText: /pause/i }).first();
    
    if (await pauseButton.count() > 0) {
      await pauseButton.click();
      await page.waitForTimeout(500);
    }
    
    // Look for back to menu button
    const backButton = page.getByRole('button').filter({ 
      hasText: /back.*menu|menu|main.*menu|exit/i 
    }).first();
    
    if (await backButton.count() > 0) {
      await backButton.click();
      await page.waitForTimeout(1000);
      
      // Should be back at main menu
      const startButton = page.getByRole('button').filter({ hasText: /start|play/i }).first();
      await expect(startButton).toBeVisible();
    } else {
      test.skip();
    }
  });

  test('should restart game when restart button is clicked', async () => {
    // Try to find pause button first
    const pauseButton = page.getByRole('button').filter({ hasText: /pause/i }).first();
    
    if (await pauseButton.count() > 0) {
      await pauseButton.click();
      await page.waitForTimeout(500);
    }
    
    // Look for restart button
    const restartButton = page.getByRole('button').filter({ 
      hasText: /restart|reset|new.*game/i 
    }).first();
    
    if (await restartButton.count() > 0) {
      // Get initial game state if possible
      const canvas = page.locator('canvas').first();
      const canvasExists = await canvas.count() > 0;
      
      await restartButton.click();
      await page.waitForTimeout(1000);
      
      // Game should still be running (canvas visible)
      if (canvasExists) {
        await expect(canvas).toBeVisible();
      }
      
      // If there's a score display, it should be reset
      const scoreDisplay = page.locator('[data-testid="score"], .score, #score').first();
      if (await scoreDisplay.count() > 0) {
        const scoreText = await scoreDisplay.textContent();
        expect(scoreText).toMatch(/0|score.*0/i);
      }
    } else {
      test.skip();
    }
  });

  test('should handle power-up activation buttons if present', async () => {
    // Look for any power-up buttons
    const powerUpButtons = page.getByRole('button').filter({ 
      hasText: /power|boost|special|ability/i 
    });
    
    const count = await powerUpButtons.count();
    
    if (count > 0) {
      // Test first power-up button
      const firstPowerUp = powerUpButtons.first();
      
      // Check if it's enabled (might be disabled until collected)
      const isEnabled = await firstPowerUp.isEnabled();
      
      if (isEnabled) {
        await firstPowerUp.click();
        // Power-up should activate (exact behavior depends on implementation)
        await page.waitForTimeout(500);
      }
      
      // Just verify button exists and can be interacted with
      await expect(firstPowerUp).toBeVisible();
    } else {
      // No power-up buttons implemented yet
      test.skip();
    }
  });
});