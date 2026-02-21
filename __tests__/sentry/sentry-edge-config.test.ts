/**
 * Task 2.3: EdgeランタイムSentry初期化設定のテスト
 *
 * Requirements:
 * - 1.4: sentry.edge.config.ts でEdgeランタイムのSentryを初期化する
 * - 5.1: 開発環境ではSentryへのエラー送信を無効化する
 * - 5.2: 本番環境ではSentryへのエラー送信を有効化する
 * - 5.5: DSN未設定時はエラーを発生させずにSentry機能を無効化する
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockInit = vi.fn();

vi.mock("@sentry/nextjs", () => ({
  init: mockInit,
}));

describe("sentry.edge.config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    mockInit.mockClear();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("DSN設定時にSentry.initが正しいオプションで呼ばれる", async () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = "https://test@sentry.io/123";
    process.env.NODE_ENV = "production";

    await import("@/sentry.edge.config");

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

    await import("@/sentry.edge.config");

    expect(mockInit).toHaveBeenCalledOnce();
    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      })
    );
  });

  it("本番環境ではtracesSampleRateが低く設定される", async () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = "https://test@sentry.io/123";
    process.env.NODE_ENV = "production";

    await import("@/sentry.edge.config");

    const callArgs = mockInit.mock.calls[0][0];
    expect(callArgs.tracesSampleRate).toBeLessThanOrEqual(0.1);
  });

  it("sendDefaultPiiがfalseに設定される", async () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = "https://test@sentry.io/123";

    await import("@/sentry.edge.config");

    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({
        sendDefaultPii: false,
      })
    );
  });
});
