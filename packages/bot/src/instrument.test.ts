import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@sentry/node", () => ({
  init: vi.fn(),
}));

vi.mock("./utils/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe("instrument", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.BOT_TOKEN = "test-token";
    process.env.APPLICATION_ID = "test-app-id";
    process.env.SUPABASE_URL = "http://localhost:54321";
    process.env.SUPABASE_SERVICE_KEY = "test-key";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should initialize Sentry when DSN is configured", async () => {
    process.env.SENTRY_DSN = "https://examplePublicKey@o0.ingest.sentry.io/0";
    process.env.NODE_ENV = "production";

    const Sentry = await import("@sentry/node");
    await import("./instrument.js");

    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: "https://examplePublicKey@o0.ingest.sentry.io/0",
        enabled: true,
        environment: "production",
        tracesSampleRate: 0.1,
        sendDefaultPii: false,
        initialScope: {
          tags: { service: "bot" },
        },
      })
    );
  });

  it("should skip initialization when DSN is not configured", async () => {
    process.env.SENTRY_DSN = undefined;

    const Sentry = await import("@sentry/node");
    await import("./instrument.js");

    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it("should disable Sentry in non-production environment", async () => {
    process.env.SENTRY_DSN = "https://examplePublicKey@o0.ingest.sentry.io/0";
    process.env.NODE_ENV = "development";

    const Sentry = await import("@sentry/node");
    await import("./instrument.js");

    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
        environment: "development",
      })
    );
  });

  it("should use SENTRY_RELEASE env var when set", async () => {
    process.env.SENTRY_DSN = "https://examplePublicKey@o0.ingest.sentry.io/0";
    process.env.NODE_ENV = "production";
    process.env.SENTRY_RELEASE = "bot@1.2.3";

    const Sentry = await import("@sentry/node");
    await import("./instrument.js");

    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        release: "bot@1.2.3",
      })
    );
  });

  it("should fall back to npm_package_version for release", async () => {
    process.env.SENTRY_DSN = "https://examplePublicKey@o0.ingest.sentry.io/0";
    process.env.NODE_ENV = "production";
    process.env.npm_package_version = "0.1.0";

    const Sentry = await import("@sentry/node");
    await import("./instrument.js");

    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        release: "@discalendar/bot@0.1.0",
      })
    );
  });

  it("should set service tag to 'bot'", async () => {
    process.env.SENTRY_DSN = "https://examplePublicKey@o0.ingest.sentry.io/0";
    process.env.NODE_ENV = "production";

    const Sentry = await import("@sentry/node");
    await import("./instrument.js");

    expect(Sentry.init).toHaveBeenCalledWith(
      expect.objectContaining({
        initialScope: {
          tags: { service: "bot" },
        },
      })
    );
  });
});
