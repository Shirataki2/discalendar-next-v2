/**
 * NotificationChannelService ユニットテスト
 *
 * Discord BOT API を使用してギルドのテキストチャンネル一覧を取得する
 * サービスの動作を検証する。
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 4.1
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getGuildChannels } from "@/lib/discord/notification-channel-service";

// fetch をモック
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

/** テスト用の Discord API チャンネルオブジェクトを生成する */
function createApiChannel(overrides: Record<string, unknown> = {}) {
  return {
    id: "111111111111111111",
    name: "general",
    type: 0,
    parent_id: null,
    position: 0,
    permission_overwrites: [],
    ...overrides,
  };
}

/** テスト用のカテゴリチャンネル（type=4）を生成する */
function createCategoryChannel(
  id: string,
  name: string,
  overrides: Record<string, unknown> = {}
) {
  return {
    id,
    name,
    type: 4,
    parent_id: null,
    position: 0,
    permission_overwrites: [],
    ...overrides,
  };
}

describe("getGuildChannels", () => {
  const guildId = "123456789012345678";
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      DISCORD_BOT_TOKEN: "test-bot-token",
      DISCORD_CLIENT_ID: "999999999999999999",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("正常系: テキストチャンネルのフィルタリング", () => {
    it("テキストチャンネル（type=0）のみをフィルタリングして返す", async () => {
      const channels = [
        createApiChannel({ id: "1", name: "general", type: 0 }),
        createApiChannel({ id: "2", name: "Voice", type: 2 }),
        createApiChannel({ id: "3", name: "announcements", type: 0 }),
        createCategoryChannel("4", "Category"),
        createApiChannel({ id: "5", name: "stage", type: 13 }),
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(channels),
      });

      const result = await getGuildChannels(guildId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data.map((c) => c.name)).toEqual([
          "general",
          "announcements",
        ]);
      }
    });

    it("チャンネル一覧が空の場合は空配列を返す", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const result = await getGuildChannels(guildId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
    });

    it("テキストチャンネルが存在しない場合は空配列を返す", async () => {
      const channels = [
        createApiChannel({ id: "1", name: "voice", type: 2 }),
        createCategoryChannel("2", "Category"),
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(channels),
      });

      const result = await getGuildChannels(guildId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
    });
  });

  describe("正常系: チャンネル情報の構造", () => {
    it("ID、名前、カテゴリID、表示順序を含む構造化データを返す", async () => {
      const channels = [
        createApiChannel({
          id: "111111111111111111",
          name: "general",
          parent_id: "444444444444444444",
          position: 3,
        }),
        createCategoryChannel("444444444444444444", "Text Channels"),
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(channels),
      });

      const result = await getGuildChannels(guildId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        const channel = result.data[0];
        expect(channel.id).toBe("111111111111111111");
        expect(channel.name).toBe("general");
        expect(channel.parentId).toBe("444444444444444444");
        expect(channel.categoryName).toBe("Text Channels");
        expect(channel.position).toBe(3);
        expect(channel.canBotSendMessages).toBe(true);
      }
    });
  });

  describe("正常系: カテゴリ名解決", () => {
    it("parent_id からカテゴリ名を解決する", async () => {
      const channels = [
        createCategoryChannel("cat-1", "General"),
        createCategoryChannel("cat-2", "Gaming"),
        createApiChannel({
          id: "ch-1",
          name: "chat",
          parent_id: "cat-1",
        }),
        createApiChannel({
          id: "ch-2",
          name: "gaming-chat",
          parent_id: "cat-2",
        }),
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(channels),
      });

      const result = await getGuildChannels(guildId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0].categoryName).toBe("General");
        expect(result.data[1].categoryName).toBe("Gaming");
      }
    });

    it("parent_id が null の場合は categoryName を null とする", async () => {
      const channels = [
        createApiChannel({
          id: "ch-1",
          name: "uncategorized",
          parent_id: null,
        }),
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(channels),
      });

      const result = await getGuildChannels(guildId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data[0].parentId).toBeNull();
        expect(result.data[0].categoryName).toBeNull();
      }
    });

    it("parent_id に該当するカテゴリが存在しない場合は categoryName を null とする", async () => {
      const channels = [
        createApiChannel({
          id: "ch-1",
          name: "orphan",
          parent_id: "nonexistent-category",
        }),
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(channels),
      });

      const result = await getGuildChannels(guildId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data[0].parentId).toBe("nonexistent-category");
        expect(result.data[0].categoryName).toBeNull();
      }
    });
  });

  describe("正常系: BOT 投稿権限チェック", () => {
    it("permission_overwrites がない場合は canBotSendMessages を true とする", async () => {
      const channels = [
        createApiChannel({
          id: "ch-1",
          name: "open",
          permission_overwrites: [],
        }),
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(channels),
      });

      const result = await getGuildChannels(guildId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data[0].canBotSendMessages).toBe(true);
      }
    });

    it("@everyone ロールで SEND_MESSAGES が deny されている場合は canBotSendMessages を false とする", async () => {
      // SEND_MESSAGES = 1 << 11 = 2048
      const channels = [
        createApiChannel({
          id: "ch-1",
          name: "restricted",
          permission_overwrites: [
            {
              id: guildId, // @everyone role id = guild id
              type: 0, // role
              allow: "0",
              deny: "2048", // SEND_MESSAGES
            },
          ],
        }),
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(channels),
      });

      const result = await getGuildChannels(guildId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data[0].canBotSendMessages).toBe(false);
      }
    });

    it("@everyone ロールで VIEW_CHANNEL が deny されている場合は canBotSendMessages を false とする", async () => {
      // VIEW_CHANNEL = 1 << 10 = 1024
      const channels = [
        createApiChannel({
          id: "ch-1",
          name: "hidden",
          permission_overwrites: [
            {
              id: guildId,
              type: 0,
              allow: "0",
              deny: "1024", // VIEW_CHANNEL
            },
          ],
        }),
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(channels),
      });

      const result = await getGuildChannels(guildId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data[0].canBotSendMessages).toBe(false);
      }
    });

    it("BOT ユーザー ID で SEND_MESSAGES が deny されている場合は canBotSendMessages を false とする", async () => {
      const channels = [
        createApiChannel({
          id: "ch-1",
          name: "bot-denied",
          permission_overwrites: [
            {
              id: "999999999999999999", // BOT user ID = DISCORD_CLIENT_ID
              type: 1, // member
              allow: "0",
              deny: "2048", // SEND_MESSAGES
            },
          ],
        }),
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(channels),
      });

      const result = await getGuildChannels(guildId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data[0].canBotSendMessages).toBe(false);
      }
    });

    it("関係のないロール/ユーザーの deny は canBotSendMessages に影響しない", async () => {
      const channels = [
        createApiChannel({
          id: "ch-1",
          name: "other-deny",
          permission_overwrites: [
            {
              id: "other-role-id",
              type: 0,
              allow: "0",
              deny: "2048",
            },
          ],
        }),
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(channels),
      });

      const result = await getGuildChannels(guildId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data[0].canBotSendMessages).toBe(true);
      }
    });

    it("SEND_MESSAGES と VIEW_CHANNEL の両方が deny されている場合は canBotSendMessages を false とする", async () => {
      // SEND_MESSAGES (2048) + VIEW_CHANNEL (1024) = 3072
      const channels = [
        createApiChannel({
          id: "ch-1",
          name: "fully-restricted",
          permission_overwrites: [
            {
              id: guildId,
              type: 0,
              allow: "0",
              deny: "3072",
            },
          ],
        }),
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(channels),
      });

      const result = await getGuildChannels(guildId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data[0].canBotSendMessages).toBe(false);
      }
    });
  });

  describe("正常系: API 呼び出し", () => {
    it("BOT トークンを Authorization ヘッダーに設定して Discord API を呼び出す", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await getGuildChannels(guildId);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://discord.com/api/v10/guilds/${guildId}/channels`,
        {
          headers: {
            Authorization: "Bot test-bot-token",
          },
        }
      );
    });
  });

  describe("エラー系: Discord API エラー", () => {
    it("401 Unauthorized の場合は unauthorized エラーを返す", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const result = await getGuildChannels(guildId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("unauthorized");
      }
    });

    it("429 Rate Limited の場合は retryAfter 情報を含むエラーを返す", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: {
          get: (name: string) => (name === "Retry-After" ? "30" : null),
        },
        json: () => Promise.resolve({}),
      });

      const result = await getGuildChannels(guildId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("rate_limited");
        if (result.error.code === "rate_limited") {
          expect(result.error.retryAfter).toBe(30);
        }
      }
    });

    it("429 で Retry-After ヘッダーがない場合はボディから retryAfter を取得する", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: {
          get: () => null,
        },
        json: () => Promise.resolve({ retry_after: 15 }),
      });

      const result = await getGuildChannels(guildId);

      expect(result.success).toBe(false);
      if (!result.success && result.error.code === "rate_limited") {
        expect(result.error.retryAfter).toBe(15);
      }
    });

    it("その他のステータスコードの場合は unknown エラーを返す", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await getGuildChannels(guildId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("unknown");
      }
    });
  });

  describe("エラー系: ネットワークエラー", () => {
    it("fetch が例外を投げた場合は network_error を返す", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Failed to fetch"));

      const result = await getGuildChannels(guildId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("network_error");
      }
    });
  });

  describe("エラー系: BOT トークン未設定", () => {
    it("DISCORD_BOT_TOKEN が未設定の場合は bot_token_missing エラーを返す", async () => {
      process.env.DISCORD_BOT_TOKEN = "";

      const result = await getGuildChannels(guildId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("bot_token_missing");
      }
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("DISCORD_BOT_TOKEN が undefined の場合は bot_token_missing エラーを返す", async () => {
      process.env.DISCORD_BOT_TOKEN = undefined;

      const result = await getGuildChannels(guildId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("bot_token_missing");
      }
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
