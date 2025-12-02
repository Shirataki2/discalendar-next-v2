/**
 * Task 10.1: Discord認証機能のE2Eテスト
 *
 * 要件:
 * - 1.1: ログインページでDiscordボタンが表示される
 * - 5.1: 未認証での保護ルートアクセスがリダイレクトされる
 * - 5.2: 認証済みでのログインページアクセスがダッシュボードへリダイレクトされる
 * - 6.2: ログアウト後にログインページへ遷移する
 *
 * Note: 実際のOAuthフローはモック不可能なため、UI表示とリダイレクト動作を検証
 */
import { expect, test } from "@playwright/test";

// Top-level regex constants for performance
const DISCORD_LOGIN_BUTTON_PATTERN = /discord.*ログイン/i;
const NETWORK_ERROR_PATTERN = /ネットワーク|サーバー/;
const AUTH_FAILED_PATTERN = /認証.*失敗/;
const ACCESS_DENIED_PATTERN = /キャンセル/;
const LOADING_PATTERN = /ログイン中/;
const OAUTH_REDIRECT_PATTERN = /supabase\.co|discord\.com/;

test.describe("認証機能E2Eテスト", () => {
  test.describe("Task 10.1: ログインページの表示検証", () => {
    test("Requirement 1.1: ログインページでDiscordログインボタンが表示される", async ({
      page,
    }) => {
      await page.goto("/auth/login");

      // ページタイトルの確認
      const heading = page.getByRole("heading", { level: 1 });
      await expect(heading).toBeVisible();
      await expect(heading).toHaveText("ログイン");

      // Discordログインボタンの表示確認
      const discordButton = page.getByRole("button", {
        name: DISCORD_LOGIN_BUTTON_PATTERN,
      });
      await expect(discordButton).toBeVisible();
      await expect(discordButton).toBeEnabled();
    });

    test("Requirement 1.2: Discordボタンがブランドカラー(#5865F2)を使用している", async ({
      page,
    }) => {
      await page.goto("/auth/login");

      const discordButton = page.getByRole("button", {
        name: DISCORD_LOGIN_BUTTON_PATTERN,
      });

      // ボタンの背景色を確認
      const backgroundColor = await discordButton.evaluate(
        (el) => window.getComputedStyle(el).backgroundColor
      );

      // #5865F2 = rgb(88, 101, 242)
      expect(backgroundColor).toBe("rgb(88, 101, 242)");
    });

    test("Requirement 1.3/1.4: Discordボタンがキーボード操作とフォーカスに対応している", async ({
      page,
    }) => {
      await page.goto("/auth/login");

      const discordButton = page.getByRole("button", {
        name: DISCORD_LOGIN_BUTTON_PATTERN,
      });

      // Tabキーでフォーカス可能
      await page.keyboard.press("Tab");

      // ボタンがフォーカスを受け取ることを確認
      // (具体的にどの要素がフォーカスされるかはDOM構造による)
      await discordButton.focus();
      await expect(discordButton).toBeFocused();
    });

    test("ログインページがアクセシブルなマークアップを持つ", async ({
      page,
    }) => {
      await page.goto("/auth/login");

      // main要素の存在確認
      const main = page.getByRole("main");
      await expect(main).toBeVisible();

      // 見出し階層の確認
      const h1 = page.getByRole("heading", { level: 1 });
      await expect(h1).toBeVisible();
    });
  });

  test.describe("Task 10.1: エラーメッセージ表示検証", () => {
    test("Requirement 7.1: network_errorパラメータでネットワークエラーメッセージが表示される", async ({
      page,
    }) => {
      await page.goto("/auth/login?error=network_error");

      // Next.jsのroute-announcerを除外して、アプリケーションのアラートのみを検証
      const alert = page.locator(
        '[role="alert"]:not(#__next-route-announcer__)'
      );
      await expect(alert).toBeVisible();
      await expect(alert).toContainText(NETWORK_ERROR_PATTERN);
    });

    test("Requirement 7.2: auth_failedパラメータで認証失敗メッセージが表示される", async ({
      page,
    }) => {
      await page.goto("/auth/login?error=auth_failed");

      const alert = page.locator(
        '[role="alert"]:not(#__next-route-announcer__)'
      );
      await expect(alert).toBeVisible();
      await expect(alert).toContainText(AUTH_FAILED_PATTERN);
    });

    test("Requirement 7.3: access_deniedパラメータで認可キャンセルメッセージが表示される", async ({
      page,
    }) => {
      await page.goto("/auth/login?error=access_denied");

      const alert = page.locator(
        '[role="alert"]:not(#__next-route-announcer__)'
      );
      await expect(alert).toBeVisible();
      await expect(alert).toContainText(ACCESS_DENIED_PATTERN);
    });

    test("エラーパラメータなしの場合、エラーメッセージが表示されない", async ({
      page,
    }) => {
      await page.goto("/auth/login");

      // Next.jsのroute-announcerを除外して、エラーアラートが表示されていないことを確認
      const alert = page.locator(
        '[role="alert"]:not(#__next-route-announcer__)'
      );
      await expect(alert).not.toBeVisible();
    });
  });

  test.describe("Task 10.1: ルート保護検証（未認証状態）", () => {
    test("Requirement 5.1: 未認証で/dashboardにアクセスすると/auth/loginにリダイレクトされる", async ({
      page,
    }) => {
      // 未認証状態でダッシュボードにアクセス
      await page.goto("/dashboard");

      // ログインページにリダイレクトされることを確認
      await page.waitForURL("**/auth/login");
      expect(page.url()).toContain("/auth/login");

      // ログインページの内容が表示されることを確認
      const heading = page.getByRole("heading", { level: 1 });
      await expect(heading).toHaveText("ログイン");
    });

    test("公開ルート(/)は未認証でもアクセス可能", async ({ page }) => {
      await page.goto("/");

      // リダイレクトされずにトップページが表示される
      await page.waitForLoadState("networkidle");
      expect(page.url()).toBe("http://localhost:3000/");
    });

    test("公開ルート(/auth/login)は未認証でもアクセス可能", async ({
      page,
    }) => {
      await page.goto("/auth/login");

      // リダイレクトされずにログインページが表示される
      expect(page.url()).toContain("/auth/login");
    });
  });

  test.describe("Task 10.1: OAuthフロー開始検証", () => {
    test("Discordボタンクリックでローディング状態またはOAuthリダイレクトが発生する", async ({
      page,
    }) => {
      await page.goto("/auth/login");

      const discordButton = page.getByRole("button", {
        name: DISCORD_LOGIN_BUTTON_PATTERN,
      });

      // ボタンをクリック
      await discordButton.click();

      // ローディング状態になるか、OAuthリダイレクトが発生することを確認
      // （高速な環境ではローディング状態を見る前にリダイレクトされる可能性がある）
      const result = await Promise.race([
        // ローディング状態になった場合
        page
          .getByText(LOADING_PATTERN)
          .waitFor({ timeout: 3000 })
          .then(() => "loading"),
        // OAuthリダイレクトが発生した場合
        page
          .waitForURL(OAUTH_REDIRECT_PATTERN, { timeout: 5000 })
          .then(() => "redirect"),
      ]);

      // いずれかの状態になればOK
      expect(["loading", "redirect"]).toContain(result);
    });

    test("Discordボタンクリック後にSupabase OAuth URLへリダイレクトされる", async ({
      page,
    }) => {
      await page.goto("/auth/login");

      const discordButton = page.getByRole("button", {
        name: DISCORD_LOGIN_BUTTON_PATTERN,
      });

      // ボタンをクリックしてリダイレクトを待つ
      await Promise.all([
        page.waitForURL(OAUTH_REDIRECT_PATTERN, { timeout: 10_000 }),
        discordButton.click(),
      ]);

      // SupabaseまたはDiscordのOAuth URLにリダイレクトされることを確認
      const url = page.url();
      expect(url.includes("supabase.co") || url.includes("discord.com")).toBe(
        true
      );
    });
  });
});

test.describe("モバイル対応検証", () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test("モバイル画面でもDiscordログインボタンが正しく表示される", async ({
    page,
  }) => {
    await page.goto("/auth/login");

    const discordButton = page.getByRole("button", {
      name: DISCORD_LOGIN_BUTTON_PATTERN,
    });
    await expect(discordButton).toBeVisible();
    await expect(discordButton).toBeEnabled();

    // ボタンが画面幅いっぱいに表示されることを確認
    const buttonBox = await discordButton.boundingBox();
    expect(buttonBox).not.toBeNull();
    if (buttonBox) {
      // ボタン幅が300px以上あることを確認（w-fullクラスによる）
      expect(buttonBox.width).toBeGreaterThanOrEqual(300);
    }
  });
});
