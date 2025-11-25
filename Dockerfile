# Multi-stage build for production deployment

# Stage 1: Build React frontend
FROM node:18 AS frontend-build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build React app
RUN npm run build

# Stage 2: Production server
FROM node:18-slim

WORKDIR /app

# Install gcsfuse and build dependencies for native modules
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    lsb-release \
    python3 \
    make \
    g++ \
    && echo "deb http://packages.cloud.google.com/apt gcsfuse-$(lsb_release -c -s) main" | tee /etc/apt/sources.list.d/gcsfuse.list \
    && curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key add - \
    && apt-get update \
    && apt-get install -y gcsfuse \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production \
    && apt-get purge -y --auto-remove python3 make g++

# Copy server code
COPY server ./server

# Copy built frontend from previous stage
COPY --from=frontend-build /app/dist ./dist

# Create directories for data mount
RUN mkdir -p /data

# Environment variables
ENV PORT=8080
ENV DB_PATH=/data/votely.db
ENV NODE_ENV=production

# Expose port
EXPOSE 8080

# Start script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

CMD ["./docker-entrypoint.sh"]
