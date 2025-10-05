import { test, expect } from '@playwright/test';
import { MainMenuPage } from '../pages/main-menu.page';
import { GamePage } from '../pages/game.page';

/**
 * Performance E2E Tests
 * Story 7.2: E2E Testing Implementation
 */

test.describe('Performance Tests', () => {
  test('should load page within 3 seconds', async ({ page }) => {
    const startTime = Date.now();
    
    const mainMenu = new MainMenuPage(page);
    await mainMenu.goto();
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000);
  });

  test('should maintain 60 FPS during gameplay', async ({ page }) => {
    const mainMenu = new MainMenuPage(page);
    const game = new GamePage(page);
    
    await mainMenu.goto();
    await mainMenu.startNewGame();
    await game.startGame();
    
    // Play for 10 seconds and monitor FPS
    const samples = [];
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(1000);
      const fps = await game.getFPS();
      samples.push(fps);
    }
    
    const avgFPS = samples.reduce((a, b) => a + b, 0) / samples.length;
    expect(avgFPS).toBeGreaterThan(55); // Allow small variance from 60
  });

  test('should not have memory leaks', async ({ page }) => {
    const mainMenu = new MainMenuPage(page);
    const game = new GamePage(page);
    
    await mainMenu.goto();
    await mainMenu.startNewGame();
    await game.startGame();
    
    // Get initial memory
    const initialMemory = await game.getMemoryUsage();
    
    // Play for 30 seconds
    await page.waitForTimeout(30000);
    
    // Get final memory
    const finalMemory = await game.getMemoryUsage();
    
    // Memory should not increase by more than 50MB
    expect(finalMemory - initialMemory).toBeLessThan(50);
  });

  test('should measure Core Web Vitals', async ({ page }) => {
    await page.goto('/');
    
    // Measure LCP (Largest Contentful Paint)
    const lcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          resolve(lastEntry.startTime);
        }).observe({ type: 'largest-contentful-paint', buffered: true });
      });
    });
    
    expect(lcp).toBeLessThan(2500); // Good LCP is under 2.5s
  });

  test('should handle rapid input without lag', async ({ page }) => {
    const mainMenu = new MainMenuPage(page);
    const game = new GamePage(page);
    
    await mainMenu.goto();
    await mainMenu.startNewGame();
    await game.startGame();
    
    // Rapid paddle movement
    for (let i = 0; i < 20; i++) {
      await game.movePaddleWithKeyboard(i % 2 === 0 ? 'left' : 'right', 50);
    }
    
    // Game should still be responsive
    const fps = await game.getFPS();
    expect(fps).toBeGreaterThan(50);
  });
});