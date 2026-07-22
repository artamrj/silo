# Silo

Silo is a self-hosted manager for Docker Compose stacks. It provides stack discovery and lifecycle controls, a compose editor, interactive terminals, authentication, localization, and optional management of remote Silo instances.

Silo is a clean fork of [Dockge](https://github.com/louislam/dockge) and remains available under the MIT License.

## Requirements

- Node.js 22.14 or newer within the Node.js 22 release line for local development
- Docker Engine with Docker Compose v2 for managing stacks
- Linux for the supported container deployment

## Local development

```bash
npm ci
npm run dev
```

The frontend development server starts after the backend is available. By default, Silo listens on port `5001` and stores application data in `./data`.

Useful checks:

```bash
npm run lint
npm run check-ts
npm run build:frontend
```

## Docker deployment

The included `compose.yaml` uses `ghcr.io/artamrj/silo:latest`:

```bash
mkdir -p /opt/stacks /opt/silo
cd /opt/silo
curl -O https://raw.githubusercontent.com/artamrj/silo/master/compose.yaml
docker compose up -d
```

Open <http://localhost:5001> and complete the initial account setup.

The stacks directory must be mounted at the same absolute path inside and outside the container. The Docker socket mount grants Silo control over the local Docker daemon; only deploy it in a trusted environment.

## Configuration

Silo supports command-line flags and the following environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `SILO_PORT` | `5001` | HTTP/HTTPS listening port |
| `SILO_HOSTNAME` | all interfaces | Listening hostname |
| `SILO_DATA_DIR` | `./data/` | Database and application data directory |
| `SILO_STACKS_DIR` | `/opt/stacks` on Linux | Docker Compose stacks directory |
| `SILO_ENABLE_CONSOLE` | `false` | Enable the host web console |
| `SILO_SSL_KEY` | unset | TLS private-key path |
| `SILO_SSL_CERT` | unset | TLS certificate path |
| `SILO_SSL_KEY_PASSPHRASE` | unset | TLS private-key passphrase |
| `SILO_HIDE_LOG` | unset | Comma-separated log levels/categories to suppress |

This fork intentionally does not accept the former `DOCKGE_*` variable names.

## Password reset

From a local checkout or inside the container:

```bash
npm run reset-password
```

## Container images

Pushes to `master` publish `ghcr.io/artamrj/silo:latest`. A semantic-version tag such as `v0.1.0` also publishes `0.1.0`, `0.1`, and `0` tags.

## Attribution

Silo is derived from Dockge by Louis Lam and contributors. The original copyright notice is retained in [LICENSE](LICENSE).
