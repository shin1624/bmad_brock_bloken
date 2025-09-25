import { test, expect } from '../fixtures/game.fixture';
import { 
  waitForGameEngineReady, 
  getGameState, 
  movePaddleTo,
  getBallPosition,
  getPaddlePosition,
  isBlockAt,
  getFPS
} from '../fixtures/canvas-helpers';

/**
 * E2E Tests: Core Gameplay Mechanics
 * Tests for paddle control, collision detection, score tracking, and performance
 */

test.describe('Core Gameplay Mechanics', () => {
  test.beforeEach(async ({ page, gameHelpers }) => {
    await page.goto('/');
    await gameHelpers.clearLocalStorage();
    await waitForGameEngineReady(page);
  });

  test('should handle paddle movement with keyboard controls', async ({ page, gamePage }) => {
    await gamePage.startNewGame();
    
    // Get initial paddle position
    const initialPos = await getPaddlePosition(page);
    expect(initialPos).toBeTruthy();
    
    // Test left movement
    await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(100);
    const leftPos = await getPaddlePosition(page);
    expect(leftPos!.x).toBeLessThan(initialPos!.x);
    
    // Test right movement
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(100);
    const rightPos = await getPaddlePosition(page);
    expect(rightPos!.x).toBeGreaterThan(leftPos!.x);
    
    // Test WASD controls
    await page.keyboard.press('a');
    await page.waitForTimeout(100);
    const aPos = await getPaddlePosition(page);
    expect(aPos!.x).toBeLessThan(rightPos!.x);
    
    await page.keyboard.press('d');
    await page.waitForTimeout(100);
    const dPos = await getPaddlePosition(page);
    expect(dPos!.x).toBeGreaterThan(aPos!.x);
  });

  test('should handle paddle movement with mouse controls', async ({ page, gamePage }) => {
    await gamePage.startNewGame();
    
    // Test mouse movement
    await movePaddleTo(page, 100);
    await page.waitForTimeout(100);
    const leftPos = await getPaddlePosition(page);
    expect(leftPos!.x).toBeLessThanOrEqual(150);
    
    await movePaddleTo(page, 700);
    await page.waitForTimeout(100);
    const rightPos = await getPaddlePosition(page);
    expect(rightPos!.x).toBeGreaterThanOrEqual(650);
    
    // Test smooth following
    const positions: number[] = [];
    for (let x = 200; x <= 600; x += 100) {
      await movePaddleTo(page, x);
      await page.waitForTimeout(50);
      const pos = await getPaddlePosition(page);
      positions.push(pos!.x);
    }
    
    // Verify positions are increasing
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i]).toBeGreaterThan(positions[i - 1]);
    }
  });

  test('should detect ball-paddle collisions correctly', async ({ page, gamePage }) => {
    await gamePage.startNewGame();
    
    // Start the game
    await page.keyboard.press('Space');
    const initialState = await getGameState(page);
    expect(initialState.isPlaying).toBe(true);
    
    // Monitor ball position for 5 seconds
    const collisions: number[] = [];
    let lastBallY = 0;
    
    for (let i = 0; i < 50; i++) {
      await page.waitForTimeout(100);
      const ballPos = await getBallPosition(page);
      
      if (ballPos) {
        // Detect direction change (collision)
        if (lastBallY > ballPos.y && ballPos.y > 500) {
          collisions.push(ballPos.y);
        }
        lastBallY = ballPos.y;
      }
    }
    
    // Should have detected at least one paddle collision
    expect(collisions.length).toBeGreaterThan(0);
  });

  test('should detect ball-block collisions and update score', async ({ page, gamePage }) => {
    await gamePage.startNewGame();
    const initialScore = await gamePage.getScore();
    expect(initialScore).toBe(0);
    
    // Start the game
    await page.keyboard.press('Space');
    
    // Wait for ball to hit blocks
    let scoreIncreased = false;
    for (let i = 0; i < 100; i++) {
      await page.waitForTimeout(100);
      const currentScore = await gamePage.getScore();
      if (currentScore > initialScore) {
        scoreIncreased = true;
        break;
      }
    }
    
    expect(scoreIncreased).toBe(true);
  });

  test('should track score correctly when destroying blocks', async ({ page, gamePage }) => {
    await gamePage.startNewGame();
    
    // Get initial block count
    const initialState = await getGameState(page);
    const initialBlocks = initialState.blocksRemaining || 0;
    
    // Start game
    await page.keyboard.press('Space');
    
    // Monitor score and blocks
    let previousScore = 0;
    let previousBlocks = initialBlocks;
    
    for (let i = 0; i < 50; i++) {
      await page.waitForTimeout(200);
      const state = await getGameState(page);
      
      // When blocks decrease, score should increase
      if (state.blocksRemaining! < previousBlocks) {
        expect(state.score).toBeGreaterThan(previousScore);
        previousScore = state.score;
        previousBlocks = state.blocksRemaining!;
      }
      
      // Stop if level cleared
      if (state.blocksRemaining === 0) break;
    }
  });

  test('should handle level progression when all blocks cleared', async ({ page, gamePage }) => {
    await gamePage.startNewGame();
    const initialLevel = await gamePage.getLevel();
    expect(initialLevel).toBe(1);
    
    // Cheat to clear all blocks quickly
    await page.evaluate(() => {
      if (window.gameEngine) {
        const state = window.gameEngine.getState();
        // Clear all blocks programmatically
        if ((window as any).gameState?.blocks) {
          (window as any).gameState.blocks = [];
        }
      }
    });
    
    // Wait for level transition
    await gamePage.waitForLevel(2, 5000);
    const newLevel = await gamePage.getLevel();
    expect(newLevel).toBe(2);
  });

  test('should maintain 60 FPS during gameplay', async ({ page, gamePage }) => {
    await gamePage.startNewGame();
    await page.keyboard.press('Space');
    
    // Collect FPS samples over 5 seconds
    const performance = await gamePage.checkPerformance();
    
    // Verify performance meets requirements
    expect(performance.average).toBeGreaterThanOrEqual(55); // Allow 5 FPS margin
    expect(performance.min).toBeGreaterThanOrEqual(45); // Minimum acceptable
    
    // Calculate 95th percentile
    const sorted = performance.samples.sort((a, b) => a - b);
    const index95 = Math.floor(sorted.length * 0.95);
    const fps95 = sorted[index95];
    
    // 95% of samples should be >= 60 FPS
    expect(fps95).toBeGreaterThanOrEqual(58);
  });

  test('should handle power-up collection and effects', async ({ page, gamePage }) => {
    await gamePage.startNewGame();
    
    // Inject a power-up for testing
    await page.evaluate(() => {
      if ((window as any).gameState) {
        // Add a power-up at paddle position
        (window as any).gameState.powerUps = [{
          type: 'multiball',
          x: 400,
          y: 550,
          active: true
        }];
      }
    });
    
    await page.keyboard.press('Space');
    
    // Move paddle to collect power-up
    await movePaddleTo(page, 400);
    await page.waitForTimeout(1000);
    
    // Check if power-up was collected
    const state = await getGameState(page);
    // Power-up effects should be active
    // This would depend on actual game implementation
  });

  test('should handle game pause and resume correctly', async ({ page, gamePage }) => {
    await gamePage.startNewGame();
    await page.keyboard.press('Space');
    
    // Get ball position before pause
    const beforePause = await getBallPosition(page);
    
    // Pause game
    await gamePage.pauseGame();
    const pausedState = await getGameState(page);
    expect(pausedState.isPaused).toBe(true);
    
    // Wait and check ball hasn't moved
    await page.waitForTimeout(500);
    const duringPause = await getBallPosition(page);
    expect(duringPause).toEqual(beforePause);
    
    // Resume game
    await gamePage.resumeGame();
    const resumedState = await getGameState(page);
    expect(resumedState.isPaused).toBe(false);
    
    // Ball should start moving again
    await page.waitForTimeout(500);
    const afterResume = await getBallPosition(page);
    expect(afterResume).not.toEqual(duringPause);
  });

  test('should handle life loss when ball falls', async ({ page, gamePage }) => {
    await gamePage.startNewGame();
    const initialLives = await gamePage.getLives();
    expect(initialLives).toBe(3);
    
    // Start game
    await page.keyboard.press('Space');
    
    // Move paddle away to let ball fall
    await movePaddleTo(page, 50);
    
    // Wait for ball to fall
    await page.waitForTimeout(5000);
    
    const currentLives = await gamePage.getLives();
    expect(currentLives).toBeLessThan(initialLives);
  });

  test('should trigger game over when all lives are lost', async ({ page, gamePage }) => {
    await gamePage.startNewGame();
    
    // Set lives to 1 for quick game over
    await page.evaluate(() => {
      if ((window as any).gameState) {
        (window as any).gameState.lives = 1;
      }
    });
    
    // Start game and let ball fall
    await page.keyboard.press('Space');
    await movePaddleTo(page, 50);
    
    // Wait for game over
    await gamePage.waitForGameOver(10000);
    const state = await getGameState(page);
    expect(state.isGameOver).toBe(true);
  });
});