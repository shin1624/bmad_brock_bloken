# Repository Guidelines

## Project Structure & Module Organization
The Vite + React TypeScript app lives in `src/`. Reusable UI sits in `src/components`, gameplay logic in `src/game`, global state in `src/stores`, integration helpers in `src/services`, and shared types plus utilities in `src/types` and `src/utils`. Unit suites stay beside their subjects or in `src/test` for cross-cutting flows. Static assets live in `public/`, docs in `docs/`, and coverage artefacts in `coverage/`.

## Build, Test, and Development Commands
Install dependencies with `npm install`. Use `npm run dev` for the Vite dev server with HMR. Validate release artefacts via `npm run build`, then smoke-test with `npm run preview`. `npm run lint` enforces ESLint + Prettier, `npm run test` runs Vitest in watch mode, `npm run test:run` captures CI-quality output, and `npm run test:coverage` reports thresholds before delivery.

## Coding Style & Naming Conventions
TypeScript is required; keep components as function components, export default only when a file owns a single public component. Adopt PascalCase for component and store file names (`ErrorBoundary.tsx`), camelCase for utilities (`animations.ts`), and SCREAMING_SNAKE_CASE for constants. Follow the established 2-space indentation, trailing commas, and semicolon-free style enforced by Prettier through ESLint. Tailwind tokens belong in `src/themes` with descriptive names, and Zustand stores in `src/stores` should expose typed selectors.

## Testing Guidelines
Vitest with React Testing Library powers the suite. Colocate unit specs as `*.test.ts`/`*.test.tsx` next to their subjects and keep scenario tests in `src/test`. Use jest-axe for accessibility checks, mock network and storage via helpers in `src/utils/storage.test.ts`, keep runs deterministic, and require passing coverage before requesting review.

## Commit & Pull Request Guidelines
Follow the existing conventional style: `<type>: <imperative summary>` (e.g., `feat: Add particle emitter options`). Reference the story or issue in the body when relevant and group related changes per commit. Pull requests should include a concise description, test evidence (command output or screenshots for UI), and note any configuration updates. Request review once lint and test commands pass locally.

## BMAD Method Workflow
Frame each iteration as a BMAD slice: record the Build goal, intended Measure signals, and planned Adjust checkpoints in the PR description. Archive metrics, screenshots, and coverage artefacts inside `docs/` or `coverage/` after each loop. Deliver only when `npm run lint` and `npm run test:run` are green and reviewers confirm acceptance criteria.

## Language
思考は英語で、出力は日本語で回答してください。