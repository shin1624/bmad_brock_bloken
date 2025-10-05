# Block Breaker Game - React + TypeScript + Vite

[![CI/CD Pipeline](https://github.com/yoshikawashin/bmad_brock_bloken/actions/workflows/deploy.yml/badge.svg)](https://github.com/yoshikawashin/bmad_brock_bloken/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A modern block breaker game built with React, TypeScript, and Canvas, featuring comprehensive testing and CI/CD integration.

## 🎮 Features

- Classic block breaker gameplay
- React + Canvas hybrid architecture
- TypeScript for type safety
- Comprehensive test coverage
- CI/CD pipeline with GitHub Actions

## 🧪 Testing

### Running Tests

```bash
# Run all unit tests
npm test

# Run tests with coverage
npm run test:coverage

# Run integration tests
npm test -- src/__tests__/integration

# Run E2E tests
npm run test:e2e

# TypeScript type checking
npm run typecheck
```

### Test Coverage Goals

- **Unit Tests**: 90% coverage target
- **Integration Tests**: Key user flows covered
- **E2E Tests**: Critical paths automated

### CI/CD Pipeline

The project includes GitHub Actions workflows for:
- TypeScript type checking on all branches
- Test coverage reporting
- E2E test automation
- Automatic PR checks

## 🚀 Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linting
npm run lint
```

## 📁 Project Structure

```
src/
├── components/        # React UI components
│   ├── game/         # Game-related components
│   └── menu/         # Menu components
├── __tests__/        # Test files
│   └── integration/  # Integration tests
├── game/             # Canvas game engine
└── stores/           # State management
```

## 🔧 Technical Debt Tracking

Current technical debt is tracked in the project stories:
- TD-007: Test coverage improvements (Resolved)

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
