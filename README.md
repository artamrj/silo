# Silo

Silo is a self-hosted Docker Compose stack manager and an independent fork of [Dockge](https://github.com/louislam/dockge).

It keeps the practical stack-management experience while giving this fork a clean base for future development under the Silo name.

## Features

- Discover and manage Docker Compose stacks
- Create, edit, start, stop, restart, update, and remove stacks
- Use interactive web and container terminals
- Manage remote Silo instances
- Authentication and multilingual interface

## Run with Docker

```bash
mkdir -p /opt/stacks /opt/silo
cd /opt/silo
curl -O https://raw.githubusercontent.com/artamrj/silo/main/compose.yaml
docker compose up -d
```

Open <http://localhost:5001> and create the administrator account.

> Silo requires access to the Docker socket. Run it only in a trusted environment.

## Development

Use Node.js 24.18 or newer within the Node.js 24 LTS release line.

```bash
npm ci
npm run dev
```

Project checks:

```bash
npm run lint
npm run check-ts
npm run build:frontend
```

## Container image

The default image is `ghcr.io/artamrj/silo:latest`. Pushes to `main` publish the latest image, while version tags such as `v0.1.0` publish matching semantic-version tags.

## Attribution

Silo is derived from Dockge by Louis Lam and its contributors. The original copyright notice and MIT terms are retained in [LICENSE](LICENSE).
