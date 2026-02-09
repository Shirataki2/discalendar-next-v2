---
name: playwright-e2e
description: Playwright を使用した E2E テスト作成の統合ワークフロー。ページ遷移、フォーム操作、認証フロー、アクセシビリティ検証など、エンドツーエンドテスト全般で使用する。「E2Eテストを追加」「ページの動作をテスト」「認証フローをテスト」など、E2Eテスト作成時に使用。
---

# Playwright E2E Testing Skill

Discalendar プロジェクトで Playwright E2E テストを作成する際の統合ワークフロー。

## 成果物チェックリスト

| # | 成果物 | パス | 必須 |
|---|--------|------|------|
| 1 | E2Eテストファイル | `e2e_tests/feature-name.spec.ts` | Yes |

---

## Phase 1: テストファイル作成

### 1.1 ファイル命名規則

```
e2e_tests/機能名.spec.ts
```

- ファイル名はケバブケースで機能を表す
- 例: `auth.spec.ts`, `calendar-events.spec.ts`, `dashboard.spec.ts`

### 1.2 基本構造

```typescript
/**
 * 機能名 E2Eテスト
 *
 * タスク番号: Task X.X
 * 要件: 1.1, 2.1, ...
 *
 * Note: テストの概要説明
 */
import { expect, test } from "@playwright/test";

// Top-level regex patterns（パフォーマンス最適化）
const BUTTON_PATTERN = /ボタン名/;
const ERROR_PATTERN = /エラーメッセージ/;

test.describe("機能名E2Eテスト", () => {
  test.describe("Task X.X: 小機能名", () => {
    test("Req Y.Y: テストの説明", async ({ page }) => {
      // テスト実装
    });
  });
});
```

---

## Phase 2: テストパターン

### 2.1 ページ遷移テスト

```typescript
test("ページ遷移が正しく動作する", async ({ page }) => {
  // ページに移動
  await page.goto("/target-path");

  // URLの確認
  expect(page.url()).toContain("/target-path");

  // または waitForURL で非同期遷移を待つ
  await page.waitForURL("**/expected-path");
});
```

### 2.2 リダイレクトテスト

```typescript
test("未認証で保護ルートにアクセスするとリダイレクトされる", async ({
  page,
}) => {
  await page.goto("/protected-route");

  // リダイレクト先を待つ
  await page.waitForURL("**/auth/login");
  expect(page.url()).toContain("/auth/login");
});
```

### 2.3 ボタン・要素の表示確認

```typescript
test("ボタンが表示されクリック可能", async ({ page }) => {
  await page.goto("/page");

  // ボタンを取得（アクセシブルな方法で）
  const button = page.getByRole("button", { name: /ボタン名/ });

  // 表示・有効状態を確認
  await expect(button).toBeVisible();
  await expect(button).toBeEnabled();
});
```

### 2.4 フォーム入力テスト

```typescript
test("フォーム入力と送信が動作する", async ({ page }) => {
  await page.goto("/form-page");

  // ダイアログ/フォームを開く
  const openButton = page.getByRole("button", { name: /追加/ });
  await openButton.click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  // フォームフィールドに入力
  const titleInput = dialog.getByLabel(/タイトル/);
  await titleInput.fill("テスト入力");

  // 送信
  const saveButton = dialog.getByRole("button", { name: /保存/ });
  await saveButton.click();
});
```

### 2.5 バリデーションエラーテスト

```typescript
test("バリデーションエラーが表示される", async ({ page }) => {
  await page.goto("/form-page");

  // フォームを開く
  const dialog = page.getByRole("dialog");

  // 空のまま送信
  const saveButton = dialog.getByRole("button", { name: /保存/ });
  await saveButton.click();

  // エラーメッセージを確認
  const errorText = dialog.getByText(/必須項目です/);
  await expect(errorText).toBeVisible();

  // ダイアログが閉じていないことを確認
  await expect(dialog).toBeVisible();
});
```

### 2.6 エラーパラメータテスト

```typescript
test("URLパラメータでエラーメッセージが表示される", async ({ page }) => {
  await page.goto("/page?error=error_code");

  // Next.jsのroute-announcerを除外
  const alert = page.locator('[role="alert"]:not(#__next-route-announcer__)');
  await expect(alert).toBeVisible();
  await expect(alert).toContainText(/エラーメッセージ/);
});
```

### 2.7 キーボード操作テスト

```typescript
test("キーボードでナビゲート可能", async ({ page, browserName }) => {
  await page.goto("/page");

  const targetElement = page.getByRole("button", { name: /ボタン/ });
  await targetElement.focus();

  // webkitではフォーカステストをスキップ
  if (browserName !== "webkit") {
    await expect(targetElement).toBeFocused();

    // Tabキーで次の要素に移動
    await page.keyboard.press("Tab");
  }
});

test("Escキーでダイアログが閉じる", async ({ page }) => {
  // ダイアログを開く
  // ...

  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
});
```

### 2.8 CSSスタイル検証

```typescript
test("正しいスタイルが適用されている", async ({ page }) => {
  await page.goto("/page");

  const element = page.getByRole("button", { name: /ボタン/ });

  // 背景色を確認
  const backgroundColor = await element.evaluate(
    (el) => window.getComputedStyle(el).backgroundColor
  );

  // #5865F2 = rgb(88, 101, 242)
  expect(backgroundColor).toBe("rgb(88, 101, 242)");
});
```

### 2.9 外部リダイレクト（OAuth等）

```typescript
const OAUTH_REDIRECT_PATTERN = /supabase\.co|discord\.com/;

test("OAuthリダイレクトが発生する", async ({ page }) => {
  await page.goto("/auth/login");

  const loginButton = page.getByRole("button", { name: /ログイン/ });

  await Promise.all([
    page.waitForURL(OAUTH_REDIRECT_PATTERN, { timeout: 10_000 }),
    loginButton.click(),
  ]);

  const url = page.url();
  expect(url.includes("supabase.co") || url.includes("discord.com")).toBe(true);
});
```

---

## Phase 3: モバイル対応テスト

```typescript
test.describe("モバイル対応検証", () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test("モバイル画面でも正しく表示される", async ({ page }) => {
    await page.goto("/page");

    const element = page.getByRole("button", { name: /ボタン/ });
    await expect(element).toBeVisible();

    // サイズを確認
    const box = await element.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.width).toBeGreaterThanOrEqual(300);
    }
  });
});
```

---

## Phase 4: アクセシビリティテスト

```typescript
test("アクセシブルなマークアップを持つ", async ({ page }) => {
  await page.goto("/page");

  // main要素の存在確認
  const main = page.getByRole("main");
  await expect(main).toBeVisible();

  // 見出し階層の確認
  const h1 = page.getByRole("heading", { level: 1 });
  await expect(h1).toBeVisible();

  // aria属性の確認
  const requiredInput = page.getByLabel(/タイトル/);
  await expect(requiredInput).toHaveAttribute("aria-required", "true");
});
```

---

## コーディング規約

### 必須ルール

1. **正規表現パターン**: Top-level で定数として定義（パフォーマンス最適化）
2. **アクセシブルなセレクタ**: `getByRole`, `getByLabel`, `getByText` を優先
3. **コメント**: ファイル先頭にタスク番号・要件を記載
4. **describe構造**: `test.describe` でタスク・機能ごとにグループ化
5. **テスト名**: `Req X.X:` プレフィックスで要件との紐付けを明示

### セレクタ優先順位

| 優先度 | セレクタ | 用途 |
|--------|----------|------|
| 1 | `getByRole("button", { name: /text/ })` | ボタン、リンク、見出し |
| 2 | `getByLabel(/ラベル/)` | フォームフィールド |
| 3 | `getByText(/テキスト/)` | 表示テキスト |
| 4 | `locator('[data-testid="id"]')` | テスト専用属性 |
| 5 | `locator('.class')` | 最終手段 |

### テスト用ルート

認証が必要な機能のテストでは、認証不要のテスト用ルートを使用:

```typescript
// 認証不要のテストルート
const TEST_CALENDAR_PATH = "/test/calendar";

test("カレンダー機能のテスト", async ({ page }) => {
  await page.goto(TEST_CALENDAR_PATH);
  // ...
});
```

### 条件付きスキップ

要素が存在しない場合のスキップパターン:

```typescript
test("オプショナル機能のテスト", async ({ page }) => {
  await page.goto("/page");

  const optionalButton = page.getByRole("button", { name: /オプション/ });
  const isVisible = await optionalButton.isVisible().catch(() => false);

  if (!isVisible) {
    test.skip();
    return;
  }

  // テスト続行
});
```

---

## テスト実行

### ローカル実行

```bash
# 全テスト実行
npm run test:e2e

# 特定ファイルのテスト
npm run test:e2e -- e2e_tests/auth.spec.ts

# UIモードで実行（デバッグに便利）
npx playwright test --ui

# ヘッドフルモード（ブラウザ表示）
npx playwright test --headed

# 特定のブラウザのみ
npx playwright test --project=chromium
```

### デバッグ

```bash
# デバッグモード
npx playwright test --debug

# トレース付き実行
npx playwright test --trace on
```

### レポート確認

```bash
# HTMLレポートを開く
npx playwright show-report
```

---

## 設定ファイル

`playwright.config.ts` の主要設定:

```typescript
export default defineConfig({
  testDir: "./e2e_tests",
  fullyParallel: !process.env.CI,  // ローカルは並列、CIは直列
  retries: process.env.CI ? 2 : 0,  // CIではリトライあり
  workers: process.env.CI ? 1 : 2,  // CIでは1ワーカー
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## 実装例

### 認証ページのテスト

```typescript
/**
 * 認証機能E2Eテスト
 * Task 10.1: Discord認証機能のE2Eテスト
 * Requirements: 1.1, 5.1, 6.2
 */
import { expect, test } from "@playwright/test";

const DISCORD_LOGIN_BUTTON_PATTERN = /discord.*ログイン/i;

test.describe("認証機能E2Eテスト", () => {
  test.describe("Task 10.1: ログインページの表示検証", () => {
    test("Req 1.1: Discordログインボタンが表示される", async ({ page }) => {
      await page.goto("/auth/login");

      const heading = page.getByRole("heading", { level: 1 });
      await expect(heading).toHaveText("ログイン");

      const discordButton = page.getByRole("button", {
        name: DISCORD_LOGIN_BUTTON_PATTERN,
      });
      await expect(discordButton).toBeVisible();
      await expect(discordButton).toBeEnabled();
    });
  });

  test.describe("Task 10.1: ルート保護検証", () => {
    test("Req 5.1: 未認証で/dashboardにアクセスするとリダイレクト", async ({
      page,
    }) => {
      await page.goto("/dashboard");
      await page.waitForURL("**/auth/login");
      expect(page.url()).toContain("/auth/login");
    });
  });
});
```

### フォーム操作のテスト

```typescript
/**
 * フォーム操作E2Eテスト
 * Task 9.5: カレンダーイベント管理
 */
import { expect, test } from "@playwright/test";

const ADD_BUTTON_PATTERN = /追加|新規/;
const TITLE_LABEL_PATTERN = /タイトル/;
const SAVE_BUTTON_PATTERN = /保存/;

test.describe("フォーム操作E2Eテスト", () => {
  test("フォーム入力と保存が動作する", async ({ page }) => {
    await page.goto("/test/calendar");

    const toolbar = page.locator('[data-testid="calendar-toolbar"]');
    const addButton = toolbar.getByRole("button", { name: ADD_BUTTON_PATTERN });
    await addButton.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    const titleInput = dialog.getByLabel(TITLE_LABEL_PATTERN);
    await titleInput.fill("E2Eテスト予定");

    const saveButton = dialog.getByRole("button", { name: SAVE_BUTTON_PATTERN });
    await expect(saveButton).toBeEnabled();
  });
});
```

---

## ワークフロー手順

1. **要件確認**: テスト対象の機能・要件を確認
2. **ファイル作成**: `e2e_tests/` にテストファイルを作成
3. **パターン定義**: Top-level で正規表現パターンを定義
4. **テスト実装**: 上記パターンに従ってテストを記述
5. **ローカル実行**: `npm run test:e2e` で動作確認
6. **デバッグ**: 失敗時は `--debug` や `--ui` で原因調査
7. **コミット・PR**: CI で全ブラウザでのテストが実行される
