# Build stage
FROM node:lts-slim AS builder

WORKDIR /app

# Copy root package files for workspace resolution
COPY package.json package-lock.json ./

# Copy workspace package.json files
COPY packages/bot/package.json packages/bot/package.json
COPY packages/rrule-utils/package.json packages/rrule-utils/package.json

# Install all dependencies (including devDependencies for build)
RUN npm ci --ignore-scripts

# Copy source code
COPY packages/rrule-utils/ packages/rrule-utils/
COPY packages/bot/ packages/bot/

# Build rrule-utils first (bot depends on it)
RUN npm run build -w @discalendar/rrule-utils

# Build bot
RUN npm run build -w @discalendar/bot

# Runtime stage
FROM node:lts-slim

WORKDIR /app

# Create non-root user
RUN useradd --create-home --shell /bin/bash app

# Copy root package files
COPY package.json package-lock.json ./

# Copy workspace package.json files
COPY packages/bot/package.json packages/bot/package.json
COPY packages/rrule-utils/package.json packages/rrule-utils/package.json

# Install production dependencies only
RUN npm ci --omit=dev --ignore-scripts

# Copy build artifacts from builder
COPY --from=builder /app/packages/rrule-utils/dist/ packages/rrule-utils/dist/
COPY --from=builder /app/packages/bot/dist/ packages/bot/dist/

# Change ownership
RUN chown -R app:app /app

USER app

CMD ["node", "packages/bot/dist/index.js"]
