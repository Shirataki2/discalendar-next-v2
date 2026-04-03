import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs", () => ({
  writeFileSync: vi.fn(),
}));

vi.mock("../services/health-service.js", () => ({
  upsertHeartbeat: vi.fn(),
}));

vi.mock("../utils/logger.js", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

const { startHeartbeatTask } = await import("./heartbeat.js");
const { upsertHeartbeat } = await import("../services/health-service.js");
const { writeFileSync } = await import("node:fs");

const mockUpsertHeartbeat = vi.mocked(upsertHeartbeat);
const mockWriteFileSync = vi.mocked(writeFileSync);

function createMockClient(guildCount = 3, wsPing = 50) {
  return {
    guilds: { cache: { size: guildCount } },
    ws: { ping: wsPing },
  } as unknown as import("discord.js").Client;
}

describe("heartbeat task", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockUpsertHeartbeat.mockResolvedValue({ success: true, data: undefined });
    mockWriteFileSync.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("calls upsertHeartbeat with client metrics on interval", async () => {
    const client = createMockClient(10, 45);
    const timer = startHeartbeatTask(client);

    vi.advanceTimersByTime(60_000);
    await vi.runOnlyPendingTimersAsync();

    expect(mockUpsertHeartbeat).toHaveBeenCalledWith({
      guildCount: 10,
      wsPing: 45,
    });

    clearInterval(timer);
  });

  it("writes sentinel file on success", async () => {
    const client = createMockClient();
    const timer = startHeartbeatTask(client);

    vi.advanceTimersByTime(60_000);
    await vi.runOnlyPendingTimersAsync();

    expect(mockWriteFileSync).toHaveBeenCalledWith(
      "/tmp/bot-healthy",
      expect.any(String)
    );

    clearInterval(timer);
  });

  it("logs error when sentinel file write fails", async () => {
    const { logger } = await import("../utils/logger.js");
    const mockLogger = vi.mocked(logger);
    mockWriteFileSync.mockImplementation(() => {
      throw new Error("EACCES");
    });

    const client = createMockClient();
    const timer = startHeartbeatTask(client);

    vi.advanceTimersByTime(60_000);
    await vi.runOnlyPendingTimersAsync();

    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.objectContaining({ guildCount: 3, wsPing: 50 }),
      "Heartbeat sent"
    );
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(Error) }),
      "Failed to write heartbeat sentinel file"
    );

    clearInterval(timer);
  });

  it("does not write sentinel file on failure", async () => {
    mockUpsertHeartbeat.mockResolvedValue({
      success: false,
      error: { code: "UPSERT_FAILED", message: "db error" },
    });

    const client = createMockClient();
    const timer = startHeartbeatTask(client);

    vi.advanceTimersByTime(60_000);
    await vi.runOnlyPendingTimersAsync();

    expect(mockWriteFileSync).not.toHaveBeenCalled();

    clearInterval(timer);
  });
});
