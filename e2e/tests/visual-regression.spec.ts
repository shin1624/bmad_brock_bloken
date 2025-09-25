import { test, expect } from '../fixtures/game.fixture';
import { screenshotCanvas } from '../fixtures/canvas-helpers';
import * as fs from 'fs';
import * as path from 'path';

/**
 * E2E Tests: Visual Regression Testing
 * Tests for visual consistency across changes
 */

test.describe('Visual Regression Testing', () => {
  const screenshotsDir = 'e2e/screenshots';
  const baselinesDir = path.join(screenshotsDir, 'baseline');
  const diffsDir = path.join(screenshotsDir, 'diff');
  
  test.beforeAll(async () => {
    // Ensure directories exist
    if (!fs.existsSync(baselinesDir)) {
      fs.mkdirSync(baselinesDir, { recursive: true });
    }
    if (!fs.existsSync(diffsDir)) {
      fs.mkdirSync(diffsDir, { recursive: true });
    }
  });

  test.beforeEach(async ({ page, gameHelpers }) => {
    await page.goto('/');
    await gameHelpers.clearLocalStorage();
    await gameHelpers.waitForGameLoad();
  });

  test.describe('Main Menu Visual Tests', () => {
    test('should match main menu baseline', async ({ page, mainMenuPage }) => {
      await mainMenuPage.goto();
      
      // Take screenshot
      const screenshot = await page.screenshot({
        fullPage: false,
        clip: { x: 0, y: 0, width: 1280, height: 720 }
      });
      
      // Compare with baseline
      await expect(page).toHaveScreenshot('main-menu.png', {
        maxDiffPixels: 100,
        threshold: 0.2,
        animations: 'disabled'
      });
    });

    test('should match settings panel baseline', async ({ page, mainMenuPage, settingsPage }) => {
      await mainMenuPage.goto();
      await mainMenuPage.clickSettings();
      
      await expect(page).toHaveScreenshot('settings-panel.png', {
        maxDiffPixels: 100,
        threshold: 0.2,
        animations: 'disabled'
      });
    });

    test('should match high scores baseline', async ({ page, mainMenuPage }) => {
      await mainMenuPage.goto();
      await mainMenuPage.clickHighScores();
      
      await expect(page).toHaveScreenshot('high-scores.png', {
        maxDiffPixels: 100,
        threshold: 0.2,
        animations: 'disabled'
      });
    });
  });

  test.describe('Game Canvas Visual Tests', () => {
    test('should match game start state baseline', async ({ page, mainMenuPage, gamePage }) => {
      await mainMenuPage.goto();
      await mainMenuPage.clickPlay();
      await gamePage.waitForGameReady();
      
      // Take canvas screenshot
      const canvasScreenshot = await screenshotCanvas(page);
      
      // Compare with baseline
      await expect(page.locator('canvas#game-canvas')).toHaveScreenshot('game-start.png', {
        maxDiffPixels: 200,
        threshold: 0.2
      });
    });

    test('should match game playing state baseline', async ({ page, mainMenuPage, gamePage }) => {
      await mainMenuPage.goto();
      await mainMenuPage.clickPlay();
      await gamePage.waitForGameReady();
      await gamePage.startNewGame();
      
      // Wait for stable frame
      await page.waitForTimeout(500);
      
      await expect(page.locator('canvas#game-canvas')).toHaveScreenshot('game-playing.png', {
        maxDiffPixels: 500, // More tolerance for moving objects
        threshold: 0.3
      });
    });

    test('should match pause menu baseline', async ({ page, mainMenuPage, gamePage }) => {
      await mainMenuPage.goto();
      await mainMenuPage.clickPlay();
      await gamePage.waitForGameReady();
      await gamePage.startNewGame();
      await gamePage.pauseGame();
      
      await expect(page).toHaveScreenshot('pause-menu.png', {
        maxDiffPixels: 100,
        threshold: 0.2,
        animations: 'disabled'
      });
    });

    test('should match game over screen baseline', async ({ page, mainMenuPage, gamePage }) => {
      await mainMenuPage.goto();
      await mainMenuPage.clickPlay();
      await gamePage.waitForGameReady();
      
      // Force game over
      await page.evaluate(() => {
        if ((window as any).gameState) {
          (window as any).gameState.lives = 0;
          (window as any).gameState.isGameOver = true;
        }
      });
      
      await page.waitForTimeout(500);
      
      await expect(page).toHaveScreenshot('game-over.png', {
        maxDiffPixels: 100,
        threshold: 0.2,
        animations: 'disabled'
      });
    });
  });

  test.describe('Level Editor Visual Tests', () => {
    test('should match level editor baseline', async ({ page, mainMenuPage, levelEditorPage }) => {
      await mainMenuPage.goto();
      await mainMenuPage.clickLevelEditor();
      
      await expect(page).toHaveScreenshot('level-editor.png', {
        maxDiffPixels: 100,
        threshold: 0.2,
        animations: 'disabled'
      });
    });

    test('should match level editor with blocks', async ({ page, mainMenuPage, levelEditorPage }) => {
      await mainMenuPage.goto();
      await mainMenuPage.clickLevelEditor();
      
      // Add some blocks
      await levelEditorPage.addBlock(5, 5, 'normal');
      await levelEditorPage.addBlock(6, 5, 'hard');
      await levelEditorPage.addBlock(7, 5, 'unbreakable');
      
      await expect(page).toHaveScreenshot('level-editor-blocks.png', {
        maxDiffPixels: 100,
        threshold: 0.2
      });
    });
  });

  test.describe('Theme Visual Tests', () => {
    const themes = ['default', 'retro', 'neon', 'dark'];

    for (const theme of themes) {
      test(`should match ${theme} theme baseline`, async ({ page, mainMenuPage, settingsPage }) => {
        await mainMenuPage.goto();
        await mainMenuPage.clickSettings();
        await settingsPage.selectTheme(theme);
        await settingsPage.saveSettings();
        
        // Go back to main menu
        await page.click('.back-button');
        
        await expect(page).toHaveScreenshot(`theme-${theme}.png`, {
          maxDiffPixels: 100,
          threshold: 0.2,
          animations: 'disabled'
        });
      });
    }
  });

  test.describe('Responsive Visual Tests', () => {
    const viewports = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1920, height: 1080 }
    ];

    for (const viewport of viewports) {
      test(`should match ${viewport.name} viewport baseline`, async ({ page, mainMenuPage }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await mainMenuPage.goto();
        
        await expect(page).toHaveScreenshot(`viewport-${viewport.name}.png`, {
          maxDiffPixels: 100,
          threshold: 0.2,
          animations: 'disabled',
          fullPage: false
        });
      });
    }
  });

  test.describe('Visual Diff Reporting', () => {
    test('should generate visual diff report', async ({ page }) => {
      // This would typically be done in CI/CD
      const reportPath = path.join(screenshotsDir, 'visual-report.html');
      
      // Check if any diffs exist
      if (fs.existsSync(diffsDir)) {
        const diffs = fs.readdirSync(diffsDir);
        
        if (diffs.length > 0) {
          // Generate HTML report
          const html = `
            <!DOCTYPE html>
            <html>
            <head>
              <title>Visual Regression Report</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .diff { margin: 20px 0; border: 1px solid #ccc; padding: 10px; }
                .diff img { max-width: 300px; margin: 10px; }
                .diff-container { display: flex; gap: 20px; }
                .status-fail { color: red; }
                .status-pass { color: green; }
              </style>
            </head>
            <body>
              <h1>Visual Regression Report</h1>
              <p>Generated: ${new Date().toISOString()}</p>
              <div class="diffs">
                ${diffs.map(diff => `
                  <div class="diff">
                    <h3>${diff}</h3>
                    <div class="diff-container">
                      <div>
                        <h4>Baseline</h4>
                        <img src="../baseline/${diff}" />
                      </div>
                      <div>
                        <h4>Current</h4>
                        <img src="../current/${diff}" />
                      </div>
                      <div>
                        <h4>Diff</h4>
                        <img src="${diff}" />
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </body>
            </html>
          `;
          
          fs.writeFileSync(reportPath, html);
          console.log(`Visual regression report generated: ${reportPath}`);
        }
      }
    });
  });
});

/**
 * Helper function to compare images pixel by pixel
 */
async function compareImages(
  baselinePath: string,
  currentPath: string,
  threshold = 0.1
): Promise<{ match: boolean; diffPercent: number }> {
  // This would use a library like pixelmatch in a real implementation
  // For now, return mock result
  return { match: true, diffPercent: 0.05 };
}

/**
 * Helper to update baseline images
 * Run with: UPDATE_BASELINES=true npm run test:e2e
 */
export async function updateBaseline(name: string, screenshot: Buffer) {
  if (process.env.UPDATE_BASELINES === 'true') {
    const baselinePath = path.join('e2e/screenshots/baseline', `${name}.png`);
    fs.writeFileSync(baselinePath, screenshot);
    console.log(`Updated baseline: ${baselinePath}`);
  }
}