import type { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";

const mockCaptureError = vi.fn();

vi.mock("./utils/sentry.js", () => ({
  captureError: (...args: unknown[]) => mockCaptureError(...args),
}));

vi.mock("./utils/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("./events/guild.js", () => ({
  onGuildCreate: vi.fn(),
  onGuildDelete: vi.fn(),
  onGuildUpdate: vi.fn(),
}));

vi.mock("./handlers/modal-submit.js", () => ({
  handleModalSubmit: vi.fn(),
}));

vi.mock("./config.js", () => ({
  getConfig: vi.fn(() => ({
    botToken: "test-token",
    applicationId: "test-app-id",
    supabaseUrl: "http://localhost",
    supabaseServiceKey: "test-key",
    invitationUrl: "",
    supportServerUrl: "",
    logLevel: "info",
    sentryDsn: undefined,
    devGuildId: "dev-guild",
  })),
}));

/**
 * DiscalendarBot は discord.js Client を継承しており、
 * setup() が REST API を呼び出すため、テストではイベントハンドラのみを
 * 登録した軽量なインスタンスを作成する。
 */
async function createBotForEventTests() {
  const { DiscalendarBot } = await import("./bot.js");
  const bot = new DiscalendarBot();
  // loadCommands + registerEventHandlers のみ実行（registerSlashCommands をスキップ）
  // EventEmitter の listeners でハンドラの登録を確認
  // setup() の代わりに prototype のメソッドを直接呼ぶ
  type BotInternal = DiscalendarBot & {
    loadCommands(): void;
    registerEventHandlers(): void;
  };
  (bot as BotInternal).loadCommands();
  (bot as BotInternal).registerEventHandlers();
  return bot;
}

describe("DiscalendarBot error capture", () => {
  it("should call captureError when command execution fails", async () => {
    mockCaptureError.mockClear();

    const bot = await createBotForEventTests();
    bot.commands.set("fail-cmd", {
      data: { name: "fail-cmd", toJSON: () => ({}) },
      execute: vi.fn().mockRejectedValue(new Error("command fail")),
    });

    const mockInteraction = {
      isChatInputCommand: () => true,
      isModalSubmit: () => false,
      commandName: "fail-cmd",
      guildId: "guild-123",
      user: { id: "user-456" },
      replied: false,
      deferred: false,
      reply: vi.fn(),
    };

    const listeners = (bot as EventEmitter).listeners("interactionCreate");
    await listeners[0](mockInteraction);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockCaptureError).toHaveBeenCalledWith(expect.any(Error), {
      source: "command",
      name: "fail-cmd",
      guildId: "guild-123",
      userId: "user-456",
    });
  });

  it("should call captureError when modal submit fails", async () => {
    mockCaptureError.mockClear();

    const { handleModalSubmit } = await import("./handlers/modal-submit.js");
    vi.mocked(handleModalSubmit).mockRejectedValue(new Error("modal fail"));

    const bot = await createBotForEventTests();

    const mockInteraction = {
      isChatInputCommand: () => false,
      isModalSubmit: () => true,
      guildId: "guild-789",
      user: { id: "user-101" },
      replied: false,
      deferred: false,
      reply: vi.fn(),
    };

    const listeners = (bot as EventEmitter).listeners("interactionCreate");
    await listeners[0](mockInteraction);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockCaptureError).toHaveBeenCalledWith(expect.any(Error), {
      source: "modal",
      guildId: "guild-789",
      userId: "user-101",
    });
  });

  it("should call captureError when guildCreate handler fails", async () => {
    mockCaptureError.mockClear();

    const { onGuildCreate } = await import("./events/guild.js");
    vi.mocked(onGuildCreate).mockRejectedValue(new Error("guild fail"));

    const bot = await createBotForEventTests();

    const mockGuild = { id: "guild-999", name: "Test Guild" };
    const listeners = (bot as EventEmitter).listeners("guildCreate");
    await listeners[0](mockGuild);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockCaptureError).toHaveBeenCalledWith(expect.any(Error), {
      source: "event",
      name: "guildCreate",
      guildId: "guild-999",
    });
  });

  it("should still reply with error message after captureError", async () => {
    mockCaptureError.mockClear();

    const bot = await createBotForEventTests();
    bot.commands.set("fail-cmd", {
      data: { name: "fail-cmd", toJSON: () => ({}) },
      execute: vi.fn().mockRejectedValue(new Error("fail")),
    });

    const mockReply = vi.fn();
    const mockInteraction = {
      isChatInputCommand: () => true,
      isModalSubmit: () => false,
      commandName: "fail-cmd",
      guildId: "guild-123",
      user: { id: "user-456" },
      replied: false,
      deferred: false,
      reply: mockReply,
    };

    const listeners = (bot as EventEmitter).listeners("interactionCreate");
    await listeners[0](mockInteraction);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockReply).toHaveBeenCalledWith({
      content: "コマンドの実行中にエラーが発生しました。",
      ephemeral: true,
    });
  });
});
