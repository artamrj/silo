# Security model

Silo can create containers and modify Compose stacks. Treat access to Silo as
administrative access to the Docker host.

## Docker daemon access

The default Compose file mounts `/var/run/docker.sock` because it is the most
compatible setup for Docker Compose. That socket is effectively root-equivalent:
a compromised Silo process could start a privileged container and mount the host
filesystem.

For stronger isolation, prefer one of these deployment boundaries:

1. Run Silo and its workloads inside a dedicated virtual machine. This is the
   simplest strong boundary and preserves all Compose features.
2. Use a dedicated rootless Docker daemon and set `DOCKER_HOST` to its socket.
   Do not mount the host's rootful Docker socket into Silo.
3. Put an authenticated Docker API proxy in front of the daemon and allow only
   the API families Silo needs (containers, images, networks, volumes, events,
   info and version). Compose requires write access, so a proxy reduces exposed
   API surface but cannot make an untrusted stack manager harmless.

Do not expose an unauthenticated Docker TCP endpoint. Restrict Silo itself to a
trusted network or an access-controlled reverse proxy, use TLS, and keep
authentication enabled.

## Observability

`GET /metrics` exposes Prometheus-format process, HTTP, and Socket.IO metrics.
Restrict this path at the reverse proxy when Silo is internet-accessible.
Logs are newline-delimited JSON and redact common password, token, and
authorization fields. Set `SILO_LOG_LEVEL` to `debug`, `info`, `warn`, or
`error`.
