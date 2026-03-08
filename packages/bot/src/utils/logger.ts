import pino from "pino";

// NOTE: logger はモジュールトップレベルで初期化されるため、getConfig() に依存できない。
// デフォルト値 "info" は config.ts の logLevel と同一に保つこと。
const level = process.env.LOG_LEVEL?.toLowerCase() ?? "info";

export const logger = pino({
  level,
  transport:
    process.env.NODE_ENV !== "production"
      ? { target: "pino-pretty" }
      : undefined,
});
