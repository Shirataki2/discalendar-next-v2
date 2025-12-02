/**
 * Task 9: OAuthコールバック処理のセキュリティとエラーログ検証
 *
 * Requirements:
 * - 7.4: 全ての認証エラーをコンソールに記録する
 * - 3.3: OAuth認証失敗時、エラーメッセージを表示してログインページに戻す
 * - 3.4: ユーザーが認可を拒否した場合、ログインページにリダイレクト
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock console.error to verify logging
const mockConsoleError = vi.fn();

// Mock Supabase client
const mockExchangeCodeForSession = vi.fn();
const mockCreateClient = vi.fn(() => ({
  auth: {
    exchangeCodeForSession: mockExchangeCodeForSession,
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => mockCreateClient(),
}));

// Store original console.error
const originalConsoleError = console.error;

describe("Task 9: OAuth Callback Route Security & Logging", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    console.error = mockConsoleError;
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  describe("Requirement 7.4: Error Logging in Callback", () => {
    it("should log error when authorization code is missing", async () => {
      const { GET } = await import("@/app/auth/callback/route");

      const request = new Request("http://localhost:3000/auth/callback");
      await GET(request);

      expect(mockConsoleError).toHaveBeenCalledWith(
        "[Auth Error]",
        "missing_code",
        expect.any(String)
      );
    });

    it("should log error when OAuth provider returns error", async () => {
      const { GET } = await import("@/app/auth/callback/route");

      const request = new Request(
        "http://localhost:3000/auth/callback?error=access_denied&error_description=User%20denied%20access"
      );
      await GET(request);

      expect(mockConsoleError).toHaveBeenCalledWith(
        "[Auth Error]",
        "access_denied",
        expect.any(String),
        expect.stringContaining("denied")
      );
    });

    it("should log error when token exchange fails", async () => {
      mockExchangeCodeForSession.mockResolvedValue({
        error: { message: "Invalid authorization code" },
      });

      vi.resetModules();
      const { GET } = await import("@/app/auth/callback/route");

      const request = new Request(
        "http://localhost:3000/auth/callback?code=invalid_code"
      );
      await GET(request);

      expect(mockConsoleError).toHaveBeenCalledWith(
        "[Auth Error]",
        "auth_failed",
        expect.any(String),
        expect.stringContaining("Invalid authorization code")
      );
    });
  });

  describe("Error Response Handling", () => {
    it("should redirect to login with error=missing_code when code is absent", async () => {
      const { GET } = await import("@/app/auth/callback/route");

      const request = new Request("http://localhost:3000/auth/callback");
      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain(
        "/auth/login?error=missing_code"
      );
    });

    it("should redirect to login with error=access_denied when user denies OAuth", async () => {
      const { GET } = await import("@/app/auth/callback/route");

      const request = new Request(
        "http://localhost:3000/auth/callback?error=access_denied"
      );
      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain(
        "/auth/login?error=access_denied"
      );
    });

    it("should redirect to login with error=auth_failed when token exchange fails", async () => {
      mockExchangeCodeForSession.mockResolvedValue({
        error: { message: "Token exchange failed" },
      });

      vi.resetModules();
      const { GET } = await import("@/app/auth/callback/route");

      const request = new Request(
        "http://localhost:3000/auth/callback?code=test_code"
      );
      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain(
        "/auth/login?error=auth_failed"
      );
    });

    it("should redirect to dashboard on successful authentication", async () => {
      mockExchangeCodeForSession.mockResolvedValue({
        error: null,
        data: { session: { access_token: "test_token" } },
      });

      vi.resetModules();
      const { GET } = await import("@/app/auth/callback/route");

      const request = new Request(
        "http://localhost:3000/auth/callback?code=valid_code"
      );
      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/dashboard");
    });

    it("should redirect to custom path when next parameter is provided", async () => {
      mockExchangeCodeForSession.mockResolvedValue({
        error: null,
        data: { session: { access_token: "test_token" } },
      });

      vi.resetModules();
      const { GET } = await import("@/app/auth/callback/route");

      const request = new Request(
        "http://localhost:3000/auth/callback?code=valid_code&next=/settings"
      );
      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/settings");
    });
  });

  describe("Security: Open Redirect Prevention", () => {
    it("should not redirect to external URLs via next parameter", async () => {
      mockExchangeCodeForSession.mockResolvedValue({
        error: null,
        data: { session: { access_token: "test_token" } },
      });

      vi.resetModules();
      const { GET } = await import("@/app/auth/callback/route");

      // Try to inject an external URL
      const request = new Request(
        "http://localhost:3000/auth/callback?code=valid_code&next=https://evil.com"
      );
      const response = await GET(request);

      expect(response.status).toBe(307);
      const location = response.headers.get("location");
      // Should redirect to dashboard, not evil.com
      expect(location).not.toContain("evil.com");
      expect(location).toContain("/dashboard");
    });

    it("should not redirect to protocol-relative URLs", async () => {
      mockExchangeCodeForSession.mockResolvedValue({
        error: null,
        data: { session: { access_token: "test_token" } },
      });

      vi.resetModules();
      const { GET } = await import("@/app/auth/callback/route");

      // Try to inject a protocol-relative URL
      const request = new Request(
        "http://localhost:3000/auth/callback?code=valid_code&next=//evil.com"
      );
      const response = await GET(request);

      expect(response.status).toBe(307);
      const location = response.headers.get("location");
      // Should redirect to dashboard, not evil.com
      expect(location).not.toContain("evil.com");
      expect(location).toContain("/dashboard");
    });
  });
});
