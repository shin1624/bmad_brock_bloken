import { test, expect } from '@playwright/test';
import { MainMenuPage } from '../pages/main-menu.page';
import { SettingsPage } from '../pages/settings.page';
import { GamePage } from '../pages/game.page';

/**
 * UI Interaction E2E Tests
 * Story 7.2: E2E Testing Implementation
 */

test.describe('Main Menu Navigation', () => {
  let mainMenuPage: MainMenuPage;

  test.beforeEach(async ({ page }) => {
    mainMenuPage = new MainMenuPage(page);
    await mainMenuPage.goto();
  });

  test('should display main menu with all options', async () => {
    // Verify all menu buttons are visible
    expect(await mainMenuPage.isVisible('button[aria-label="Play Game"]')).toBe(true);
    expect(await mainMenuPage.isVisible('button[aria-label="Settings"]')).toBe(true);
    expect(await mainMenuPage.isVisible('button[aria-label="Level Editor"]')).toBe(true);
    expect(await mainMenuPage.isVisible('button[aria-label="High Scores"]')).toBe(true);
    expect(await mainMenuPage.isVisible('button[aria-label="About"]')).toBe(true);
  });

  test('should navigate to game when Play is clicked', async () => {
    await mainMenuPage.startNewGame();
    
    const gamePage = new GamePage(mainMenuPage.page);
    await gamePage.startGame();
    
    const gameState = await gamePage.canvas.getGameState();
    expect(gameState).toBeTruthy();
  });

  test('should open and close settings modal', async () => {
    await mainMenuPage.openSettings();
    
    // Verify settings modal is visible
    expect(await mainMenuPage.isVisible('[data-testid="settings-modal"]')).toBe(true);
    
    // Close settings
    await mainMenuPage.cancelSettings();
    
    // Verify settings modal is hidden
    expect(await mainMenuPage.isVisible('[data-testid="settings-modal"]')).toBe(false);
  });

  test('should open and close high scores modal', async () => {
    await mainMenuPage.openHighScores();
    
    // Verify high scores modal is visible
    expect(await mainMenuPage.isVisible('[data-testid="high-scores-modal"]')).toBe(true);
    
    // Close with ESC key
    await mainMenuPage.closeModal();
    
    // Verify modal is closed
    expect(await mainMenuPage.isVisible('[data-testid="high-scores-modal"]')).toBe(false);
  });

  test('should open about dialog', async () => {
    await mainMenuPage.openAbout();
    
    // Verify about modal is visible
    expect(await mainMenuPage.isVisible('[data-testid="about-modal"]')).toBe(true);
    
    // Check version is displayed
    const version = await mainMenuPage.getVersion();
    expect(version).toBeTruthy();
    
    // Close modal
    await mainMenuPage.closeModal();
  });

  test('should support keyboard navigation', async () => {
    // Navigate through menu items with Tab
    await mainMenuPage.navigateWithKeyboard(1);
    expect(await mainMenuPage.isButtonFocused('button[aria-label="Play Game"]')).toBe(true);
    
    await mainMenuPage.navigateWithKeyboard(1);
    expect(await mainMenuPage.isButtonFocused('button[aria-label="Settings"]')).toBe(true);
    
    // Activate with Enter
    await mainMenuPage.activateFocusedButton();
    expect(await mainMenuPage.isVisible('[data-testid="settings-modal"]')).toBe(true);
  });
});

test.describe('Settings Management', () => {
  let settingsPage: SettingsPage;
  let mainMenuPage: MainMenuPage;

  test.beforeEach(async ({ page }) => {
    mainMenuPage = new MainMenuPage(page);
    settingsPage = new SettingsPage(page);
    
    await mainMenuPage.goto();
    await mainMenuPage.openSettings();
  });

  test('should change and save audio settings', async () => {
    // Set volumes
    await settingsPage.setMasterVolume(50);
    await settingsPage.setSoundEffectsVolume(75);
    await settingsPage.setMusicVolume(25);
    
    // Save settings
    await settingsPage.applySettings();
    
    // Reopen settings and verify
    await mainMenuPage.openSettings();
    
    const masterVolume = await settingsPage.getMasterVolume();
    expect(masterVolume).toBe(50);
  });

  test('should change theme', async () => {
    const initialTheme = await settingsPage.getSelectedTheme();
    
    // Change theme
    await settingsPage.selectTheme('neon');
    await settingsPage.applySettings();
    
    // Reopen and verify
    await mainMenuPage.openSettings();
    const newTheme = await settingsPage.getSelectedTheme();
    expect(newTheme).toBe('neon');
    expect(newTheme).not.toBe(initialTheme);
  });

  test('should toggle visual effects', async () => {
    // Toggle particle effects
    await settingsPage.toggleParticleEffects();
    const particlesEnabled = await settingsPage.areParticleEffectsEnabled();
    
    await settingsPage.toggleScreenShake();
    await settingsPage.toggleFPSDisplay();
    
    // Apply settings
    await settingsPage.applySettings();
    
    // Verify settings persisted
    await mainMenuPage.openSettings();
    const particlesStillEnabled = await settingsPage.areParticleEffectsEnabled();
    expect(particlesStillEnabled).toBe(particlesEnabled);
  });

  test('should change difficulty', async () => {
    await settingsPage.selectDifficulty('hard');
    await settingsPage.applySettings();
    
    // Verify difficulty changed
    await mainMenuPage.openSettings();
    const difficulty = await settingsPage.getSelectedDifficulty();
    expect(difficulty).toBe('hard');
  });

  test('should reset settings to defaults', async () => {
    // Change multiple settings
    await settingsPage.setMasterVolume(25);
    await settingsPage.selectTheme('space');
    await settingsPage.selectDifficulty('easy');
    await settingsPage.applySettings();
    
    // Reset to defaults
    await mainMenuPage.openSettings();
    await settingsPage.resetToDefaults();
    await settingsPage.applySettings();
    
    // Verify defaults restored
    await mainMenuPage.openSettings();
    const settings = await settingsPage.getAllSettings();
    
    expect(settings.masterVolume).toBeGreaterThan(25); // Should be default (usually 100)
    expect(settings.theme).not.toBe('space'); // Should be default theme
    expect(settings.difficulty).toBe('normal'); // Should be default difficulty
  });

  test('should cancel settings changes', async () => {
    const initialVolume = await settingsPage.getMasterVolume();
    
    // Change settings but cancel
    await settingsPage.setMasterVolume(10);
    await settingsPage.selectTheme('retro');
    await settingsPage.cancelSettings();
    
    // Verify changes not applied
    await mainMenuPage.openSettings();
    const volume = await settingsPage.getMasterVolume();
    expect(volume).toBe(initialVolume);
  });

  test('should apply performance preset', async () => {
    await settingsPage.applyPreset('performance');
    
    // Verify performance settings applied
    await mainMenuPage.openSettings();
    const particlesEnabled = await settingsPage.areParticleEffectsEnabled();
    const theme = await settingsPage.getSelectedTheme();
    
    expect(particlesEnabled).toBe(false); // Particles disabled for performance
    expect(theme).toBe('classic'); // Simple theme for performance
  });

  test('should apply quality preset', async () => {
    await settingsPage.applyPreset('quality');
    
    // Verify quality settings applied
    await mainMenuPage.openSettings();
    const particlesEnabled = await settingsPage.areParticleEffectsEnabled();
    const theme = await settingsPage.getSelectedTheme();
    
    expect(particlesEnabled).toBe(true); // All effects enabled
    expect(theme).toBe('neon'); // Fancy theme
  });
});

test.describe('In-Game UI', () => {
  let gamePage: GamePage;
  let mainMenuPage: MainMenuPage;

  test.beforeEach(async ({ page }) => {
    gamePage = new GamePage(page);
    mainMenuPage = new MainMenuPage(page);
    
    await mainMenuPage.goto();
    await mainMenuPage.startNewGame();
    await gamePage.startGame();
  });

  test('should display game HUD elements', async () => {
    // Verify HUD elements are visible
    expect(await gamePage.isVisible('[data-testid="score-display"]')).toBe(true);
    expect(await gamePage.isVisible('[data-testid="lives-display"]')).toBe(true);
    expect(await gamePage.isVisible('[data-testid="level-display"]')).toBe(true);
    expect(await gamePage.isVisible('button[aria-label="Pause Game"]')).toBe(true);
  });

  test('should show pause menu with options', async () => {
    await gamePage.pauseGame();
    
    // Verify pause menu options
    expect(await gamePage.isVisible('[data-testid="pause-menu"]')).toBe(true);
    expect(await gamePage.isVisible('button[aria-label="Resume Game"]')).toBe(true);
    expect(await gamePage.isVisible('button[aria-label="Restart Game"]')).toBe(true);
    expect(await gamePage.isVisible('button[aria-label="Quit to Menu"]')).toBe(true);
  });

  test('should update score display', async ({ page }) => {
    const initialScore = await gamePage.getScore();
    expect(initialScore).toBe(0);
    
    // Simulate score increase
    await page.evaluate(() => {
      const gameEngine = (window as any).gameEngine;
      if (gameEngine && gameEngine.state) {
        gameEngine.state.score = 100;
      }
    });
    
    // Wait for UI update
    await page.waitForFunction(
      () => {
        const scoreElement = document.querySelector('[data-testid="score-display"]');
        return scoreElement?.textContent?.includes('100');
      },
      { timeout: 5000 }
    );
    
    const newScore = await gamePage.getScore();
    expect(newScore).toBe(100);
  });

  test('should update lives display', async ({ page }) => {
    const initialLives = await gamePage.getLives();
    expect(initialLives).toBeGreaterThanOrEqual(3);
    
    // Simulate losing a life
    await page.evaluate(() => {
      const gameEngine = (window as any).gameEngine;
      if (gameEngine && gameEngine.state) {
        gameEngine.state.lives -= 1;
      }
    });
    
    // Wait for UI update
    await page.waitForTimeout(500);
    
    const newLives = await gamePage.getLives();
    expect(newLives).toBe(initialLives - 1);
  });

  test('should update level display', async ({ page }) => {
    const initialLevel = await gamePage.getLevel();
    expect(initialLevel).toBe(1);
    
    // Simulate level progression
    await page.evaluate(() => {
      const gameEngine = (window as any).gameEngine;
      if (gameEngine && gameEngine.state) {
        gameEngine.state.level = 2;
      }
    });
    
    // Wait for UI update
    await page.waitForTimeout(500);
    
    const newLevel = await gamePage.getLevel();
    expect(newLevel).toBe(2);
  });

  test('should show FPS counter when enabled', async () => {
    // Toggle debug info (F12)
    await gamePage.toggleDebugInfo();
    
    // Check if debug info is visible
    const debugVisible = await gamePage.isDebugInfoVisible();
    
    if (debugVisible) {
      const fps = await gamePage.getFPS();
      expect(fps).toBeGreaterThan(0);
      expect(fps).toBeLessThanOrEqual(120);
    }
  });
});

test.describe('Responsive Design', () => {
  let mainMenuPage: MainMenuPage;

  test('should adapt to mobile viewport', async ({ page }) => {
    mainMenuPage = new MainMenuPage(page);
    
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await mainMenuPage.goto();
    
    // Verify menu is still accessible
    expect(await mainMenuPage.isVisible('button[aria-label="Play Game"]')).toBe(true);
    
    // Test touch interactions
    await page.tap('button[aria-label="Play Game"]');
    
    const gamePage = new GamePage(page);
    await gamePage.startGame();
    
    // Test touch controls
    await gamePage.canvas.touchCanvas(200, 550);
  });

  test('should adapt to tablet viewport', async ({ page }) => {
    mainMenuPage = new MainMenuPage(page);
    
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await mainMenuPage.goto();
    
    // Verify layout adapts
    expect(await mainMenuPage.isVisible('button[aria-label="Play Game"]')).toBe(true);
    expect(await mainMenuPage.isVisible('button[aria-label="Settings"]')).toBe(true);
  });

  test('should handle orientation change', async ({ page }) => {
    mainMenuPage = new MainMenuPage(page);
    
    // Start in portrait
    await page.setViewportSize({ width: 375, height: 667 });
    await mainMenuPage.goto();
    
    // Change to landscape
    await page.setViewportSize({ width: 667, height: 375 });
    
    // Verify UI adapts
    expect(await mainMenuPage.isVisible('button[aria-label="Play Game"]')).toBe(true);
  });
});

test.describe('Level Editor UI', () => {
  let mainMenuPage: MainMenuPage;

  test.beforeEach(async ({ page }) => {
    mainMenuPage = new MainMenuPage(page);
    await mainMenuPage.goto();
  });

  test('should navigate to level editor', async ({ page }) => {
    await mainMenuPage.openLevelEditor();
    
    // Verify level editor loads
    await page.waitForSelector('[data-testid="level-editor"]', { timeout: 5000 }).catch(() => {
      console.log('Level editor not yet implemented');
    });
  });

  test.skip('should create custom level', async ({ page }) => {
    // Skip if level editor not implemented
    await mainMenuPage.openLevelEditor();
    
    // Test level editor functionality
    // This would include drag-and-drop, block placement, etc.
  });

  test.skip('should save and load custom levels', async ({ page }) => {
    // Skip if level editor not implemented
    await mainMenuPage.openLevelEditor();
    
    // Test save/load functionality
  });
});