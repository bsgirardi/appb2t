# syntax=docker/dockerfile:1
ARG NODE_BASE=node:22-bookworm-slim
FROM ${NODE_BASE} AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
RUN chown node:node /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS manifests
USER node
COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node scripts/docker/build-manifests.mjs /tmp/build-manifests.mjs
# Lock pruning is offline, uses an empty metadata cache and cannot change artifacts.
RUN node /tmp/build-manifests.mjs create /app /app/manifests \
    && cd /app/manifests/tools \
    && npm install --package-lock-only --offline --ignore-scripts --legacy-peer-deps --no-audit --no-fund --cache /tmp/lock-cache \
    && node /tmp/build-manifests.mjs finalize /app /app/manifests

FROM base AS deps
USER node
COPY --from=manifests --chown=node:node /app/manifests/deps/ ./
# Match the repository's npm settings without requiring hidden files in the context.
RUN --mount=type=cache,id=appb2t-npm-node22,target=/home/node/.npm,uid=1000,gid=1000,sharing=locked \
    npm ci --legacy-peer-deps --maxsockets=5
COPY --chown=node:node prisma/schema.prisma ./prisma/schema.prisma
RUN ./node_modules/.bin/prisma generate

FROM deps AS build
COPY --chown=node:node . .
RUN mkdir -p .next/cache
ARG NEXT_BUILD_MAX_OLD_SPACE_SIZE=1280
# Release compiler memory before type checking and final page generation.
# Both Next build modes are required; neither mode performs App Router type checking.
RUN --mount=type=cache,id=appb2t-next-node22-next16,target=/app/.next/cache,uid=1000,gid=1000,sharing=locked \
    NODE_OPTIONS="--max-old-space-size=${NEXT_BUILD_MAX_OLD_SPACE_SIZE}" ./node_modules/.bin/next build --experimental-build-mode compile
RUN NODE_OPTIONS="--max-old-space-size=${NEXT_BUILD_MAX_OLD_SPACE_SIZE}" npm run typecheck
RUN --mount=type=cache,id=appb2t-next-node22-next16,target=/app/.next/cache,uid=1000,gid=1000,sharing=locked \
    NODE_OPTIONS="--max-old-space-size=${NEXT_BUILD_MAX_OLD_SPACE_SIZE}" ./node_modules/.bin/next build --experimental-build-mode generate

# Explicit local release gate; never runs against the operational database.
FROM deps AS verify
COPY --chown=node:node . .
ENV DATABASE_URL=postgresql://unused:unused@127.0.0.1:55432/b2t_test
ENV NODE_OPTIONS=--max-old-space-size=1280
RUN ./node_modules/.bin/next typegen && npm run typecheck && npm run lint && npm run test:unit

FROM base AS tools-deps
USER node
COPY --from=manifests --chown=node:node /app/manifests/tools/ ./
RUN --mount=type=cache,id=appb2t-npm-node22,target=/home/node/.npm,uid=1000,gid=1000,sharing=locked \
    npm ci --omit=dev --legacy-peer-deps --maxsockets=5
COPY --chown=node:node prisma/schema.prisma ./prisma/schema.prisma
RUN ./node_modules/.bin/prisma generate

FROM tools-deps AS tools
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node tsconfig.json ./
COPY --chown=node:node scripts/create-admin.ts scripts/admin-password.ts ./scripts/
COPY --chown=node:node src/lib/db.ts src/lib/errors.ts ./src/lib/
COPY --chown=node:node src/server/auth/password.ts src/server/auth/session.ts ./src/server/auth/
COPY --from=manifests --chown=node:node /app/manifests/tools-runtime/ ./
ARG APP_REVISION=unknown
LABEL org.opencontainers.image.revision=$APP_REVISION
ENV NODE_ENV=production
CMD ["npm", "run", "db:migrate"]

FROM base AS runtime
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
ARG APP_REVISION=unknown
LABEL org.opencontainers.image.revision=$APP_REVISION
USER node
EXPOSE 3000
CMD ["node", "server.js"]
