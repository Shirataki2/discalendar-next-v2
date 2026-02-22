import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// posthog-jsのモック
const mockInit = vi.fn();
vi.mock("posthog-js", () => {
  const posthog = {
    init: mockInit,
    capture: vi.fn(),
    opt_out_capturing: vi.fn(),
  };
  return { default: posthog };
});

describe("PostHogProvider", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    mockInit.mockClear();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("環境変数が設定されている場合、PostHog SDKを初期化する", async () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key";
    process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://us.i.posthog.com";

    const { PostHogProvider } = await import("./posthog-provider");

    render(
      <PostHogProvider>
        <div data-testid="child">child content</div>
      </PostHogProvider>,
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(mockInit).toHaveBeenCalledWith(
      "phc_test_key",
      expect.objectContaining({
        api_host: "https://us.i.posthog.com",
        capture_pageview: false,
        persistence: "memory",
      }),
    );
  });

  it("環境変数が未設定の場合、SDKを初期化しない", async () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "";
    process.env.NEXT_PUBLIC_POSTHOG_HOST = "";

    const { PostHogProvider } = await import("./posthog-provider");

    render(
      <PostHogProvider>
        <div data-testid="child">child content</div>
      </PostHogProvider>,
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(mockInit).not.toHaveBeenCalled();
  });

  it("子コンポーネントを正しくレンダリングする", async () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "";

    const { PostHogProvider } = await import("./posthog-provider");

    render(
      <PostHogProvider>
        <div data-testid="child">child content</div>
      </PostHogProvider>,
    );

    expect(screen.getByTestId("child")).toHaveTextContent("child content");
  });

  it("SDK初期化失敗時もアプリケーションの動作を妨げない", async () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key";
    process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://us.i.posthog.com";

    mockInit.mockImplementation(() => {
      throw new Error("SDK init failed");
    });

    const { PostHogProvider } = await import("./posthog-provider");

    render(
      <PostHogProvider>
        <div data-testid="child">child content</div>
      </PostHogProvider>,
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("capture_pageview: false でページビューの自動キャプチャを無効化する", async () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key";
    process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://us.i.posthog.com";

    const { PostHogProvider } = await import("./posthog-provider");

    render(
      <PostHogProvider>
        <div>test</div>
      </PostHogProvider>,
    );

    expect(mockInit).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        capture_pageview: false,
      }),
    );
  });

  it("persistence: 'memory' でCookieレス設定になる", async () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key";
    process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://us.i.posthog.com";

    const { PostHogProvider } = await import("./posthog-provider");

    render(
      <PostHogProvider>
        <div>test</div>
      </PostHogProvider>,
    );

    expect(mockInit).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        persistence: "memory",
      }),
    );
  });
});
