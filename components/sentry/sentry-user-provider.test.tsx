import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SentryUserProvider } from "./sentry-user-provider";

// Mock @sentry/nextjs
const mockSetUser = vi.fn();
vi.mock("@sentry/nextjs", () => ({
  setUser: (...args: unknown[]) => mockSetUser(...args),
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

describe("SentryUserProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    });
  });

  it("SIGNED_IN イベントで setUser にユーザ��IDが渡される", () => {
    render(
      <SentryUserProvider>
        <div>child</div>
      </SentryUserProvider>
    );

    const callback = mockOnAuthStateChange.mock.calls[0][0];
    callback("SIGNED_IN", {
      user: { id: "user-uuid-123" },
    });

    expect(mockSetUser).toHaveBeenCalledWith({ id: "user-uuid-123" });
  });

  it("INITIAL_SESSION イベントで setUser が呼ばれる（リロードケース）", () => {
    render(
      <SentryUserProvider>
        <div>child</div>
      </SentryUserProvider>
    );

    const callback = mockOnAuthStateChange.mock.calls[0][0];
    callback("INITIAL_SESSION", {
      user: { id: "user-uuid-456" },
    });

    expect(mockSetUser).toHaveBeenCalledWith({ id: "user-uuid-456" });
  });

  it("SIGNED_OUT イベントで setUser(null) が呼ばれる", () => {
    render(
      <SentryUserProvider>
        <div>child</div>
      </SentryUserProvider>
    );

    const callback = mockOnAuthStateChange.mock.calls[0][0];
    callback("SIGNED_OUT", null);

    expect(mockSetUser).toHaveBeenCalledWith(null);
  });

  it("セッションが null の場合に setUser(null) が呼ばれる", () => {
    render(
      <SentryUserProvider>
        <div>child</div>
      </SentryUserProvider>
    );

    const callback = mockOnAuthStateChange.mock.calls[0][0];
    callback("SIGNED_IN", null);

    expect(mockSetUser).toHaveBeenCalledWith(null);
  });

  it("アンマウント時に onAuthStateChange の購読が解除される", () => {
    const { unmount } = render(
      <SentryUserProvider>
        <div>child</div>
      </SentryUserProvider>
    );

    expect(mockUnsubscribe).not.toHaveBeenCalled();
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it("children をそのまま返す", () => {
    const { getByText } = render(
      <SentryUserProvider>
        <div>test child content</div>
      </SentryUserProvider>
    );

    expect(getByText("test child content")).toBeDefined();
  });
});
