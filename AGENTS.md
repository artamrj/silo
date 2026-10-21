# Silo agent guide

## Mission

Silo is self-hosted Docker Compose stack manager, forked from Dockge. It discovers stacks on disk, edits Compose files, runs `docker compose`, and offers web/container terminals. Authentication is one administrator account.

Keep Silo small: one container, no runtime build, no native addons, few dependencies. Prefer existing modules and platform APIs over new packages, frameworks, state stores, or ORMs.

## Baseline

- Node `>=26.0.0 <27`; ESM TypeScript.
- Server: Express 5, Socket.IO 4, pino, zod, built-in `node:sqlite`.
- Client: Vue 3 Composition API, Vue Router 5, vue-i18n, Tailwind v4, shadcn-vue, Lucide, vue-sonner.
- Build/test: Vite, esbuild, Vitest, ESLint flat config.
- Formatting: 4 spaces (`.yaml`/`.yml`: 2; Go: tabs), double quotes, semicolons, LF, final newline. Follow nearby code and ESLint.

## Map

| Area | Location | Rule |
| --- | --- | --- |
| Client pages | `src/client/src/pages/` | Route-level Vue views |
| Client shared state | `src/client/src/composables/` | Module-level `ref`/`reactive` composables |
| Client context | `src/client/src/context.ts` | `provide`/`inject`; avoid prop drilling |
| Client strings | `src/client/src/lang/en.json` | All visible text is translated |
| Client theme | `src/client/src/styles/main.css` | Use existing semantic Tailwind tokens |
| HTTP | `src/server/routers/` | `Router` subclasses, registered in `SiloServer.routerList` |
| Socket.IO | `src/server/socket-handlers/` | `SocketHandler` subclasses, registered in `SiloServer.socketHandlerList` |
| Database | `src/server/db/` | Migrations, driver, small repositories |
| Cross-runtime | `src/shared/` | Shared types, schemas, utilities, socket events |
| Tests | `tests/` | Self-contained Vitest suites |

## Workflow

1. Read adjacent code before editing. Keep scope narrow; preserve user changes.
2. Use matching installed skill before covered work. Required by task type:
   - Feature/bug fix: `test-driven-development`; add or update focused tests first.
   - Unexpected behavior/test failure: `systematic-debugging` before a fix.
   - Multi-file or cross-subsystem work: `writing-plans` before code.
   - Vue/client: `vue-best-practices`; routes/guards: `vue-router-best-practices`; shadcn-vue work: `shadcn-vue`.
   - UI flow verification: `webapp-testing`; Playwright tests: `playwright-best-practices`.
   - Review: `code-review`; final claims: `verification-before-completion`.
3. Run smallest relevant checks while iterating. Before completion run required checks below and report exact results.
4. Do not commit or push unless user explicitly asks. Keep generated/private files out of commits.

## Commands



```bash
npm ci
cp .local/.env.example .local/.env
npm run dev          # Vite :5173; server :5001
npm run check-ts     # server/shared tsc + client vue-tsc
npm run lint         # ESLint
npm test             # Vitest
npm run build        # server esbuild + client Vite
npm run check-size   # gzip bundle budgets
```

Validation floor:

- Client-only changes: `npm run check-ts` and `npm run lint`.
- Server/shared/database changes: `npm run check-ts`, `npm run lint`, and `npm test`.
- Vite config, chunking, or bundle-sensitive changes: also `npm run build`; run `npm run check-size` when output size can change.
- Documentation-only changes: inspect diff and run `git diff --check`.

## Server, shared, and database

- Keep TypeScript strict. Use `const` unless reassignment is needed; no `var`. Files use `kebab-case`, classes `PascalCase`, constants `UPPER_SNAKE_CASE`.
- Add exported JSDoc and comments only where logic is non-obvious.
- For every authenticated socket event: call `checkLogin(socket)` first, validate payload with `validate(schema, value)`, use schemas in `src/shared/schemas.ts`, and return with `callbackResult`/`callbackError`.
- Any added/changed socket event must update `src/shared/socket-events.ts`.
- Use `log.info/warn/error/debug()` from `src/server/log.ts`; never log secrets or use `console.log`.
- Never build shell commands from client input. Preserve stack/service schema validation.
- Add migrations only as new, monotonic entries in `src/server/db/migrations.ts`; never change applied migrations. Keep migration transactions small and idempotent where cheap.
- Repositories issue SQL and return rows. Keep parsing/caching outside repositories. `node:sqlite` is synchronous: no heavy query loops on request paths.

## Client

- Use `<script setup lang="ts">` and Composition API only. No Options API, mixins, component-instance globals, or `this`.
- Put shared client state in existing composables. Place client-only types in `src/client/src/composables/types.ts`; shared payload types belong in `src/shared/`.
- Import app code with `@/`. Use typed `defineProps`/`defineEmits`, `useTemplateRef`/`ref`, and dynamic page imports in `src/client/src/router.ts`.
- Use `useTheme()` and semantic tokens such as `bg-card`, `text-ink-muted`, and `bg-primary-soft`; do not hardcode theme colors. Use existing toast helpers for feedback.
- Never hand-edit `src/client/src/components/ui/**`; it is generated shadcn-vue output.
- Add every new user-facing string to `en.json` and access it via `$t(...)` or `useI18n().t(...)`.

### Content-page design brief

When redesigning UI, change content pages only. Preserve sidebar structure, behavior, and styling unless user explicitly expands scope.

- Favor clear hierarchy, calm density, obvious primary actions, readable status, useful empty/loading/error states, keyboard-accessible controls, and responsive layouts.
- Remove redundant controls, repeated copy, decorative clutter, and dependencies instead of hiding them.
- Reuse existing primitives, tokens, icons, and composables. Keep lazy route loading and avoid adding UI libraries or large assets.
- Optimize perceived and delivered performance: minimal DOM, no unnecessary client state, conditional loading for heavy content, no avoidable bundle growth.
- Validate changed flows in browser when feasible; test dark/light theme and narrow viewports.

## Tests and safety

- Vitest discovers `tests/**/*.test.ts`. Put pure logic in `tests/shared/`; DB tests use `:memory:` or temp files.
- Tests must not require Docker daemon, network, or `.local/data`.
- Treat all external input as untrusted. Silo may have Docker-socket access and `SILO_ENABLE_CONSOLE=true`.
- Keep `SILO_DEV_NO_AUTH` development-only. Report security issues through `SECURITY.md`, never public issue.

## Boundaries

- Do not edit `dist/`, `node_modules/`, `.local/`, `.env`, generated shadcn-vue components, or applied migrations.
- Change `package-lock.json` only through npm.
- Use Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`) if asked to commit. Never commit or push without explicit user approval.
