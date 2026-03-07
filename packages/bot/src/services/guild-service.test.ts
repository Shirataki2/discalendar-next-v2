import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockSingle = vi.fn();
const mockSelectForGuild = vi.fn(() => ({ single: mockSingle }));
const mockUpsert = vi.fn(() => ({ select: mockSelectForGuild }));
const mockEqForDelete = vi.fn(() => ({ error: null }));
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("upsertGuild calls supabase upsert", async () => {
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

    expect(result.guild_id).toBe("123");
    expect(result.name).toBe("Test Guild");
  });

  it("deleteGuild does not throw on success", async () => {
    const { deleteGuild } = await import("./guild-service.js");
    await expect(deleteGuild("123")).resolves.toBeUndefined();
  });

  it("getGuildConfig returns null when not found", async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { code: "PGRST116", message: "not found" },
    });

    const { getGuildConfig } = await import("./guild-service.js");
    const result = await getGuildConfig("123");

    expect(result).toBeNull();
  });

  it("getGuildConfig returns config when found", async () => {
    mockSingle.mockResolvedValue({
      data: { guild_id: "123", restricted: true },
      error: null,
    });

    const { getGuildConfig } = await import("./guild-service.js");
    const result = await getGuildConfig("123");

    expect(result).toEqual({ guild_id: "123", restricted: true });
  });
});
