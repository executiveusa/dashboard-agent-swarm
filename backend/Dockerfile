# syntax=docker/dockerfile:1.6
FROM node:20-bookworm-slim
WORKDIR /srv
COPY backend/package.json ./package.json
COPY backend/server.mjs ./server.mjs
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "server.mjs"]
