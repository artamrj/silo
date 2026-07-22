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
npm run dev
```

Open <http://localhost:5173>. The Vite client reloads when UI code
changes, while the server watcher restarts the Socket.IO server on port
5001 when server code changes.

Project checks:

```bash
npm run lint
npm run check-ts
npm run build:client
npm test
```

In development, Vite proxies `/socket.io`, `/trpc`, and `/metrics` to the backend
on port 5001. The browser therefore uses the same origin in development and
production.

Silo uses tRPC for typed request/response APIs and Socket.IO for real-time push
events and terminal streams. Prometheus metrics are available at `/metrics` and
runtime logs are emitted as structured JSON.

## Project structure

```text
src/
├── client/       Vue application, styles, and static assets
├── server/       HTTP, Socket.IO, database, and Docker integration
└── shared/       Types and utilities used by client and server
scripts/          Administrative utilities
docker/           Container build and health check
dist/client/      Generated production client
```

Runtime data belongs in `data/`, and locally managed Compose stacks belong
in `stacks/`. Both directories are intentionally excluded from Git.

## Container image

The default image is `ghcr.io/artamrj/silo:latest`. Pushes to `main` publish the latest image, while version tags such as `v0.1.0` publish matching semantic-version tags.

## Attribution

Silo is derived from Dockge by Louis Lam and its contributors. The original copyright notice and MIT terms are retained in [LICENSE](LICENSE).
