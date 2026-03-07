import pino from "pino";
import { getConfig } from "../config.js";

export const logger = pino({
  level: getConfig().logLevel,
  transport:
    process.env.NODE_ENV !== "production"
      ? { target: "pino-pretty" }
      : undefined,
});
