# 16. Testing Architecture

## Overview

This document defines the comprehensive testing architecture for the Bmad Brock Bloken game, establishing patterns, tools, and strategies to achieve 90% test coverage while maintaining test quality and execution speed.

## Testing Philosophy

### Core Principles
1. **Test Pyramid Adherence**: 60% unit, 30% integration, 10% E2E
2. **Fast Feedback**: Unit tests < 10ms, integration < 100ms, E2E < 5s
3. **Test Independence**: No shared state or test order dependencies
4. **Behavior Focus**: Test what, not how
5. **Comprehensive Coverage**: 90% statement coverage minimum

### Testing Pyramid

```
         /\
        /E2E\      10% - Full user journeys
       /------\    Playwright - Real browser testing
      / Integ \    30% - Component interactions
     /----------\  React Testing Library - DOM testing
    / Unit Tests \ 60% - Pure logic testing
   /--------------\ Vitest - Fast isolation testing
```

## Test Infrastructure

### Directory Structure

```
src/
├── __tests__/                    # Global test utilities
│   ├── fixtures/                 # Test data fixtures
│   ├── mocks/                    # Global mocks
│   └── utils/                    # Test helper functions
├── [module]/
│   ├── __tests__/                # Module-specific tests
│   │   ├── [Component].test.ts   # Unit tests
│   │   └── [Component].integration.test.ts
│   └── __mocks__/                # Module-specific mocks
e2e/
├── specs/                        # E2E test specifications
├── fixtures/                     # E2E test data
├── pages/                        # Page object models
└── utils/                        # E2E utilities
```

### Configuration Files

#### vitest.config.ts
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData/',
        '**/types/',
        '**/__mocks__/',
        '**/__tests__/',
        'e2e/**'
      ],
      statements: 90,
      branches: 85,
      functions: 80,
      lines: 90
    },
    testTimeout: 5000,
    hookTimeout: 10000
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@game': path.resolve(__dirname, './src/game'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@stores': path.resolve(__dirname, './src/stores'),
      '@services': path.resolve(__dirname, './src/services'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@types': path.resolve(__dirname, './src/types')
    }
  }
});
```

#### playwright.config.ts
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/specs',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results.json' }],
    ['junit', { outputFile: 'junit.xml' }]
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] }
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] }
    }
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI
  }
});
```

## Testing Patterns

### Unit Testing Patterns

#### Basic Test Structure
```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ComponentUnderTest } from '../ComponentUnderTest';

describe('ComponentUnderTest', () => {
  let component: ComponentUnderTest;
  
  beforeEach(() => {
    // Setup - create fresh instance for each test
    component = new ComponentUnderTest();
  });
  
  afterEach(() => {
    // Cleanup - reset all mocks
    vi.restoreAllMocks();
  });
  
  describe('methodName', () => {
    it('should handle normal case correctly', () => {
      // Arrange
      const input = { value: 42 };
      const expected = { result: 84 };
      
      // Act
      const actual = component.methodName(input);
      
      // Assert
      expect(actual).toEqual(expected);
    });
    
    it('should handle edge case correctly', () => {
      // Edge case testing
    });
    
    it('should throw error for invalid input', () => {
      // Error case testing
      expect(() => component.methodName(null))
        .toThrow('Invalid input');
    });
  });
});
```

#### Mocking Patterns
```typescript
// Mock external modules
vi.mock('@/services/AudioService', () => ({
  default: {
    playSound: vi.fn(),
    stopSound: vi.fn(),
    setVolume: vi.fn()
  }
}));

// Mock Canvas API
const mockCanvas = {
  getContext: vi.fn(() => ({
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn()
  }))
};

// Mock timers
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});
```

### Integration Testing Patterns

#### React Component Testing
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GameComponent } from '../GameComponent';
import { gameStore } from '@/stores/gameStore';

describe('GameComponent Integration', () => {
  beforeEach(() => {
    // Reset store state
    gameStore.getState().reset();
  });
  
  it('should integrate with game store correctly', async () => {
    // Arrange
    render(<GameComponent />);
    
    // Act
    const startButton = screen.getByRole('button', { name: /start/i });
    fireEvent.click(startButton);
    
    // Assert
    await waitFor(() => {
      expect(gameStore.getState().status).toBe('playing');
      expect(screen.getByTestId('game-canvas')).toBeInTheDocument();
    });
  });
});
```

#### Store Integration Testing
```typescript
import { renderHook, act } from '@testing-library/react';
import { useGameStore } from '@/hooks/useGameStore';
import { useGameEngine } from '@/hooks/useGameEngine';

describe('Store-Engine Integration', () => {
  it('should sync store with engine state', () => {
    const { result: storeHook } = renderHook(() => useGameStore());
    const { result: engineHook } = renderHook(() => useGameEngine());
    
    act(() => {
      engineHook.current.start();
    });
    
    expect(storeHook.current.isPlaying).toBe(true);
    expect(engineHook.current.state).toBe('running');
  });
});
```

### E2E Testing Patterns

#### Page Object Model
```typescript
// e2e/pages/GamePage.ts
import { Page, Locator } from '@playwright/test';

export class GamePage {
  readonly page: Page;
  readonly canvas: Locator;
  readonly scoreDisplay: Locator;
  readonly startButton: Locator;
  readonly pauseButton: Locator;
  
  constructor(page: Page) {
    this.page = page;
    this.canvas = page.locator('canvas#game-canvas');
    this.scoreDisplay = page.getByTestId('score-display');
    this.startButton = page.getByRole('button', { name: /start/i });
    this.pauseButton = page.getByRole('button', { name: /pause/i });
  }
  
  async goto() {
    await this.page.goto('/');
  }
  
  async startGame() {
    await this.startButton.click();
    await this.canvas.waitFor({ state: 'visible' });
  }
  
  async pauseGame() {
    await this.pauseButton.click();
  }
  
  async getScore(): Promise<number> {
    const text = await this.scoreDisplay.textContent();
    return parseInt(text || '0', 10);
  }
}
```

#### E2E Test Specification
```typescript
// e2e/specs/gameplay.spec.ts
import { test, expect } from '@playwright/test';
import { GamePage } from '../pages/GamePage';

test.describe('Gameplay E2E', () => {
  let gamePage: GamePage;
  
  test.beforeEach(async ({ page }) => {
    gamePage = new GamePage(page);
    await gamePage.goto();
  });
  
  test('complete game session', async ({ page }) => {
    // Start game
    await gamePage.startGame();
    
    // Play game (simulate input)
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowRight');
    
    // Wait for score update
    await page.waitForTimeout(2000);
    
    // Verify score increased
    const score = await gamePage.getScore();
    expect(score).toBeGreaterThan(0);
    
    // Pause game
    await gamePage.pauseGame();
    
    // Verify pause state
    await expect(page.getByText(/paused/i)).toBeVisible();
  });
});
```

## Test Data Management

### Fixtures
```typescript
// src/__tests__/fixtures/gameData.ts
export const createMockLevel = (overrides = {}) => ({
  id: 'test-level-1',
  name: 'Test Level',
  blocks: [
    { x: 0, y: 0, type: 'normal', health: 1 },
    { x: 1, y: 0, type: 'hard', health: 2 }
  ],
  ...overrides
});

export const createMockGameState = (overrides = {}) => ({
  status: 'idle',
  score: 0,
  lives: 3,
  level: 1,
  ...overrides
});
```

### Test Builders
```typescript
// src/__tests__/utils/builders.ts
export class GameStateBuilder {
  private state = createMockGameState();
  
  withScore(score: number) {
    this.state.score = score;
    return this;
  }
  
  withStatus(status: string) {
    this.state.status = status;
    return this;
  }
  
  build() {
    return { ...this.state };
  }
}

// Usage
const gameState = new GameStateBuilder()
  .withScore(1000)
  .withStatus('playing')
  .build();
```

## Coverage Strategy

### Module Coverage Targets

| Module | Statements | Branches | Functions | Lines | Priority |
|--------|------------|----------|-----------|-------|----------|
| game/core | 95% | 90% | 90% | 95% | P0 |
| game/physics | 90% | 85% | 85% | 90% | P0 |
| game/entities | 90% | 85% | 85% | 90% | P0 |
| stores | 90% | 85% | 80% | 90% | P0 |
| hooks | 85% | 80% | 80% | 85% | P1 |
| services | 90% | 85% | 85% | 90% | P1 |
| components | 80% | 75% | 75% | 80% | P2 |
| utils | 85% | 80% | 80% | 85% | P2 |

### Coverage Improvement Process

1. **Baseline Measurement**
   ```bash
   npm run test:coverage
   ```

2. **Gap Analysis**
   - Review coverage reports in `coverage/index.html`
   - Identify uncovered lines and branches
   - Prioritize by risk and importance

3. **Targeted Testing**
   - Write tests for uncovered critical paths
   - Add edge case tests for complex logic
   - Ensure error paths are tested

4. **Continuous Monitoring**
   - Set up pre-commit hooks for coverage check
   - Configure CI to fail on coverage regression
   - Generate coverage badges for README

## CI/CD Integration

### GitHub Actions Workflow
```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: unittests
          
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

## Performance Testing

### Load Testing
```typescript
// performance/load.test.ts
describe('Performance Tests', () => {
  it('should handle 1000 blocks without FPS drop', async () => {
    const startTime = performance.now();
    const game = new GameEngine();
    
    // Add 1000 blocks
    for (let i = 0; i < 1000; i++) {
      game.addBlock({ x: i % 50, y: Math.floor(i / 50) });
    }
    
    // Run 60 frames
    for (let frame = 0; frame < 60; frame++) {
      game.update(16.67);
    }
    
    const duration = performance.now() - startTime;
    expect(duration).toBeLessThan(1000); // Should complete in 1 second
  });
});
```

### Memory Leak Detection
```typescript
// performance/memory.test.ts
describe('Memory Tests', () => {
  it('should not leak memory in game loop', () => {
    const game = new GameEngine();
    const initialMemory = process.memoryUsage().heapUsed;
    
    // Run 1000 game cycles
    for (let i = 0; i < 1000; i++) {
      game.start();
      game.stop();
      game.reset();
    }
    
    global.gc(); // Force garbage collection
    const finalMemory = process.memoryUsage().heapUsed;
    
    // Memory should not grow significantly
    const memoryGrowth = finalMemory - initialMemory;
    expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024); // 10MB threshold
  });
});
```

## Best Practices

### Do's
- ✅ Write descriptive test names that explain the behavior
- ✅ Follow AAA pattern (Arrange-Act-Assert)
- ✅ Test one behavior per test
- ✅ Use test builders for complex data
- ✅ Mock at the boundary (external dependencies)
- ✅ Keep tests independent and idempotent
- ✅ Use data-testid for E2E element selection

### Don'ts
- ❌ Test implementation details
- ❌ Share state between tests
- ❌ Use random or time-dependent data
- ❌ Mock everything (test real logic when possible)
- ❌ Write tests after fixing bugs (write them to reproduce first)
- ❌ Ignore flaky tests (fix or remove them)
- ❌ Test third-party libraries

## Debugging Tests

### Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| Timeout errors | Increase timeout or use waitFor |
| Canvas not defined | Mock Canvas API properly |
| State pollution | Reset stores in beforeEach |
| Async issues | Use proper async/await patterns |
| Mock not working | Check mock path and module resolution |
| Coverage gaps | Run coverage report with --ui flag |

### Debugging Commands
```bash
# Run specific test file
npm run test -- Ball.test.ts

# Run tests in watch mode
npm run test:watch

# Debug with UI
npm run test:ui

# Run with verbose output
npm run test -- --reporter=verbose

# Update snapshots
npm run test -- -u

# Run E2E in headed mode
npm run test:e2e -- --headed

# Debug E2E test
npm run test:e2e -- --debug
```

## Maintenance

### Regular Tasks
- Weekly: Review coverage reports and identify gaps
- Sprint: Update test documentation
- Monthly: Review and remove obsolete tests
- Quarterly: Performance test audit
- Yearly: Test infrastructure upgrade

### Test Health Metrics
- Coverage trend (should increase over time)
- Test execution time (should remain stable)
- Flaky test count (should be zero)
- Test-to-code ratio (aim for 1.5:1)
- Mean time to test failure detection