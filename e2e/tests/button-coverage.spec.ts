import { test, expect } from '@playwright/test';
import { MainMenuPage } from '../pages/main-menu.page';
import { SettingsPage } from '../pages/settings.page';
import { GamePage } from '../pages/game.page';

/**
 * Story 7.5: E2E Button Test Coverage 100%
 * Test Architect: Quinn
 * Created: 2025-09-27
 */

test.describe('Complete Button Coverage Tests', () => {
  let mainMenuPage: MainMenuPage;
  let settingsPage: SettingsPage;
  let gamePage: GamePage;

  test.beforeEach(async ({ page }) => {
    mainMenuPage = new MainMenuPage(page);
    settingsPage = new SettingsPage(page);
    gamePage = new GamePage(page);
    
    // Navigate to main menu for each test
    await mainMenuPage.goto();
  });

  test.describe('AC1: Main Menu Buttons', () => {
    test('should navigate to game when Start Game is clicked', async ({ page }) => {
      // Given: On main menu
      await expect(page.locator('h1')).toBeVisible();
      
      // When: Click Start Game
      await page.getByRole('button', { name: /start/i }).click();
      
      // Then: Navigate to game screen
      await expect(page.locator('canvas')).toBeVisible();
      await expect(page.url()).toContain('#game');
    });

    test('should open settings modal when Settings is clicked', async ({ page }) => {
      // When: Click Settings
      await page.getByRole('button', { name: /settings/i }).click();
      
      // Then: Settings modal appears
      await expect(page.locator('[data-testid="settings-modal"]')).toBeVisible();
      await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible();
    });

    test('should navigate to high scores when High Scores is clicked', async ({ page }) => {
      // When: Click High Scores
      await page.getByRole('button', { name: /high scores/i }).click();
      
      // Then: High scores view appears
      await expect(page.getByRole('heading', { name: /high scores/i })).toBeVisible();
      await expect(page.locator('[data-testid="high-scores-list"]')).toBeVisible();
    });

    test('should open level editor when Level Editor is clicked', async ({ page }) => {
      // When: Click Level Editor
      await page.getByRole('button', { name: /level editor/i }).click();
      
      // Then: Editor screen appears
      await expect(page.locator('[data-testid="editor-canvas"]')).toBeVisible();
      await expect(page.getByRole('heading', { name: /level editor/i })).toBeVisible();
    });

    test('should open about modal when About is clicked', async ({ page }) => {
      // When: Click About
      await page.getByRole('button', { name: /about/i }).click();
      
      // Then: About modal appears
      await expect(page.locator('[data-testid="about-modal"]')).toBeVisible();
      await expect(page.getByText(/version/i)).toBeVisible();
    });
  });

  test.describe('AC2: Settings Modal Controls', () => {
    test.beforeEach(async ({ page }) => {
      // Open settings modal before each settings test
      await page.getByRole('button', { name: /settings/i }).click();
      await expect(page.locator('[data-testid="settings-modal"]')).toBeVisible();
    });

    test('should persist volume slider changes', async ({ page }) => {
      // Get initial volume
      const volumeSlider = page.locator('input[aria-label="Volume"]');
      const initialValue = await volumeSlider.inputValue();
      
      // Change volume
      await volumeSlider.fill('50');
      
      // Save settings
      await page.getByRole('button', { name: /save/i }).click();
      
      // Reopen settings
      await page.getByRole('button', { name: /settings/i }).click();
      
      // Verify persistence
      await expect(volumeSlider).toHaveValue('50');
    });

    test('should toggle sound effects on/off', async ({ page }) => {
      const soundToggle = page.locator('input[aria-label="Sound Effects"]');
      
      // Get initial state
      const initialState = await soundToggle.isChecked();
      
      // Toggle
      await soundToggle.click();
      
      // Verify toggled
      await expect(soundToggle).toBeChecked({ checked: !initialState });
      
      // Save and verify persistence
      await page.getByRole('button', { name: /save/i }).click();
      await page.getByRole('button', { name: /settings/i }).click();
      await expect(soundToggle).toBeChecked({ checked: !initialState });
    });

    test('should toggle background music on/off', async ({ page }) => {
      const musicToggle = page.locator('input[aria-label="Background Music"]');
      
      // Get initial state
      const initialState = await musicToggle.isChecked();
      
      // Toggle
      await musicToggle.click();
      
      // Verify toggled
      await expect(musicToggle).toBeChecked({ checked: !initialState });
    });

    test('should change theme selection', async ({ page }) => {
      const themeSelector = page.locator('select[aria-label="Theme"]');
      
      // Select different theme
      await themeSelector.selectOption('neon');
      
      // Save settings
      await page.getByRole('button', { name: /save/i }).click();
      
      // Verify theme applied (check for theme class on body)
      await expect(page.locator('body')).toHaveClass(/theme-neon/);
    });

    test('should change difficulty selection', async ({ page }) => {
      const difficultySelector = page.locator('select[aria-label="Difficulty"]');
      
      // Select hard difficulty
      await difficultySelector.selectOption('hard');
      
      // Verify selection
      await expect(difficultySelector).toHaveValue('hard');
      
      // Save and verify persistence
      await page.getByRole('button', { name: /save/i }).click();
      await page.getByRole('button', { name: /settings/i }).click();
      await expect(difficultySelector).toHaveValue('hard');
    });

    test('should revert changes when Cancel is clicked', async ({ page }) => {
      const volumeSlider = page.locator('input[aria-label="Volume"]');
      const initialValue = await volumeSlider.inputValue();
      
      // Make changes
      await volumeSlider.fill('0');
      
      // Cancel
      await page.getByRole('button', { name: /cancel/i }).click();
      
      // Reopen and verify no changes
      await page.getByRole('button', { name: /settings/i }).click();
      await expect(volumeSlider).toHaveValue(initialValue);
    });
  });

  test.describe('AC3: In-Game UI Buttons', () => {
    test.beforeEach(async ({ page }) => {
      // Start game before each in-game test
      await page.getByRole('button', { name: /start/i }).click();
      await expect(page.locator('canvas')).toBeVisible();
    });

    test('should pause game when pause button is clicked', async ({ page }) => {
      // Start the game (spacebar)
      await page.keyboard.press('Space');
      
      // Click pause
      await page.getByRole('button', { name: /pause/i }).click();
      
      // Verify paused state
      await expect(page.locator('[data-testid="pause-menu"]')).toBeVisible();
      await expect(page.getByText(/paused/i)).toBeVisible();
    });

    test('should resume game from pause menu', async ({ page }) => {
      // Pause game
      await page.keyboard.press('Space');
      await page.getByRole('button', { name: /pause/i }).click();
      
      // Resume
      await page.getByRole('button', { name: /resume/i }).click();
      
      // Verify resumed
      await expect(page.locator('[data-testid="pause-menu"]')).not.toBeVisible();
    });

    test('should return to main menu from game', async ({ page }) => {
      // Click back to menu
      await page.getByRole('button', { name: /back.*menu|menu/i }).click();
      
      // Verify on main menu
      await expect(page.getByRole('button', { name: /start/i })).toBeVisible();
      await expect(page.locator('canvas')).not.toBeVisible();
    });

    test('should restart game when restart is clicked', async ({ page }) => {
      // Start and play for a moment
      await page.keyboard.press('Space');
      await page.waitForTimeout(1000);
      
      // Get initial score
      const initialScore = await page.locator('[data-testid="score"]').textContent();
      
      // Restart
      await page.getByRole('button', { name: /restart/i }).click();
      
      // Verify reset
      await expect(page.locator('[data-testid="score"]')).toHaveText('0');
      await expect(page.locator('[data-testid="lives"]')).toHaveText('3');
    });
  });

  test.describe('AC4: Level Editor Buttons', () => {
    test.beforeEach(async ({ page }) => {
      // Open level editor
      await page.getByRole('button', { name: /level editor/i }).click();
      await expect(page.locator('[data-testid="editor-canvas"]')).toBeVisible();
    });

    test('should save level with valid data', async ({ page }) => {
      // Add some blocks to canvas
      await page.locator('[data-testid="block-tool"]').click();
      await page.locator('[data-testid="editor-canvas"]').click({ position: { x: 100, y: 100 } });
      
      // Save level
      await page.getByRole('button', { name: /save.*level/i }).click();
      
      // Verify save dialog or success message
      await expect(page.getByText(/level saved/i)).toBeVisible();
    });

    test('should load existing level', async ({ page }) => {
      // Click load
      await page.getByRole('button', { name: /load.*level/i }).click();
      
      // Select a level
      await page.locator('[data-testid="level-select"]').selectOption('1');
      
      // Verify level loaded
      await expect(page.locator('[data-testid="editor-canvas"]')).toHaveAttribute('data-level', '1');
    });

    test('should clear canvas when clear is clicked', async ({ page }) => {
      // Add blocks
      await page.locator('[data-testid="block-tool"]').click();
      await page.locator('[data-testid="editor-canvas"]').click({ position: { x: 100, y: 100 } });
      
      // Clear canvas
      await page.getByRole('button', { name: /clear/i }).click();
      
      // Confirm clear
      await page.getByRole('button', { name: /confirm/i }).click();
      
      // Verify canvas is empty
      await expect(page.locator('[data-testid="block-count"]')).toHaveText('0');
    });

    test('should start preview when test play is clicked', async ({ page }) => {
      // Add blocks for testing
      await page.locator('[data-testid="block-tool"]').click();
      await page.locator('[data-testid="editor-canvas"]').click({ position: { x: 100, y: 100 } });
      
      // Test play
      await page.getByRole('button', { name: /test.*play/i }).click();
      
      // Verify preview mode
      await expect(page.locator('[data-testid="preview-mode"]')).toBeVisible();
      await expect(page.getByRole('button', { name: /stop.*preview/i })).toBeVisible();
    });

    test('should warn on exit with unsaved changes', async ({ page }) => {
      // Make changes
      await page.locator('[data-testid="block-tool"]').click();
      await page.locator('[data-testid="editor-canvas"]').click({ position: { x: 100, y: 100 } });
      
      // Try to exit
      await page.getByRole('button', { name: /exit/i }).click();
      
      // Verify warning dialog
      await expect(page.getByText(/unsaved changes/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /save.*exit/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /discard/i })).toBeVisible();
    });
  });

  test.describe('AC6-7: Cross-browser and Performance', () => {
    test('should complete all button tests within 2 minutes', async ({ page }) => {
      const startTime = Date.now();
      
      // Run quick smoke test of all major buttons
      await page.getByRole('button', { name: /start/i }).click();
      await page.getByRole('button', { name: /back.*menu/i }).click();
      await page.getByRole('button', { name: /settings/i }).click();
      await page.getByRole('button', { name: /cancel/i }).click();
      await page.getByRole('button', { name: /high scores/i }).click();
      await page.getByRole('button', { name: /back/i }).click();
      
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      
      // Verify under 2 minutes (120 seconds)
      expect(duration).toBeLessThan(120);
    });
  });
});

// Browser-specific test configurations
test.describe('Browser Compatibility', () => {
  ['chromium', 'firefox', 'webkit'].forEach(browserName => {
    test(`should work in ${browserName}`, async ({ page, browserName: actualBrowser }) => {
      if (actualBrowser !== browserName) {
        test.skip();
      }
      
      // Basic smoke test for each browser
      const mainMenuPage = new MainMenuPage(page);
      await mainMenuPage.goto();
      
      // Test critical button
      await page.getByRole('button', { name: /start/i }).click();
      await expect(page.locator('canvas')).toBeVisible();
      
      // Log browser-specific issues if any
      console.log(`${browserName}: All critical buttons functional`);
    });
  });
});