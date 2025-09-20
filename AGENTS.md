# Repository Guidelines

## Project Structure & Module Organization
The Vite + React TypeScript app lives in `src/`, with feature code grouped by responsibility: reusable UI under `src/components`, game mechanics in `src/game`, global state in `src/stores`, async and integration helpers in `src/services`, and shared types and utilities in `src/types` and `src/utils`. Tests co-located with code sit in directories such as `src/utils/__tests__` and `src/test` for broader scenarios. Static assets are served from `public/`, documentation references live under `docs/`, and build artefacts like coverage reports land in `coverage/`.

## Build, Test, and Development Commands
Run `npm install` once per clone. Use `npm run dev` for the Vite dev server and hot module reload. Validate production output with `npm run build`, then `npm run preview` to smoke-test the bundle. `npm run lint` applies the ESLint + Prettier ruleset, while `npm run test` launches Vitest in watch mode. Prefer `npm run test:run` in CI-style runs and `npm run test:coverage` before releases to ensure thresholds hold.

## Coding Style & Naming Conventions
TypeScript is required; keep components as function components, export default only when a file owns a single public component. Adopt PascalCase for component and store file names (`ErrorBoundary.tsx`), camelCase for utilities (`animations.ts`), and SCREAMING_SNAKE_CASE for constants. Follow the established 2-space indentation, trailing commas, and semicolon-free style enforced by Prettier through ESLint. Tailwind tokens belong in `src/themes` with descriptive names, and Zustand stores in `src/stores` should expose typed selectors.

## Testing Guidelines
Vitest with React Testing Library powers the suite; colocate unit specs as `*.test.ts`/`*.test.tsx` next to their subjects. Use jest-axe for accessibility checks when rendering UI, and favour integration flows inside `src/test` for gameplay scenarios. Keep tests deterministic, mock network or storage through helpers in `src/utils/storage.test.ts`, and ensure new features include coverage before requesting review.

## Commit & Pull Request Guidelines
Follow the existing conventional style: `<type>: <imperative summary>` (e.g., `feat: Add particle emitter options`). Reference the story or issue in the body when relevant and group related changes per commit. Pull requests should include a concise description, test evidence (command output or screenshots for UI), and note any configuration updates. Request review once lint and test commands pass locally.
