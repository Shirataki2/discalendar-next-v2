/**
 * Task 2.1: クライアントサイドSentry初期化設定のテスト
 *
 * Requirements:
 * - 1.2: sentry.client.config.ts でクライアントサイドのSentryを初期化する
 * - 2.1: Client Componentsで発生するランタイムエラーがSentryに自動送信される
 * - 5.1: 開発環境ではSentryへのエラー送信を無効化する（またはスキップ）
 * - 5.2: 本番環境ではSentryへのエラー送信を有効化する
 * - 5.5: DSN未設定時はエラーを発生させずにSentry機能を無効化する
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockInit = vi.fn();

vi.mock("@sentry/nextjs", () => ({
  init: mockInit,
}));

describe("sentry.client.config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    mockInit.mockClear();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("DSN設定かつ本番環境でSentryが有効化される", async () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = "https://test@sentry.io/123";
    process.env.NODE_ENV = "production";

    await import("@/sentry.client.config");

    expect(mockInit).toHaveBeenCalledOnce();
    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: "https://test@sentry.io/123",
        enabled: true,
      })
    );
  });

  it("DSN未設定時にSentryが無効化される", async () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = "";
    process.env.NODE_ENV = "production";

    await import("@/sentry.client.config");

    expect(mockInit).toHaveBeenCalledOnce();
    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      })
    );
  });

  it("開発環境ではDSNが設定されていてもSentryが無効化される", async () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = "https://test@sentry.io/123";
    process.env.NODE_ENV = "development";

    await import("@/sentry.client.config");

    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      })
    );
  });

  it("environmentにNODE_ENVが設定される", async () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = "https://test@sentry.io/123";
    process.env.NODE_ENV = "production";

    await import("@/sentry.client.config");

    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({
        environment: "production",
      })
    );
  });

  it("sendDefaultPiiがfalseに設定される", async () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = "https://test@sentry.io/123";

    await import("@/sentry.client.config");

    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({
        sendDefaultPii: false,
      })
    );
  });
});
