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
