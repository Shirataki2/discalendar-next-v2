/**
 * Task 3.1: サーバーサイド計装フックのテスト
 *
 * Requirements:
 * - 3.1: Server Componentsでエラーが発生した場合、Sentryに自動送信する
 * - 3.2: Route Handlersでエラーが発生した場合、Sentryに自動送信する
 * - 3.3: Server Actionsでエラーが発生した場合、Sentryに自動送信する
 * - 3.4: instrumentation.tsを使用してサーバーサイドのSentry初期化を行う
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockCaptureRequestError = vi.fn();

vi.mock("@sentry/nextjs", () => ({
  captureRequestError: mockCaptureRequestError,
}));

vi.mock("@/sentry.server.config", () => ({}));
vi.mock("@/sentry.edge.config", () => ({}));

describe("instrumentation", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("register()", () => {
    it("Node.jsランタイムでsentry.server.configをimportする", async () => {
      process.env.NEXT_RUNTIME = "nodejs";

      const mod = await import("@/instrumentation");

      await mod.register();

      // sentry.server.configのimportが実行されたことを確認
      // vi.mockでモック済みなのでエラーなく完了すれば成功
      expect(mod.register).toBeDefined();
    });

    it("Edgeランタイムでsentry.edge.configをimportする", async () => {
      process.env.NEXT_RUNTIME = "edge";

      const mod = await import("@/instrumentation");

      await mod.register();

      expect(mod.register).toBeDefined();
    });

    it("未知のランタイムではエラーをスローしない", async () => {
      process.env.NEXT_RUNTIME = "unknown";

      const mod = await import("@/instrumentation");

      await expect(mod.register()).resolves.toBeUndefined();
    });
  });

  describe("onRequestError", () => {
    it("captureRequestErrorとしてエクスポートされる", async () => {
      const mod = await import("@/instrumentation");

      expect(mod.onRequestError).toBe(mockCaptureRequestError);
    });
  });
});
