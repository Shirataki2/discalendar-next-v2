import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock next/navigation redirect
const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args);
    // redirect() throws a NEXT_REDIRECT error in Next.js
    throw new Error("NEXT_REDIRECT");
  },
}));

// Mock Supabase server client
const mockGetUser = vi.fn();
const mockGetSession = vi.fn();
const mockSupabase = {
  auth: {
    getUser: mockGetUser,
    getSession: mockGetSession,
  },
};
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

// Mock fetchGuilds
const mockFetchGuilds = vi.fn();
vi.mock("@/lib/guilds/fetch-guilds", () => ({
  fetchGuilds: (...args: unknown[]) => mockFetchGuilds(...args),
}));

// Mock GuildConfigService
const mockGetGuildConfig = vi.fn();
vi.mock("@/lib/guilds/guild-config-service", () => ({
  createGuildConfigService: () => ({
    getGuildConfig: mockGetGuildConfig,
  }),
}));

// Mock buildDashboardUser
vi.mock("@/lib/user/build-dashboard-user", () => ({
  buildDashboardUser: (user: { id: string; email?: string }) => ({
    id: user.id,
    email: user.email ?? "",
    fullName: "Test User",
    avatarUrl: null,
  }),
}));

// Helper: authenticated user
const authenticatedUser = {
  id: "user-123",
  email: "test@example.com",
  user_metadata: {
    full_name: "Test User",
    avatar_url: null,
  },
};

// Helper: guild with manage permissions (ADMINISTRATOR bit set)
const ADMINISTRATOR_BIT = (BigInt(1) << BigInt(3)).toString();

function createMockGuild(guildId: string, name: string) {
  return {
    id: 1,
    guildId,
    name,
    avatarUrl: null,
    locale: "ja",
    permissions: {
      administrator: true,
      manageGuild: false,
      manageChannels: false,
      manageMessages: false,
      manageRoles: false,
      manageEvents: false,
      raw: BigInt(8),
    },
  };
}

function createMockGuildNoPermission(guildId: string, name: string) {
  return {
    id: 1,
    guildId,
    name,
    avatarUrl: null,
    locale: "ja",
    permissions: {
      administrator: false,
      manageGuild: false,
      manageChannels: false,
      manageMessages: false,
      manageRoles: false,
      manageEvents: false,
      raw: BigInt(0),
    },
  };
}

describe("GuildSettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({
      data: { session: { provider_token: "mock-token" } },
    });
  });

  describe("Requirement 1.2: 未認証ユーザーのリダイレクト", () => {
    it("should redirect to /auth/login when user is not authenticated", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: "Not authenticated" },
      });

      const { default: GuildSettingsPage } = await import(
        "@/app/dashboard/guilds/[guildId]/settings/page"
      );

      await expect(
        GuildSettingsPage({ params: Promise.resolve({ guildId: "guild-1" }) })
      ).rejects.toThrow("NEXT_REDIRECT");

      expect(mockRedirect).toHaveBeenCalledWith("/auth/login");
    });
  });

  describe("Requirement 1.4: 存在しない guildId のリダイレクト", () => {
    it("should redirect to /dashboard when guildId is not found in user guilds", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: authenticatedUser },
        error: null,
      });
      mockFetchGuilds.mockResolvedValue({
        guilds: [createMockGuild("guild-other", "Other Server")],
        invitableGuilds: [],
      });

      const { default: GuildSettingsPage } = await import(
        "@/app/dashboard/guilds/[guildId]/settings/page"
      );

      await expect(
        GuildSettingsPage({
          params: Promise.resolve({ guildId: "guild-nonexistent" }),
        })
      ).rejects.toThrow("NEXT_REDIRECT");

      expect(mockRedirect).toHaveBeenCalledWith("/dashboard");
    });
  });

  describe("Requirement 1.3: 権限なしユーザーのリダイレクト", () => {
    it("should redirect to /dashboard when user lacks canManageGuild permission", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: authenticatedUser },
        error: null,
      });
      mockFetchGuilds.mockResolvedValue({
        guilds: [
          createMockGuildNoPermission("guild-1", "No Permission Server"),
        ],
        invitableGuilds: [],
      });

      const { default: GuildSettingsPage } = await import(
        "@/app/dashboard/guilds/[guildId]/settings/page"
      );

      await expect(
        GuildSettingsPage({ params: Promise.resolve({ guildId: "guild-1" }) })
      ).rejects.toThrow("NEXT_REDIRECT");

      expect(mockRedirect).toHaveBeenCalledWith("/dashboard");
    });
  });

  describe("Requirement 1.1: 認証済みユーザーのページ表示", () => {
    it("should fetch guild config and return JSX when all checks pass", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: authenticatedUser },
        error: null,
      });
      mockFetchGuilds.mockResolvedValue({
        guilds: [createMockGuild("guild-1", "Test Server")],
        invitableGuilds: [],
      });
      mockGetGuildConfig.mockResolvedValue({
        success: true,
        data: { guildId: "guild-1", restricted: false },
      });

      const { default: GuildSettingsPage } = await import(
        "@/app/dashboard/guilds/[guildId]/settings/page"
      );

      const result = await GuildSettingsPage({
        params: Promise.resolve({ guildId: "guild-1" }),
      });

      // Should not redirect
      expect(mockRedirect).not.toHaveBeenCalled();
      // Should return JSX (not null/undefined)
      expect(result).toBeDefined();
      // Should have called getGuildConfig
      expect(mockGetGuildConfig).toHaveBeenCalledWith("guild-1");
    });

    it("should redirect to /dashboard when guild config fetch fails", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: authenticatedUser },
        error: null,
      });
      mockFetchGuilds.mockResolvedValue({
        guilds: [createMockGuild("guild-1", "Test Server")],
        invitableGuilds: [],
      });
      mockGetGuildConfig.mockResolvedValue({
        success: false,
        error: {
          code: "FETCH_FAILED",
          message: "Failed to fetch",
        },
      });

      const { default: GuildSettingsPage } = await import(
        "@/app/dashboard/guilds/[guildId]/settings/page"
      );

      await expect(
        GuildSettingsPage({ params: Promise.resolve({ guildId: "guild-1" }) })
      ).rejects.toThrow("NEXT_REDIRECT");

      expect(mockRedirect).toHaveBeenCalledWith("/dashboard");
    });
  });
});
