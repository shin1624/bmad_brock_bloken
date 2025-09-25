import { test, expect } from '../fixtures/game.fixture';

/**
 * E2E Tests: UI Interactions
 * Tests for menu navigation, settings, level editor, and UI responsiveness
 */

test.describe('UI Interactions', () => {
  test.beforeEach(async ({ page, gameHelpers }) => {
    await page.goto('/');
    await gameHelpers.clearLocalStorage();
  });

  test.describe('Main Menu Navigation', () => {
    test('should display main menu with all options', async ({ mainMenuPage }) => {
      await mainMenuPage.goto();
      
      // Verify all menu options are visible
      expect(await mainMenuPage.isVisible()).toBe(true);
      expect(await mainMenuPage.playButton.isVisible()).toBe(true);
      expect(await mainMenuPage.settingsButton.isVisible()).toBe(true);
      expect(await mainMenuPage.highScoresButton.isVisible()).toBe(true);
      expect(await mainMenuPage.levelEditorButton.isVisible()).toBe(true);
    });

    test('should navigate to game when play is clicked', async ({ mainMenuPage, gamePage }) => {
      await mainMenuPage.goto();
      await mainMenuPage.clickPlay();
      
      // Should transition to game
      await expect(gamePage.gameCanvas).toBeVisible();
      expect(await gamePage.isPlaying()).toBe(false); // Not started yet
    });

    test('should navigate to settings when settings is clicked', async ({ mainMenuPage, settingsPage }) => {
      await mainMenuPage.goto();
      await mainMenuPage.clickSettings();
      
      // Should show settings panel
      await expect(settingsPage.settingsPanel).toBeVisible();
    });

    test('should navigate to high scores', async ({ mainMenuPage, page }) => {
      await mainMenuPage.goto();
      await mainMenuPage.clickHighScores();
      
      // Should show high scores
      await expect(page.locator('.high-scores-panel')).toBeVisible();
    });

    test('should navigate to level editor', async ({ mainMenuPage, levelEditorPage }) => {
      await mainMenuPage.goto();
      await mainMenuPage.clickLevelEditor();
      
      // Should show level editor
      await expect(levelEditorPage.editorCanvas).toBeVisible();
    });
  });

  test.describe('Settings Management', () => {
    test('should open settings panel', async ({ mainMenuPage, settingsPage }) => {
      await mainMenuPage.goto();
      await mainMenuPage.clickSettings();
      
      expect(await settingsPage.isVisible()).toBe(true);
    });

    test('should adjust volume controls', async ({ mainMenuPage, settingsPage }) => {
      await mainMenuPage.goto();
      await mainMenuPage.clickSettings();
      
      // Test master volume
      await settingsPage.setMasterVolume(50);
      expect(await settingsPage.getMasterVolume()).toBe(50);
      
      // Test sound effects volume
      await settingsPage.setSoundEffectsVolume(75);
      expect(await settingsPage.getSoundEffectsVolume()).toBe(75);
      
      // Test music volume
      await settingsPage.setMusicVolume(25);
      expect(await settingsPage.getMusicVolume()).toBe(25);
      
      // Test mute toggle
      await settingsPage.toggleMute();
      expect(await settingsPage.isMuted()).toBe(true);
      
      await settingsPage.toggleMute();
      expect(await settingsPage.isMuted()).toBe(false);
    });

    test('should change visual theme', async ({ mainMenuPage, settingsPage, page }) => {
      await mainMenuPage.goto();
      await mainMenuPage.clickSettings();
      
      // Get available themes
      const themes = await settingsPage.getAvailableThemes();
      expect(themes.length).toBeGreaterThan(0);
      
      // Change theme
      if (themes.length > 1) {
        await settingsPage.selectTheme(themes[1]);
        
        // Verify theme changed
        const bodyClass = await page.locator('body').getAttribute('class');
        expect(bodyClass).toContain(`theme-${themes[1]}`);
      }
    });

    test('should change control scheme', async ({ mainMenuPage, settingsPage }) => {
      await mainMenuPage.goto();
      await mainMenuPage.clickSettings();
      
      // Test keyboard control selection
      await settingsPage.selectControlScheme('keyboard');
      expect(await settingsPage.getControlScheme()).toBe('keyboard');
      
      // Test mouse control selection
      await settingsPage.selectControlScheme('mouse');
      expect(await settingsPage.getControlScheme()).toBe('mouse');
      
      // Test touch control selection
      await settingsPage.selectControlScheme('touch');
      expect(await settingsPage.getControlScheme()).toBe('touch');
    });

    test('should persist settings across sessions', async ({ mainMenuPage, settingsPage, page }) => {
      await mainMenuPage.goto();
      await mainMenuPage.clickSettings();
      
      // Change settings
      await settingsPage.setMasterVolume(65);
      await settingsPage.selectTheme('retro');
      await settingsPage.selectControlScheme('keyboard');
      
      // Save settings
      await settingsPage.saveSettings();
      
      // Reload page
      await page.reload();
      
      // Navigate back to settings
      await mainMenuPage.goto();
      await mainMenuPage.clickSettings();
      
      // Verify settings persisted
      expect(await settingsPage.getMasterVolume()).toBe(65);
      expect(await settingsPage.getCurrentTheme()).toBe('retro');
      expect(await settingsPage.getControlScheme()).toBe('keyboard');
    });

    test('should reset settings to defaults', async ({ mainMenuPage, settingsPage }) => {
      await mainMenuPage.goto();
      await mainMenuPage.clickSettings();
      
      // Change settings
      await settingsPage.setMasterVolume(30);
      await settingsPage.selectTheme('neon');
      
      // Reset to defaults
      await settingsPage.resetToDefaults();
      
      // Verify defaults restored
      expect(await settingsPage.getMasterVolume()).toBe(100);
      expect(await settingsPage.getCurrentTheme()).toBe('default');
    });
  });

  test.describe('Pause Menu', () => {
    test('should show pause menu when ESC is pressed during game', async ({ mainMenuPage, gamePage, page }) => {
      await mainMenuPage.goto();
      await mainMenuPage.clickPlay();
      await gamePage.startNewGame();
      
      // Press ESC to pause
      await page.keyboard.press('Escape');
      
      // Pause menu should be visible
      await expect(page.locator('.pause-menu')).toBeVisible();
      expect(await gamePage.isPaused()).toBe(true);
    });

    test('should resume game from pause menu', async ({ mainMenuPage, gamePage, page }) => {
      await mainMenuPage.goto();
      await mainMenuPage.clickPlay();
      await gamePage.startNewGame();
      
      // Pause game
      await page.keyboard.press('Escape');
      await expect(page.locator('.pause-menu')).toBeVisible();
      
      // Click resume
      await page.click('.pause-menu .resume-button');
      
      // Game should resume
      await expect(page.locator('.pause-menu')).not.toBeVisible();
      expect(await gamePage.isPaused()).toBe(false);
    });

    test('should restart game from pause menu', async ({ mainMenuPage, gamePage, page }) => {
      await mainMenuPage.goto();
      await mainMenuPage.clickPlay();
      await gamePage.startNewGame();
      
      // Play a bit to change score
      await page.keyboard.press('Space');
      await page.waitForTimeout(2000);
      
      // Pause game
      await page.keyboard.press('Escape');
      
      // Click restart
      await page.click('.pause-menu .restart-button');
      
      // Game should restart
      expect(await gamePage.getScore()).toBe(0);
      expect(await gamePage.getLives()).toBe(3);
      expect(await gamePage.getLevel()).toBe(1);
    });

    test('should return to main menu from pause menu', async ({ mainMenuPage, gamePage, page }) => {
      await mainMenuPage.goto();
      await mainMenuPage.clickPlay();
      await gamePage.startNewGame();
      
      // Pause game
      await page.keyboard.press('Escape');
      
      // Click main menu
      await page.click('.pause-menu .main-menu-button');
      
      // Should return to main menu
      expect(await mainMenuPage.isVisible()).toBe(true);
    });
  });

  test.describe('Game Over Screen', () => {
    test('should display game over screen when game ends', async ({ mainMenuPage, gamePage, page }) => {
      await mainMenuPage.goto();
      await mainMenuPage.clickPlay();
      await gamePage.startNewGame();
      
      // Force game over
      await page.evaluate(() => {
        if ((window as any).gameState) {
          (window as any).gameState.lives = 0;
          (window as any).gameState.isGameOver = true;
        }
      });
      
      // Game over screen should appear
      await expect(page.locator('.game-over-screen')).toBeVisible();
    });

    test('should display final score on game over', async ({ mainMenuPage, gamePage, page }) => {
      await mainMenuPage.goto();
      await mainMenuPage.clickPlay();
      await gamePage.startNewGame();
      
      // Set a specific score
      await page.evaluate(() => {
        if ((window as any).gameState) {
          (window as any).gameState.score = 12345;
          (window as any).gameState.lives = 0;
          (window as any).gameState.isGameOver = true;
        }
      });
      
      // Check score display
      const scoreText = await page.locator('.game-over-screen .final-score').textContent();
      expect(scoreText).toContain('12345');
    });

    test('should allow restart from game over screen', async ({ mainMenuPage, gamePage, page }) => {
      await mainMenuPage.goto();
      await mainMenuPage.clickPlay();
      await gamePage.startNewGame();
      
      // Force game over
      await page.evaluate(() => {
        if ((window as any).gameState) {
          (window as any).gameState.lives = 0;
          (window as any).gameState.isGameOver = true;
        }
      });
      
      // Click restart
      await page.click('.game-over-screen .restart-button');
      
      // Game should restart
      expect(await gamePage.getScore()).toBe(0);
      expect(await gamePage.getLives()).toBe(3);
      expect(await gamePage.isGameOver()).toBe(false);
    });

    test('should save high score if applicable', async ({ mainMenuPage, gamePage, page }) => {
      await mainMenuPage.goto();
      await mainMenuPage.clickPlay();
      await gamePage.startNewGame();
      
      // Set a high score
      await page.evaluate(() => {
        if ((window as any).gameState) {
          (window as any).gameState.score = 99999;
          (window as any).gameState.lives = 0;
          (window as any).gameState.isGameOver = true;
        }
      });
      
      // Check if high score prompt appears
      await expect(page.locator('.high-score-entry')).toBeVisible();
      
      // Enter name
      await page.fill('.high-score-entry input', 'TEST');
      await page.click('.high-score-entry .submit-button');
      
      // Navigate to high scores
      await page.click('.game-over-screen .high-scores-button');
      
      // Verify score is saved
      const scores = await page.locator('.high-scores-list .score-entry').allTextContents();
      expect(scores.some(s => s.includes('99999') && s.includes('TEST'))).toBe(true);
    });
  });

  test.describe('HUD Elements', () => {
    test('should display score, lives, and level', async ({ mainMenuPage, gamePage }) => {
      await mainMenuPage.goto();
      await mainMenuPage.clickPlay();
      await gamePage.startNewGame();
      
      const hud = await gamePage.getHUDElements();
      
      expect(hud.score).toContain('0');
      expect(hud.lives).toContain('3');
      expect(hud.level).toContain('1');
    });

    test('should update HUD in real-time', async ({ mainMenuPage, gamePage, page }) => {
      await mainMenuPage.goto();
      await mainMenuPage.clickPlay();
      await gamePage.startNewGame();
      
      // Start game
      await page.keyboard.press('Space');
      
      // Wait for score change
      await page.waitForTimeout(3000);
      
      const hud = await gamePage.getHUDElements();
      const score = await gamePage.getScore();
      
      expect(hud.score).toContain(score.toString());
    });

    test('should display combo multiplier', async ({ mainMenuPage, gamePage, page }) => {
      await mainMenuPage.goto();
      await mainMenuPage.clickPlay();
      await gamePage.startNewGame();
      
      // Simulate combo
      await page.evaluate(() => {
        if ((window as any).gameState) {
          (window as any).gameState.combo = 5;
        }
      });
      
      const hud = await gamePage.getHUDElements();
      expect(hud.combo).toContain('5');
    });

    test('should display active power-up', async ({ mainMenuPage, gamePage, page }) => {
      await mainMenuPage.goto();
      await mainMenuPage.clickPlay();
      await gamePage.startNewGame();
      
      // Simulate power-up
      await page.evaluate(() => {
        if ((window as any).gameState) {
          (window as any).gameState.activePowerUp = 'multiball';
        }
      });
      
      const hud = await gamePage.getHUDElements();
      expect(hud.powerUp).toContain('multiball');
    });
  });

  test.describe('Responsive Design', () => {
    test('should adapt to mobile viewport', async ({ page, mainMenuPage }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await mainMenuPage.goto();
      
      // Menu should be visible and adapted
      expect(await mainMenuPage.isVisible()).toBe(true);
      
      // Check if mobile-specific styles are applied
      const menuClass = await mainMenuPage.mainMenu.getAttribute('class');
      expect(menuClass).toContain('mobile');
    });

    test('should adapt to tablet viewport', async ({ page, mainMenuPage }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      
      await mainMenuPage.goto();
      
      // Menu should be visible and adapted
      expect(await mainMenuPage.isVisible()).toBe(true);
      
      // Check if tablet-specific styles are applied
      const menuClass = await mainMenuPage.mainMenu.getAttribute('class');
      expect(menuClass).toContain('tablet');
    });

    test('should handle orientation change', async ({ page, mainMenuPage, gamePage }) => {
      // Start in portrait
      await page.setViewportSize({ width: 414, height: 896 });
      await mainMenuPage.goto();
      await mainMenuPage.clickPlay();
      
      // Switch to landscape
      await page.setViewportSize({ width: 896, height: 414 });
      
      // Game should adapt
      await expect(gamePage.gameCanvas).toBeVisible();
      
      // Canvas should resize appropriately
      const canvasSize = await gamePage.gameCanvas.boundingBox();
      expect(canvasSize!.width).toBeGreaterThan(canvasSize!.height);
    });
  });
});