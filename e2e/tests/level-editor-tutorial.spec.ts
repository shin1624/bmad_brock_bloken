import { test, expect, Page } from '@playwright/test';

test.describe('Level Editor Tutorial', () => {
  let page: Page;

  test.beforeEach(async ({ page: p }) => {
    page = p;
    
    // Clear localStorage to simulate first-time user
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('blockbreaker_tutorial_state');
    });
    
    // Navigate to level editor
    await page.goto('/editor');
    
    // Wait for tutorial to initialize
    await page.waitForTimeout(600);
  });

  test('should auto-start tutorial for first-time users', async () => {
    // Tutorial should be visible
    await expect(page.locator('text=レベルエディタへようこそ！')).toBeVisible();
    
    // Should show step progress
    await expect(page.locator('text=ステップ 1 / 9')).toBeVisible();
    
    // Should have skip button
    await expect(page.locator('button:has-text("スキップ")')).toBeVisible();
  });

  test('should complete full tutorial flow', async () => {
    // Step 1: Welcome
    await expect(page.locator('text=レベルエディタへようこそ！')).toBeVisible();
    await page.locator('text=次へ').click();
    
    // Step 2: Select Block
    await expect(page.locator('text=ブロックタイプを選択')).toBeVisible();
    
    // Block palette should be highlighted
    const blockPalette = page.locator('[data-testid="block-palette"]');
    await expect(blockPalette).toHaveClass(/tutorial-highlight/);
    
    // Click on a block in the palette
    await page.locator('[data-testid="block-group-basic"] button').first().click();
    
    // Step 3: Place Block
    await expect(page.locator('text=最初のブロックを配置')).toBeVisible();
    
    // Canvas should be highlighted
    const canvas = page.locator('[data-testid="editor-canvas"]');
    await expect(canvas).toHaveClass(/tutorial-highlight/);
    
    // Click on canvas to place block
    await canvas.click({ position: { x: 100, y: 100 } });
    
    // Step 4: Remove Block
    await expect(page.locator('text=ブロックの削除')).toBeVisible();
    
    // Right-click to remove
    await canvas.click({ button: 'right', position: { x: 100, y: 100 } });
    
    // Continue through remaining steps
    await page.locator('text=次へ').click(); // Special blocks
    await page.locator('text=次へ').click(); // Test level
    await page.locator('text=次へ').click(); // Save level
    await page.locator('text=次へ').click(); // Load/Edit
    
    // Step 9: Completion
    await expect(page.locator('text=おめでとうございます！')).toBeVisible();
    await page.locator('text=次へ').click();
    
    // Tutorial should be completed
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    
    // Check localStorage for completion
    const tutorialState = await page.evaluate(() => {
      const state = localStorage.getItem('blockbreaker_tutorial_state');
      return state ? JSON.parse(state) : null;
    });
    
    expect(tutorialState?.state?.completed).toBe(true);
  });

  test('should allow skipping tutorial', async () => {
    // Click skip button
    await page.locator('button:has-text("スキップ")').click();
    
    // Confirm skip in dialog
    page.on('dialog', dialog => dialog.accept());
    
    // Tutorial should be hidden
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    
    // Check localStorage for skip status
    const tutorialState = await page.evaluate(() => {
      const state = localStorage.getItem('blockbreaker_tutorial_state');
      return state ? JSON.parse(state) : null;
    });
    
    expect(tutorialState?.state?.skipped).toBe(true);
  });

  test('should navigate backwards in tutorial', async () => {
    // Go to step 2
    await page.locator('text=次へ').click();
    await expect(page.locator('text=ブロックタイプを選択')).toBeVisible();
    
    // Should show previous button
    await expect(page.locator('button:has-text("前へ")')).toBeVisible();
    
    // Go back to step 1
    await page.locator('button:has-text("前へ")').click();
    await expect(page.locator('text=レベルエディタへようこそ！')).toBeVisible();
    
    // Should not show previous button on first step
    await expect(page.locator('button:has-text("前へ")')).not.toBeVisible();
  });

  test('should not auto-start for returning users', async () => {
    // Set tutorial as completed in localStorage
    await page.evaluate(() => {
      localStorage.setItem('blockbreaker_tutorial_state', JSON.stringify({
        state: {
          completed: true,
          hasSeenBefore: true,
          skipped: false,
          currentStep: 0,
          progress: [0, 1, 2, 3, 4, 5, 6, 7, 8]
        },
        version: 0
      }));
    });
    
    // Reload page
    await page.reload();
    await page.waitForTimeout(600);
    
    // Tutorial should not be visible
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test('should restart tutorial from help menu', async () => {
    // Skip tutorial first
    await page.locator('button:has-text("スキップ")').click();
    page.on('dialog', dialog => dialog.accept());
    
    // Wait for tutorial to close
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
    
    // Open help menu (assuming there's a help button)
    // Note: This assumes help menu implementation exists
    await page.locator('button:has-text("ヘルプ")').click();
    await page.locator('text=チュートリアルを再実行').click();
    
    // Tutorial should restart
    await expect(page.locator('text=レベルエディタへようこそ！')).toBeVisible();
  });

  test('should handle keyboard navigation', async () => {
    // ESC key should trigger skip
    await page.keyboard.press('Escape');
    
    // Confirm skip in dialog
    page.on('dialog', dialog => dialog.accept());
    
    // Tutorial should be hidden
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test('should save and resume progress', async () => {
    // Progress to step 3
    await page.locator('text=次へ').click();
    await page.locator('[data-testid="block-group-basic"] button').first().click();
    
    // Reload page
    await page.reload();
    
    // Should resume at step 3
    await expect(page.locator('text=最初のブロックを配置')).toBeVisible();
    await expect(page.locator('text=ステップ 3 / 9')).toBeVisible();
  });

  test('should highlight target elements correctly', async () => {
    // Progress to step 2
    await page.locator('text=次へ').click();
    
    // Block palette should have highlight class
    const blockPalette = page.locator('[data-testid="block-palette"]');
    await expect(blockPalette).toHaveClass(/tutorial-highlight/);
    
    // Progress to step 3
    await page.locator('[data-testid="block-group-basic"] button').first().click();
    
    // Canvas should have highlight class
    const canvas = page.locator('[data-testid="editor-canvas"]');
    await expect(canvas).toHaveClass(/tutorial-highlight/);
    
    // Previous element should no longer be highlighted
    await expect(blockPalette).not.toHaveClass(/tutorial-highlight/);
  });

  test('should handle tooltip positioning', async () => {
    // Progress to step 2
    await page.locator('text=次へ').click();
    
    // Tooltip should be positioned correctly
    const tooltip = page.locator('[role="dialog"]');
    const blockPalette = page.locator('[data-testid="block-palette"]');
    
    // Get bounding boxes
    const tooltipBox = await tooltip.boundingBox();
    const paletteBox = await blockPalette.boundingBox();
    
    // Tooltip should be positioned to the right of the palette
    expect(tooltipBox?.x).toBeGreaterThan(paletteBox?.x ?? 0);
  });
});