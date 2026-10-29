# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
RUN chown node:node /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
USER node
COPY --chown=node:node package.json package-lock.json ./
# Match the repository's npm settings without requiring hidden files in the context.
RUN --mount=type=cache,id=appb2t-npm-node22,target=/home/node/.npm,uid=1000,gid=1000,sharing=locked \
    npm ci --legacy-peer-deps --maxsockets=5
COPY --chown=node:node prisma/schema.prisma ./prisma/schema.prisma
RUN ./node_modules/.bin/prisma generate

FROM deps AS build
COPY --chown=node:node . .
RUN mkdir -p .next/cache
ARG NEXT_BUILD_MAX_OLD_SPACE_SIZE=1536
RUN --mount=type=cache,id=appb2t-next-node22-next16,target=/app/.next/cache,uid=1000,gid=1000,sharing=locked \
    NODE_OPTIONS="--max-old-space-size=${NEXT_BUILD_MAX_OLD_SPACE_SIZE}" ./node_modules/.bin/next build

FROM deps AS tools
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node tsconfig.json ./
COPY --chown=node:node scripts/create-admin.ts scripts/admin-password.ts ./scripts/
COPY --chown=node:node src/lib/db.ts src/lib/errors.ts ./src/lib/
COPY --chown=node:node src/server/auth/password.ts src/server/auth/session.ts ./src/server/auth/
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
