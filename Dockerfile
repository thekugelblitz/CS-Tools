# ==============================================================================
# CS2 Multi-Account Drop & XP Radar - Production Dockerfile
# Optimized for Dokploy, Coolify, Railway, and standard Docker environments
# ==============================================================================

# --- Stage 1: Build Stage ---
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies if needed
COPY package*.json ./
RUN npm ci

# Copy application source
COPY . .

# Build Astro standalone application
ENV NODE_ENV=production
RUN npm run build

# Remove development dependencies to keep final image small
RUN npm prune --omit=dev

# --- Stage 2: Runtime Stage ---
FROM node:22-alpine AS runner

WORKDIR /app

# Set production environment variables
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321

# Use unprivileged non-root user for enhanced security
USER node

# Copy production artifacts from builder stage
COPY --chown=node:node --from=builder /app/package.json ./package.json
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/server-entry.mjs ./server-entry.mjs
COPY --chown=node:node --from=builder /app/dist ./dist

# Expose default port and common reverse-proxy ports
EXPOSE 4321 3000

# Built-in health check for Dokploy / container orchestration
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 4321) + '/').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Start server with dual-port forwarder
CMD ["node", "server-entry.mjs"]
