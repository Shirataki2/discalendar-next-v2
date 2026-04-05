import { init } from "@sentry/node";
import { getConfig } from "./config.js";
import { logger } from "./utils/logger.js";

const config = getConfig();
const dsn = config.sentryDsn;
const isProduction = process.env.NODE_ENV === "production";

if (dsn) {
  init({
    dsn,
    enabled: isProduction,
    environment: process.env.NODE_ENV ?? "production",
    release:
      process.env.SENTRY_RELEASE ??
      (process.env.npm_package_version
        ? `@discalendar/bot@${process.env.npm_package_version}`
        : undefined),
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    initialScope: {
      tags: { service: "bot" },
    },
  });
  logger.info("Sentry SDK initialized");
} else {
  logger.info("Sentry DSN not configured, skipping initialization");
}
