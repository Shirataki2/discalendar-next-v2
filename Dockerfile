# Build stage
FROM node:lts-slim AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package manager and workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY .npmrc* ./

# Copy workspace package.json files
COPY packages/bot/package.json packages/bot/package.json
COPY packages/rrule-utils/package.json packages/rrule-utils/package.json

# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy source code
COPY packages/rrule-utils/ packages/rrule-utils/
COPY packages/bot/ packages/bot/

# Build rrule-utils first (bot depends on it)
RUN pnpm --filter @discalendar/rrule-utils run build

# Build bot
RUN pnpm --filter @discalendar/bot run build

# Runtime stage
FROM node:lts-slim

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Create non-root user
RUN useradd --create-home --shell /bin/bash app

# Copy package manager and workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY .npmrc* ./

# Copy workspace package.json files
COPY packages/bot/package.json packages/bot/package.json
COPY packages/rrule-utils/package.json packages/rrule-utils/package.json

# Install production dependencies only
ENV NODE_ENV=production
RUN pnpm install --frozen-lockfile --ignore-scripts --prod

# Copy build artifacts from builder
COPY --from=builder /app/packages/rrule-utils/dist/ packages/rrule-utils/dist/
COPY --from=builder /app/packages/bot/dist/ packages/bot/dist/

# Change ownership
RUN chown -R app:app /app

USER app

CMD ["node", "packages/bot/dist/index.js"]
