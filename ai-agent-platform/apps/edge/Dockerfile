# syntax=docker/dockerfile:1.6
FROM node:20-bookworm-slim AS base
ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY ai-agent-platform/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY ai-agent-platform/package.json ./package.json
COPY ai-agent-platform/apps/edge/package.json ./apps/edge/package.json
COPY ai-agent-platform/apps/frontend/package.json ./apps/frontend/package.json
COPY ai-agent-platform/apps/local-runner/package.json ./apps/local-runner/package.json
COPY ai-agent-platform/packages/shared/package.json ./packages/shared/package.json
RUN pnpm install --filter apps/edge... --frozen-lockfile=false

COPY ai-agent-platform ./
RUN pnpm --filter @ai-agent-platform/shared... run build && pnpm --filter apps/edge run build

FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /srv
COPY --from=deps /app/apps/edge/dist ./dist
COPY --from=deps /app/apps/edge/package.json ./package.json
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/dist ./packages/shared/dist
EXPOSE 8787
CMD ["node", "dist/server.js"]
