# syntax=docker/dockerfile:1.6
FROM node:20-bookworm-slim AS base
ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY ai-agent-platform/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY ai-agent-platform/package.json ./package.json
COPY ai-agent-platform/apps/frontend/package.json ./apps/frontend/package.json
COPY ai-agent-platform/packages/shared/package.json ./packages/shared/package.json
RUN pnpm install --filter apps/frontend... --frozen-lockfile=false

COPY ai-agent-platform ./
RUN pnpm --filter @ai-agent-platform/shared... run build && pnpm --filter apps/frontend run build

FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/apps/frontend/.next ./.next
COPY --from=deps /app/apps/frontend/public ./public
COPY --from=deps /app/apps/frontend/package.json ./package.json
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/frontend/next.config.mjs ./next.config.mjs
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@10.13.1 --activate
WORKDIR /app

FROM base AS install
COPY pnpm-workspace.yaml package.json ./
COPY apps/frontend/package.json apps/frontend/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --filter apps/frontend... --filter @ai-agent-platform/shared... --workspace-root

FROM base AS build
WORKDIR /app
COPY --from=install /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter @ai-agent-platform/shared... run build \
 && pnpm --filter apps/frontend... run build \
 && pnpm deploy --filter apps/frontend --prod /app/deploy

FROM node:20-bookworm-slim AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/deploy/apps/frontend ./
COPY --from=build /app/apps/frontend/.next ./.next
COPY --from=build /app/apps/frontend/public ./public
EXPOSE 3000
CMD ["node", "node_modules/next/dist/bin/next", "start", "-p", "3000"]
