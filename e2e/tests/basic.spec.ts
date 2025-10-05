import { test, expect } from "@playwright/test";

/**
 * Basic E2E Tests for Story 7.2 Verification
 */

test.describe("Basic E2E Tests", () => {
  test("should load application", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Vite \+ React \+ TS/);
  });

  test("should display main menu", async ({ page }) => {
    await page.goto("/");

    // Check for main menu elements - updated to match actual text
    const startButton = page.getByRole("button", { name: /start/i });
    await expect(startButton).toBeVisible();
  });

  test("should navigate to game screen", async ({ page }) => {
    await page.goto("/");

    // Click start button - updated to match actual text
    const startButton = page.getByRole("button", { name: /start/i });
    await startButton.click();

    // Verify canvas is visible
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();
  });

  test("should navigate to settings", async ({ page }) => {
    await page.goto("/");

    // Click settings button
    const settingsButton = page.getByRole("button", { name: /settings/i });
    await settingsButton.click();

    // Verify settings screen is displayed
    const settingsTitle = page.getByText(/settings/i);
    await expect(settingsTitle).toBeVisible();
  });

  test("should navigate to high scores", async ({ page }) => {
    await page.goto("/");

    // Click high scores button
    const highScoresButton = page.getByRole("button", { name: /high scores/i });
    await highScoresButton.click();

    // Verify high scores screen is displayed
    const highScoresTitle = page.getByText(/high scores/i);
    await expect(highScoresTitle).toBeVisible();
  });

  test("should return to main menu from game", async ({ page }) => {
    await page.goto("/");

    // Navigate to game
    const startButton = page.getByRole("button", { name: /start/i });
    await startButton.click();

    // Return to menu
    const backButton = page.getByRole("button", { name: /back|menu/i });
    await backButton.click();

    // Verify back on main menu
    const startButtonAgain = page.getByRole("button", { name: /start/i });
    await expect(startButtonAgain).toBeVisible();
  });
});
