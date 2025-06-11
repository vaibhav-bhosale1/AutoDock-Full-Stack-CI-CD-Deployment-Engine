# -------- Stage 1: Build React frontend --------
FROM node:18-alpine AS frontend-build

WORKDIR /app/client

# Copy and install frontend dependencies
COPY client/package.json client/package-lock.json ./
RUN npm install

# Copy the rest of the frontend code
COPY client/ ./

# Build the frontend
RUN npm run build


# -------- Stage 2: Build and serve backend --------
FROM node:18-alpine AS production

# Install dumb-init for signal handling
RUN apk update && apk add --no-cache dumb-init

WORKDIR /app/server

# Copy and install backend dependencies
COPY server/package.json server/package-lock.json ./
RUN npm install --only=production && npm cache clean --force

# Copy backend code
COPY server/ ./

# Copy the built frontend from previous stage
WORKDIR /app
COPY --from=frontend-build /app/client/build ./client/build

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); const options = { hostname: 'localhost', port: 5000, path: '/api/health', timeout: 2000 }; const req = http.get(options, (res) => { if (res.statusCode === 200) process.exit(0); else process.exit(1); }); req.on('error', () => process.exit(1)); req.on('timeout', () => { req.destroy(); process.exit(1); });"

# Start the backend server
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "index.js"]
