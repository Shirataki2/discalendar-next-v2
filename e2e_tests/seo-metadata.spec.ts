/**
 * Task 5.2: SEOメタデータとOGP画像のE2E検証テスト
 *
 * Requirements:
 * - 4.1, 4.4: OGP画像が image/png で 1200×630px
 * - 5.4, 5.5: JSON-LD構造化データが Schema.org 準拠
 * - 6.1: ダッシュボード配下で noindex/nofollow
 * - 7.1: Lighthouse SEO 90+ (手動検証)
 * - 7.2: viewport が設定されている
 * - 7.3: canonical URL が設定されている
 */
import { expect, test } from "@playwright/test";

const VIEWPORT_PATTERN = /width/;

test.describe("SEO メタデータ E2E検証", () => {
  test.describe("OGP画像", () => {
    test("OGP画像がimage/pngで返される", async ({ request }) => {
      const response = await request.get("/opengraph-image");
      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"]).toContain("image/png");
    });
  });

  test.describe("JSON-LD構造化データ", () => {
    test("ランディングページにWebApplication JSON-LDが含まれる", async ({
      page,
    }) => {
      await page.goto("/");

      const scripts = await page.locator('script[type="application/ld+json"]');
      const count = await scripts.count();
      expect(count).toBeGreaterThanOrEqual(2);

      const contents: Record<string, unknown>[] = [];
      for (let i = 0; i < count; i++) {
        const text = await scripts.nth(i).textContent();
        contents.push(JSON.parse(text ?? "{}"));
      }

      const webApp = contents.find((ld) => ld["@type"] === "WebApplication");
      expect(webApp).toBeDefined();
      expect(webApp?.["@context"]).toBe("https://schema.org");
      expect(webApp?.name).toBe("Discalendar");
      expect(webApp?.applicationCategory).toBe("BusinessApplication");
      expect(webApp?.operatingSystem).toBe("Web");
    });

    test("ランディングページにWebSite JSON-LDが含まれる", async ({ page }) => {
      await page.goto("/");

      const scripts = await page.locator('script[type="application/ld+json"]');
      const count = await scripts.count();

      const contents: Record<string, unknown>[] = [];
      for (let i = 0; i < count; i++) {
        const text = await scripts.nth(i).textContent();
        contents.push(JSON.parse(text ?? "{}"));
      }

      const webSite = contents.find((ld) => ld["@type"] === "WebSite");
      expect(webSite).toBeDefined();
      expect(webSite?.["@context"]).toBe("https://schema.org");
      expect(webSite?.name).toBe("Discalendar");
    });
  });

  test.describe("公開ページのcanonical URL", () => {
    const publicPages = [
      { path: "/", canonical: "/" },
      { path: "/terms", canonical: "/terms" },
      { path: "/privacy", canonical: "/privacy" },
      { path: "/docs/getting-started", canonical: "/docs/getting-started" },
    ];

    for (const { path, canonical } of publicPages) {
      test(`${path} に canonical URL が設定されている`, async ({ page }) => {
        await page.goto(path);

        const link = page.locator('link[rel="canonical"]');
        await expect(link).toHaveAttribute(
          "href",
          new RegExp(`${canonical.replace("/", "/")}$`)
        );
      });
    }
  });

  test.describe("viewport", () => {
    test("ランディングページに viewport が設定されている", async ({ page }) => {
      await page.goto("/");

      const viewport = page.locator('meta[name="viewport"]');
      await expect(viewport).toHaveAttribute("content", VIEWPORT_PATTERN);
    });
  });

  test.describe("ページタイトルの統一形式", () => {
    test("利用規約ページが「利用規約 | Discalendar」形式", async ({ page }) => {
      await page.goto("/terms");
      await expect(page).toHaveTitle("利用規約 | Discalendar");
    });

    test("プライバシーポリシーページが「プライバシーポリシー | Discalendar」形式", async ({
      page,
    }) => {
      await page.goto("/privacy");
      await expect(page).toHaveTitle("プライバシーポリシー | Discalendar");
    });

    test("ドキュメントページが「{タイトル} | Discalendar」形式", async ({
      page,
    }) => {
      await page.goto("/docs/getting-started");
      await expect(page).toHaveTitle("基本的な使い方 | Discalendar");
    });

    test("ランディングページがブランドファースト形式", async ({ page }) => {
      await page.goto("/");
      await expect(page).toHaveTitle(
        "Discalendar - Discordコミュニティの予定管理をもっと便利に"
      );
    });
  });
});
