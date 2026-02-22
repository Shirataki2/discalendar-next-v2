/**
 * PostHogProvider + PostHogPageView 統合テスト
 *
 * Task 6.1: パス変更時にページビューがキャプチャされることを検証する
 * PostHog SDKをモック化し、capture関数の呼び出しを検証する
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 5.1
 */
import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// next/navigationのモック
const mockUsePathname = vi.fn<() => string>();
const mockUseSearchParams = vi.fn<() => URLSearchParams>();
vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
  useSearchParams: () => mockUseSearchParams(),
}));

// posthog-jsのモック
const mockCapture = vi.fn();
const mockInit = vi.fn();
vi.mock("posthog-js", () => {
  const posthog = {
    init: (...args: unknown[]) => mockInit(...args),
    capture: (...args: unknown[]) => mockCapture(...args),
    get_distinct_id: () => "test-distinct-id",
  };
  return { default: posthog };
});

describe("PostHogProvider + PostHogPageView 統合テスト", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    mockCapture.mockClear();
    mockInit.mockClear();
    mockUsePathname.mockReturnValue("/dashboard");
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test_key";
    process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://us.i.posthog.com";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("PostHogProvider内のPostHogPageViewがページビューをキャプチャする (Req 2.1, 5.1)", async () => {
    mockUsePathname.mockReturnValue("/dashboard");

    const { PostHogProvider } = await import(
      "@/lib/analytics/posthog-provider"
    );
    render(
      <PostHogProvider>
        <div>Dashboard</div>
      </PostHogProvider>
    );

    expect(mockCapture).toHaveBeenCalledWith("$pageview");
  });

  it("SPA遷移（パス変更）時に新しいページビューがキャプチャされる (Req 2.2)", async () => {
    mockUsePathname.mockReturnValue("/dashboard");

    const { PostHogProvider } = await import(
      "@/lib/analytics/posthog-provider"
    );
    const { rerender } = render(
      <PostHogProvider>
        <div>Dashboard</div>
      </PostHogProvider>
    );

    mockCapture.mockClear();
    mockUsePathname.mockReturnValue("/dashboard/settings");

    rerender(
      <PostHogProvider>
        <div>Settings</div>
      </PostHogProvider>
    );

    expect(mockCapture).toHaveBeenCalledWith("$pageview");
  });

  it("searchParams変更時にページビューがキャプチャされる (Req 2.3)", async () => {
    mockUsePathname.mockReturnValue("/dashboard");
    mockUseSearchParams.mockReturnValue(new URLSearchParams());

    const { PostHogProvider } = await import(
      "@/lib/analytics/posthog-provider"
    );
    const { rerender } = render(
      <PostHogProvider>
        <div>Dashboard</div>
      </PostHogProvider>
    );

    mockCapture.mockClear();
    mockUseSearchParams.mockReturnValue(new URLSearchParams("?guild=abc"));

    rerender(
      <PostHogProvider>
        <div>Dashboard</div>
      </PostHogProvider>
    );

    expect(mockCapture).toHaveBeenCalledWith("$pageview");
  });

  it("子コンポーネントが正しくレンダリングされる", async () => {
    const { PostHogProvider } = await import(
      "@/lib/analytics/posthog-provider"
    );
    const { container } = render(
      <PostHogProvider>
        <div data-testid="child">content</div>
      </PostHogProvider>
    );

    expect(container.querySelector("[data-testid='child']")).not.toBeNull();
  });
});
