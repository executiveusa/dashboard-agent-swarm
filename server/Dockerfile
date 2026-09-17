FROM node:26-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/

# Install dependencies
# We need to install dependencies in the root and server directory
RUN npm install && cd server && npm install

# Copy source code
COPY . .

# Build the server (if needed, or just run with tsx)
# For production, we might want to build. For now, let's use tsx for simplicity as per package.json
# But for a robust docker image, let's build.
WORKDIR /app/server
RUN npm run build

# Expose port
EXPOSE 8787

# Start command
CMD ["npm", "start"]
