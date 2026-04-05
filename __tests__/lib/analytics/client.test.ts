import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// posthog-jsのモック
const mockCapture = vi.fn();
const mockGetDistinctId = vi.fn();
const mockPeopleSet = vi.fn();
vi.mock("posthog-js", () => {
  const posthog = {
    init: vi.fn(),
    capture: mockCapture,
    get_distinct_id: mockGetDistinctId,
    people: {
      set: mockPeopleSet,
    },
  };
  return { default: posthog };
});

describe("getPostHogClient", () => {
  beforeEach(() => {
    vi.resetModules();
    mockGetDistinctId.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("PostHogが初期化済みの場合、インスタンスを返す", async () => {
    mockGetDistinctId.mockReturnValue("test-distinct-id");

    const { getPostHogClient } = await import("@/lib/analytics/client");
    const client = getPostHogClient();

    expect(client).toBeDefined();
    expect(mockGetDistinctId).toHaveBeenCalled();
  });

  it("PostHogが未初期化の場合、undefinedを返す", async () => {
    mockGetDistinctId.mockReturnValue(undefined);

    const { getPostHogClient } = await import("@/lib/analytics/client");
    const client = getPostHogClient();

    expect(client).toBeUndefined();
  });

  it("get_distinct_idが例外を投げた場合、undefinedを返す", async () => {
    mockGetDistinctId.mockImplementation(() => {
      throw new Error("PostHog not initialized");
    });

    const { getPostHogClient } = await import("@/lib/analytics/client");
    const client = getPostHogClient();

    expect(client).toBeUndefined();
  });
});

describe("setPostHogUserProperties", () => {
  beforeEach(() => {
    vi.resetModules();
    mockGetDistinctId.mockReset();
    mockPeopleSet.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("guild_count が people.set で送信される", async () => {
    mockGetDistinctId.mockReturnValue("test-distinct-id");

    const { setPostHogUserProperties } = await import("@/lib/analytics/client");
    setPostHogUserProperties({ guild_count: 5 });

    expect(mockPeopleSet).toHaveBeenCalledWith({ guild_count: 5 });
  });

  it("SDK 未初期化時にエラーがスローされない", async () => {
    mockGetDistinctId.mockReturnValue(undefined);

    const { setPostHogUserProperties } = await import("@/lib/analytics/client");

    expect(() => {
      setPostHogUserProperties({ guild_count: 3 });
    }).not.toThrow();
    expect(mockPeopleSet).not.toHaveBeenCalled();
  });
});
