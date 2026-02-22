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

describe("getPostHogClient", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("PostHogが初期化済みの場合、インスタンスを返す", async () => {
    const posthog = (await import("posthog-js")).default;
    Object.defineProperty(posthog, "__loaded", { value: true, writable: true });

    const { getPostHogClient } = await import("./client");
    const client = getPostHogClient();

    expect(client).toBe(posthog);
  });

  it("PostHogが未初期化の場合、undefinedを返す", async () => {
    const posthog = (await import("posthog-js")).default;
    Object.defineProperty(posthog, "__loaded", { value: false, writable: true });

    const { getPostHogClient } = await import("./client");
    const client = getPostHogClient();

    expect(client).toBeUndefined();
  });
});
