import pino from "pino";

const level = process.env.LOG_LEVEL?.toLowerCase() ?? "info";

export const logger = pino({
  level,
  transport:
    process.env.NODE_ENV !== "production"
      ? { target: "pino-pretty" }
      : undefined,
});
