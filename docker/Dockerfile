FROM golang:1.24-bookworm AS healthcheck
WORKDIR /src
COPY docker/healthcheck.go .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /healthcheck healthcheck.go

FROM node:26-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY src/client ./src/client
COPY src/server ./src/server
COPY src/shared ./src/shared
COPY scripts ./scripts
RUN npm run build \
    && npm prune --omit=dev

FROM node:26-bookworm-slim AS release
RUN apt-get update && apt-get install --yes --no-install-recommends \
        ca-certificates \
        curl \
        dumb-init \
        gnupg \
        unzip \
    && install -m 0755 -d /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg \
    && chmod a+r /etc/apt/keyrings/docker.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list \
    && apt-get update \
    && apt-get install --yes --no-install-recommends docker-ce-cli docker-compose-plugin \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=healthcheck /healthcheck /app/bin/healthcheck
COPY --from=build /app/node_modules /app/node_modules
COPY . .
# Compiled server + client from the build stage. Copied after `COPY . .` so a
# stale host `dist/` can never shadow them.
COPY --from=build /app/dist /app/dist
RUN mkdir -p /app/data

ENV NODE_ENV=production \
    SILO_IS_CONTAINER=1 \
    UV_USE_IO_URING=0

VOLUME ["/app/data"]
EXPOSE 5001
HEALTHCHECK --interval=60s --timeout=30s --start-period=60s --retries=5 CMD ["/app/bin/healthcheck"]
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
# Compiled server bundle. No TypeScript or tsx is needed at runtime.
CMD ["node", "./dist/server/index.js"]
