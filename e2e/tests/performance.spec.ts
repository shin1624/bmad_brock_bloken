import { test, expect } from '../fixtures/game.fixture';
import { getFPS } from '../fixtures/canvas-helpers';

/**
 * E2E Tests: Performance Testing
 * Tests for page load time, game performance metrics, memory usage, and frame rate
 */

test.describe('Performance Testing', () => {
  test.beforeEach(async ({ page, gameHelpers }) => {
    await gameHelpers.clearLocalStorage();
  });

  test.describe('Page Load Performance', () => {
    test('should load main page within 3 seconds', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/', { waitUntil: 'networkidle' });
      
      const loadTime = Date.now() - startTime;
      
      console.log(`Page load time: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(3000);
      
      // Check Core Web Vitals
      const metrics = await page.evaluate(() => {
        return new Promise<any>((resolve) => {
          let fcp = 0;
          let lcp = 0;
          let cls = 0;
          let fid = 0;
          
          // First Contentful Paint
          const fcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            for (const entry of entries) {
              if (entry.name === 'first-contentful-paint') {
                fcp = entry.startTime;
              }
            }
          });
          fcpObserver.observe({ entryTypes: ['paint'] });
          
          // Largest Contentful Paint
          const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            lcp = lastEntry.startTime;
          });
          lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
          
          // Cumulative Layout Shift
          let clsValue = 0;
          const clsObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!(entry as any).hadRecentInput) {
                clsValue += (entry as any).value;
              }
            }
            cls = clsValue;
          });
          clsObserver.observe({ entryTypes: ['layout-shift'] });
          
          // Wait a bit then resolve
          setTimeout(() => {
            resolve({
              fcp,
              lcp,
              cls,
              navigationTiming: performance.getEntriesByType('navigation')[0]
            });
          }, 2000);
        });
      });
      
      // Core Web Vitals thresholds
      expect(metrics.fcp).toBeLessThan(1800); // FCP < 1.8s is good
      expect(metrics.lcp).toBeLessThan(2500); // LCP < 2.5s is good
      expect(metrics.cls).toBeLessThan(0.1);  // CLS < 0.1 is good
    });

    test('should load game assets efficiently', async ({ page }) => {
      const resourceTimings: any[] = [];
      
      // Monitor resource loading
      page.on('response', response => {
        resourceTimings.push({
          url: response.url(),
          status: response.status(),
          timing: response.timing()
        });
      });
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Analyze resource loading
      const slowResources = resourceTimings.filter(r => 
        r.timing && r.timing.responseEnd - r.timing.requestStart > 1000
      );
      
      console.log(`Total resources loaded: ${resourceTimings.length}`);
      console.log(`Slow resources (>1s): ${slowResources.length}`);
      
      // No resource should take more than 2 seconds
      for (const resource of resourceTimings) {
        if (resource.timing) {
          const loadTime = resource.timing.responseEnd - resource.timing.requestStart;
          expect(loadTime).toBeLessThan(2000);
        }
      }
    });
  });

  test.describe('Game Performance Metrics', () => {
    test('should maintain 60 FPS during idle', async ({ page, mainMenuPage, gamePage }) => {
      await mainMenuPage.goto();
      await mainMenuPage.clickPlay();
      await gamePage.waitForGameReady();
      
      // Collect FPS samples while idle
      const samples: number[] = [];
      for (let i = 0; i < 30; i++) {
        const fps = await getFPS(page);
        samples.push(fps);
        await page.waitForTimeout(100);
      }
      
      const avgFPS = samples.reduce((a, b) => a + b, 0) / samples.length;
      const minFPS = Math.min(...samples);
      
      console.log(`Idle - Average FPS: ${avgFPS.toFixed(2)}, Min FPS: ${minFPS}`);
      
      expect(avgFPS).toBeGreaterThanOrEqual(59);
      expect(minFPS).toBeGreaterThanOrEqual(55);
    });

    test('should maintain 60 FPS during gameplay', async ({ page, mainMenuPage, gamePage }) => {
      await mainMenuPage.goto();
      await mainMenuPage.clickPlay();
      await gamePage.waitForGameReady();
      await gamePage.startNewGame();
      
      // Collect FPS during active gameplay
      const samples: number[] = [];
      for (let i = 0; i < 50; i++) {
        // Move paddle to create activity
        await gamePage.movePaddle(Math.random() * 800);
        
        const fps = await getFPS(page);
        samples.push(fps);
        await page.waitForTimeout(100);
      }
      
      const avgFPS = samples.reduce((a, b) => a + b, 0) / samples.length;
      const percentile95 = samples.sort((a, b) => a - b)[Math.floor(samples.length * 0.95)];
      
      console.log(`Gameplay - Average FPS: ${avgFPS.toFixed(2)}, 95th percentile: ${percentile95}`);
      
      // 95% of frames should be >= 60 FPS
      expect(percentile95).toBeGreaterThanOrEqual(58);
      expect(avgFPS).toBeGreaterThanOrEqual(55);
    });

    test('should handle stress test with many blocks', async ({ page, mainMenuPage, gamePage }) => {
      await mainMenuPage.goto();
      await mainMenuPage.clickPlay();
      await gamePage.waitForGameReady();
      
      // Add maximum blocks for stress test
      await page.evaluate(() => {
        if ((window as any).gameState) {
          const blocks = [];
          for (let row = 0; row < 10; row++) {
            for (let col = 0; col < 15; col++) {
              blocks.push({
                row,
                col,
                type: 'normal',
                health: 1,
                destroyed: false
              });
            }
          }
          (window as any).gameState.blocks = blocks;
        }
      });
      
      await gamePage.startNewGame();
      
      // Measure performance with many blocks
      const samples: number[] = [];
      for (let i = 0; i < 30; i++) {
        const fps = await getFPS(page);
        samples.push(fps);
        await page.waitForTimeout(100);
      }
      
      const avgFPS = samples.reduce((a, b) => a + b, 0) / samples.length;
      
      console.log(`Stress test (150 blocks) - Average FPS: ${avgFPS.toFixed(2)}`);
      
      // Should maintain at least 45 FPS even under stress
      expect(avgFPS).toBeGreaterThanOrEqual(45);
    });
  });

  test.describe('Memory Usage Monitoring', () => {
    test('should not exceed 200MB memory usage', async ({ page, mainMenuPage, gamePage }) => {
      await mainMenuPage.goto();
      
      // Get initial memory
      const initialMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize / 1024 / 1024;
        }
        return 0;
      });
      
      console.log(`Initial memory: ${initialMemory.toFixed(2)}MB`);
      
      // Navigate through various screens
      await mainMenuPage.clickPlay();
      await gamePage.waitForGameReady();
      await gamePage.startNewGame();
      
      // Play for a while
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('ArrowLeft');
        await page.waitForTimeout(100);
        await page.keyboard.press('ArrowRight');
        await page.waitForTimeout(100);
      }
      
      // Check memory after gameplay
      const gameplayMemory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize / 1024 / 1024;
        }
        return 0;
      });
      
      console.log(`Gameplay memory: ${gameplayMemory.toFixed(2)}MB`);
      
      expect(gameplayMemory).toBeLessThan(200);
    });

    test('should not have memory leaks during long gameplay', async ({ page, mainMenuPage, gamePage }) => {
      await mainMenuPage.goto();
      await mainMenuPage.clickPlay();
      await gamePage.waitForGameReady();
      
      const memorySnapshots: number[] = [];
      
      // Take memory snapshots over time
      for (let i = 0; i < 5; i++) {
        await gamePage.startNewGame();
        
        // Play for 10 seconds
        const startTime = Date.now();
        while (Date.now() - startTime < 10000) {
          await page.keyboard.press('ArrowLeft');
          await page.waitForTimeout(200);
          await page.keyboard.press('ArrowRight');
          await page.waitForTimeout(200);
        }
        
        // Force game over and restart
        await page.evaluate(() => {
          if ((window as any).gameState) {
            (window as any).gameState.lives = 0;
          }
        });
        
        await page.waitForTimeout(1000);
        
        // Take memory snapshot
        const memory = await page.evaluate(() => {
          if ('memory' in performance) {
            return (performance as any).memory.usedJSHeapSize / 1024 / 1024;
          }
          return 0;
        });
        
        memorySnapshots.push(memory);
        console.log(`Memory snapshot ${i + 1}: ${memory.toFixed(2)}MB`);
      }
      
      // Check for memory leak (memory shouldn't grow continuously)
      const memoryGrowth = memorySnapshots[4] - memorySnapshots[0];
      console.log(`Memory growth over 5 cycles: ${memoryGrowth.toFixed(2)}MB`);
      
      // Allow up to 50MB growth (some growth is normal due to caching)
      expect(memoryGrowth).toBeLessThan(50);
    });
  });

  test.describe('Input Latency', () => {
    test('should have low input latency', async ({ page, mainMenuPage, gamePage }) => {
      await mainMenuPage.goto();
      await mainMenuPage.clickPlay();
      await gamePage.waitForGameReady();
      await gamePage.startNewGame();
      
      // Measure input latency
      const latencies: number[] = [];
      
      for (let i = 0; i < 10; i++) {
        const startTime = Date.now();
        
        // Send input
        await page.keyboard.press('ArrowLeft');
        
        // Wait for paddle position to change
        await page.waitForFunction(() => {
          const paddle = (window as any).gameState?.paddlePosition;
          return paddle && paddle.x < 400; // Assuming starts at center
        }, { timeout: 100 });
        
        const latency = Date.now() - startTime;
        latencies.push(latency);
      }
      
      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const maxLatency = Math.max(...latencies);
      
      console.log(`Average input latency: ${avgLatency.toFixed(2)}ms`);
      console.log(`Max input latency: ${maxLatency}ms`);
      
      // Input latency should be < 16ms (one frame at 60 FPS)
      expect(avgLatency).toBeLessThan(16);
      expect(maxLatency).toBeLessThan(33); // Max 2 frames
    });
  });

  test.describe('Network Performance', () => {
    test('should handle slow network gracefully', async ({ page, context }) => {
      // Simulate slow 3G
      await context.route('**/*', route => {
        setTimeout(() => route.continue(), 500);
      });
      
      const startTime = Date.now();
      await page.goto('/');
      const loadTime = Date.now() - startTime;
      
      console.log(`Load time on slow 3G: ${loadTime}ms`);
      
      // Should still load within reasonable time
      expect(loadTime).toBeLessThan(10000);
      
      // UI should be responsive
      const mainMenu = await page.locator('.main-menu');
      await expect(mainMenu).toBeVisible({ timeout: 5000 });
    });

    test('should work offline after initial load', async ({ page, context }) => {
      // Load page normally first
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Go offline
      await context.setOffline(true);
      
      // Should still be able to play
      await page.reload();
      
      // Check if game still works
      const mainMenu = await page.locator('.main-menu');
      await expect(mainMenu).toBeVisible();
      
      // Can still navigate
      await page.click('.play-button');
      const gameCanvas = await page.locator('canvas#game-canvas');
      await expect(gameCanvas).toBeVisible();
    });
  });

  test.describe('Performance Budget', () => {
    test('should meet performance budget requirements', async ({ page }) => {
      await page.goto('/');
      
      const metrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as any;
        const resources = performance.getEntriesByType('resource');
        
        // Calculate bundle sizes
        const jsBundleSize = resources
          .filter(r => r.name.endsWith('.js'))
          .reduce((sum, r: any) => sum + (r.transferSize || 0), 0);
        
        const cssBundleSize = resources
          .filter(r => r.name.endsWith('.css'))
          .reduce((sum, r: any) => sum + (r.transferSize || 0), 0);
        
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          jsBundleSize: jsBundleSize / 1024, // KB
          cssBundleSize: cssBundleSize / 1024, // KB
          totalResources: resources.length
        };
      });
      
      console.log('Performance Budget Metrics:', metrics);
      
      // Performance budget thresholds
      expect(metrics.domContentLoaded).toBeLessThan(1000); // < 1s
      expect(metrics.loadComplete).toBeLessThan(3000); // < 3s
      expect(metrics.jsBundleSize).toBeLessThan(500); // < 500KB
      expect(metrics.cssBundleSize).toBeLessThan(100); // < 100KB
      expect(metrics.totalResources).toBeLessThan(50); // < 50 resources
    });
  });
});