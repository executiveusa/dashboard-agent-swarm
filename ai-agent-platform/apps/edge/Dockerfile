# syntax=docker/dockerfile:1
FROM node:20-bullseye AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY ai-agent-platform ./ai-agent-platform

RUN npm install --workspaces
RUN npm run --workspace apps/edge build

FROM node:20-bullseye AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/ai-agent-platform/apps/edge/dist ./dist

EXPOSE 8787
CMD ["node", "dist/index.js"]
