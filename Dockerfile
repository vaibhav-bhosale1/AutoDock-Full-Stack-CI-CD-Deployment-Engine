# Multi-stage build for optimization
# Stage 1: Build React frontend
FROM node:18-alpine AS frontend-build
WORKDIR /app/client

# Copy package files
COPY client/package*.json ./

# Install dependencies (remove --only=production for build stage)
RUN npm install --legacy-peer-deps --verbose 2>&1 | tee npm-install.log || (cat npm-install.log && exit 1)

# Copy source code
COPY client/ ./

# Build the application
RUN npm run build

# Stage 2: Setup backend and serve
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app directory
WORKDIR /app

# Copy backend package files
COPY server/package*.json ./server/

# Install backend dependencies with better error handling
WORKDIR /app/server
RUN npm install --only=production --no-audit --no-fund && \
    npm cache clean --force

# Return to app directory
WORKDIR /app

# Copy backend source
COPY server/ ./server/

# Copy built frontend from previous stage
COPY --from=frontend-build /app/client/build ./client/build

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of app directory
RUN chown -R nodejs:nodejs /app

USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); const options = { hostname: 'localhost', port: 5000, path: '/api/health', timeout: 2000 }; const req = http.get(options, (res) => { if (res.statusCode === 200) process.exit(0); else process.exit(1); }); req.on('error', () => process.exit(1)); req.on('timeout', () => { req.destroy(); process.exit(1); });"

# Start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server/index.js"]