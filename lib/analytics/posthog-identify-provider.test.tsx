import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PostHogIdentifyProvider } from "./posthog-identify-provider";

// Mock posthog-js
const mockIdentify = vi.fn();
const mockReset = vi.fn();
vi.mock("posthog-js", () => ({
  default: {
    identify: (...args: unknown[]) => mockIdentify(...args),
    reset: (...args: unknown[]) => mockReset(...args),
    get_distinct_id: () => "mock-distinct-id",
  },
}));

// Mock @supabase/ssr — onAuthStateChange subscription
const mockUnsubscribe = vi.fn();
const mockOnAuthStateChange = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      onAuthStateChange: mockOnAuthStateChange,
    },
  }),
}));

describe("PostHogIdentifyProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    });
  });

  it("SIGNED_IN イベントで identify が userId 付きで呼ばれる", () => {
    render(
      <PostHogIdentifyProvider>
        <div>child</div>
      </PostHogIdentifyProvider>,
    );

    const callback = mockOnAuthStateChange.mock.calls[0][0];
    callback("SIGNED_IN", {
      user: { id: "user-uuid-123" },
    });

    expect(mockIdentify).toHaveBeenCalledWith("user-uuid-123");
  });

  it("INITIAL_SESSION イベントで identify が呼ばれる（リロードケース）", () => {
    render(
      <PostHogIdentifyProvider>
        <div>child</div>
      </PostHogIdentifyProvider>,
    );

    const callback = mockOnAuthStateChange.mock.calls[0][0];
    callback("INITIAL_SESSION", {
      user: { id: "user-uuid-456" },
    });

    expect(mockIdentify).toHaveBeenCalledWith("user-uuid-456");
  });

  it("SIGNED_OUT イベントで reset が呼ばれる", () => {
    render(
      <PostHogIdentifyProvider>
        <div>child</div>
      </PostHogIdentifyProvider>,
    );

    const callback = mockOnAuthStateChange.mock.calls[0][0];
    callback("SIGNED_OUT", null);

    expect(mockReset).toHaveBeenCalled();
  });

  it("セッションが null の場合に reset が呼ばれる", () => {
    render(
      <PostHogIdentifyProvider>
        <div>child</div>
      </PostHogIdentifyProvider>,
    );

    const callback = mockOnAuthStateChange.mock.calls[0][0];
    callback("SIGNED_IN", null);

    expect(mockReset).toHaveBeenCalled();
  });

  it("アンマウント時に onAuthStateChange の購読が解除される", () => {
    const { unmount } = render(
      <PostHogIdentifyProvider>
        <div>child</div>
      </PostHogIdentifyProvider>,
    );

    expect(mockUnsubscribe).not.toHaveBeenCalled();
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it("children をそのまま返す", () => {
    const { getByText } = render(
      <PostHogIdentifyProvider>
        <div>test child content</div>
      </PostHogIdentifyProvider>,
    );

    expect(getByText("test child content")).toBeDefined();
  });
});
