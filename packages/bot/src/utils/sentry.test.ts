import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSetTag = vi.fn();
const mockSetContext = vi.fn();
const mockSetExtras = vi.fn();
const mockCaptureException = vi.fn();

vi.mock("@sentry/node", () => ({
  withScope: vi.fn((callback: (scope: unknown) => void) => {
    callback({
      setTag: mockSetTag,
      setContext: mockSetContext,
      setExtras: mockSetExtras,
    });
  }),
  captureException: mockCaptureException,
}));

describe("captureError", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should capture exception with source tag", async () => {
    const { captureError } = await import("./sentry.js");
    const error = new Error("test error");

    captureError(error, { source: "command" });

    expect(mockSetTag).toHaveBeenCalledWith("source", "command");
    expect(mockCaptureException).toHaveBeenCalledWith(error);
  });

  it("should set name tag when provided", async () => {
    const { captureError } = await import("./sentry.js");

    captureError(new Error("test"), { source: "command", name: "create" });

    expect(mockSetTag).toHaveBeenCalledWith("name", "create");
  });

  it("should set discord context with guildId and userId", async () => {
    const { captureError } = await import("./sentry.js");

    captureError(new Error("test"), {
      source: "command",
      guildId: "guild-123",
      userId: "user-456",
    });

    expect(mockSetContext).toHaveBeenCalledWith("discord", {
      guildId: "guild-123",
      userId: "user-456",
    });
  });

  it("should set extras when provided", async () => {
    const { captureError } = await import("./sentry.js");
    const extra = { key: "value", count: 42 };

    captureError(new Error("test"), { source: "event", extra });

    expect(mockSetExtras).toHaveBeenCalledWith(extra);
  });

  it("should not set optional fields when not provided", async () => {
    const { captureError } = await import("./sentry.js");

    captureError(new Error("test"), { source: "task" });

    expect(mockSetTag).toHaveBeenCalledTimes(1);
    expect(mockSetTag).toHaveBeenCalledWith("source", "task");
    expect(mockSetContext).not.toHaveBeenCalled();
    expect(mockSetExtras).not.toHaveBeenCalled();
  });
});
