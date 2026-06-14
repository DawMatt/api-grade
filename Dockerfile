# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /build

# Copy all package manifests before install (workspace-aware layer caching)
COPY package.json package-lock.json ./
COPY packages/api-grade-core/package.json ./packages/api-grade-core/

RUN npm ci --ignore-scripts

COPY tsconfig.json ./
COPY src/ ./src/
COPY packages/api-grade-core/ ./packages/api-grade-core/

RUN npm run build

# Stage 2: Runtime
FROM node:20-alpine AS runtime

WORKDIR /app

# Copy manifests so npm knows about the workspace and installs its deps
COPY package.json package-lock.json ./
COPY packages/api-grade-core/package.json ./packages/api-grade-core/

RUN npm ci --omit=dev --ignore-scripts

# Copy compiled CLI output from builder
COPY --from=builder /build/dist ./dist

# Copy compiled library output from builder (satisfies the workspace symlink)
COPY --from=builder /build/packages/api-grade-core/dist ./packages/api-grade-core/dist

# Run as non-root user for security
USER node

ENTRYPOINT ["node", "/app/dist/cli/index.js"]
