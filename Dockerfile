FROM node:22-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json ./
# Match the repository's npm settings without requiring hidden files in the context.
RUN npm ci --legacy-peer-deps --maxsockets=5

FROM deps AS build
COPY . .
RUN npm run build

FROM build AS tools
# COPY preserves host modes, including 0600 files from restrictive umasks.
# The migration/admin user must own the sources and generated dependencies.
RUN chown -R node:node /app
USER node
CMD ["npm", "run", "db:migrate"]

FROM base AS runtime
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
