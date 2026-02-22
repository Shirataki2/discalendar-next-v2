import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// posthog-jsのモック
const mockCapture = vi.fn();
vi.mock("posthog-js", () => {
  const posthog = {
    init: vi.fn(),
    capture: mockCapture,
    __loaded: false,
  };
  return { default: posthog };
});

describe("trackEvent", () => {
  beforeEach(() => {
    vi.resetModules();
    mockCapture.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("event_created を正しいプロパティでキャプチャする", async () => {
    const posthog = (await import("posthog-js")).default;
    Object.defineProperty(posthog, "__loaded", { value: true, writable: true });

    const { trackEvent } = await import("./events");
    trackEvent("event_created", {
      is_all_day: true,
      color: "blue",
      has_notifications: false,
    });

    expect(mockCapture).toHaveBeenCalledWith("event_created", {
      is_all_day: true,
      color: "blue",
      has_notifications: false,
    });
  });

  it("event_updated を変更フィールド情報付きでキャプチャする", async () => {
    const posthog = (await import("posthog-js")).default;
    Object.defineProperty(posthog, "__loaded", { value: true, writable: true });

    const { trackEvent } = await import("./events");
    trackEvent("event_updated", {
      changed_fields: ["title", "start_time"],
    });

    expect(mockCapture).toHaveBeenCalledWith("event_updated", {
      changed_fields: ["title", "start_time"],
    });
  });

  it("event_deleted をプロパティなしでキャプチャする", async () => {
    const posthog = (await import("posthog-js")).default;
    Object.defineProperty(posthog, "__loaded", { value: true, writable: true });

    const { trackEvent } = await import("./events");
    trackEvent("event_deleted", {});

    expect(mockCapture).toHaveBeenCalledWith("event_deleted", {});
  });

  it("event_moved をメソッド情報付きでキャプチャする", async () => {
    const posthog = (await import("posthog-js")).default;
    Object.defineProperty(posthog, "__loaded", { value: true, writable: true });

    const { trackEvent } = await import("./events");
    trackEvent("event_moved", { method: "drag_and_drop" });

    expect(mockCapture).toHaveBeenCalledWith("event_moved", {
      method: "drag_and_drop",
    });
  });

  it("event_resized をプロパティなしでキャプチャする", async () => {
    const posthog = (await import("posthog-js")).default;
    Object.defineProperty(posthog, "__loaded", { value: true, writable: true });

    const { trackEvent } = await import("./events");
    trackEvent("event_resized", {});

    expect(mockCapture).toHaveBeenCalledWith("event_resized", {});
  });

  it("guild_switched をギルドID付きでキャプチャする", async () => {
    const posthog = (await import("posthog-js")).default;
    Object.defineProperty(posthog, "__loaded", { value: true, writable: true });

    const { trackEvent } = await import("./events");
    trackEvent("guild_switched", { guild_id: "guild_123" });

    expect(mockCapture).toHaveBeenCalledWith("guild_switched", {
      guild_id: "guild_123",
    });
  });

  it("view_changed をビュータイプ付きでキャプチャする", async () => {
    const posthog = (await import("posthog-js")).default;
    Object.defineProperty(posthog, "__loaded", { value: true, writable: true });

    const { trackEvent } = await import("./events");
    trackEvent("view_changed", { view_type: "week" });

    expect(mockCapture).toHaveBeenCalledWith("view_changed", {
      view_type: "week",
    });
  });

  it("calendar_navigated を方向情報付きでキャプチャする", async () => {
    const posthog = (await import("posthog-js")).default;
    Object.defineProperty(posthog, "__loaded", { value: true, writable: true });

    const { trackEvent } = await import("./events");
    trackEvent("calendar_navigated", { direction: "next" });

    expect(mockCapture).toHaveBeenCalledWith("calendar_navigated", {
      direction: "next",
    });
  });

  it("PostHog SDKが未初期化の場合、エラーを投げない", async () => {
    const posthog = (await import("posthog-js")).default;
    Object.defineProperty(posthog, "__loaded", {
      value: false,
      writable: true,
    });

    const { trackEvent } = await import("./events");

    expect(() => {
      trackEvent("event_created", {
        is_all_day: false,
        color: "red",
        has_notifications: true,
      });
    }).not.toThrow();

    expect(mockCapture).not.toHaveBeenCalled();
  });

  it("PostHog SDKが未初期化の場合、captureを呼び出さない", async () => {
    const posthog = (await import("posthog-js")).default;
    Object.defineProperty(posthog, "__loaded", {
      value: false,
      writable: true,
    });

    const { trackEvent } = await import("./events");
    trackEvent("guild_switched", { guild_id: "guild_456" });

    expect(mockCapture).not.toHaveBeenCalled();
  });
});
