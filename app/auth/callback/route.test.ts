import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

// Mock Supabase server client
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// Import after mocking
import { createClient } from "@/lib/supabase/server";
import { GET } from "./route";

/**
 * OAuthコールバック処理のテスト
 *
 * 要件対応:
 * - 2.3: コールバックURLがSupabase設定と一致
 * - 3.1: 認可コードを受け取りセッションを確立
 * - 3.2: セッション確立成功時、ダッシュボードにリダイレクト
 * - 3.3: OAuth認証失敗時、エラーメッセージを表示してログインページに戻す
 * - 3.4: ユーザーが認可を拒否した場合、ログインページにリダイレクト
 * - 4.1: CookieベースでSupabaseセッションを保存
 */
describe("GET /auth/callback", () => {
  const mockExchangeCodeForSession = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (createClient as Mock).mockResolvedValue({
      auth: {
        exchangeCodeForSession: mockExchangeCodeForSession,
      },
    });
  });

  /**
   * 要件3.1, 3.2: 認可コードを受け取りセッションを確立し、ダッシュボードへリダイレクト
   */
  it("should exchange code for session and redirect to dashboard on success", async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      data: { session: { access_token: "test-token" } },
      error: null,
    });

    const request = new Request(
      "http://localhost:3000/auth/callback?code=test-auth-code"
    );

    const response = await GET(request);

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith("test-auth-code");
    expect(response.status).toBe(307); // Temporary redirect
    expect(response.headers.get("Location")).toBe(
      "http://localhost:3000/dashboard"
    );
  });

  /**
   * 要件3.2: nextパラメータがある場合、指定されたURLにリダイレクト
   */
  it("should redirect to 'next' parameter URL when provided", async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      data: { session: { access_token: "test-token" } },
      error: null,
    });

    const request = new Request(
      "http://localhost:3000/auth/callback?code=test-auth-code&next=/settings"
    );

    const response = await GET(request);

    expect(response.headers.get("Location")).toBe(
      "http://localhost:3000/settings"
    );
  });

  /**
   * 認可コードが欠落している場合、missing_codeエラーでログインページにリダイレクト
   */
  it("should redirect to login with missing_code error when code is missing", async () => {
    const request = new Request("http://localhost:3000/auth/callback");

    const response = await GET(request);

    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
    expect(response.status).toBe(307);
    expect(response.headers.get("Location")).toBe(
      "http://localhost:3000/auth/login?error=missing_code"
    );
  });

  /**
   * 要件3.3: セッション交換に失敗した場合、auth_failedエラーでログインページにリダイレクト
   */
  it("should redirect to login with auth_failed error when session exchange fails", async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      data: { session: null },
      error: { message: "Invalid code" },
    });

    const request = new Request(
      "http://localhost:3000/auth/callback?code=invalid-code"
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("Location")).toBe(
      "http://localhost:3000/auth/login?error=auth_failed"
    );
  });

  /**
   * 要件3.4: ユーザーがDiscordで認可を拒否した場合、access_deniedエラーでログインページにリダイレクト
   */
  it("should redirect to login with access_denied error when user denies authorization", async () => {
    const request = new Request(
      "http://localhost:3000/auth/callback?error=access_denied&error_description=The+user+denied+access"
    );

    const response = await GET(request);

    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
    expect(response.status).toBe(307);
    expect(response.headers.get("Location")).toBe(
      "http://localhost:3000/auth/login?error=access_denied"
    );
  });

  /**
   * Discordからエラーパラメータが返された場合の処理
   */
  it("should handle generic OAuth error from provider", async () => {
    const request = new Request(
      "http://localhost:3000/auth/callback?error=server_error&error_description=Something+went+wrong"
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("Location")).toBe(
      "http://localhost:3000/auth/login?error=auth_failed"
    );
  });

  /**
   * 要件7.4: エラーがコンソールにログ記録されることを確認
   */
  it("should log errors to console when session exchange fails", async () => {
    // Suppress console.error output during test
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {
      // intentionally empty - suppress console output
    });

    mockExchangeCodeForSession.mockResolvedValue({
      data: { session: null },
      error: { message: "Invalid authorization code" },
    });

    const request = new Request(
      "http://localhost:3000/auth/callback?code=bad-code"
    );

    await GET(request);

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  /**
   * nextパラメータに相対パスが指定されている場合のみリダイレクトを許可
   */
  it("should only allow relative paths in next parameter", async () => {
    mockExchangeCodeForSession.mockResolvedValue({
      data: { session: { access_token: "test-token" } },
      error: null,
    });

    // 外部URLへのリダイレクトは許可しない
    const request = new Request(
      "http://localhost:3000/auth/callback?code=test-code&next=https://evil.com/steal"
    );

    const response = await GET(request);

    // 外部URLの場合はデフォルトのdashboardにリダイレクト
    expect(response.headers.get("Location")).toBe(
      "http://localhost:3000/dashboard"
    );
  });
});
