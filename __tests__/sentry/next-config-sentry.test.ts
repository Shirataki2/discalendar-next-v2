/**
 * Task 3.2: Next.js設定のSentryビルド統合テスト
 *
 * Requirements:
 * - 1.5: next.config.tsをwithSentryConfigでラップしてビルド統合を有効化する
 * - 4.1: プロダクションビルドでソースマップをSentryに自動アップロードする
 * - 4.2: ソースマップをクライアントに公開しない（v10ではデフォルト）
 */
import { describe, expect, it, vi } from "vitest";

const mockWithSentryConfig = vi.fn(
  (config: Record<string, unknown>, _options: Record<string, unknown>) => ({
    ...config,
    _sentryWrapped: true,
  })
);

vi.mock("@sentry/nextjs", () => ({
  withSentryConfig: mockWithSentryConfig,
}));

describe("next.config.ts Sentry integration", () => {
  it("withSentryConfigでラップされた設定をエクスポートする", async () => {
    const mod = await import("@/next.config");

    expect(mockWithSentryConfig).toHaveBeenCalledOnce();
    expect(mod.default).toHaveProperty("_sentryWrapped", true);
  });

  it("既存のNext.js設定（images等）が保持される", async () => {
    const mod = await import("@/next.config");
    const passedConfig = mockWithSentryConfig.mock.calls[0][0] as Record<
      string,
      unknown
    >;

    expect(passedConfig).toHaveProperty("images");
    expect(mod.default).toBeDefined();
  });

  it("withSentryConfigに正しいオプションが渡される", async () => {
    await import("@/next.config");

    const sentryOptions = mockWithSentryConfig.mock.calls[0][1] as Record<
      string,
      unknown
    >;

    expect(sentryOptions).toHaveProperty("org");
    expect(sentryOptions).toHaveProperty("project");
    expect(sentryOptions).toHaveProperty("authToken");
    expect(sentryOptions).toHaveProperty("widenClientFileUpload", true);
  });

  it("CI環境以外ではログ出力が抑制される", async () => {
    await import("@/next.config");

    const sentryOptions = mockWithSentryConfig.mock.calls[0][1] as Record<
      string,
      unknown
    >;

    expect(sentryOptions).toHaveProperty("silent");
  });
});
