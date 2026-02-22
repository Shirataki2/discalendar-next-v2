import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock posthog-js before importing modules
vi.mock("posthog-js", () => {
  const mockPostHog = {
    __loaded: true,
    capture: vi.fn(),
    init: vi.fn(),
  };
  return { default: mockPostHog };
});

describe("Analytics Events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("trackEvent", () => {
    it("should call posthog.capture with correct event name and properties", async () => {
      const posthog = await import("posthog-js");
      const { trackEvent } = await import("@/lib/analytics/events");

      trackEvent("event_created", {
        is_all_day: true,
        color: "#3b82f6",
        has_notifications: false,
      });

      expect(posthog.default.capture).toHaveBeenCalledWith("event_created", {
        is_all_day: true,
        color: "#3b82f6",
        has_notifications: false,
      });
    });

    it("should call posthog.capture for event_deleted with empty properties", async () => {
      const posthog = await import("posthog-js");
      const { trackEvent } = await import("@/lib/analytics/events");

      trackEvent("event_deleted", {} as Record<string, never>);

      expect(posthog.default.capture).toHaveBeenCalledWith("event_deleted", {});
    });

    it("should call posthog.capture for guild_switched with guild_id", async () => {
      const posthog = await import("posthog-js");
      const { trackEvent } = await import("@/lib/analytics/events");

      trackEvent("guild_switched", { guild_id: "123456789" });

      expect(posthog.default.capture).toHaveBeenCalledWith("guild_switched", {
        guild_id: "123456789",
      });
    });

    it("should call posthog.capture for view_changed with view_type", async () => {
      const posthog = await import("posthog-js");
      const { trackEvent } = await import("@/lib/analytics/events");

      trackEvent("view_changed", { view_type: "week" });

      expect(posthog.default.capture).toHaveBeenCalledWith("view_changed", {
        view_type: "week",
      });
    });

    it("should call posthog.capture for calendar_navigated with direction", async () => {
      const posthog = await import("posthog-js");
      const { trackEvent } = await import("@/lib/analytics/events");

      trackEvent("calendar_navigated", { direction: "next" });

      expect(posthog.default.capture).toHaveBeenCalledWith(
        "calendar_navigated",
        { direction: "next" }
      );
    });

    it("should not throw when PostHog is not loaded", async () => {
      const posthog = await import("posthog-js");
      // Simulate unloaded state
      Object.defineProperty(posthog.default, "__loaded", { value: false });

      const { trackEvent } = await import("@/lib/analytics/events");

      expect(() => {
        trackEvent("event_created", {
          is_all_day: false,
          color: "#ef4444",
          has_notifications: true,
        });
      }).not.toThrow();

      // Restore
      Object.defineProperty(posthog.default, "__loaded", { value: true });
    });
  });

  describe("getChangedEventFields", () => {
    it("should detect changed string fields", async () => {
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

    it("should detect changed boolean fields", async () => {
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

    it("should detect changed date fields", async () => {
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

    it("should detect changed notifications", async () => {
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

    it("should return empty array when nothing changed", async () => {
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

    it("should handle partial initial data (create mode)", async () => {
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
      // Fields that exist in updated but not in initial should be counted as changed
      expect(changed).toContain("title");
      expect(changed).toContain("color");
      expect(changed).not.toContain("startAt");
      expect(changed).not.toContain("endAt");
    });
  });

  describe("mapNavigationDirection", () => {
    it('should map PREV to "prev"', async () => {
      const { mapNavigationDirection } = await import("@/lib/analytics/events");
      expect(mapNavigationDirection("PREV")).toBe("prev");
    });

    it('should map NEXT to "next"', async () => {
      const { mapNavigationDirection } = await import("@/lib/analytics/events");
      expect(mapNavigationDirection("NEXT")).toBe("next");
    });

    it('should map TODAY to "today"', async () => {
      const { mapNavigationDirection } = await import("@/lib/analytics/events");
      expect(mapNavigationDirection("TODAY")).toBe("today");
    });
  });
});
