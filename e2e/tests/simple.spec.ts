import { test, expect } from '@playwright/test';

test.describe('Simple Test', () => {
  test('should load the application', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Vite \+ React \+ TS/);
  });
});