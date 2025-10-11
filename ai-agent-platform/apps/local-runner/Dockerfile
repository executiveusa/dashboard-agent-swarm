# syntax=docker/dockerfile:1.6
FROM node:20-bookworm-slim AS base
ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY ai-agent-platform/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY ai-agent-platform/package.json ./package.json
COPY ai-agent-platform/apps/local-runner/package.json ./apps/local-runner/package.json
COPY ai-agent-platform/packages/shared/package.json ./packages/shared/package.json
RUN pnpm install --filter apps/local-runner... --frozen-lockfile=false

COPY ai-agent-platform ./
RUN pnpm --filter @ai-agent-platform/shared... run build && pnpm --filter apps/local-runner run build

FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /srv
COPY --from=deps /app/apps/local-runner/dist ./dist
COPY --from=deps /app/apps/local-runner/package.json ./package.json
COPY --from=deps /app/node_modules ./node_modules
EXPOSE 3333
CMD ["node", "dist/index.js"]
