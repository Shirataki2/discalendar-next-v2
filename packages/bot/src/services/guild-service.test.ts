import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockSingle = vi.fn();
const mockSelectForGuild = vi.fn(() => ({ single: mockSingle }));
const mockUpsert = vi.fn(() => ({ select: mockSelectForGuild }));
const mockEqForDelete = vi.fn();
const mockDelete = vi.fn(() => ({ eq: mockEqForDelete }));

const mockEqForConfig = vi.fn(() => ({ single: mockSingle }));
const mockSelectForConfig = vi.fn(() => ({ eq: mockEqForConfig }));

vi.mock("../services/supabase.js", () => ({
  getSupabaseClient: () => ({
    from: (table: string) => {
      if (table === "guilds") {
        return {
          upsert: mockUpsert,
          delete: mockDelete,
        };
      }
      if (table === "guild_config") {
        return {
          select: mockSelectForConfig,
        };
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

describe("guild-service", () => {
  beforeEach(() => {
    vi.resetModules();
    mockSingle.mockResolvedValue({ data: null, error: null });
    mockEqForDelete.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("upsertGuild returns success result", async () => {
    const guildRow = {
      id: 1,
      guild_id: "123",
      name: "Test Guild",
      avatar_url: null,
      locale: "ja",
    };
    mockSingle.mockResolvedValue({ data: guildRow, error: null });

    const { upsertGuild } = await import("./guild-service.js");
    const result = await upsertGuild({
      guild_id: "123",
      name: "Test Guild",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.guild_id).toBe("123");
      expect(result.data.name).toBe("Test Guild");
    }
  });

  it("deleteGuild returns success on completion", async () => {
    mockEqForDelete.mockResolvedValue({ error: null });

    const { deleteGuild } = await import("./guild-service.js");
    const result = await deleteGuild("123");

    expect(result.success).toBe(true);
  });

  it("getGuildConfig returns null data when not found", async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { code: "PGRST116", message: "not found" },
    });

    const { getGuildConfig } = await import("./guild-service.js");
    const result = await getGuildConfig("123");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBeNull();
    }
  });

  it("getGuildConfig returns config when found", async () => {
    mockSingle.mockResolvedValue({
      data: { guild_id: "123", restricted: true },
      error: null,
    });

    const { getGuildConfig } = await import("./guild-service.js");
    const result = await getGuildConfig("123");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ guild_id: "123", restricted: true });
    }
  });
});
