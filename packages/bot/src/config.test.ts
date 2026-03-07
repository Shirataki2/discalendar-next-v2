import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("getConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return config when all required env vars are set", async () => {
    process.env.BOT_TOKEN = "test-token";
    process.env.APPLICATION_ID = "test-app-id";
    process.env.SUPABASE_URL = "http://localhost:54321";
    process.env.SUPABASE_SERVICE_KEY = "test-key";

    const { getConfig } = await import("./config.js");
    const config = getConfig();

    expect(config.botToken).toBe("test-token");
    expect(config.applicationId).toBe("test-app-id");
    expect(config.supabaseUrl).toBe("http://localhost:54321");
    expect(config.supabaseServiceKey).toBe("test-key");
    expect(config.logLevel).toBe("info");
    expect(config.invitationUrl).toBe("");
    expect(config.sentryDsn).toBeUndefined();
  });

  it("should throw when required env var is missing", async () => {
    process.env.APPLICATION_ID = "test-app-id";
    process.env.SUPABASE_URL = "http://localhost:54321";
    process.env.SUPABASE_SERVICE_KEY = "test-key";
    process.env.BOT_TOKEN = undefined;

    const { getConfig } = await import("./config.js");

    expect(() => getConfig()).toThrow(
      "Missing required environment variable: BOT_TOKEN"
    );
  });

  it("should use optional env vars when provided", async () => {
    process.env.BOT_TOKEN = "test-token";
    process.env.APPLICATION_ID = "test-app-id";
    process.env.SUPABASE_URL = "http://localhost:54321";
    process.env.SUPABASE_SERVICE_KEY = "test-key";
    process.env.LOG_LEVEL = "DEBUG";
    process.env.INVITATION_URL = "https://invite.example.com";
    process.env.SENTRY_DSN = "https://sentry.example.com";

    const { getConfig } = await import("./config.js");
    const config = getConfig();

    expect(config.logLevel).toBe("debug");
    expect(config.invitationUrl).toBe("https://invite.example.com");
    expect(config.sentryDsn).toBe("https://sentry.example.com");
  });
});
