# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /build

# Copy workspace manifests before install (workspace-aware layer caching)
COPY package.json package-lock.json ./
COPY packages/api-grade-core/package.json ./packages/api-grade-core/
COPY packages/api-grade-mcp/package.json ./packages/api-grade-mcp/

RUN npm ci --ignore-scripts

COPY tsconfig.json ./
COPY packages/api-grade-core/ ./packages/api-grade-core/
COPY packages/api-grade-mcp/ ./packages/api-grade-mcp/

RUN npm run build --workspace=@dawmatt/api-grade-core
RUN npm run build --workspace=@dawmatt/api-grade-mcp

# Stage 2: Runtime
FROM node:20-alpine AS runtime

WORKDIR /app

# Copy manifests so npm knows about the workspace and installs its deps
COPY package.json package-lock.json ./
COPY packages/api-grade-core/package.json ./packages/api-grade-core/
COPY packages/api-grade-mcp/package.json ./packages/api-grade-mcp/

RUN npm ci --omit=dev --ignore-scripts

# Copy compiled output from builder
COPY --from=builder /build/packages/api-grade-core/dist ./packages/api-grade-core/dist
COPY --from=builder /build/packages/api-grade-mcp/dist ./packages/api-grade-mcp/dist

# Run as non-root user for security
USER node

ENTRYPOINT ["node", "/app/packages/api-grade-mcp/dist/index.js"]
