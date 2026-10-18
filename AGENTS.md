# AGENTS.md

Guidance for coding agents working in the Silo repository.

## Project

Silo is a self-hosted Docker Compose stack manager and an independent fork of
[Dockge](https://github.com/louislam/dockge). It discovers stacks on disk, edits
their Compose files, runs `docker compose` actions, and exposes web and
container terminals. Authentication is a single administrator account.

Keep the intent of the original: small, single-container, no build step at
runtime, no native addons.

## Stack

- **Runtime**: Node.js `>=26.0.0 <27` (see `.nvmrc`), ESM (`"type": "module"`).
- **Server**: TypeScript, Express 5, Socket.IO 4, `pino` logging, zod validation.
- **Database**: SQLite through the built-in `node:sqlite` driver (no native addon).
- **Client**: Vue 3 (options API) + Vue Router 5 + vue-i18n, Tailwind CSS v4,
  shadcn-vue primitives, `@lucide/vue` icons, `vue-sonner` toasts.
- **Build/test**: Vite (client), esbuild (server), Vitest, ESLint (flat config).

Do not add a framework, state library, ORM, or native dependency without a
strong reason. The project deliberately uses small, dependency-light modules.

## Layout

```text
src/
├── client/       Vue app (Vite root is src/client)
│   └── src/
│       ├── pages/        Route-level views (Options API, plain JS <script>)
│       ├── components/   App components; components/ui/** is generated shadcn-vue
│       ├── layouts/      Shell layout
│       ├── mixins/       Global mixins (socket, theme)
│       ├── context.ts    provide/inject keys and their interfaces
│       ├── styles/main.css  Tailwind entry + theme tokens
│       └── lang/en.json  i18n strings
├── server/       HTTP, Socket.IO handlers, DB, Docker integration
│   ├── routers/          Express routers (see Router base class)
│   ├── socket-handlers/  Socket.IO handlers (see SocketHandler base class)
│   ├── db/               driver, migrations, repositories
│   ├── utils/            socket helpers, exec, limits
│   └── silo-server.ts    Composition root: server, config, handler lists
└── shared/       Types and utilities used by both client and server
scripts/          build-server.mjs, reset-password.ts, check-bundle-size.mjs
tests/            Vitest suites (shared/, db/, build/, integration/)
docker/           Dockerfile and Go healthcheck
dist/             Generated output; never edit or commit (gitignored)
.local/           Dev state: .env, data/ (SQLite), stacks/ (gitignored)
```

## Commands

```bash
npm ci
cp .local/.env.example .local/.env
npm run dev          # Vite on :5173 (proxies /socket.io, /metrics to :5001) + tsx watch server on :5001

npm run lint         # eslint --fix via `npm run fmt`
npm run check-ts     # tsc --noEmit
npm test             # vitest run
npm run test:watch
npm run build        # build:server (esbuild) then build:client (vite)
npm run check-size   # gzip budgets for dist/client assets
npm start            # run compiled dist/server/index.js
```

Always run `npm run check-ts`, `npm run lint`, and `npm test` for changes that
touch server or shared code. Client-only changes still need `npm run check-ts`
and `npm run lint`; add `npm run build` when you touch Vite config, chunking,
or bundle-sensitive code.

## Conventions

Formatting is enforced by ESLint and `.editorconfig`; match them instead of
hand-formatting:

- **4-space indent** everywhere; 2 spaces for `.yaml`/`.yml`; tabs in Go.
- **Double quotes**, semicolons required, LF line endings, final newline.
- Space inside array brackets: `[ a, b ]`; single-element arrays keep the
  single-value spacing rule from `array-bracket-spacing`.
- Spaces around `:` in object literals are conventional in this codebase,
  e.g. `private readonly logger : PinoLogger;`.
- No `var`; prefer `const` when a binding is never reassigned (the rule is off,
  but follow the style of surrounding code).
- Files are named `kebab-case` (`silo-server.ts`, `rate-limiter.ts`); classes are
  `PascalCase`; constants are `UPPER_SNAKE_CASE`.
- Add a short comment above non-obvious logic and a JSDoc block for exported
  functions and classes, matching existing files.

### Server

- TypeScript is strict (`tsconfig.json`), but only `src/server`, `src/shared`,
  and `scripts` are type-checked. The client is checked by Vite/esbuild only.
- Express routes live in a `Router` subclass (`src/server/router.ts`) and are
  registered in `SiloServer.routerList`.
- Socket.IO event handlers live in a `SocketHandler` subclass
  (`src/server/socket-handler.ts`) and are registered in
  `SiloServer.socketHandlerList`. Add the new `SiloServer` member and push it
  into the list in the same change.
- Every socket payload is validated with zod before use: call
  `validate(schema, value)` from `src/server/utils/socket.ts`, keep schemas in
  `src/shared/schemas.ts`, and report failures through `callbackError`/
  `callbackResult`. Never trust a client-provided object directly.
- Authenticated events call `checkLogin(socket)` first.
- Import ordering in handlers is loosely alphabetical; keep new imports grouped
  with the existing block.
- Use `log.info/warn/error/debug(module, message)` from `src/server/log.ts`, not
  `console.log`, so output stays structured JSON and respects log redaction.

### Database

- Schema is versioned with `PRAGMA user_version` and applied by
  `src/server/db/migrations.ts`. Add a new `Migration` with a monotonic version
  and a descriptive `name`; do **not** edit an already-applied migration.
- Each migration runs in its own transaction via `withTransaction`, so a failure
  leaves the DB at the previous version. Keep migrations idempotent where cheap.
- Queries live in `src/server/db/repositories/*` (`users.ts`, `settings.ts`).
  Keep repositories dumb (SQL in, rows out) and put parsing/caching in
  `src/server/settings.ts` or the caller.
- `node:sqlite` is synchronous. Keep queries small; do not run loops of heavy
  queries on the request path.

### Client

- App-level Vue code uses the **options API** with a plain `<script>` block (no
  `lang="ts"`), `data`/`computed`/`methods`/`watch`, and mixins for global state
  (`mixins/socket.ts`, `mixins/theme.ts`). Match that style; do not introduce
  `<script setup>` or TypeScript in app components.
- `src/client/src/components/ui/**` is generated shadcn-vue output and is
  excluded from ESLint. Do not hand-edit it — regenerate when a primitive needs
  changes, or keep overrides in the consuming component.
- Import app modules with the `@/` alias (`@/components/ui/...`, `@/lib/utils`),
  which maps to `src/client/src`. `lucide-vue-next` imports are aliased to
  `@lucide/vue`.
- Use `Toaster` from `@/components/ui/sonner` and the `toast` helper in
  `src/client/src/toast.ts` for user feedback.
- All user-facing strings go through `$t(...)` with entries in
  `src/client/src/lang/en.json`. Add the English string when you add a key.
- Use shared context keys from `src/client/src/context.ts` via
  `provide`/`inject` rather than prop-drilling; the getters intentionally return
  live objects.
- Theme is global: `$root.theme`, `$root.isDark`, `$root.cycleTheme`, and the
  `dark` class on `document.body`. Style with Tailwind tokens (`bg-card`,
  `text-ink-muted`, `bg-primary-soft`, ...) defined in `styles/main.css`; do not
  hardcode colors.
- Router routes are code-split with dynamic `import()` in
  `src/client/src/router.ts`. Add new pages there, not eagerly.

### Shared

- Types and helpers usable by both sides live in `src/shared/`
  (`schemas.ts`, `utils.ts`, `docker.ts`, `socket-events.ts`, `yaml.ts`,
  `envsubst.ts`).
- When you add or change a socket event, update the matching signature in
  `src/shared/socket-events.ts` (`ClientToServerEvents` /
  `ServerToClientEvents`).

## Testing

- Vitest picks up `tests/**/*.test.ts`; there is no client DOM test setup.
- Cover pure logic in `tests/shared/` and database behavior in `tests/db/`
  (use `:memory:` or a temp file — never the real `.local/data`).
- Tests must not depend on a running Docker daemon or the network; keep
  integration-style suites self-contained.

## Security

- Silo can hold Docker socket access and often runs with
  `SILO_ENABLE_CONSOLE=true`. Treat every socket event as untrusted input:
  validate with zod, call `checkLogin`, and never build shell commands from raw
  client strings.
- Stack paths are validated with `stackNameSchema`/`serviceNameSchema`; keep path
  traversal out of filenames.
- Never log secrets. The logger redacts `password`, `token`, `authorization`;
  keep credentials out of log messages anyway.
- `SILO_DEV_NO_AUTH` is development-only. Never enable it in production paths or
  document it as a workaround.
- Report vulnerabilities per `SECURITY.md`; do not open a public issue for them.

## Git / PR workflow

- Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`,
  `test:`), subject in the imperative mood.
- **Never `git commit` or `git push` without the user asking first.**
- Do not commit `dist/`, `.local/` contents, or `.env`; they are gitignored.

## Do not touch

- `dist/` — generated by the build; regenerate with `npm run build`.
- `src/client/src/components/ui/**` — generated shadcn-vue primitives.
- Applied migrations in `src/server/db/migrations.ts`.
- `node_modules/`, `package-lock.json` (change only through npm).
