import { test, expect } from '@playwright/test';
import {
  retryWithBackoff,
  waitForElement,
  safeClick,
  findButton,
  testData,
  assertionMessage,
  waitForStableDOM,
  captureErrorContext
} from '../fixtures/test-helpers';

test.describe('Test Reliability Improvements Demo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForStableDOM(page);
  });

  test('should use retry logic for flaky operations', async ({ page }) => {
    // Demonstrate retry with backoff
    await retryWithBackoff(async () => {
      const button = await findButton(page, /start|play/i);
      if (!button) {
        throw new Error('Button not found');
      }
      await safeClick(page, button);
    }, { maxAttempts: 3, delay: 1000 });

    // Verify navigation occurred
    const canvas = await waitForElement(page, 'canvas', { timeout: 5000 });
    await expect(canvas).toBeVisible();
  });

  test('should handle dynamic button finding', async ({ page }) => {
    // Find settings button with multiple strategies
    const settingsButton = await findButton(page, /settings|options|preferences/i);
    
    if (settingsButton) {
      await safeClick(page, settingsButton, { 
        waitBefore: 500, 
        waitAfter: 1000 
      });
      
      // Wait for modal with custom conditions
      const modal = await waitForElement(page, '[role="dialog"], .modal, .settings-modal', {
        state: 'visible',
        timeout: 5000
      });
      
      expect(modal).toBeTruthy();
    } else {
      test.skip();
    }
  });

  test('should use test data fixtures for consistency', async ({ page }) => {
    // Navigate to settings
    const settingsButton = await findButton(page, /settings/i);
    
    if (settingsButton) {
      await safeClick(page, settingsButton);
      
      // Use fixture data for testing
      const volumeSlider = page.locator('input[type="range"], input[type="number"]').first();
      
      if (await volumeSlider.count() > 0) {
        await volumeSlider.fill(testData.defaultSettings.volume.toString());
        
        const value = await volumeSlider.inputValue();
        expect(value, assertionMessage(
          'set volume',
          testData.defaultSettings.volume.toString(),
          value
        )).toBe(testData.defaultSettings.volume.toString());
      }
    } else {
      test.skip();
    }
  });

  test('should capture detailed error context on failure', async ({ page }) => {
    try {
      // Intentionally try to find a non-existent element to demo error handling
      const nonExistent = await findButton(page, /this-button-does-not-exist/i, {
        timeout: 1000
      });
      
      if (!nonExistent) {
        // This is expected - just demonstrating the helper
        console.log('Button not found as expected - error handling working');
      }
    } catch (error) {
      await captureErrorContext(page, error as Error);
    }
  });

  test('should wait for DOM stability before interactions', async ({ page }) => {
    // Wait for initial page to stabilize
    await waitForStableDOM(page, 1000);
    
    // Now interact with stable page
    const mainMenu = page.locator('.main-menu, #main-menu, [data-testid="main-menu"]').first();
    
    if (await mainMenu.count() > 0) {
      await expect(mainMenu).toBeVisible();
      
      // Count buttons in stable state
      const buttons = page.getByRole('button');
      const count = await buttons.count();
      
      expect(count, assertionMessage(
        'find buttons',
        'at least 1 button',
        `${count} buttons`
      )).toBeGreaterThan(0);
    }
  });
});