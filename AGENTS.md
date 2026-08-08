# Repository Guidelines

## Project Structure & Module Organization

- `app/` and `pages/` contain Next.js routes; `src/` holds most shared logic and
  UI modules.
- `public/` hosts static assets served by Next.js; `assets/` stores design/media
  artifacts.
- `tests/` includes integration fixtures and outputs; unit tests live alongside
  code (e.g., `src/**/*.spec.ts`).
- `docs/` contains project documentation; `scripts/` holds helper scripts.
- `worker/` and `types/` provide background/runtime helpers and shared typings.

## Build, Test, and Development Commands

- `pnpm install` installs dependencies (Node ^22, pnpm ^10.26.1).
- `pnpm dev` runs the Next.js dev server.
- `pnpm build` creates the production build; `pnpm start` serves it.
- `pnpm lint` runs Biome's linter; `pnpm lint:fix` applies safe lint fixes.
- `pnpm format` formats the repository with Biome; `pnpm format:check` checks
  formatting without writing changes.
- `pnpm check` runs Biome formatting, lint, and import-organization checks;
  `pnpm check:fix` applies safe fixes.
- `pnpm test` runs Vitest in non-watch mode.
- `pnpm i18n:extract` refreshes Lingui catalogs in `locales/*/messages.po`.
- `pnpm i18n:extract:clean` refreshes catalogs and removes obsolete `#~`
  entries.
- `pnpm i18n:compile` regenerates the checked-in compiled catalogs in
  `locales/*/messages.js`.
- `pnpm i18n:status` reports active missing translations and obsolete entries
  per locale.
- `pnpm i18n:refresh` runs the repo’s standard translation maintenance flow:
  clean extract, then compile.

## Coding Style & Naming Conventions

- TypeScript + React; 2-space indentation is the dominant style.
- Use Biome for linting and formatting; unused imports are errors (`biome.json`).
- Test files follow `*.spec.ts` naming (see `src/lib/civitai.spec.ts`).
- Run `pnpm format` after editing code that Biome supports.

## Testing Guidelines

- Unit tests use Vitest with Testing Library; run via `pnpm test`.
- Place tests near the code they cover (`src/.../*.spec.ts`).
- No explicit coverage threshold is enforced; keep new functionality covered.

## Commit & Pull Request Guidelines

- Commit history favors Conventional Commits, often with scopes:
  `feat(pkg): ...`, `fix(masonic): ...`.
- In the body, include the motivation, summary of changes, and anything else of
  note.
- At bottom: "Co-authored with <Assistant> (<model>, reasoning <level>)"
- If and only if YOU are the Codex tool, use the top-level `model` and
  `model_reasoning_effort` values from `~/.codex/config.toml` for `<model>` and
  `<level>` when present (not relevant for Antigravity or other non-Codex
  assistants).
- If the exact assistant name, model and reasoning level are unknown and cannot
  be inferred, ask the user before committing and then reuse that answer for the
  rest of the session.

- PRs should include a clear description, linked issues if applicable, and
  screenshots for UI changes.
- Before opening a PR, run `pnpm lint` and `pnpm test`.

## Environment & Configuration Tips

- Use `.env.local` for local secrets. Common variables: `BANANA_API_KEY`,
  `BANANA_MODEL_KEY`, `STABLE_DIFFUSION_HOME`.
- `NEXT_PUBLIC_` variables are baked at build time (set before `pnpm build`).
- `REQUIRE_REGISTRATION` and `NEXT_PUBLIC_REQUIRE_REGISTRATION` toggle auth flow
  behavior.

## Localization / i18n

- Next.js locale routing is configured in `next.config.ts`; the app currently
  serves `en-US`, `he-IL`, `ja-JP`, and `fa-IR`.
- Locale metadata such as language labels and text direction (`ltr` / `rtl`)
  lives in `src/lib/locales.ts`.
- Lingui is configured in `lingui.config.mjs` and extracts messages from
  `pages/` and `src/`.
- User-facing strings use `t` from `@lingui/core/macro` and React helpers such
  as `Trans` and `Plural` from `@lingui/react/macro`.
- `pages/_app.tsx` activates the current locale, and `src/lib/i18n.ts`
  statically imports the compiled `locales/*/messages.js` catalogs.
- After changing translatable copy, run `pnpm i18n:extract` or
  `pnpm i18n:extract:clean`, update non-source `msgstr` entries in
  `locales/*/messages.po`, then run `pnpm i18n:compile`.
- `scripts/i18n/status.mjs` and `scripts/i18n/refresh.mjs` are the reusable
  maintenance helpers behind `pnpm i18n:status` and `pnpm i18n:refresh`.
