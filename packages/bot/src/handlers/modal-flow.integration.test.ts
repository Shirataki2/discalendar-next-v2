import type {
  ChatInputCommandInteraction,
  GuildMember,
  ModalSubmitInteraction,
} from "discord.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ── External boundary mocks (services + logger only) ──
const mockCreateEvent = vi.fn();
const mockUpdateEvent = vi.fn();
const mockGetEventById = vi.fn();
const mockGetGuildConfig = vi.fn();
const mockFindEventByName = vi.fn();
const mockGetEventsByGuildId = vi.fn();

vi.mock("../services/event-service.js", () => ({
  createEvent: (...args: unknown[]) => mockCreateEvent(...args),
  updateEvent: (...args: unknown[]) => mockUpdateEvent(...args),
  getEventById: (...args: unknown[]) => mockGetEventById(...args),
  getEventsByGuildId: (...args: unknown[]) => mockGetEventsByGuildId(...args),
}));

vi.mock("../services/guild-service.js", () => ({
  getGuildConfig: (...args: unknown[]) => mockGetGuildConfig(...args),
}));

vi.mock("../services/attendee-service.js", () => ({
  findEventByName: (...args: unknown[]) => mockFindEventByName(...args),
}));

vi.mock("../utils/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// ── real internal modules (not mocked) ──
import type { EventRecord } from "../types/event.js";

function makeEvent(overrides: Partial<EventRecord> = {}): EventRecord {
  return {
    id: "550e8400-e29b-41d4-a716-446655440000",
    guild_id: "guild-1",
    name: "統合テストイベント",
    description: "統合テスト用の説明",
    color: "#3e44f7",
    is_all_day: false,
    // JST 2026-03-29 15:00 → UTC 2026-03-29 06:00
    start_at: "2026-03-29T06:00:00.000Z",
    // JST 2026-03-29 17:00 → UTC 2026-03-29 08:00
    end_at: "2026-03-29T08:00:00.000Z",
    location: null,
    channel_id: null,
    channel_name: null,
    notifications: [],
    created_at: "2026-03-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z",
    ...overrides,
  };
}

function makeCommandInteraction(options: {
  guildId?: string;
  member?: GuildMember | null;
  strings?: Record<string, string | null>;
  integers?: Record<string, number | null>;
  booleans?: Record<string, boolean | null>;
}) {
  const strings = options.strings ?? {};
  const integers = options.integers ?? {};
  const booleans = options.booleans ?? {};

  return {
    guild: options.guildId ? { id: options.guildId } : null,
    member: options.member ?? null,
    options: {
      getString: (name: string, required?: boolean) => {
        const val = strings[name] ?? null;
        if (required && val === null) {
          throw new Error(`Missing required option: ${name}`);
        }
        return val;
      },
      getInteger: (name: string, required?: boolean) => {
        const val = integers[name] ?? null;
        if (required && val === null) {
          throw new Error(`Missing required option: ${name}`);
        }
        return val;
      },
      getBoolean: (name: string) => booleans[name] ?? null,
    },
    reply: vi.fn(),
    deferReply: vi.fn(),
    editReply: vi.fn(),
    showModal: vi.fn(),
  } as unknown as ChatInputCommandInteraction & {
    reply: ReturnType<typeof vi.fn>;
    showModal: ReturnType<typeof vi.fn>;
    deferReply: ReturnType<typeof vi.fn>;
    editReply: ReturnType<typeof vi.fn>;
  };
}

function makeModalSubmitInteraction(options: {
  customId: string;
  guildId?: string;
  member?: GuildMember | null;
  fields: Record<string, string>;
}) {
  return {
    customId: options.customId,
    guild: options.guildId ? { id: options.guildId } : null,
    member: options.member ?? null,
    replied: false,
    deferred: false,
    fields: {
      getTextInputValue: (id: string) => options.fields[id] ?? "",
    },
    reply: vi.fn(),
    deferReply: vi.fn(),
    editReply: vi.fn(),
    deleteReply: vi.fn(),
    followUp: vi.fn(),
  } as unknown as ModalSubmitInteraction & {
    reply: ReturnType<typeof vi.fn>;
    deferReply: ReturnType<typeof vi.fn>;
    editReply: ReturnType<typeof vi.fn>;
    deleteReply: ReturnType<typeof vi.fn>;
  };
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mockGetGuildConfig.mockResolvedValue({
    success: true,
    data: { restricted: false },
  });
  mockGetEventsByGuildId.mockResolvedValue({ success: true, data: [] });
});

describe("結合テスト: /create モーダルフロー", () => {
  it("/create（オプションなし）→ モーダル表示 → Submit → イベント作成 → Embed返信", async () => {
    const createdEvent = makeEvent({ name: "春の集会" });
    mockCreateEvent.mockResolvedValue({ success: true, data: createdEvent });

    // Step 1: /create コマンド実行（name未指定）→ モーダル表示
    const cmdInteraction = makeCommandInteraction({
      guildId: "guild-1",
      strings: {},
    });

    const createCommand = (await import("../commands/create.js")).default;
    await createCommand.execute(cmdInteraction);

    expect(cmdInteraction.showModal).toHaveBeenCalledTimes(1);
    expect(cmdInteraction.reply).not.toHaveBeenCalled();

    // モーダルの構造を検証
    const modal = cmdInteraction.showModal.mock.calls[0][0];
    expect(modal.data.custom_id).toBe("event-create");
    expect(modal.data.title).toBe("イベント作成");
    const modalJson = modal.toJSON();
    expect(modalJson.components).toHaveLength(5);

    // Step 2: ModalSubmit → バリデーション → イベント作成 → Embed返信
    const submitInteraction = makeModalSubmitInteraction({
      customId: "event-create",
      guildId: "guild-1",
      fields: {
        "event-title": "春の集会",
        "event-description": "桜の下で集まろう",
        "event-start-at": "2026/03/29 15:00",
        "event-end-at": "2026/03/29 17:00",
        "event-is-all-day": "",
      },
    });

    const { handleModalSubmit } = await import("./modal-submit.js");
    await handleModalSubmit(submitInteraction);

    // createEvent が正しいデータで呼ばれたか
    expect(mockCreateEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        guild_id: "guild-1",
        name: "春の集会",
        description: "桜の下で集まろう",
        start_at: "2026-03-29T06:00:00.000Z",
        end_at: "2026-03-29T08:00:00.000Z",
        is_all_day: false,
      })
    );

    // 成功レスポンス（Embed付き）
    expect(submitInteraction.followUp).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "正常に予定を作成しました",
        embeds: expect.arrayContaining([expect.any(Object)]),
      })
    );
  });

  it("モーダル送信でバリデーションエラー → エフェメラルエラー", async () => {
    const submitInteraction = makeModalSubmitInteraction({
      customId: "event-create",
      guildId: "guild-1",
      fields: {
        "event-title": "テスト",
        "event-description": "",
        "event-start-at": "2026/03/29 17:00",
        "event-end-at": "2026/03/29 15:00",
        "event-is-all-day": "",
      },
    });

    const { handleModalSubmit } = await import("./modal-submit.js");
    await handleModalSubmit(submitInteraction);

    expect(submitInteraction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "開始時間が終了時間以降になっています",
      })
    );
    expect(mockCreateEvent).not.toHaveBeenCalled();
  });

  it("Supabase保存失敗 → エフェメラルエラー", async () => {
    mockCreateEvent.mockResolvedValue({
      success: false,
      error: { code: "CREATE_FAILED", message: "DB error" },
    });

    const submitInteraction = makeModalSubmitInteraction({
      customId: "event-create",
      guildId: "guild-1",
      fields: {
        "event-title": "テスト",
        "event-description": "",
        "event-start-at": "2026/03/29 15:00",
        "event-end-at": "2026/03/29 17:00",
        "event-is-all-day": "",
      },
    });

    const { handleModalSubmit } = await import("./modal-submit.js");
    await handleModalSubmit(submitInteraction);

    expect(submitInteraction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "予定の作成に失敗しました",
      })
    );
  });
});

describe("結合テスト: /edit モーダルフロー", () => {
  it("/edit（編集オプションなし）→ イベント検索 → モーダル表示（プリフィル）→ Submit → 更新 → Embed返信", async () => {
    const existingEvent = makeEvent({
      id: "660e8400-e29b-41d4-b716-446655440001",
      name: "既存イベント",
      description: "既存の説明",
    });
    mockFindEventByName.mockResolvedValue({
      success: true,
      data: existingEvent,
    });

    // Step 1: /edit コマンド実行（編集オプションなし）→ モーダル表示
    const cmdInteraction = makeCommandInteraction({
      guildId: "guild-1",
      strings: { event: "既存イベント" },
    });

    const editCommand = (await import("../commands/edit.js")).default;
    await editCommand.execute(cmdInteraction);

    expect(cmdInteraction.showModal).toHaveBeenCalledTimes(1);
    expect(cmdInteraction.deferReply).not.toHaveBeenCalled();

    // モーダルの構造とプリフィル値を検証
    const modal = cmdInteraction.showModal.mock.calls[0][0];
    expect(modal.data.custom_id).toBe(`event-edit:${existingEvent.id}`);
    expect(modal.data.title).toBe("イベント編集");
    const modalJson = modal.toJSON();
    expect(modalJson.components).toHaveLength(5);

    // タイトルフィールドのプリフィル値を検証
    const titleRow = modalJson.components[0];
    expect(titleRow.components[0].value).toBe("既存イベント");

    // 説明フィールドのプリフィル値を検証
    const descRow = modalJson.components[1];
    expect(descRow.components[0].value).toBe("既存の説明");

    // Step 2: ModalSubmit → 更新
    const updatedEvent = makeEvent({
      id: "660e8400-e29b-41d4-b716-446655440001",
      name: "更新後イベント",
      description: "更新後の説明",
    });
    mockGetEventById.mockResolvedValue({ success: true, data: existingEvent });
    mockUpdateEvent.mockResolvedValue({ success: true, data: updatedEvent });

    const submitInteraction = makeModalSubmitInteraction({
      customId: `event-edit:${existingEvent.id}`,
      guildId: "guild-1",
      fields: {
        "event-title": "更新後イベント",
        "event-description": "更新後の説明",
        "event-start-at": "2026/03/29 15:00",
        "event-end-at": "2026/03/29 17:00",
        "event-is-all-day": "",
      },
    });

    const { handleModalSubmit } = await import("./modal-submit.js");
    await handleModalSubmit(submitInteraction);

    expect(mockGetEventById).toHaveBeenCalledWith(
      "660e8400-e29b-41d4-b716-446655440001",
      "guild-1"
    );
    expect(mockUpdateEvent).toHaveBeenCalledWith(
      "660e8400-e29b-41d4-b716-446655440001",
      "guild-1",
      expect.objectContaining({
        name: "更新後イベント",
        description: "更新後の説明",
      })
    );
    expect(submitInteraction.followUp).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "正常に予定を更新しました",
        embeds: expect.arrayContaining([expect.any(Object)]),
      })
    );
  });

  it("イベント未発見時にエフェメラルエラーを返す", async () => {
    mockFindEventByName.mockResolvedValue({ success: true, data: null });

    const cmdInteraction = makeCommandInteraction({
      guildId: "guild-1",
      strings: { event: "存在しないイベント" },
    });

    const editCommand = (await import("../commands/edit.js")).default;
    await editCommand.execute(cmdInteraction);

    expect(cmdInteraction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("見つかりません"),
      })
    );
    expect(cmdInteraction.showModal).not.toHaveBeenCalled();
  });

  it("編集Submit時にイベントが削除されていた場合エフェメラルエラーを返す", async () => {
    mockGetEventById.mockResolvedValue({ success: true, data: null });

    const submitInteraction = makeModalSubmitInteraction({
      customId: "event-edit:770e8400-e29b-41d4-8716-446655440002",
      guildId: "guild-1",
      fields: {
        "event-title": "テスト",
        "event-description": "",
        "event-start-at": "2026/03/29 15:00",
        "event-end-at": "2026/03/29 17:00",
        "event-is-all-day": "",
      },
    });

    const { handleModalSubmit } = await import("./modal-submit.js");
    await handleModalSubmit(submitInteraction);

    expect(submitInteraction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("見つかりません"),
      })
    );
    expect(mockUpdateEvent).not.toHaveBeenCalled();
  });
});

describe("結合テスト: 後方互換性（スラッシュオプション版）", () => {
  it("/create 全オプション指定で従来フローが動作する", async () => {
    const createdEvent = makeEvent({ name: "インラインイベント" });
    mockCreateEvent.mockResolvedValue({ success: true, data: createdEvent });

    const cmdInteraction = makeCommandInteraction({
      guildId: "guild-1",
      strings: { name: "インラインイベント" },
      integers: {
        start_year: 2026,
        start_month: 3,
        start_day: 29,
        start_hour: 15,
        start_minute: 0,
        end_year: 2026,
        end_month: 3,
        end_day: 29,
        end_hour: 17,
        end_minute: 0,
      },
    });

    const createCommand = (await import("../commands/create.js")).default;
    await createCommand.execute(cmdInteraction);

    // モーダルではなく直接作成
    expect(cmdInteraction.showModal).not.toHaveBeenCalled();
    expect(mockCreateEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        guild_id: "guild-1",
        name: "インラインイベント",
        start_at: "2026-03-29T06:00:00.000Z",
        end_at: "2026-03-29T08:00:00.000Z",
      })
    );
    expect(cmdInteraction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "正常に予定を作成しました",
        embeds: expect.arrayContaining([expect.any(Object)]),
      })
    );
  });

  it("/edit 編集オプション指定で従来のinlineフローが動作する", async () => {
    const existingEvent = makeEvent();
    mockFindEventByName.mockResolvedValue({
      success: true,
      data: existingEvent,
    });
    const updatedEvent = makeEvent({ name: "インライン更新" });
    mockUpdateEvent.mockResolvedValue({ success: true, data: updatedEvent });

    const cmdInteraction = makeCommandInteraction({
      guildId: "guild-1",
      strings: { event: "統合テスト", name: "インライン更新" },
    });

    const editCommand = (await import("../commands/edit.js")).default;
    await editCommand.execute(cmdInteraction);

    // モーダルではなくinline処理
    expect(cmdInteraction.showModal).not.toHaveBeenCalled();
    expect(cmdInteraction.deferReply).toHaveBeenCalled();
    expect(mockUpdateEvent).toHaveBeenCalledWith(
      existingEvent.id,
      "guild-1",
      expect.objectContaining({ name: "インライン更新" })
    );
    expect(cmdInteraction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "正常に予定を更新しました",
      })
    );
  });
});

describe("結合テスト: 権限チェック（restricted guild）", () => {
  const memberNoPermission = {
    permissions: { has: () => false },
  } as unknown as GuildMember;

  const memberWithPermission = {
    permissions: { has: () => true },
  } as unknown as GuildMember;

  beforeEach(() => {
    mockGetGuildConfig.mockResolvedValue({
      success: true,
      data: { guild_id: "guild-1", restricted: true },
    });
  });

  it("/create モーダル表示前に権限不足でエフェメラルエラー", async () => {
    const cmdInteraction = makeCommandInteraction({
      guildId: "guild-1",
      member: memberNoPermission,
      strings: {},
    });

    const createCommand = (await import("../commands/create.js")).default;
    await createCommand.execute(cmdInteraction);

    expect(cmdInteraction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("権限"),
      })
    );
    expect(cmdInteraction.showModal).not.toHaveBeenCalled();
  });

  it("/edit モーダル表示前に権限不足でエフェメラルエラー", async () => {
    const cmdInteraction = makeCommandInteraction({
      guildId: "guild-1",
      member: memberNoPermission,
      strings: { event: "テスト" },
    });

    const editCommand = (await import("../commands/edit.js")).default;
    await editCommand.execute(cmdInteraction);

    expect(cmdInteraction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("権限"),
      })
    );
    expect(cmdInteraction.showModal).not.toHaveBeenCalled();
  });

  it("ModalSubmit 時に権限不足でエフェメラルエラー", async () => {
    const submitInteraction = makeModalSubmitInteraction({
      customId: "event-create",
      guildId: "guild-1",
      member: memberNoPermission,
      fields: {
        "event-title": "テスト",
        "event-description": "",
        "event-start-at": "2026/03/29 15:00",
        "event-end-at": "2026/03/29 17:00",
        "event-is-all-day": "",
      },
    });

    const { handleModalSubmit } = await import("./modal-submit.js");
    await handleModalSubmit(submitInteraction);

    expect(submitInteraction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining("権限"),
      })
    );
    expect(mockCreateEvent).not.toHaveBeenCalled();
  });

  it("権限ありの場合はモーダル表示 → Submit成功の全フローが通る", async () => {
    const createdEvent = makeEvent({ name: "権限OK" });
    mockCreateEvent.mockResolvedValue({ success: true, data: createdEvent });

    // Step 1: コマンド → モーダル表示
    const cmdInteraction = makeCommandInteraction({
      guildId: "guild-1",
      member: memberWithPermission,
      strings: {},
    });

    const createCommand = (await import("../commands/create.js")).default;
    await createCommand.execute(cmdInteraction);

    expect(cmdInteraction.showModal).toHaveBeenCalledTimes(1);

    // Step 2: Submit → 作成成功
    const submitInteraction = makeModalSubmitInteraction({
      customId: "event-create",
      guildId: "guild-1",
      member: memberWithPermission,
      fields: {
        "event-title": "権限OK",
        "event-description": "",
        "event-start-at": "2026/03/29 15:00",
        "event-end-at": "2026/03/29 17:00",
        "event-is-all-day": "",
      },
    });

    const { handleModalSubmit } = await import("./modal-submit.js");
    await handleModalSubmit(submitInteraction);

    expect(mockCreateEvent).toHaveBeenCalled();
    expect(submitInteraction.followUp).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "正常に予定を作成しました",
        embeds: expect.arrayContaining([expect.any(Object)]),
      })
    );
  });
});
