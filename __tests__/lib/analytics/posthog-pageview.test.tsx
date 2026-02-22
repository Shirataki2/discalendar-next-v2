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
vi.mock("posthog-js", () => {
  const posthog = {
    init: vi.fn(),
    capture: (...args: unknown[]) => mockCapture(...args),
    get_distinct_id: () => "test-distinct-id",
  };
  return { default: posthog };
});

describe("PostHogPageView", () => {
  beforeEach(() => {
    vi.resetModules();
    mockCapture.mockClear();
    mockUsePathname.mockReturnValue("/dashboard");
    mockUseSearchParams.mockReturnValue(new URLSearchParams());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("初回レンダリング時にページビューをキャプチャする", async () => {
    mockUsePathname.mockReturnValue("/dashboard");
    mockUseSearchParams.mockReturnValue(new URLSearchParams());

    const { PostHogPageView } = await import(
      "@/lib/analytics/posthog-pageview"
    );
    render(<PostHogPageView />);

    expect(mockCapture).toHaveBeenCalledWith("$pageview");
  });

  it("パスが変更されたときにページビューをキャプチャする", async () => {
    mockUsePathname.mockReturnValue("/dashboard");
    mockUseSearchParams.mockReturnValue(new URLSearchParams());

    const { PostHogPageView } = await import(
      "@/lib/analytics/posthog-pageview"
    );
    const { rerender } = render(<PostHogPageView />);

    mockCapture.mockClear();
    mockUsePathname.mockReturnValue("/dashboard/settings");

    rerender(<PostHogPageView />);

    expect(mockCapture).toHaveBeenCalledWith("$pageview");
  });

  it("searchParamsが変更されたときにページビューをキャプチャする", async () => {
    mockUsePathname.mockReturnValue("/dashboard");
    mockUseSearchParams.mockReturnValue(new URLSearchParams());

    const { PostHogPageView } = await import(
      "@/lib/analytics/posthog-pageview"
    );
    const { rerender } = render(<PostHogPageView />);

    mockCapture.mockClear();
    mockUseSearchParams.mockReturnValue(new URLSearchParams("?guild=123"));

    rerender(<PostHogPageView />);

    expect(mockCapture).toHaveBeenCalledWith("$pageview");
  });

  it("パスもsearchParamsも変更されない場合、再キャプチャしない", async () => {
    mockUsePathname.mockReturnValue("/dashboard");
    mockUseSearchParams.mockReturnValue(new URLSearchParams());

    const { PostHogPageView } = await import(
      "@/lib/analytics/posthog-pageview"
    );
    const { rerender } = render(<PostHogPageView />);

    mockCapture.mockClear();

    rerender(<PostHogPageView />);

    expect(mockCapture).not.toHaveBeenCalled();
  });

  it("DOMに何もレンダリングしない", async () => {
    const { PostHogPageView } = await import(
      "@/lib/analytics/posthog-pageview"
    );
    const { container } = render(<PostHogPageView />);

    expect(container.innerHTML).toBe("");
  });
});
