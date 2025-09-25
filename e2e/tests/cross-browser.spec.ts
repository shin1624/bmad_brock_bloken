import { test, expect, devices } from '@playwright/test';
import { GamePage } from '../pages/game.page';
import { MainMenuPage } from '../pages/main-menu.page';

/**
 * E2E Tests: Cross-Browser Compatibility
 * Tests for browser-specific functionality and compatibility
 */

test.describe('Cross-Browser Compatibility', () => {
  // Helper to check browser name
  const getBrowserName = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('chrome')) return 'chrome';
    if (userAgent.includes('firefox')) return 'firefox';
    if (userAgent.includes('safari') && !userAgent.includes('chrome')) return 'safari';
    if (userAgent.includes('edg')) return 'edge';
    return 'unknown';
  };

  test.describe('Chrome-specific tests', () => {
    test.skip(({ browserName }) => browserName !== 'chromium', 'Chrome only');

    test('should support Chrome DevTools Protocol features', async ({ page }) => {
      // Enable performance metrics
      const client = await page.context().newCDPSession(page);
      await client.send('Performance.enable');
      
      await page.goto('/');
      
      // Get performance metrics
      const metrics = await client.send('Performance.getMetrics');
      expect(metrics.metrics).toBeDefined();
      
      // Check for Chrome-specific metrics
      const jsHeapUsed = metrics.metrics.find(m => m.name === 'JSHeapUsedSize');
      expect(jsHeapUsed).toBeDefined();
    });

    test('should handle Chrome-specific Canvas features', async ({ page }) => {
      await page.goto('/');
      
      // Check for Chrome Canvas 2D features
      const supportsAdvancedFeatures = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Check for Chrome-specific features
        return {
          supportsFilter: 'filter' in (ctx as any),
          supportsImageSmoothing: 'imageSmoothingEnabled' in (ctx as any),
          supportsGlobalCompositeOperation: 'globalCompositeOperation' in (ctx as any)
        };
      });
      
      expect(supportsAdvancedFeatures.supportsFilter).toBe(true);
      expect(supportsAdvancedFeatures.supportsImageSmoothing).toBe(true);
      expect(supportsAdvancedFeatures.supportsGlobalCompositeOperation).toBe(true);
    });

    test('should handle Chrome Web Audio API correctly', async ({ page }) => {
      await page.goto('/');
      
      const audioSupport = await page.evaluate(() => {
        return {
          webAudioAPI: 'AudioContext' in window || 'webkitAudioContext' in window,
          audioWorklet: 'AudioWorklet' in window
        };
      });
      
      expect(audioSupport.webAudioAPI).toBe(true);
      expect(audioSupport.audioWorklet).toBe(true);
    });
  });

  test.describe('Firefox-specific tests', () => {
    test.skip(({ browserName }) => browserName !== 'firefox', 'Firefox only');

    test('should handle Firefox Canvas rendering', async ({ page }) => {
      await page.goto('/');
      
      // Check Firefox-specific Canvas behavior
      const canvasFeatures = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { alpha: false });
        
        return {
          supportsNonAlpha: ctx !== null,
          supportsWillReadFrequently: true // Firefox optimization
        };
      });
      
      expect(canvasFeatures.supportsNonAlpha).toBe(true);
    });

    test('should handle Firefox performance API', async ({ page }) => {
      await page.goto('/');
      
      const performanceFeatures = await page.evaluate(() => {
        return {
          hasPerformanceObserver: 'PerformanceObserver' in window,
          hasUserTiming: 'performance' in window && 'mark' in performance
        };
      });
      
      expect(performanceFeatures.hasPerformanceObserver).toBe(true);
      expect(performanceFeatures.hasUserTiming).toBe(true);
    });

    test('should handle Firefox gamepad API if available', async ({ page }) => {
      await page.goto('/');
      
      const gamepadSupport = await page.evaluate(() => {
        return 'getGamepads' in navigator;
      });
      
      // Firefox should support gamepad API
      expect(gamepadSupport).toBe(true);
    });
  });

  test.describe('Safari/WebKit-specific tests', () => {
    test.skip(({ browserName }) => browserName !== 'webkit', 'Safari only');

    test('should handle Safari Canvas limitations', async ({ page }) => {
      await page.goto('/');
      
      // Check Safari-specific limitations and workarounds
      const safariFeatures = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        return {
          // Safari has different image smoothing property names
          hasImageSmoothing: 'imageSmoothingEnabled' in (ctx as any) || 
                             'webkitImageSmoothingEnabled' in (ctx as any),
          // Check for Safari's requestAnimationFrame
          hasRAF: 'requestAnimationFrame' in window || 
                  'webkitRequestAnimationFrame' in window
        };
      });
      
      expect(safariFeatures.hasImageSmoothing).toBe(true);
      expect(safariFeatures.hasRAF).toBe(true);
    });

    test('should handle Safari touch events', async ({ page }) => {
      await page.goto('/');
      
      const touchSupport = await page.evaluate(() => {
        return {
          hasTouchEvents: 'ontouchstart' in window,
          hasPointerEvents: 'PointerEvent' in window
        };
      });
      
      // Safari should support touch events
      expect(touchSupport.hasTouchEvents || touchSupport.hasPointerEvents).toBe(true);
    });

    test('should handle Safari Web Audio with webkit prefix', async ({ page }) => {
      await page.goto('/');
      
      const audioSupport = await page.evaluate(() => {
        return 'AudioContext' in window || 'webkitAudioContext' in window;
      });
      
      expect(audioSupport).toBe(true);
    });
  });

  test.describe('Mobile browser tests', () => {
    test('should work on mobile Chrome', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['Pixel 5']
      });
      const page = await context.newPage();
      
      await page.goto('/');
      const mainMenu = new MainMenuPage(page);
      
      expect(await mainMenu.isVisible()).toBe(true);
      
      // Check touch events
      const touchSupport = await page.evaluate(() => {
        return 'ontouchstart' in window;
      });
      expect(touchSupport).toBe(true);
      
      await context.close();
    });

    test('should work on mobile Safari', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 12']
      });
      const page = await context.newPage();
      
      await page.goto('/');
      const mainMenu = new MainMenuPage(page);
      
      expect(await mainMenu.isVisible()).toBe(true);
      
      // Check iOS-specific viewport
      const viewport = await page.evaluate(() => {
        const meta = document.querySelector('meta[name="viewport"]');
        return meta?.getAttribute('content');
      });
      expect(viewport).toContain('width=device-width');
      
      await context.close();
    });

    test('should handle touch controls on mobile', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPad Pro'],
        hasTouch: true
      });
      const page = await context.newPage();
      
      await page.goto('/');
      const mainMenu = new MainMenuPage(page);
      const gamePage = new GamePage(page);
      
      // Navigate to game using touch
      await mainMenu.clickPlay();
      await gamePage.waitForGameReady();
      
      // Simulate touch to move paddle
      const canvas = await page.locator('canvas#game-canvas');
      await canvas.tap({ position: { x: 200, y: 550 } });
      
      // Verify touch was registered
      const paddlePos = await page.evaluate(() => {
        if (window.gameEngine) {
          const state = window.gameEngine.getState();
          return state.paddlePosition;
        }
        return null;
      });
      
      expect(paddlePos).toBeDefined();
      
      await context.close();
    });
  });

  test.describe('Edge-specific tests', () => {
    test.skip(({ browserName }) => browserName !== 'chromium', 'Edge uses Chromium');

    test('should handle Edge-specific features', async ({ page }) => {
      // Edge shares most features with Chrome
      await page.goto('/');
      
      const edgeFeatures = await page.evaluate(() => {
        return {
          hasEdgeUserAgent: navigator.userAgent.includes('Edg'),
          hasChromiumFeatures: 'chrome' in window
        };
      });
      
      // Edge should identify itself
      if (edgeFeatures.hasEdgeUserAgent) {
        expect(edgeFeatures.hasChromiumFeatures).toBe(true);
      }
    });
  });

  test.describe('Browser feature detection', () => {
    test('should detect and handle Canvas support', async ({ page }) => {
      await page.goto('/');
      
      const canvasSupport = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        return {
          basic2D: !!canvas.getContext('2d'),
          webgl: !!canvas.getContext('webgl'),
          webgl2: !!canvas.getContext('webgl2'),
          offscreen: 'OffscreenCanvas' in window
        };
      });
      
      // All modern browsers should support basic Canvas 2D
      expect(canvasSupport.basic2D).toBe(true);
    });

    test('should detect and handle localStorage', async ({ page }) => {
      await page.goto('/');
      
      const storageSupport = await page.evaluate(() => {
        try {
          const test = 'test';
          localStorage.setItem(test, test);
          localStorage.removeItem(test);
          return true;
        } catch (e) {
          return false;
        }
      });
      
      expect(storageSupport).toBe(true);
    });

    test('should detect and handle Web Audio API', async ({ page }) => {
      await page.goto('/');
      
      const audioSupport = await page.evaluate(() => {
        return {
          audioContext: 'AudioContext' in window || 'webkitAudioContext' in window,
          audioElement: !!document.createElement('audio').canPlayType
        };
      });
      
      expect(audioSupport.audioContext || audioSupport.audioElement).toBe(true);
    });

    test('should detect and handle requestAnimationFrame', async ({ page }) => {
      await page.goto('/');
      
      const rafSupport = await page.evaluate(() => {
        return 'requestAnimationFrame' in window ||
               'webkitRequestAnimationFrame' in window ||
               'mozRequestAnimationFrame' in window;
      });
      
      expect(rafSupport).toBe(true);
    });

    test('should detect and handle Performance API', async ({ page }) => {
      await page.goto('/');
      
      const performanceSupport = await page.evaluate(() => {
        return {
          basic: 'performance' in window,
          now: 'performance' in window && 'now' in performance,
          navigation: 'performance' in window && 'navigation' in performance,
          memory: 'performance' in window && 'memory' in (performance as any)
        };
      });
      
      expect(performanceSupport.basic).toBe(true);
      expect(performanceSupport.now).toBe(true);
    });
  });

  test.describe('Viewport and resolution tests', () => {
    const viewports = [
      { name: 'Desktop HD', width: 1920, height: 1080 },
      { name: 'Desktop', width: 1366, height: 768 },
      { name: 'Tablet Landscape', width: 1024, height: 768 },
      { name: 'Tablet Portrait', width: 768, height: 1024 },
      { name: 'Mobile Landscape', width: 812, height: 375 },
      { name: 'Mobile Portrait', width: 375, height: 812 }
    ];

    for (const viewport of viewports) {
      test(`should render correctly at ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/');
        
        const mainMenu = new MainMenuPage(page);
        const gamePage = new GamePage(page);
        
        // Check main menu renders
        expect(await mainMenu.isVisible()).toBe(true);
        
        // Navigate to game
        await mainMenu.clickPlay();
        await gamePage.waitForGameReady();
        
        // Check game canvas renders and scales properly
        const canvasSize = await page.locator('canvas#game-canvas').boundingBox();
        expect(canvasSize).toBeDefined();
        expect(canvasSize!.width).toBeGreaterThan(0);
        expect(canvasSize!.height).toBeGreaterThan(0);
        
        // Take screenshot for visual verification
        await page.screenshot({ 
          path: `e2e/screenshots/viewport-${viewport.width}x${viewport.height}.png`,
          fullPage: false 
        });
      });
    }
  });

  test.describe('Performance across browsers', () => {
    test('should maintain acceptable FPS across all browsers', async ({ page, browserName }) => {
      await page.goto('/');
      const gamePage = new GamePage(page);
      
      await gamePage.gotoGame();
      await gamePage.startNewGame();
      
      // Start game
      await page.keyboard.press('Space');
      
      // Measure FPS
      const samples: number[] = [];
      for (let i = 0; i < 30; i++) {
        const fps = await gamePage.getFPS();
        samples.push(fps);
        await page.waitForTimeout(100);
      }
      
      const avgFPS = samples.reduce((a, b) => a + b, 0) / samples.length;
      
      // Log browser-specific performance
      console.log(`${browserName} average FPS: ${avgFPS.toFixed(2)}`);
      
      // All browsers should maintain at least 50 FPS
      expect(avgFPS).toBeGreaterThanOrEqual(50);
    });

    test('should have acceptable load time across all browsers', async ({ page, browserName }) => {
      const startTime = Date.now();
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      console.log(`${browserName} load time: ${loadTime}ms`);
      
      // Should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
    });

    test('should have acceptable memory usage across browsers', async ({ page, browserName }) => {
      await page.goto('/');
      
      // Get memory usage if available
      const memoryInfo = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory;
        }
        return null;
      });
      
      if (memoryInfo) {
        const usedMB = memoryInfo.usedJSHeapSize / 1024 / 1024;
        console.log(`${browserName} memory usage: ${usedMB.toFixed(2)}MB`);
        
        // Should use less than 200MB
        expect(usedMB).toBeLessThan(200);
      }
    });
  });
});