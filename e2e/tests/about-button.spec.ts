import { test, expect } from '@playwright/test';

test.describe('About Button', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display About button in main menu', async ({ page }) => {
    const aboutButton = page.getByRole('button', { name: /about/i });
    await expect(aboutButton).toBeVisible();
    await expect(aboutButton).toContainText('About');
    
    // Check button position (should be after Settings)
    const buttons = await page.locator('.menu-button').all();
    const buttonTexts = await Promise.all(buttons.map(btn => btn.textContent()));
    const settingsIndex = buttonTexts.findIndex(text => text?.includes('Settings'));
    const aboutIndex = buttonTexts.findIndex(text => text?.includes('About'));
    expect(aboutIndex).toBeGreaterThan(settingsIndex);
  });

  test('should open About modal when clicked', async ({ page }) => {
    await page.getByRole('button', { name: /about/i }).click();
    
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(page.getByText('Block Breaker')).toBeVisible();
    await expect(page.getByText(/Version \d+\.\d+/)).toBeVisible();
  });

  test('should display all required information', async ({ page }) => {
    await page.getByRole('button', { name: /about/i }).click();
    
    // Check all content sections
    await expect(page.getByText('About')).toBeVisible();
    await expect(page.getByText('Development Team')).toBeVisible();
    await expect(page.getByText('Technologies')).toBeVisible();
    await expect(page.getByText('License')).toBeVisible();
    
    // Check specific content
    await expect(page.getByText(/React 18.3/)).toBeVisible();
    await expect(page.getByText(/TypeScript 5.4/)).toBeVisible();
    await expect(page.getByText(/MIT License/)).toBeVisible();
    await expect(page.getByText(/© 2025 BMAD Brock Bloken/)).toBeVisible();
  });

  test('should display sanitized version only (SEC-001 mitigation)', async ({ page }) => {
    await page.getByRole('button', { name: /about/i }).click();
    
    const versionText = await page.getByText(/Version/).textContent();
    expect(versionText).toMatch(/Version \d+\.\d+$/);
    expect(versionText).not.toMatch(/\d+\.\d+\.\d+/);
    expect(versionText).not.toMatch(/beta/);
    expect(versionText).not.toMatch(/alpha/);
    expect(versionText).not.toMatch(/rc/);
  });

  test('should close with close button', async ({ page }) => {
    await page.getByRole('button', { name: /about/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    
    // Click the bottom close button
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('should close with X button', async ({ page }) => {
    await page.getByRole('button', { name: /about/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    
    // Click the X close button
    await page.getByRole('button', { name: 'Close about dialog' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('should close with ESC key', async ({ page }) => {
    await page.getByRole('button', { name: /about/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    
    // Press ESC key
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('should have proper ARIA attributes for accessibility', async ({ page }) => {
    await page.getByRole('button', { name: /about/i }).click();
    
    const dialog = page.getByRole('dialog');
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(dialog).toHaveAttribute('aria-labelledby', 'about-title');
    
    // Check that close buttons have proper labels
    await expect(page.getByRole('button', { name: 'Close about dialog' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Close' })).toBeVisible();
  });

  test('should maintain focus trap within modal', async ({ page }) => {
    await page.getByRole('button', { name: /about/i }).click();
    
    // The close button should be focused when modal opens
    const closeButton = page.getByRole('button', { name: 'Close about dialog' });
    await expect(closeButton).toBeFocused();
  });

  test('modal should have proper z-index above game canvas (TECH-001 mitigation)', async ({ page }) => {
    await page.getByRole('button', { name: /about/i }).click();
    
    const overlay = page.locator('.about-overlay');
    const zIndex = await overlay.evaluate(el => window.getComputedStyle(el).zIndex);
    expect(parseInt(zIndex)).toBeGreaterThanOrEqual(9999);
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.getByRole('button', { name: /about/i }).click();
    
    const modal = page.locator('.about-modal');
    await expect(modal).toBeVisible();
    
    // Check that modal is properly sized for mobile
    const boundingBox = await modal.boundingBox();
    expect(boundingBox?.width).toBeLessThanOrEqual(375 * 0.95); // 95% of viewport width
  });

  test('complete user journey', async ({ page }) => {
    // User sees About button
    const aboutButton = page.getByRole('button', { name: /about/i });
    await expect(aboutButton).toBeVisible();
    
    // User clicks About button
    await aboutButton.click();
    
    // Modal opens with information
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Block Breaker')).toBeVisible();
    await expect(page.getByText(/Version \d+\.\d+/)).toBeVisible();
    
    // User reads information
    await expect(page.getByText('Development Team')).toBeVisible();
    await expect(page.getByText('Technologies')).toBeVisible();
    
    // User closes modal with ESC
    await page.keyboard.press('Escape');
    
    // User is back at main menu
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(aboutButton).toBeVisible();
  });
});