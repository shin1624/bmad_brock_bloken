import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * E2E Tests: Accessibility Testing
 * Tests for keyboard navigation, screen reader compatibility, and WCAG compliance
 */

test.describe('Accessibility Testing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('WCAG Compliance', () => {
    test('should pass WCAG 2.1 AA standards on main menu', async ({ page }) => {
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      // Log violations for debugging
      if (accessibilityScanResults.violations.length > 0) {
        console.log('Accessibility violations:', 
          JSON.stringify(accessibilityScanResults.violations, null, 2));
      }

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should have proper color contrast', async ({ page }) => {
      const results = await new AxeBuilder({ page })
        .withTags(['cat.color'])
        .analyze();

      expect(results.violations.filter(v => v.id === 'color-contrast')).toEqual([]);
    });

    test('should have proper heading structure', async ({ page }) => {
      const results = await new AxeBuilder({ page })
        .withTags(['cat.structure'])
        .analyze();

      // Check heading hierarchy
      const headings = await page.evaluate(() => {
        const h1 = document.querySelectorAll('h1');
        const h2 = document.querySelectorAll('h2');
        const h3 = document.querySelectorAll('h3');
        return {
          h1Count: h1.length,
          h2Count: h2.length,
          h3Count: h3.length
        };
      });

      // Should have exactly one h1
      expect(headings.h1Count).toBe(1);
      
      // No heading level violations
      expect(results.violations.filter(v => 
        v.id === 'heading-order' || v.id === 'empty-heading'
      )).toEqual([]);
    });

    test('should have proper ARIA labels', async ({ page }) => {
      const results = await new AxeBuilder({ page })
        .withTags(['cat.aria'])
        .analyze();

      expect(results.violations.filter(v => 
        v.id.includes('aria')
      )).toEqual([]);

      // Check for important ARIA labels
      const buttons = await page.locator('button').all();
      for (const button of buttons) {
        const ariaLabel = await button.getAttribute('aria-label');
        const text = await button.textContent();
        expect(ariaLabel || text).toBeTruthy();
      }
    });

    test('should have proper form labels', async ({ page }) => {
      // Navigate to settings which has forms
      await page.click('button[aria-label="Settings"]');

      const results = await new AxeBuilder({ page })
        .withTags(['cat.forms'])
        .analyze();

      expect(results.violations.filter(v => 
        v.id === 'label' || v.id === 'label-title-only'
      )).toEqual([]);

      // Check all inputs have labels
      const inputs = await page.locator('input, select, textarea').all();
      for (const input of inputs) {
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledby = await input.getAttribute('aria-labelledby');
        
        if (id) {
          const label = await page.locator(`label[for="${id}"]`);
          expect(await label.count() > 0 || ariaLabel || ariaLabelledby).toBeTruthy();
        }
      }
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should navigate main menu with keyboard', async ({ page }) => {
      // Focus on first interactive element
      await page.keyboard.press('Tab');
      
      // Check focus is visible
      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          tagName: el?.tagName,
          ariaLabel: el?.getAttribute('aria-label'),
          hasVisibleOutline: window.getComputedStyle(el!).outlineStyle !== 'none'
        };
      });

      expect(focusedElement.hasVisibleOutline).toBe(true);

      // Navigate through all menu items
      const menuItems = ['Play', 'Settings', 'High Scores', 'Level Editor'];
      for (const item of menuItems) {
        await page.keyboard.press('Tab');
        const focused = await page.evaluate(() => document.activeElement?.textContent);
        expect(menuItems.some(i => focused?.includes(i))).toBe(true);
      }

      // Test Enter key activation
      await page.keyboard.press('Tab'); // Focus on Play button
      await page.keyboard.press('Enter');
      
      // Should navigate to game
      await expect(page.locator('canvas#game-canvas')).toBeVisible();
    });

    test('should navigate game with keyboard only', async ({ page }) => {
      // Navigate to game
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab'); // Focus on Play
      await page.keyboard.press('Enter');

      // Wait for game
      await page.waitForSelector('canvas#game-canvas');

      // Test game controls
      await page.keyboard.press('Space'); // Start game
      await page.waitForTimeout(500);

      // Test paddle movement
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('a'); // WASD alternative
      await page.keyboard.press('d');

      // Test pause
      await page.keyboard.press('Escape');
      await expect(page.locator('.pause-menu')).toBeVisible();

      // Navigate pause menu
      await page.keyboard.press('Tab'); // Focus on Resume
      await page.keyboard.press('Enter'); // Resume game

      // Game should be unpaused
      await expect(page.locator('.pause-menu')).not.toBeVisible();
    });

    test('should trap focus in modals', async ({ page }) => {
      // Open settings modal
      await page.click('button[aria-label="Settings"]');
      
      // Check focus is trapped
      const modalElements = await page.locator('.settings-modal [tabindex]:not([tabindex="-1"])').count();
      
      // Tab through all elements
      for (let i = 0; i < modalElements + 1; i++) {
        await page.keyboard.press('Tab');
      }
      
      // Focus should wrap back to first element
      const firstElement = await page.evaluate(() => {
        return document.activeElement?.getAttribute('aria-label');
      });
      
      expect(firstElement).toBeTruthy();
      
      // ESC should close modal
      await page.keyboard.press('Escape');
      await expect(page.locator('.settings-modal')).not.toBeVisible();
    });

    test('should have skip links', async ({ page }) => {
      // Check for skip link
      await page.keyboard.press('Tab');
      
      const skipLink = await page.evaluate(() => {
        const el = document.activeElement;
        return el?.textContent?.toLowerCase().includes('skip');
      });
      
      expect(skipLink).toBe(true);
    });
  });

  test.describe('Screen Reader Support', () => {
    test('should have proper page structure for screen readers', async ({ page }) => {
      // Check for landmarks
      const landmarks = await page.evaluate(() => {
        return {
          main: document.querySelector('main') !== null,
          nav: document.querySelector('nav') !== null || 
               document.querySelector('[role="navigation"]') !== null,
          header: document.querySelector('header') !== null ||
                  document.querySelector('[role="banner"]') !== null,
          footer: document.querySelector('footer') !== null ||
                  document.querySelector('[role="contentinfo"]') !== null
        };
      });

      expect(landmarks.main).toBe(true);
      expect(landmarks.nav || landmarks.header).toBe(true);
    });

    test('should announce game state changes', async ({ page }) => {
      // Navigate to game
      await page.click('.play-button');
      await page.waitForSelector('canvas#game-canvas');

      // Check for live regions
      const liveRegions = await page.evaluate(() => {
        const regions = document.querySelectorAll('[aria-live], [role="status"], [role="alert"]');
        return Array.from(regions).map(r => ({
          role: r.getAttribute('role'),
          ariaLive: r.getAttribute('aria-live'),
          content: r.textContent
        }));
      });

      expect(liveRegions.length).toBeGreaterThan(0);

      // Start game and check for announcements
      await page.keyboard.press('Space');
      await page.waitForTimeout(1000);

      // Check score announcement
      const scoreAnnouncement = await page.locator('[aria-live="polite"]').textContent();
      expect(scoreAnnouncement).toBeTruthy();
    });

    test('should have descriptive alt text for images', async ({ page }) => {
      const images = await page.locator('img').all();
      
      for (const img of images) {
        const alt = await img.getAttribute('alt');
        const ariaLabel = await img.getAttribute('aria-label');
        const role = await img.getAttribute('role');
        
        // Decorative images should have role="presentation" or empty alt
        if (role === 'presentation' || alt === '') {
          expect(role).toBe('presentation');
        } else {
          // Informative images should have descriptive alt text
          expect(alt || ariaLabel).toBeTruthy();
          expect((alt || ariaLabel)?.length).toBeGreaterThan(0);
        }
      }
    });

    test('should provide context for game canvas', async ({ page }) => {
      await page.click('.play-button');
      await page.waitForSelector('canvas#game-canvas');

      // Canvas should have accessible description
      const canvas = await page.locator('canvas#game-canvas');
      const ariaLabel = await canvas.getAttribute('aria-label');
      const ariaDescribedby = await canvas.getAttribute('aria-describedby');
      
      expect(ariaLabel || ariaDescribedby).toBeTruthy();

      // Should have text alternative for game state
      const gameDescription = await page.locator('.game-description, [role="status"]').textContent();
      expect(gameDescription).toBeTruthy();
    });
  });

  test.describe('Focus Management', () => {
    test('should have visible focus indicators', async ({ page }) => {
      // Tab through elements
      const elements = [];
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
        
        const focusInfo = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el) return null;
          
          const styles = window.getComputedStyle(el);
          return {
            tagName: el.tagName,
            hasOutline: styles.outlineStyle !== 'none' && styles.outlineWidth !== '0px',
            hasBorder: styles.borderStyle !== 'none' && styles.borderWidth !== '0px',
            hasBoxShadow: styles.boxShadow !== 'none'
          };
        });
        
        if (focusInfo) {
          elements.push(focusInfo);
        }
      }

      // All focused elements should have visible indicators
      for (const el of elements) {
        expect(el.hasOutline || el.hasBorder || el.hasBoxShadow).toBe(true);
      }
    });

    test('should restore focus after modal close', async ({ page }) => {
      // Focus on settings button
      const settingsButton = page.locator('button[aria-label="Settings"]');
      await settingsButton.focus();

      // Open modal
      await settingsButton.click();
      await expect(page.locator('.settings-modal')).toBeVisible();

      // Close modal
      await page.keyboard.press('Escape');

      // Focus should return to settings button
      const focusedElement = await page.evaluate(() => {
        return document.activeElement?.getAttribute('aria-label');
      });
      
      expect(focusedElement).toBe('Settings');
    });
  });

  test.describe('Touch and Mobile Accessibility', () => {
    test('should have touch-friendly tap targets', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // Check button sizes
      const buttons = await page.locator('button, a, [role="button"]').all();
      
      for (const button of buttons) {
        const box = await button.boundingBox();
        if (box) {
          // WCAG 2.1 requires 44x44px minimum
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
    });

    test('should support touch gestures', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Navigate to game
      await page.tap('.play-button');
      await page.waitForSelector('canvas#game-canvas');

      // Test touch controls
      const canvas = page.locator('canvas#game-canvas');
      
      // Tap to start
      await canvas.tap();
      
      // Swipe for paddle movement
      await page.mouse.move(200, 500);
      await page.mouse.down();
      await page.mouse.move(400, 500);
      await page.mouse.up();
    });
  });

  test.describe('Reduced Motion Support', () => {
    test('should respect prefers-reduced-motion', async ({ page }) => {
      // Enable reduced motion
      await page.emulateMedia({ reducedMotion: 'reduce' });

      // Check if animations are disabled
      const hasAnimations = await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        for (const el of Array.from(elements)) {
          const styles = window.getComputedStyle(el);
          if (styles.animationDuration !== '0s' && styles.animationDuration !== '0ms') {
            return true;
          }
          if (styles.transitionDuration !== '0s' && styles.transitionDuration !== '0ms') {
            return true;
          }
        }
        return false;
      });

      expect(hasAnimations).toBe(false);
    });
  });

  test.describe('Text and Content Accessibility', () => {
    test('should have readable text size', async ({ page }) => {
      const textElements = await page.locator('p, span, div, button').all();
      
      for (const element of textElements.slice(0, 10)) { // Check first 10
        const fontSize = await element.evaluate(el => {
          return parseInt(window.getComputedStyle(el).fontSize);
        });
        
        // Minimum readable size is typically 12px
        if (fontSize) {
          expect(fontSize).toBeGreaterThanOrEqual(12);
        }
      }
    });

    test('should support text zoom', async ({ page }) => {
      // Zoom to 200%
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '200%';
      });

      // Check layout doesn't break
      const overflow = await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        for (const el of Array.from(elements)) {
          const rect = el.getBoundingClientRect();
          if (rect.right > window.innerWidth || rect.bottom > window.innerHeight) {
            return true;
          }
        }
        return false;
      });

      expect(overflow).toBe(false);
    });
  });
});