import { Page } from '@playwright/test';
import { CanvasHelpers } from '../fixtures/canvas-helpers';

/**
 * Base Page Object Model
 * Story 7.2: E2E Testing Implementation
 */

export class BasePage {
  protected canvas: CanvasHelpers;

  constructor(protected page: Page) {
    this.canvas = new CanvasHelpers(page);
  }

  /**
   * Navigate to the application
   */
  async goto(path = '/') {
    await this.page.goto(path);
    await this.waitForAppReady();
  }

  /**
   * Wait for the application to be ready
   */
  async waitForAppReady() {
    // Wait for React to mount
    await this.page.waitForSelector('#root', { state: 'visible' });
    
    // Wait for initial loading to complete
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Take a full page screenshot
   */
  async takeScreenshot(name: string) {
    await this.page.screenshot({ 
      path: `e2e/screenshots/${name}.png`,
      fullPage: true 
    });
  }

  /**
   * Check if element is visible
   */
  async isVisible(selector: string): Promise<boolean> {
    const element = await this.page.locator(selector);
    return await element.isVisible();
  }

  /**
   * Wait for element to be visible
   */
  async waitForVisible(selector: string, timeout = 5000) {
    await this.page.locator(selector).waitFor({ 
      state: 'visible', 
      timeout 
    });
  }

  /**
   * Click element with retry logic
   */
  async clickWithRetry(selector: string, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        await this.page.locator(selector).click({ timeout: 5000 });
        return;
      } catch (error) {
        if (i === retries - 1) throw error;
        await this.page.waitForTimeout(1000);
      }
    }
  }

  /**
   * Get text content of element
   */
  async getText(selector: string): Promise<string> {
    return await this.page.locator(selector).textContent() || '';
  }

  /**
   * Check if button is enabled
   */
  async isButtonEnabled(selector: string): Promise<boolean> {
    return await this.page.locator(selector).isEnabled();
  }

  /**
   * Wait for navigation
   */
  async waitForNavigation() {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get current URL
   */
  async getCurrentURL(): Promise<string> {
    return this.page.url();
  }

  /**
   * Reload the page
   */
  async reload() {
    await this.page.reload();
    await this.waitForAppReady();
  }

  /**
   * Check for console errors
   */
  async checkForConsoleErrors(): Promise<string[]> {
    const errors: string[] = [];
    
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    return errors;
  }

  /**
   * Clear local storage
   */
  async clearLocalStorage() {
    await this.page.evaluate(() => localStorage.clear());
  }

  /**
   * Set local storage item
   */
  async setLocalStorageItem(key: string, value: string) {
    await this.page.evaluate(([k, v]) => {
      localStorage.setItem(k, v);
    }, [key, value]);
  }

  /**
   * Get local storage item
   */
  async getLocalStorageItem(key: string): Promise<string | null> {
    return await this.page.evaluate((k) => {
      return localStorage.getItem(k);
    }, key);
  }
}