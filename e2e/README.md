# E2E Testing with Playwright

This directory contains end-to-end tests for the BMAD Brock Bloken game using Playwright.

## Structure

```
e2e/
├── fixtures/       # Test fixtures and utilities
├── pages/          # Page Object Models
├── tests/          # Test specifications
├── screenshots/    # Visual regression screenshots
└── README.md       # This file
```

## Running Tests

```bash
# Install Playwright
npm install -D @playwright/test

# Install browsers
npx playwright install

# Run all tests
npm run test:e2e

# Run tests in UI mode
npm run test:e2e:ui

# Run tests in debug mode
npm run test:e2e:debug

# Run specific test file
npx playwright test game-flow.spec.ts

# Run tests in specific browser
npx playwright test --project=chromium
```

## Test Coverage

### Core Game Flow
- Game startup and initialization
- Paddle movement controls
- Ball physics and collisions
- Score tracking
- Level progression
- Game over scenarios
- Save/restore functionality

### UI Interactions
- Main menu navigation
- Settings management
- Level editor workflows
- Pause/resume functionality

### Cross-Browser Testing
- Chrome/Chromium
- Firefox
- Safari/WebKit
- Mobile viewports

## Page Object Models

### GamePage
Handles interactions with the game canvas and game state.

### MainMenuPage
Manages main menu navigation.

### SettingsPage
Controls settings panel interactions.

### LevelEditorPage
Manages level editor functionality.

## Writing Tests

Use the custom test fixtures for better organization:

```typescript
import { test, expect } from '../fixtures/game.fixture';

test('should do something', async ({ gamePage, gameHelpers }) => {
  // Your test code here
});
```

## Visual Testing

Screenshots are saved to `e2e/screenshots/` for visual regression testing.

## CI/CD Integration

Tests run automatically in GitHub Actions on pull requests.

## Best Practices

1. Use Page Object Models for maintainability
2. Keep tests independent and isolated
3. Use meaningful test descriptions
4. Implement proper wait strategies
5. Take screenshots for debugging
6. Mock external dependencies when needed