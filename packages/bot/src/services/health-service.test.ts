import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockUpsert = vi.fn();

vi.mock("../services/supabase.js", () => ({
  getSupabaseClient: () => ({
    from: (table: string) => {
      if (table === "service_health") {
        return { upsert: mockUpsert };
      }
      return {};
    },
  }),
}));

vi.mock("../config.js", () => ({
  getConfig: () => ({
    supabaseUrl: "http://localhost",
    supabaseServiceKey: "test-key",
    botToken: "test",
    applicationId: "test",
    invitationUrl: "",
    logLevel: "silent",
    sentryDsn: undefined,
  }),
}));

vi.mock("../utils/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("health-service", () => {
  beforeEach(() => {
    vi.resetModules();
    mockUpsert.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("upsertHeartbeat returns success on completion", async () => {
    const { upsertHeartbeat } = await import("./health-service.js");
    const result = await upsertHeartbeat({ guildCount: 5, wsPing: 42 });

    expect(result.success).toBe(true);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        service_name: "discord-bot",
        metadata: { guildCount: 5, wsPing: 42 },
      }),
      { onConflict: "service_name" }
    );
  });

  it("upsertHeartbeat returns failure on Supabase error", async () => {
    mockUpsert.mockResolvedValue({
      error: { code: "23505", message: "duplicate" },
    });

    const { upsertHeartbeat } = await import("./health-service.js");
    const result = await upsertHeartbeat({ guildCount: 5, wsPing: 42 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("DUPLICATE");
    }
  });
});
