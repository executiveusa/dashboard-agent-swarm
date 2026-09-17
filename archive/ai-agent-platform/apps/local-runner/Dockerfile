# syntax=docker/dockerfile:1.6
FROM node:26-bookworm-slim AS base
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

FROM node:26-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /srv
COPY --from=deps /app/apps/local-runner/dist ./dist
COPY --from=deps /app/apps/local-runner/package.json ./package.json
COPY --from=deps /app/node_modules ./node_modules
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@10.13.1 --activate
WORKDIR /app

FROM base AS install
COPY pnpm-workspace.yaml package.json ./
COPY apps/local-runner/package.json apps/local-runner/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --filter apps/local-runner... --filter @ai-agent-platform/shared... --workspace-root

FROM base AS build
WORKDIR /app
COPY --from=install /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter @ai-agent-platform/shared... run build \
 && pnpm --filter apps/local-runner... run build \
 && pnpm exec playwright install --with-deps chromium \
 && pnpm deploy --filter apps/local-runner --prod /app/deploy

FROM node:26-bookworm-slim AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/deploy/apps/local-runner ./
COPY --from=build /app/apps/local-runner/dist ./dist
COPY --from=build /root/.cache/ms-playwright /root/.cache/ms-playwright
EXPOSE 3333
CMD ["node", "dist/index.js"]
