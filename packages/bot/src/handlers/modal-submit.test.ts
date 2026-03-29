import type { GuildMember, ModalSubmitInteraction } from "discord.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../services/event-service.js");
vi.mock("../services/guild-service.js");
vi.mock("../utils/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  createEvent,
  getEventById,
  updateEvent,
} from "../services/event-service.js";
import { getGuildConfig } from "../services/guild-service.js";
import type { EventRecord } from "../types/event.js";
import { handleModalSubmit } from "./modal-submit.js";

const mockedCreateEvent = vi.mocked(createEvent);
const mockedUpdateEvent = vi.mocked(updateEvent);
const mockedGetEventById = vi.mocked(getEventById);
const mockedGetGuildConfig = vi.mocked(getGuildConfig);

function makeEvent(overrides: Partial<EventRecord> = {}): EventRecord {
  return {
    id: "event-uuid-123",
    guild_id: "guild-1",
    name: "テストイベント",
    description: "テスト説明",
    color: "#3e44f7",
    is_all_day: false,
    start_at: "2025-03-29T06:00:00.000Z",
    end_at: "2025-03-29T08:00:00.000Z",
    location: null,
    channel_id: null,
    channel_name: null,
    notifications: [],
    created_at: "2025-03-01T00:00:00.000Z",
    updated_at: "2025-03-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeInteraction(
  overrides: {
    customId?: string;
    guildId?: string | null;
    fields?: Record<string, string>;
    member?: GuildMember | null;
  } = {}
): ModalSubmitInteraction {
  const {
    customId = "event-create",
    guildId = "guild-1",
    fields = {
      "event-title": "新しいイベント",
      "event-description": "イベント説明",
      "event-start-at": "2025/03/29 15:00",
      "event-end-at": "2025/03/29 17:00",
      "event-is-all-day": "",
    },
    member = null,
  } = overrides;

  return {
    customId,
    guild: guildId ? { id: guildId } : null,
    member,
    replied: false,
    deferred: false,
    fields: {
      getTextInputValue: (id: string) => fields[id] ?? "",
    },
    reply: vi.fn(),
    followUp: vi.fn(),
  } as unknown as ModalSubmitInteraction;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedGetGuildConfig.mockResolvedValue({ success: true, data: null });
});

describe("handleModalSubmit", () => {
  describe("routing", () => {
    it("should skip unknown customId", async () => {
      const interaction = makeInteraction({ customId: "unknown-modal" });
      await handleModalSubmit(interaction);
      expect(interaction.reply).not.toHaveBeenCalled();
    });
  });

  describe("guild check", () => {
    it("should reply error when not in guild", async () => {
      const interaction = makeInteraction({ guildId: null });
      await handleModalSubmit(interaction);
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: "このコマンドはサーバーでのみ実行可能です",
          ephemeral: true,
        })
      );
    });
  });

  describe("validation", () => {
    it("should reply error when title is empty", async () => {
      const interaction = makeInteraction({
        fields: {
          "event-title": "",
          "event-description": "",
          "event-start-at": "2025/03/29 15:00",
          "event-end-at": "2025/03/29 17:00",
          "event-is-all-day": "",
        },
      });
      await handleModalSubmit(interaction);
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining("タイトル"),
          ephemeral: true,
        })
      );
    });

    it("should reply error when start datetime is invalid", async () => {
      const interaction = makeInteraction({
        fields: {
          "event-title": "テスト",
          "event-description": "",
          "event-start-at": "not-a-date",
          "event-end-at": "2025/03/29 17:00",
          "event-is-all-day": "",
        },
      });
      await handleModalSubmit(interaction);
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining("開始日時"),
          ephemeral: true,
        })
      );
    });

    it("should reply error when end datetime is invalid", async () => {
      const interaction = makeInteraction({
        fields: {
          "event-title": "テスト",
          "event-description": "",
          "event-start-at": "2025/03/29 15:00",
          "event-end-at": "invalid-date",
          "event-is-all-day": "",
        },
      });
      await handleModalSubmit(interaction);
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining("終了日時"),
          ephemeral: true,
        })
      );
    });

    it("should reply error when start >= end", async () => {
      const interaction = makeInteraction({
        fields: {
          "event-title": "テスト",
          "event-description": "",
          "event-start-at": "2025/03/29 17:00",
          "event-end-at": "2025/03/29 15:00",
          "event-is-all-day": "",
        },
      });
      await handleModalSubmit(interaction);
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining("開始時間が終了時間以降"),
          ephemeral: true,
        })
      );
    });

    it("should reply error when is_all_day is not true/false", async () => {
      const interaction = makeInteraction({
        fields: {
          "event-title": "テスト",
          "event-description": "",
          "event-start-at": "2025/03/29 15:00",
          "event-end-at": "2025/03/29 17:00",
          "event-is-all-day": "yes",
        },
      });
      await handleModalSubmit(interaction);
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining("true または false"),
          ephemeral: true,
        })
      );
    });

    it("should treat empty is_all_day as false", async () => {
      mockedCreateEvent.mockResolvedValue({
        success: true,
        data: makeEvent({ is_all_day: false }),
      });
      const interaction = makeInteraction({
        fields: {
          "event-title": "テスト",
          "event-description": "",
          "event-start-at": "2025/03/29 15:00",
          "event-end-at": "2025/03/29 17:00",
          "event-is-all-day": "",
        },
      });
      await handleModalSubmit(interaction);
      expect(mockedCreateEvent).toHaveBeenCalledWith(
        expect.objectContaining({ is_all_day: false })
      );
    });
  });

  describe("permission check", () => {
    it("should reply error when restricted guild and no permission", async () => {
      mockedGetGuildConfig.mockResolvedValue({
        success: true,
        data: { guild_id: "guild-1", restricted: true },
      });
      const member = {
        permissions: { has: () => false },
      } as unknown as GuildMember;
      const interaction = makeInteraction({ member });
      await handleModalSubmit(interaction);
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining("権限"),
          ephemeral: true,
        })
      );
    });

    it("should proceed when restricted guild and has permission", async () => {
      mockedGetGuildConfig.mockResolvedValue({
        success: true,
        data: { guild_id: "guild-1", restricted: true },
      });
      const member = {
        permissions: { has: () => true },
      } as unknown as GuildMember;
      mockedCreateEvent.mockResolvedValue({
        success: true,
        data: makeEvent(),
      });
      const interaction = makeInteraction({ member });
      await handleModalSubmit(interaction);
      expect(mockedCreateEvent).toHaveBeenCalled();
    });

    it("should reply error when guild config fetch fails", async () => {
      mockedGetGuildConfig.mockResolvedValue({
        success: false,
        error: { code: "FETCH_FAILED", message: "DB error" },
      });
      const interaction = makeInteraction();
      await handleModalSubmit(interaction);
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining("ギルド設定"),
          ephemeral: true,
        })
      );
    });
  });

  describe("create flow", () => {
    it("should create event and reply with embed on success", async () => {
      const event = makeEvent({ name: "新しいイベント" });
      mockedCreateEvent.mockResolvedValue({ success: true, data: event });
      const interaction = makeInteraction();
      await handleModalSubmit(interaction);
      expect(mockedCreateEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          guild_id: "guild-1",
          name: "新しいイベント",
          description: "イベント説明",
          is_all_day: false,
        })
      );
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining("作成"),
          embeds: expect.arrayContaining([expect.any(Object)]),
        })
      );
    });

    it("should store null for empty description", async () => {
      mockedCreateEvent.mockResolvedValue({
        success: true,
        data: makeEvent({ description: null }),
      });
      const interaction = makeInteraction({
        fields: {
          "event-title": "テスト",
          "event-description": "",
          "event-start-at": "2025/03/29 15:00",
          "event-end-at": "2025/03/29 17:00",
          "event-is-all-day": "",
        },
      });
      await handleModalSubmit(interaction);
      expect(mockedCreateEvent).toHaveBeenCalledWith(
        expect.objectContaining({ description: null })
      );
    });

    it("should reply error when createEvent fails", async () => {
      mockedCreateEvent.mockResolvedValue({
        success: false,
        error: { code: "CREATE_FAILED", message: "DB error" },
      });
      const interaction = makeInteraction();
      await handleModalSubmit(interaction);
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining("作成に失敗"),
          ephemeral: true,
        })
      );
    });
  });

  describe("edit flow", () => {
    it("should update event and reply with embed on success", async () => {
      const event = makeEvent();
      mockedGetEventById.mockResolvedValue({ success: true, data: event });
      const updatedEvent = makeEvent({ name: "更新後イベント" });
      mockedUpdateEvent.mockResolvedValue({
        success: true,
        data: updatedEvent,
      });
      const interaction = makeInteraction({
        customId: "event-edit:event-uuid-123",
        fields: {
          "event-title": "更新後イベント",
          "event-description": "更新説明",
          "event-start-at": "2025/03/29 15:00",
          "event-end-at": "2025/03/29 17:00",
          "event-is-all-day": "",
        },
      });
      await handleModalSubmit(interaction);
      expect(mockedUpdateEvent).toHaveBeenCalledWith(
        "event-uuid-123",
        "guild-1",
        expect.objectContaining({ name: "更新後イベント" })
      );
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining("更新"),
          embeds: expect.arrayContaining([expect.any(Object)]),
        })
      );
    });

    it("should reply error when event not found", async () => {
      mockedGetEventById.mockResolvedValue({ success: true, data: null });
      const interaction = makeInteraction({
        customId: "event-edit:non-existent-id",
      });
      await handleModalSubmit(interaction);
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining("見つかりません"),
          ephemeral: true,
        })
      );
    });

    it("should reply error when getEventById fails", async () => {
      mockedGetEventById.mockResolvedValue({
        success: false,
        error: { code: "FETCH_FAILED", message: "DB error" },
      });
      const interaction = makeInteraction({
        customId: "event-edit:event-uuid-123",
      });
      await handleModalSubmit(interaction);
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining("取得に失敗"),
          ephemeral: true,
        })
      );
    });

    it("should reply error when updateEvent fails", async () => {
      mockedGetEventById.mockResolvedValue({
        success: true,
        data: makeEvent(),
      });
      mockedUpdateEvent.mockResolvedValue({
        success: false,
        error: { code: "UPDATE_FAILED", message: "DB error" },
      });
      const interaction = makeInteraction({
        customId: "event-edit:event-uuid-123",
      });
      await handleModalSubmit(interaction);
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining("更新に失敗"),
          ephemeral: true,
        })
      );
    });
  });

  describe("JST to UTC conversion", () => {
    it("should convert JST datetime to UTC for storage", async () => {
      mockedCreateEvent.mockResolvedValue({
        success: true,
        data: makeEvent(),
      });
      const interaction = makeInteraction({
        fields: {
          "event-title": "テスト",
          "event-description": "",
          "event-start-at": "2025/03/29 15:00",
          "event-end-at": "2025/03/29 17:00",
          "event-is-all-day": "",
        },
      });
      await handleModalSubmit(interaction);
      // 15:00 JST = 06:00 UTC, 17:00 JST = 08:00 UTC
      expect(mockedCreateEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          start_at: "2025-03-29T06:00:00.000Z",
          end_at: "2025-03-29T08:00:00.000Z",
        })
      );
    });
  });
});
