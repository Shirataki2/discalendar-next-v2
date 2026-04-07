/**
 * DIS-172: Security Headers のE2E検証テスト
 *
 * next.config.ts の headers() で設定した以下のヘッダーが
 * 全ページで返却されることを検証する。
 *
 * - Strict-Transport-Security
 * - X-Content-Type-Options
 * - X-Frame-Options
 * - Referrer-Policy
 * - Permissions-Policy
 */
import { expect, test } from "@playwright/test";

const EXPECTED_HEADERS = {
  "strict-transport-security": "max-age=63072000; includeSubDomains; preload",
  "x-content-type-options": "nosniff",
  "x-frame-options": "SAMEORIGIN",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy":
    "camera=(), microphone=(), geolocation=(), interest-cohort=()",
};

const TARGET_PATHS = [
  "/",
  "/terms",
  "/privacy",
  "/docs/getting-started",
  "/auth/login",
];

test.describe("Security Headers E2E検証", () => {
  for (const path of TARGET_PATHS) {
    test(`${path} でセキュリティヘッダーが返却される`, async ({ request }) => {
      const response = await request.get(path);
      const headers = response.headers();

      for (const [name, value] of Object.entries(EXPECTED_HEADERS)) {
        expect(headers[name]).toBe(value);
      }
    });
  }

  test("API Route (/api/health) でもセキュリティヘッダーが返却される", async ({
    request,
  }) => {
    const response = await request.get("/api/health");
    const headers = response.headers();

    for (const [name, value] of Object.entries(EXPECTED_HEADERS)) {
      expect(headers[name]).toBe(value);
    }
  });
});
