# Repository Guidelines

## Project Structure & Module Organization
This repository is a Next.js 16 (App Router) TypeScript app.
- `app/`: routes, layouts, and server/client page entrypoints
- `components/`: UI and feature components (`components/ui` for shadcn-style primitives)
- `hooks/`: reusable React hooks (calendar and guild logic are grouped by domain)
- `lib/`: shared services and utilities (auth, Supabase, analytics, guild/calendar logic)
- `__tests__/`: unit/integration test suites by concern
- `e2e_tests/`: Playwright end-to-end tests
- `public/`: static assets
- `.kiro/`: steering docs and feature specs

## Build, Test, and Development Commands
- `npm run dev`: start local dev server (`http://localhost:3000`)
- `npm run build`: production build
- `npm run start`: run built app
- `npm run lint`: run Ultracite/Biome checks
- `npm run type-check`: strict TypeScript check (no emit)
- `npm run test` or `npm run test:unit`: run Vitest tests
- `npm run test:e2e`: run Playwright tests (uses `e2e_tests/`)
- `npm run storybook` / `npm run build-storybook`: component development and docs

## Coding Style & Naming Conventions
Use TypeScript with strict typing; avoid `any` unless justified.
- Formatting/linting is enforced by Ultracite (`biome.jsonc`)
- Follow existing style: 2-space indentation, semicolons, double quotes
- File names: `kebab-case` (e.g., `guild-list-client.tsx`)
- React components/types: `PascalCase`; variables/functions: `camelCase`; constants: `UPPER_SNAKE_CASE`
- Prefer `@/` path aliases over deep relative imports

## Testing Guidelines
- Unit/integration: Vitest + Testing Library, typically `*.test.ts` / `*.test.tsx`
- E2E: Playwright, `*.spec.ts` under `e2e_tests/`
- Add tests for new behavior and bug fixes; update nearby tests when refactoring
- Run at minimum: `npm run lint && npm run type-check && npm run test`

## Commit & Pull Request Guidelines
Recent history follows Conventional Commit style with optional scope and ticket ID:
- Example: `feat(user): add profile page (DIS-54)`
- Example: `fix(calendar): normalize all-day event endAt`

For PRs:
- Keep changes focused and explain user-visible impact
- Link issue/ticket (`DIS-xxx`) when available
- Include screenshots/GIFs for UI changes
- Ensure CI passes (lint, type-check, build, unit tests)

## Security & Configuration Tips
- Copy `.env.example` to `.env.local`; never commit secrets
- Treat Supabase and Sentry credentials as sensitive
- Validate auth and permission changes with both unit and E2E tests
