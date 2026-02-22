import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// posthog-jsのモック
const mockCapture = vi.fn();
const mockGetDistinctId = vi.fn();
vi.mock("posthog-js", () => {
  const posthog = {
    init: vi.fn(),
    capture: mockCapture,
    get_distinct_id: mockGetDistinctId,
  };
  return { default: posthog };
});

describe("trackEvent", () => {
  beforeEach(() => {
    vi.resetModules();
    mockCapture.mockClear();
    mockGetDistinctId.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("event_created を正しいプロパティでキャプチャする", async () => {
    mockGetDistinctId.mockReturnValue("test-id");

    const { trackEvent } = await import("@/lib/analytics/events");
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
    mockGetDistinctId.mockReturnValue("test-id");

    const { trackEvent } = await import("@/lib/analytics/events");
    trackEvent("event_updated", {
      changed_fields: ["title", "start_time"],
    });

    expect(mockCapture).toHaveBeenCalledWith("event_updated", {
      changed_fields: ["title", "start_time"],
    });
  });

  it("event_deleted をプロパティなしでキャプチャする", async () => {
    mockGetDistinctId.mockReturnValue("test-id");

    const { trackEvent } = await import("@/lib/analytics/events");
    trackEvent("event_deleted", {});

    expect(mockCapture).toHaveBeenCalledWith("event_deleted", {});
  });

  it("event_moved をメソッド情報付きでキャプチャする", async () => {
    mockGetDistinctId.mockReturnValue("test-id");

    const { trackEvent } = await import("@/lib/analytics/events");
    trackEvent("event_moved", { method: "drag_and_drop" });

    expect(mockCapture).toHaveBeenCalledWith("event_moved", {
      method: "drag_and_drop",
    });
  });

  it("event_resized をプロパティなしでキャプチャする", async () => {
    mockGetDistinctId.mockReturnValue("test-id");

    const { trackEvent } = await import("@/lib/analytics/events");
    trackEvent("event_resized", {});

    expect(mockCapture).toHaveBeenCalledWith("event_resized", {});
  });

  it("guild_switched をギルドID付きでキャプチャする", async () => {
    mockGetDistinctId.mockReturnValue("test-id");

    const { trackEvent } = await import("@/lib/analytics/events");
    trackEvent("guild_switched", { guild_id: "guild_123" });

    expect(mockCapture).toHaveBeenCalledWith("guild_switched", {
      guild_id: "guild_123",
    });
  });

  it("view_changed をビュータイプ付きでキャプチャする", async () => {
    mockGetDistinctId.mockReturnValue("test-id");

    const { trackEvent } = await import("@/lib/analytics/events");
    trackEvent("view_changed", { view_type: "week" });

    expect(mockCapture).toHaveBeenCalledWith("view_changed", {
      view_type: "week",
    });
  });

  it("calendar_navigated を方向情報付きでキャプチャする", async () => {
    mockGetDistinctId.mockReturnValue("test-id");

    const { trackEvent } = await import("@/lib/analytics/events");
    trackEvent("calendar_navigated", { direction: "next" });

    expect(mockCapture).toHaveBeenCalledWith("calendar_navigated", {
      direction: "next",
    });
  });

  it("PostHog SDKが未初期化の場合、エラーを投げない", async () => {
    mockGetDistinctId.mockReturnValue(undefined);

    const { trackEvent } = await import("@/lib/analytics/events");

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
    mockGetDistinctId.mockReturnValue(undefined);

    const { trackEvent } = await import("@/lib/analytics/events");
    trackEvent("guild_switched", { guild_id: "guild_456" });

    expect(mockCapture).not.toHaveBeenCalled();
  });
});

describe("getChangedEventFields", () => {
  it("変更された文字列フィールドを検出する", async () => {
    const { getChangedEventFields } = await import("@/lib/analytics/events");

    const initial = {
      title: "Meeting",
      description: "Old desc",
      color: "#3b82f6",
      location: "",
      isAllDay: false,
      startAt: new Date("2026-01-01T10:00:00"),
      endAt: new Date("2026-01-01T11:00:00"),
      notifications: [] as Array<{ type: string; minutes: number }>,
    };

    const updated = {
      ...initial,
      title: "Updated Meeting",
      color: "#ef4444",
    };

    const changed = getChangedEventFields(initial, updated);
    expect(changed).toContain("title");
    expect(changed).toContain("color");
    expect(changed).not.toContain("description");
    expect(changed).not.toContain("isAllDay");
  });

  it("変更されたbooleanフィールドを検出する", async () => {
    const { getChangedEventFields } = await import("@/lib/analytics/events");

    const initial = {
      title: "Meeting",
      description: "",
      color: "#3b82f6",
      location: "",
      isAllDay: false,
      startAt: new Date("2026-01-01T10:00:00"),
      endAt: new Date("2026-01-01T11:00:00"),
      notifications: [] as Array<{ type: string; minutes: number }>,
    };

    const updated = {
      ...initial,
      isAllDay: true,
    };

    const changed = getChangedEventFields(initial, updated);
    expect(changed).toContain("isAllDay");
    expect(changed).toHaveLength(1);
  });

  it("変更されたDateフィールドを検出する", async () => {
    const { getChangedEventFields } = await import("@/lib/analytics/events");

    const initial = {
      title: "Meeting",
      description: "",
      color: "#3b82f6",
      location: "",
      isAllDay: false,
      startAt: new Date("2026-01-01T10:00:00"),
      endAt: new Date("2026-01-01T11:00:00"),
      notifications: [] as Array<{ type: string; minutes: number }>,
    };

    const updated = {
      ...initial,
      startAt: new Date("2026-01-02T10:00:00"),
      endAt: new Date("2026-01-02T11:00:00"),
    };

    const changed = getChangedEventFields(initial, updated);
    expect(changed).toContain("startAt");
    expect(changed).toContain("endAt");
    expect(changed).not.toContain("title");
  });

  it("変更された通知を検出する", async () => {
    const { getChangedEventFields } = await import("@/lib/analytics/events");

    const initial = {
      title: "Meeting",
      description: "",
      color: "#3b82f6",
      location: "",
      isAllDay: false,
      startAt: new Date("2026-01-01T10:00:00"),
      endAt: new Date("2026-01-01T11:00:00"),
      notifications: [] as Array<{ type: string; minutes: number }>,
    };

    const updated = {
      ...initial,
      notifications: [{ type: "push" as const, minutes: 10 }],
    };

    const changed = getChangedEventFields(initial, updated);
    expect(changed).toContain("notifications");
  });

  it("変更がない場合は空配列を返す", async () => {
    const { getChangedEventFields } = await import("@/lib/analytics/events");

    const initial = {
      title: "Meeting",
      description: "",
      color: "#3b82f6",
      location: "",
      isAllDay: false,
      startAt: new Date("2026-01-01T10:00:00"),
      endAt: new Date("2026-01-01T11:00:00"),
      notifications: [] as Array<{ type: string; minutes: number }>,
    };

    const changed = getChangedEventFields(initial, { ...initial });
    expect(changed).toHaveLength(0);
  });

  it("部分的な初期データを処理する（作成モード）", async () => {
    const { getChangedEventFields } = await import("@/lib/analytics/events");

    const initial = {
      startAt: new Date("2026-01-01T10:00:00"),
      endAt: new Date("2026-01-01T11:00:00"),
    };

    const updated = {
      title: "New Event",
      description: "",
      color: "#3b82f6",
      location: "",
      isAllDay: false,
      startAt: new Date("2026-01-01T10:00:00"),
      endAt: new Date("2026-01-01T11:00:00"),
      notifications: [] as Array<{ type: string; minutes: number }>,
    };

    const changed = getChangedEventFields(initial, updated);
    expect(changed).toContain("title");
    expect(changed).toContain("color");
    expect(changed).not.toContain("startAt");
    expect(changed).not.toContain("endAt");
  });
});

describe("mapNavigationDirection", () => {
  it('PREVを"prev"にマッピングする', async () => {
    const { mapNavigationDirection } = await import("@/lib/analytics/events");
    expect(mapNavigationDirection("PREV")).toBe("prev");
  });

  it('NEXTを"next"にマッピングする', async () => {
    const { mapNavigationDirection } = await import("@/lib/analytics/events");
    expect(mapNavigationDirection("NEXT")).toBe("next");
  });

  it('TODAYを"today"にマッピングする', async () => {
    const { mapNavigationDirection } = await import("@/lib/analytics/events");
    expect(mapNavigationDirection("TODAY")).toBe("today");
  });
});
