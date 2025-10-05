import { Page, Locator } from '@playwright/test';

/**
 * Test reliability helper functions for E2E tests
 */

export interface RetryOptions {
  maxAttempts?: number;
  delay?: number;
  timeout?: number;
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxAttempts = 3, delay = 1000 } = options;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) {
        throw new Error(`Failed after ${maxAttempts} attempts: ${error}`);
      }
      
      const waitTime = delay * Math.pow(2, attempt - 1);
      console.log(`Attempt ${attempt} failed, retrying in ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw new Error('Unexpected error in retry logic');
}

/**
 * Wait for element with custom conditions
 */
export async function waitForElement(
  page: Page,
  selector: string,
  options: {
    state?: 'visible' | 'hidden' | 'attached' | 'detached';
    timeout?: number;
  } = {}
): Promise<Locator> {
  const { state = 'visible', timeout = 10000 } = options;
  
  try {
    const element = page.locator(selector).first();
    await element.waitFor({ state, timeout });
    return element;
  } catch (error) {
    throw new Error(`Element ${selector} not ${state} within ${timeout}ms: ${error}`);
  }
}

/**
 * Safe click with wait conditions
 */
export async function safeClick(
  page: Page,
  selector: string | Locator,
  options: {
    waitBefore?: number;
    waitAfter?: number;
    force?: boolean;
  } = {}
): Promise<void> {
  const { waitBefore = 0, waitAfter = 500, force = false } = options;
  
  if (waitBefore > 0) {
    await page.waitForTimeout(waitBefore);
  }
  
  const element = typeof selector === 'string' ? page.locator(selector).first() : selector;
  
  try {
    await element.waitFor({ state: 'visible', timeout: 5000 });
    await element.scrollIntoViewIfNeeded();
    await element.click({ force });
  } catch (error) {
    throw new Error(`Failed to click element: ${error}`);
  }
  
  if (waitAfter > 0) {
    await page.waitForTimeout(waitAfter);
  }
}

/**
 * Wait for navigation with fallback
 */
export async function waitForNavigation(
  page: Page,
  expectedUrl?: string | RegExp,
  timeout: number = 10000
): Promise<void> {
  try {
    await Promise.race([
      page.waitForURL(expectedUrl || '**/*', { timeout }),
      page.waitForTimeout(timeout)
    ]);
  } catch (error) {
    console.warn(`Navigation timeout, continuing: ${error}`);
  }
}

/**
 * Get element with flexible selectors
 */
export async function findButton(
  page: Page,
  text: string | RegExp,
  options: {
    exact?: boolean;
    timeout?: number;
  } = {}
): Promise<Locator | null> {
  const { exact = false, timeout = 5000 } = options;
  
  // Try multiple selector strategies
  const selectors = [
    page.getByRole('button', { name: text, exact }),
    page.getByRole('button').filter({ hasText: text }),
    page.locator('button').filter({ hasText: text }),
    page.getByText(text, { exact }),
    page.locator(`[aria-label*="${text}"]`),
    page.locator(`button:has-text("${text}")`)
  ];
  
  for (const selector of selectors) {
    try {
      const count = await selector.count();
      if (count > 0) {
        const element = selector.first();
        await element.waitFor({ state: 'visible', timeout });
        return element;
      }
    } catch {
      // Try next selector
    }
  }
  
  return null;
}

/**
 * Test data fixtures for consistent state
 */
export const testData = {
  defaultSettings: {
    volume: 50,
    soundEffects: true,
    backgroundMusic: true,
    theme: 'classic',
    difficulty: 'medium'
  },
  
  testLevel: {
    name: 'Test Level',
    blocks: [
      { x: 100, y: 100, type: 'normal' },
      { x: 200, y: 100, type: 'normal' },
      { x: 300, y: 100, type: 'special' }
    ]
  },
  
  mockScores: [
    { player: 'Player1', score: 1000 },
    { player: 'Player2', score: 800 },
    { player: 'Player3', score: 600 }
  ]
};

/**
 * Enhanced error messages for assertions
 */
export function assertionMessage(
  action: string,
  expected: string,
  actual?: string
): string {
  const baseMessage = `Failed ${action}: Expected ${expected}`;
  return actual ? `${baseMessage}, but got ${actual}` : baseMessage;
}

/**
 * Wait for stable DOM (no changes for specified time)
 */
export async function waitForStableDOM(
  page: Page,
  stability: number = 500
): Promise<void> {
  let lastHTML = await page.content();
  let stable = false;
  const maxWait = 5000;
  const startTime = Date.now();
  
  while (!stable && (Date.now() - startTime) < maxWait) {
    await page.waitForTimeout(stability);
    const currentHTML = await page.content();
    
    if (currentHTML === lastHTML) {
      stable = true;
    } else {
      lastHTML = currentHTML;
    }
  }
  
  if (!stable) {
    console.warn('DOM did not stabilize within timeout');
  }
}

/**
 * Capture detailed error context
 */
export async function captureErrorContext(
  page: Page,
  error: Error
): Promise<void> {
  console.error('Test Error:', error.message);
  
  // Capture console logs
  page.on('console', msg => {
    console.log('Browser console:', msg.type(), msg.text());
  });
  
  // Capture page errors
  page.on('pageerror', err => {
    console.error('Page error:', err.message);
  });
  
  // Try to capture screenshot on error
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await page.screenshot({ 
      path: `e2e/screenshots/error-${timestamp}.png`,
      fullPage: true 
    });
    console.log(`Error screenshot saved: error-${timestamp}.png`);
  } catch {
    console.warn('Could not capture error screenshot');
  }
}