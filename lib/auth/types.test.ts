import { describe, expect, it, vi } from "vitest";
import {
  AUTH_ERROR_CODES,
  AUTH_ERROR_MESSAGES,
  type AuthError,
  type AuthErrorCode,
  getAuthErrorMessage,
  logAuthError,
} from "./types";

describe("AuthErrorCode", () => {
  it("should have all expected error codes defined", () => {
    const expectedCodes: AuthErrorCode[] = [
      "missing_code",
      "auth_failed",
      "access_denied",
      "network_error",
      "session_expired",
    ];

    for (const code of expectedCodes) {
      expect(AUTH_ERROR_CODES).toContain(code);
    }
  });
});

describe("AUTH_ERROR_MESSAGES", () => {
  it("should have a message for missing_code", () => {
    expect(AUTH_ERROR_MESSAGES.missing_code).toBe(
      "認証コードが見つかりません。再度ログインしてください。"
    );
  });

  it("should have a message for auth_failed (Req 7.2)", () => {
    expect(AUTH_ERROR_MESSAGES.auth_failed).toBe(
      "認証に失敗しました。再度お試しください。"
    );
  });

  it("should have a message for access_denied (Req 7.3)", () => {
    expect(AUTH_ERROR_MESSAGES.access_denied).toBe(
      "ログインがキャンセルされました。"
    );
  });

  it("should have a message for network_error (Req 7.1)", () => {
    expect(AUTH_ERROR_MESSAGES.network_error).toBe(
      "サーバーに接続できませんでした。ネットワーク接続を確認してください。"
    );
  });

  it("should have a message for session_expired", () => {
    expect(AUTH_ERROR_MESSAGES.session_expired).toBe(
      "セッションの有効期限が切れました。再度ログインしてください。"
    );
  });
});

describe("getAuthErrorMessage", () => {
  it("should return the correct message for a valid error code", () => {
    expect(getAuthErrorMessage("auth_failed")).toBe(
      "認証に失敗しました。再度お試しください。"
    );
  });

  it("should return a default message for an unknown error code", () => {
    expect(getAuthErrorMessage("unknown_code" as AuthErrorCode)).toBe(
      "予期しないエラーが発生しました。"
    );
  });

  it("should handle network_error correctly (Req 7.1)", () => {
    expect(getAuthErrorMessage("network_error")).toBe(
      "サーバーに接続できませんでした。ネットワーク接続を確認してください。"
    );
  });

  it("should handle auth_failed correctly (Req 7.2)", () => {
    expect(getAuthErrorMessage("auth_failed")).toBe(
      "認証に失敗しました。再度お試しください。"
    );
  });

  it("should handle access_denied correctly (Req 7.3)", () => {
    expect(getAuthErrorMessage("access_denied")).toBe(
      "ログインがキャンセルされました。"
    );
  });
});

describe("AuthError type", () => {
  it("should allow creating a valid AuthError object", () => {
    const error: AuthError = {
      code: "auth_failed",
      message: "認証に失敗しました。再度お試しください。",
    };

    expect(error.code).toBe("auth_failed");
    expect(error.message).toBe("認証に失敗しました。再度お試しください。");
  });

  it("should allow optional details field", () => {
    const error: AuthError = {
      code: "network_error",
      message: "サーバーに接続できませんでした。ネットワーク接続を確認してください。",
      details: "Connection timeout after 30 seconds",
    };

    expect(error.details).toBe("Connection timeout after 30 seconds");
  });
});

describe("logAuthError (Req 7.4)", () => {
  it("should log error to console.error", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const error: AuthError = {
      code: "auth_failed",
      message: "認証に失敗しました。再度お試しください。",
    };

    logAuthError(error);

    expect(consoleSpy).toHaveBeenCalledWith(
      "[Auth Error]",
      error.code,
      error.message
    );

    consoleSpy.mockRestore();
  });

  it("should include details in log when provided", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const error: AuthError = {
      code: "network_error",
      message: "サーバーに接続できませんでした。ネットワーク接続を確認してください。",
      details: "Fetch failed: net::ERR_CONNECTION_REFUSED",
    };

    logAuthError(error);

    expect(consoleSpy).toHaveBeenCalledWith(
      "[Auth Error]",
      error.code,
      error.message,
      error.details
    );

    consoleSpy.mockRestore();
  });
});
