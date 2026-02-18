/**
 * Task 6.3: 静的ページのE2Eテスト
 *
 * Requirements:
 * - 6.1: フッター利用規約リンク → /terms 遷移
 * - 6.2: フッタープライバシーポリシーリンク → /privacy 遷移
 * - 6.3: フッタードキュメントリンク → /docs/getting-started 遷移
 * - 4.2, 4.3, 4.4: ドキュメントページの前後ナビゲーション
 * - 3.5: 存在しないslugで404表示
 */
import { expect, test } from "@playwright/test";

const TERMS_TITLE_PATTERN = /利用規約/;
const PRIVACY_TITLE_PATTERN = /プライバシーポリシー/;

test.describe("静的ページ E2Eテスト", () => {
  test.describe("フッターリンク遷移", () => {
    test("Req 6.1: フッターの利用規約リンクから /terms へ遷移する", async ({
      page,
    }) => {
      await page.goto("/");

      const footer = page.locator("footer");
      const termsLink = footer.getByRole("link", { name: "利用規約" });
      await expect(termsLink).toBeVisible();
      await termsLink.click();

      await page.waitForURL("**/terms");
      expect(page.url()).toContain("/terms");

      const heading = page.getByRole("heading", { level: 1, name: "利用規約" });
      await expect(heading).toBeVisible();
    });

    test("Req 6.2: フッターのプライバシーポリシーリンクから /privacy へ遷移する", async ({
      page,
    }) => {
      await page.goto("/");

      const footer = page.locator("footer");
      const privacyLink = footer.getByRole("link", {
        name: "プライバシーポリシー",
      });
      await expect(privacyLink).toBeVisible();
      await privacyLink.click();

      await page.waitForURL("**/privacy");
      expect(page.url()).toContain("/privacy");

      const heading = page.getByRole("heading", {
        level: 1,
        name: "プライバシーポリシー",
      });
      await expect(heading).toBeVisible();
    });

    test("Req 6.3: フッターのドキュメントリンクから /docs/getting-started へ遷移する", async ({
      page,
    }) => {
      await page.goto("/");

      const footer = page.locator("footer");
      const docsLink = footer.getByRole("link", { name: "ドキュメント" });
      await expect(docsLink).toBeVisible();
      await docsLink.click();

      await page.waitForURL("**/docs/getting-started");
      expect(page.url()).toContain("/docs/getting-started");

      const heading = page.getByRole("heading", {
        level: 1,
        name: "基本的な使い方",
      });
      await expect(heading).toBeVisible();
    });
  });

  test.describe("利用規約ページ", () => {
    test("Req 1.2: タイトルと全条文見出しが表示される", async ({ page }) => {
      await page.goto("/terms");

      await expect(
        page.getByRole("heading", { level: 1, name: "利用規約" })
      ).toBeVisible();

      const articles = [
        "第1条(適用)",
        "第2条(利用の定義)",
        "第3条(利用の拒否・停止)",
        "第4条(禁止事項)",
        "第5条(知的財産権)",
        "第6条(個人情報の取り扱い)",
        "第7条(サービスの変更・中断・終了)",
        "第8条(免責事項)",
        "第9条(損害賠償)",
        "第10条(本規約の変更)",
        "第11条(可分性)",
        "第12条(準拠法および管轄裁判所)",
      ];
      for (const article of articles) {
        await expect(
          page.getByRole("heading", { level: 2, name: article })
        ).toBeVisible();
      }
    });

    test("Req 1.5: ページタイトルにSEOメタデータが設定されている", async ({
      page,
    }) => {
      await page.goto("/terms");
      await expect(page).toHaveTitle(TERMS_TITLE_PATTERN);
    });
  });

  test.describe("プライバシーポリシーページ", () => {
    test("Req 2.2: タイトルと全セクション見出しが表示される", async ({
      page,
    }) => {
      await page.goto("/privacy");

      await expect(
        page.getByRole("heading", {
          level: 1,
          name: "プライバシーポリシー",
        })
      ).toBeVisible();

      const sections = [
        "収集する個人情報",
        "個人情報の利用目的",
        "個人情報の第三者への提供",
        "免責事項",
        "プライバシーポリシーの改定について",
      ];
      for (const section of sections) {
        await expect(
          page.getByRole("heading", { level: 2, name: section })
        ).toBeVisible();
      }
    });

    test("Req 2.5: ページタイトルにSEOメタデータが設定されている", async ({
      page,
    }) => {
      await page.goto("/privacy");
      await expect(page).toHaveTitle(PRIVACY_TITLE_PATTERN);
    });
  });

  test.describe("ドキュメントページのナビゲーション", () => {
    test("Req 4.1: 目次ナビゲーションが表示される", async ({ page }) => {
      await page.goto("/docs/getting-started");

      const nav = page.getByRole("navigation", { name: "ドキュメント目次" });
      await expect(nav).toBeVisible();

      // 全ドキュメントページのリンクが含まれる
      const docTitles = [
        "基本的な使い方",
        "ログイン",
        "Botの招待",
        "初期設定",
        "予定の追加と表示",
        "予定の編集と削除",
        "利用可能なコマンド",
      ];
      for (const title of docTitles) {
        await expect(nav.getByRole("link", { name: title })).toBeVisible();
      }
    });

    test("Req 4.3: 最初のページでは「前の記事」が非表示", async ({ page }) => {
      await page.goto("/docs/getting-started");

      await expect(page.getByText("次の記事")).toBeVisible();
      await expect(page.getByText("前の記事")).not.toBeVisible();
    });

    test("Req 4.4: 最後のページでは「次の記事」が非表示", async ({ page }) => {
      await page.goto("/docs/commands");

      await expect(page.getByText("前の記事")).toBeVisible();
      await expect(page.getByText("次の記事")).not.toBeVisible();
    });

    test("Req 4.2: 「次の記事」リンクで次のページへ遷移する", async ({
      page,
    }) => {
      await page.goto("/docs/getting-started");

      const nextLink = page
        .getByRole("navigation", { name: "ページ送り" })
        .getByRole("link");
      await expect(nextLink).toBeVisible();
      await nextLink.click();

      await page.waitForURL("**/docs/login");
      expect(page.url()).toContain("/docs/login");

      await expect(
        page.getByRole("heading", { level: 1, name: "ログイン" })
      ).toBeVisible();
    });

    test("Req 4.2: 「前の記事」リンクで前のページへ遷移する", async ({
      page,
    }) => {
      await page.goto("/docs/login");

      const prevLink = page
        .getByRole("navigation", { name: "ページ送り" })
        .getByText("前の記事")
        .locator("..");
      await prevLink.click();

      await page.waitForURL("**/docs/getting-started");
      expect(page.url()).toContain("/docs/getting-started");

      await expect(
        page.getByRole("heading", { level: 1, name: "基本的な使い方" })
      ).toBeVisible();
    });

    test("Req 4.1: 目次から別のページへ遷移する", async ({ page }) => {
      await page.goto("/docs/getting-started");

      const nav = page.getByRole("navigation", { name: "ドキュメント目次" });
      await nav.getByRole("link", { name: "初期設定" }).click();

      await page.waitForURL("**/docs/initialize");
      expect(page.url()).toContain("/docs/initialize");

      await expect(
        page.getByRole("heading", { level: 1, name: "初期設定" })
      ).toBeVisible();
    });

    test("Req 3.5: 存在しないslugで404が表示される", async ({ page }) => {
      const response = await page.goto("/docs/non-existent-page");

      expect(response?.status()).toBe(404);
    });
  });
});
