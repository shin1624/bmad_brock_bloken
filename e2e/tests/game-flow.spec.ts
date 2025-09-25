import { test, expect } from '../fixtures/game.fixture';

/**
 * E2E Tests: Core Game Flow
 * Tests complete game lifecycle from start to finish
 */

test.describe('Game Flow', () => {
  test.beforeEach(async ({ page, gameHelpers }) => {
    await page.goto('/');
    await gameHelpers.clearLocalStorage();
  });

  test('should complete full game startup sequence', async ({ 
    mainMenuPage, 
    gamePage, 
    gameHelpers 
  }) => {
    // Start from main menu
    await mainMenuPage.goto();
    expect(await mainMenuPage.isVisible()).toBeTruthy();
    
    // Click play button
    await mainMenuPage.clickPlay();
    
    // Wait for game to load
    await gameHelpers.waitForGameLoad();
    
    // Verify game canvas is visible
    expect(await gamePage.gameCanvas.isVisible()).toBeTruthy();
    
    // Check initial game state
    expect(await gamePage.getScore()).toBe(0);
    expect(await gamePage.getLives()).toBe(3);
    expect(await gamePage.getLevel()).toBe(1);
  });

  test('should handle paddle movement controls', async ({ 
    mainMenuPage, 
    gamePage, 
    gameHelpers 
  }) => {
    // Navigate to game
    await mainMenuPage.goto();
    await mainMenuPage.clickPlay();
    await gameHelpers.waitForGameLoad();
    
    // Test keyboard controls
    await gamePage.movePaddleLeft(200);
    await gameHelpers.waitForAnimation();
    
    await gamePage.movePaddleRight(200);
    await gameHelpers.waitForAnimation();
    
    // Test mouse controls
    await gamePage.movePaddleToPosition(100);
    await gameHelpers.waitForAnimation();
    
    await gamePage.movePaddleToPosition(700);
    await gameHelpers.waitForAnimation();
    
    // Take screenshot for visual verification
    await gameHelpers.takeGameScreenshot('paddle-movement');
  });

  test('should handle game pause and resume', async ({ 
    mainMenuPage, 
    gamePage, 
    gameHelpers 
  }) => {
    // Start game
    await mainMenuPage.goto();
    await mainMenuPage.clickPlay();
    await gameHelpers.waitForGameLoad();
    await gamePage.startGame();
    
    // Pause game
    await gamePage.pauseGame();
    const pausedState = await gameHelpers.getGameState();
    expect(pausedState?.isPaused).toBeTruthy();
    
    // Resume game
    await gamePage.resumeGame();
    const resumedState = await gameHelpers.getGameState();
    expect(resumedState?.isPaused).toBeFalsy();
  });

  test('should track score when hitting blocks', async ({ 
    mainMenuPage, 
    gamePage, 
    gameHelpers 
  }) => {
    // Start game
    await mainMenuPage.goto();
    await mainMenuPage.clickPlay();
    await gameHelpers.waitForGameLoad();
    
    const initialScore = await gamePage.getScore();
    
    // Start game and let ball hit blocks
    await gamePage.startGame();
    await gameHelpers.setGameSpeed(2); // Speed up for testing
    
    // Wait for some gameplay
    await gameHelpers.waitForAnimation();
    await gamePage.page.waitForTimeout(3000);
    
    const newScore = await gamePage.getScore();
    expect(newScore).toBeGreaterThan(initialScore);
  });

  test('should handle game over when all lives lost', async ({ 
    mainMenuPage, 
    gamePage, 
    gameHelpers 
  }) => {
    // Start game
    await mainMenuPage.goto();
    await mainMenuPage.clickPlay();
    await gameHelpers.waitForGameLoad();
    
    // Simulate losing all lives quickly
    await gamePage.page.evaluate(() => {
      const gameState = (window as any).gameState;
      if (gameState) {
        gameState.lives = 1;
      }
    });
    
    await gamePage.startGame();
    
    // Wait for ball to fall and trigger game over
    await gamePage.page.waitForTimeout(5000);
    
    // Check if game over dialog appears
    expect(await gamePage.isGameOver()).toBeTruthy();
    
    // Test restart functionality
    await gamePage.restartGame();
    await gameHelpers.waitForGameLoad();
    expect(await gamePage.getLives()).toBe(3);
  });

  test('should progress to next level when all blocks cleared', async ({ 
    mainMenuPage, 
    gamePage, 
    gameHelpers 
  }) => {
    // Start game
    await mainMenuPage.goto();
    await mainMenuPage.clickPlay();
    await gameHelpers.waitForGameLoad();
    
    const initialLevel = await gamePage.getLevel();
    
    // Simulate clearing all blocks
    await gamePage.page.evaluate(() => {
      const gameState = (window as any).gameState;
      if (gameState) {
        // Clear all blocks to trigger level completion
        gameState.blocks = [];
      }
    });
    
    // Wait for level transition
    await gamePage.page.waitForTimeout(2000);
    
    const newLevel = await gamePage.getLevel();
    expect(newLevel).toBe(initialLevel + 1);
  });

  test('should save and restore game progress', async ({ 
    mainMenuPage, 
    gamePage, 
    gameHelpers,
    page 
  }) => {
    // Start game and make progress
    await mainMenuPage.goto();
    await mainMenuPage.clickPlay();
    await gameHelpers.waitForGameLoad();
    await gamePage.startGame();
    
    // Play for a bit to accumulate score
    await gameHelpers.setGameSpeed(2);
    await page.waitForTimeout(3000);
    
    const savedScore = await gamePage.getScore();
    const savedLevel = await gamePage.getLevel();
    
    // Simulate browser refresh
    await page.reload();
    await gameHelpers.waitForGameLoad();
    
    // Check if progress was saved
    const restoredScore = await gamePage.getScore();
    const restoredLevel = await gamePage.getLevel();
    
    expect(restoredScore).toBe(savedScore);
    expect(restoredLevel).toBe(savedLevel);
  });
});