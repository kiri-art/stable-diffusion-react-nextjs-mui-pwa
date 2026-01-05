# Repository Guidelines

## Project Structure & Module Organization
- `app/` and `pages/` contain Next.js routes; `src/` holds most shared logic and UI modules.
- `public/` hosts static assets served by Next.js; `assets/` stores design/media artifacts.
- `tests/` includes integration fixtures and outputs; unit tests live alongside code (e.g., `src/**/*.spec.ts`).
- `docs/` contains project documentation; `scripts/` holds helper scripts.
- `worker/` and `types/` provide background/runtime helpers and shared typings.

## Build, Test, and Development Commands
- `pnpm install` installs dependencies (Node ^22, pnpm ^10.26.1).
- `pnpm dev` runs the Next.js dev server.
- `pnpm build` creates the production build; `pnpm start` serves it.
- `pnpm lint` runs ESLint (Next.js + TypeScript rules).
- `pnpm test` runs Vitest in non-watch mode.
- i18n helpers: `pnpm i18n:extract` and `pnpm i18n:compile` for Lingui workflows.

## Coding Style & Naming Conventions
- TypeScript + React; 2-space indentation is the dominant style.
- Use ESLint for quality gates; unused imports are errors (`eslint.config.cjs`).
- Test files follow `*.spec.ts` naming (see `src/lib/civitai.spec.ts`).
- Prettier is available as a dev dependency; run manually when needed (`pnpm exec prettier`).

## Testing Guidelines
- Unit tests use Vitest with Testing Library; run via `pnpm test`.
- Place tests near the code they cover (`src/.../*.spec.ts`).
- No explicit coverage threshold is enforced; keep new functionality covered.

## Commit & Pull Request Guidelines
- Commit history favors Conventional Commits, often with scopes: `feat(pkg): ...`, `fix(masonic): ...`.
- PRs should include a clear description, linked issues if applicable, and screenshots for UI changes.
- Before opening a PR, run `pnpm lint` and `pnpm test`.

## Environment & Configuration Tips
- Use `.env.local` for local secrets. Common variables: `BANANA_API_KEY`, `BANANA_MODEL_KEY`, `STABLE_DIFFUSION_HOME`.
- `NEXT_PUBLIC_` variables are baked at build time (set before `pnpm build`).
- `REQUIRE_REGISTRATION` and `NEXT_PUBLIC_REQUIRE_REGISTRATION` toggle auth flow behavior.
