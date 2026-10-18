# Silo

Silo is a self-hosted Docker Compose stack manager and an independent fork of [Dockge](https://github.com/louislam/dockge).

It keeps the practical stack-management experience while giving this fork a clean base for future development under the Silo name.

## Features

- Discover and manage Docker Compose stacks
- Create, edit, start, stop, restart, update, and remove stacks
- Use interactive web and container terminals
- Protect access with administrator authentication

## Run with Docker

```bash
mkdir -p /opt/stacks /opt/silo
cd /opt/silo
curl -O https://raw.githubusercontent.com/artamrj/silo/main/compose.yaml
docker compose up -d
```

Open <http://localhost:5001> and create the administrator account.

> Silo requires access to the Docker socket. Run it only in a trusted environment.
> See [SECURITY.md](SECURITY.md) for rootless Docker, API proxy, and network-isolation options.

## Development

Use Node.js 24.18 or newer within the Node.js 24 LTS release line.

```bash
npm ci
cp .local/.env.example .local/.env
npm run dev
```

Open <http://localhost:5173>. The Vite client reloads when UI code
changes, while the server watcher restarts the Socket.IO server on port
5001 when server code changes.

Project checks:

```bash
npm run lint
npm run check-ts
npm test
npm run build
```

`npm run build` compiles the client into `dist/client` and the TypeScript server
into `dist/server` (see [Production](#production)). Run the compiled server with
`npm start` after building. The `reset-password` script also runs from `dist`,
so build before using it.

In development, Vite proxies `/socket.io`, `/trpc`, and `/metrics` to the backend
on port 5001. The browser therefore uses the same origin in development and
production.

Silo uses tRPC for typed request/response APIs and Socket.IO for real-time push
events and terminal streams. Prometheus metrics are available at `/metrics` and
runtime logs are emitted as structured JSON.

## Database

Silo stores its data in a single SQLite file, `silo.db`, inside the data
directory (`.local/data` in development, `/app/data` in the container). It uses
Node's built-in `node:sqlite` driver, so no native addon needs to be compiled.

The schema is versioned with `PRAGMA user_version` and applied on startup by the
migrations in `src/server/db/migrations.ts`. Every migration runs in its own
transaction, so a failure leaves the database at the previous version rather
than half-applied.

### Upgrading from the old Knex/RedBean database

The first start after upgrading adopts the existing database in place: rows in
`user` and `setting` are preserved, and the old `knex_migrations` bookkeeping
tables are dropped. Before any change is made, a byte-for-byte snapshot is
written to `silo.pre-migrate.db` next to `silo.db`.

### Rollback

If an upgrade has to be undone:

1. Stop Silo (`docker compose down`, or stop the dev server).
2. Replace the current database with the snapshot:

   ```bash
   cd /path/to/data          # /app/data in the container, .local/data in dev
   mv silo.pre-migrate.db silo.db
   rm -f silo.db-wal silo.db-shm
   ```

3. Pin an older image tag (for example `ghcr.io/artamrj/silo:v0.1.0`) and start
   Silo again.

## Project structure

```text
src/
├── client/       Vue application, styles, and static assets
├── server/       HTTP, Socket.IO, database, and Docker integration
└── shared/       Types and utilities used by client and server
scripts/          Administrative utilities
docker/           Container build and health check
dist/client/      Generated production client
dist/server/      Generated production server bundle
```

Development-only state is kept under `.local/`:

```text
.local/
├── .env       # local environment overrides
├── data/      # SQLite database and database configuration
└── stacks/    # locally managed Compose stacks
```

`.local/.env` and all runtime contents are excluded from Git. The tracked
`.local/.env.example` documents the available local defaults. Production keeps
using `/app/data` and `/opt/stacks` when run with the provided Compose file.

## Production

Production runs compiled JavaScript, not TypeScript. `npm run build` bundles the
server into `dist/server/index.js` and the reset-password tool into
`dist/scripts/reset-password.js`, then `npm start` runs the bundle with plain
`node`. `tsx` and the TypeScript compiler are only needed for development, so a
production install works with `npm ci --omit=dev` after building.

The container image builds and runs the compiled server this way; it ships no
`tsx` and no TypeScript sources are executed at runtime.

## Container image

The default image is `ghcr.io/artamrj/silo:latest`. Pushes to `main` publish the latest image, while version tags such as `v0.1.0` publish matching semantic-version tags.

## Attribution

Silo is derived from Dockge by Louis Lam and its contributors. The original copyright notice and MIT terms are retained in [LICENSE](LICENSE).
