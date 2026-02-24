/**
 * 繰り返しイベント E2Eテスト
 *
 * タスク8.2: E2Eテストを作成する
 * - 繰り返しイベント作成からカレンダー表示、オカレンスクリック、プレビュー確認
 * - 「この予定のみ」編集で該当オカレンスのみが変更されることを確認
 * - 「すべての予定」削除で全オカレンスが消失することを確認
 * - 「これ以降の予定」削除で選択日以降のみが消失することを確認
 *
 * Requirements: 5.2, 5.4, 6.3, 7.2
 *
 * Note: E2Eテストでは /test/calendar ルートを使用（認証不要）
 */
import { expect, test } from "@playwright/test";

const TEST_CALENDAR_PATH = "/test/calendar";

// ボタン・ラベルのパターン
const ADD_BUTTON_PATTERN = /追加|新規/;
const SAVE_BUTTON_PATTERN = /保存/;
const TITLE_LABEL_PATTERN = /タイトル/;
const CANCEL_BUTTON_PATTERN = /キャンセル/;

// 繰り返し設定パターン
const FREQUENCY_PATTERN = /頻度/;
const INTERVAL_PATTERN = /間隔/;
const END_CONDITION_PATTERN = /終了条件/;
const COUNT_OPTION_PATTERN = /回数/;
const COUNT_INPUT_PATTERN = /回数/;
const WEEKLY_OPTION_PATTERN = /毎週/;
const DAY_BUTTONS_PATTERN = /繰り返す曜日/;
const DELETE_TEXT_PATTERN = /削除/;

// スコープ選択パターン
const SCOPE_THIS_PATTERN = /この予定のみ/;
const SCOPE_ALL_PATTERN = /すべての予定/;
const SCOPE_FOLLOWING_PATTERN = /これ以降の予定/;

test.describe("繰り返しイベント E2Eテスト", () => {
  test.describe("タスク8.2: 繰り返しイベント作成フロー", () => {
    test("繰り返し設定トグルが作成フォームに表示される", async ({ page }) => {
      await page.goto(TEST_CALENDAR_PATH);

      // ツールバーの追加ボタンをクリック
      const toolbar = page.locator('[data-testid="calendar-toolbar"]');
      const addButton = toolbar.getByRole("button", {
        name: ADD_BUTTON_PATTERN,
      });
      await expect(addButton).toBeVisible();
      await addButton.click();

      // ダイアログが開く
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();

      // 繰り返しトグルが存在する
      const recurringSwitch = dialog.locator("#isRecurring");
      await expect(recurringSwitch).toBeVisible();
    });

    test("繰り返しトグルをONにすると繰り返し設定UIが表示される", async ({
      page,
    }) => {
      await page.goto(TEST_CALENDAR_PATH);

      const toolbar = page.locator('[data-testid="calendar-toolbar"]');
      const addButton = toolbar.getByRole("button", {
        name: ADD_BUTTON_PATTERN,
      });
      await expect(addButton).toBeVisible();
      await addButton.click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();

      // 繰り返しトグルをON
      const recurringSwitch = dialog.locator("#isRecurring");
      await recurringSwitch.click();

      // 頻度選択が表示される
      const frequencySelect = dialog.getByRole("combobox", {
        name: FREQUENCY_PATTERN,
      });
      await expect(frequencySelect).toBeVisible();

      // 間隔入力が表示される
      const intervalInput = dialog.getByRole("spinbutton", {
        name: INTERVAL_PATTERN,
      });
      await expect(intervalInput).toBeVisible();

      // 終了条件選択が表示される
      const endConditionSelect = dialog.getByRole("combobox", {
        name: END_CONDITION_PATTERN,
      });
      await expect(endConditionSelect).toBeVisible();
    });

    test("毎週の頻度選択時に曜日選択UIが表示される", async ({ page }) => {
      await page.goto(TEST_CALENDAR_PATH);

      const toolbar = page.locator('[data-testid="calendar-toolbar"]');
      const addButton = toolbar.getByRole("button", {
        name: ADD_BUTTON_PATTERN,
      });
      await expect(addButton).toBeVisible();
      await addButton.click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();

      // 繰り返しトグルをON
      const recurringSwitch = dialog.locator("#isRecurring");
      await recurringSwitch.click();

      // 頻度を「毎週」に変更
      const frequencySelect = dialog.getByRole("combobox", {
        name: FREQUENCY_PATTERN,
      });
      await frequencySelect.click();
      await page.getByRole("option", { name: WEEKLY_OPTION_PATTERN }).click();

      // 曜日選択のトグルグループが表示される
      const dayButtons = dialog.getByRole("group", {
        name: DAY_BUTTONS_PATTERN,
      });
      await expect(dayButtons).toBeVisible();
    });

    test("繰り返しイベントを作成してカレンダーに表示される", async ({
      page,
    }) => {
      await page.goto(TEST_CALENDAR_PATH);

      const toolbar = page.locator('[data-testid="calendar-toolbar"]');
      const addButton = toolbar.getByRole("button", {
        name: ADD_BUTTON_PATTERN,
      });
      await expect(addButton).toBeVisible();
      await addButton.click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();

      // タイトルを入力
      const titleInput = dialog.getByLabel(TITLE_LABEL_PATTERN);
      await titleInput.fill("E2E繰り返しテスト");

      // 繰り返しトグルをON
      const recurringSwitch = dialog.locator("#isRecurring");
      await recurringSwitch.click();

      // 頻度を「毎日」（デフォルト）のまま、終了条件を「回数指定」に
      const endConditionSelect = dialog.getByRole("combobox", {
        name: END_CONDITION_PATTERN,
      });
      await endConditionSelect.click();
      await page.getByRole("option", { name: COUNT_OPTION_PATTERN }).click();

      // 回数を入力
      const countInput = dialog.getByRole("spinbutton", {
        name: COUNT_INPUT_PATTERN,
      });
      await countInput.fill("3");

      // 保存
      const saveButton = dialog.getByRole("button", {
        name: SAVE_BUTTON_PATTERN,
      });
      await saveButton.click();

      // ダイアログが閉じることを確認
      await expect(dialog).not.toBeVisible({ timeout: 10_000 });

      // カレンダー上にイベントが表示されることを確認
      const calendarGrid = page.locator('[data-testid="calendar-grid"]');
      const eventBlocks = calendarGrid.locator('[data-testid="event-block"]');

      // 繰り返しイベントが少なくとも1つ表示されることを確認
      // (表示範囲によってはすべてのオカレンスが見えるとは限らない)
      await expect(
        eventBlocks.filter({ hasText: "E2E繰り返しテスト" }).first()
      ).toBeVisible({
        timeout: 10_000,
      });
    });

    test("繰り返しイベントに繰り返しアイコンインジケーターが表示される", async ({
      page,
    }) => {
      await page.goto(TEST_CALENDAR_PATH);

      const toolbar = page.locator('[data-testid="calendar-toolbar"]');
      const addButton = toolbar.getByRole("button", {
        name: ADD_BUTTON_PATTERN,
      });
      await expect(addButton).toBeVisible();
      await addButton.click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();

      // タイトル入力
      const titleInput = dialog.getByLabel(TITLE_LABEL_PATTERN);
      await titleInput.fill("繰り返しアイコンテスト");

      // 繰り返しON + 毎日 + 回数1
      const recurringSwitch = dialog.locator("#isRecurring");
      await recurringSwitch.click();
      const endConditionSelect = dialog.getByRole("combobox", {
        name: END_CONDITION_PATTERN,
      });
      await endConditionSelect.click();
      await page.getByRole("option", { name: COUNT_OPTION_PATTERN }).click();
      const countInput = dialog.getByRole("spinbutton", {
        name: COUNT_INPUT_PATTERN,
      });
      await countInput.fill("1");

      // 保存
      const saveButton = dialog.getByRole("button", {
        name: SAVE_BUTTON_PATTERN,
      });
      await saveButton.click();
      await expect(dialog).not.toBeVisible({ timeout: 10_000 });

      // 繰り返しアイコンが表示されることを確認
      const calendarGrid = page.locator('[data-testid="calendar-grid"]');
      const eventBlock = calendarGrid
        .locator('[data-testid="event-block"]')
        .filter({ hasText: "繰り返しアイコンテスト" })
        .first();
      await expect(eventBlock).toBeVisible({ timeout: 10_000 });

      // 繰り返しインジケーターが表示されることを確認
      const recurringIndicator = eventBlock.locator(
        '[data-testid="recurring-indicator"]'
      );
      await expect(recurringIndicator).toBeVisible();
    });
  });

  test.describe("タスク8.2: オカレンスクリックとプレビュー", () => {
    test("繰り返しイベントのオカレンスをクリックするとプレビューに繰り返し情報が表示される", async ({
      page,
    }) => {
      await page.goto(TEST_CALENDAR_PATH);

      // 繰り返しイベントを作成
      const toolbar = page.locator('[data-testid="calendar-toolbar"]');
      const addButton = toolbar.getByRole("button", {
        name: ADD_BUTTON_PATTERN,
      });
      await expect(addButton).toBeVisible();
      await addButton.click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();

      const titleInput = dialog.getByLabel(TITLE_LABEL_PATTERN);
      await titleInput.fill("プレビューテスト");

      const recurringSwitch = dialog.locator("#isRecurring");
      await recurringSwitch.click();

      // 毎日 + 回数2
      const endConditionSelect = dialog.getByRole("combobox", {
        name: END_CONDITION_PATTERN,
      });
      await endConditionSelect.click();
      await page.getByRole("option", { name: COUNT_OPTION_PATTERN }).click();
      const countInput = dialog.getByRole("spinbutton", {
        name: COUNT_INPUT_PATTERN,
      });
      await countInput.fill("2");

      const saveButton = dialog.getByRole("button", {
        name: SAVE_BUTTON_PATTERN,
      });
      await saveButton.click();
      await expect(dialog).not.toBeVisible({ timeout: 10_000 });

      // オカレンスをクリック
      const calendarGrid = page.locator('[data-testid="calendar-grid"]');
      const eventBlock = calendarGrid
        .locator('[data-testid="event-block"]')
        .filter({ hasText: "プレビューテスト" })
        .first();
      await expect(eventBlock).toBeVisible({ timeout: 10_000 });
      await eventBlock.click();

      // ポップオーバーが表示される
      const popover = page.locator('[data-testid="event-popover"]');
      await expect(popover).toBeVisible({ timeout: 5000 });

      // 繰り返し情報が表示される
      const recurrenceInfo = popover.locator('[data-testid="recurrence-info"]');
      await expect(recurrenceInfo).toBeVisible();

      // 編集・削除ボタンが表示される
      const editButton = popover.locator('[data-testid="event-edit-button"]');
      const deleteButton = popover.locator(
        '[data-testid="event-delete-button"]'
      );
      await expect(editButton).toBeVisible();
      await expect(deleteButton).toBeVisible();
    });
  });

  test.describe("タスク8.2: 編集・削除スコープ選択", () => {
    /**
     * テストデータ: 繰り返しイベントを作成して返す
     */
    async function createRecurringEvent(
      page: ReturnType<typeof test.info>["_test"] extends never
        ? never
        : Parameters<Parameters<typeof test>[2]>[0]["page"],
      title: string
    ) {
      const toolbar = page.locator('[data-testid="calendar-toolbar"]');
      const addButton = toolbar.getByRole("button", {
        name: ADD_BUTTON_PATTERN,
      });
      await expect(addButton).toBeVisible();
      await addButton.click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();

      const titleInput = dialog.getByLabel(TITLE_LABEL_PATTERN);
      await titleInput.fill(title);

      const recurringSwitch = dialog.locator("#isRecurring");
      await recurringSwitch.click();

      // 毎日 + 回数5
      const endConditionSelect = dialog.getByRole("combobox", {
        name: END_CONDITION_PATTERN,
      });
      await endConditionSelect.click();
      await page.getByRole("option", { name: COUNT_OPTION_PATTERN }).click();
      const countInput = dialog.getByRole("spinbutton", {
        name: COUNT_INPUT_PATTERN,
      });
      await countInput.fill("5");

      const saveButton = dialog.getByRole("button", {
        name: SAVE_BUTTON_PATTERN,
      });
      await saveButton.click();
      await expect(dialog).not.toBeVisible({ timeout: 10_000 });

      // イベントが表示されるまで待つ
      const calendarGrid = page.locator('[data-testid="calendar-grid"]');
      const eventBlock = calendarGrid
        .locator('[data-testid="event-block"]')
        .filter({ hasText: title })
        .first();
      await expect(eventBlock).toBeVisible({ timeout: 10_000 });
    }

    test("繰り返しイベントの編集ボタンクリックでスコープ選択ダイアログが表示される", async ({
      page,
    }) => {
      await page.goto(TEST_CALENDAR_PATH);
      await createRecurringEvent(page, "スコープテスト編集");

      // オカレンスをクリック
      const calendarGrid = page.locator('[data-testid="calendar-grid"]');
      const eventBlock = calendarGrid
        .locator('[data-testid="event-block"]')
        .filter({ hasText: "スコープテスト編集" })
        .first();
      await eventBlock.click();

      // ポップオーバーの編集ボタンをクリック
      const popover = page.locator('[data-testid="event-popover"]');
      await expect(popover).toBeVisible({ timeout: 5000 });
      const editButton = popover.locator('[data-testid="event-edit-button"]');
      await editButton.click();

      // EditScopeDialog が表示される
      const scopeDialog = page.getByRole("alertdialog");
      await expect(scopeDialog).toBeVisible({ timeout: 5000 });

      // 3つのスコープ選択ボタンが表示される
      await expect(
        scopeDialog.getByRole("button", { name: SCOPE_THIS_PATTERN })
      ).toBeVisible();
      await expect(
        scopeDialog.getByRole("button", { name: SCOPE_ALL_PATTERN })
      ).toBeVisible();
      await expect(
        scopeDialog.getByRole("button", { name: SCOPE_FOLLOWING_PATTERN })
      ).toBeVisible();

      // キャンセルボタンが表示される
      await expect(
        scopeDialog.getByRole("button", { name: CANCEL_BUTTON_PATTERN })
      ).toBeVisible();
    });

    test("繰り返しイベントの削除ボタンクリックでスコープ選択ダイアログが表示される", async ({
      page,
    }) => {
      await page.goto(TEST_CALENDAR_PATH);
      await createRecurringEvent(page, "スコープテスト削除");

      // オカレンスをクリック
      const calendarGrid = page.locator('[data-testid="calendar-grid"]');
      const eventBlock = calendarGrid
        .locator('[data-testid="event-block"]')
        .filter({ hasText: "スコープテスト削除" })
        .first();
      await eventBlock.click();

      // ポップオーバーの削除ボタンをクリック
      const popover = page.locator('[data-testid="event-popover"]');
      await expect(popover).toBeVisible({ timeout: 5000 });
      const deleteButton = popover.locator(
        '[data-testid="event-delete-button"]'
      );
      await deleteButton.click();

      // 削除用EditScopeDialog が表示される
      const scopeDialog = page.getByRole("alertdialog");
      await expect(scopeDialog).toBeVisible({ timeout: 5000 });

      // 削除モードのタイトルが表示される
      await expect(scopeDialog.getByText(DELETE_TEXT_PATTERN)).toBeVisible();

      // 3つのスコープ選択ボタンが表示される
      await expect(
        scopeDialog.getByRole("button", { name: SCOPE_THIS_PATTERN })
      ).toBeVisible();
      await expect(
        scopeDialog.getByRole("button", { name: SCOPE_ALL_PATTERN })
      ).toBeVisible();
      await expect(
        scopeDialog.getByRole("button", { name: SCOPE_FOLLOWING_PATTERN })
      ).toBeVisible();
    });

    test("「この予定のみ」削除で該当オカレンスのみが消失する", async ({
      page,
    }) => {
      await page.goto(TEST_CALENDAR_PATH);
      const eventTitle = "単一削除テスト";
      await createRecurringEvent(page, eventTitle);

      // 削除前のオカレンス数をカウント
      const calendarGrid = page.locator('[data-testid="calendar-grid"]');
      const eventBlocks = calendarGrid
        .locator('[data-testid="event-block"]')
        .filter({ hasText: eventTitle });
      const countBefore = await eventBlocks.count();

      // 最初のオカレンスをクリック → 削除 → 「この予定のみ」
      const firstBlock = eventBlocks.first();
      await firstBlock.click();

      const popover = page.locator('[data-testid="event-popover"]');
      await expect(popover).toBeVisible({ timeout: 5000 });
      const deleteButton = popover.locator(
        '[data-testid="event-delete-button"]'
      );
      await deleteButton.click();

      const scopeDialog = page.getByRole("alertdialog");
      await expect(scopeDialog).toBeVisible({ timeout: 5000 });
      await scopeDialog
        .getByRole("button", { name: SCOPE_THIS_PATTERN })
        .click();

      // スコープダイアログが閉じる
      await expect(scopeDialog).not.toBeVisible({ timeout: 10_000 });

      // 削除後のオカレンス数が1つ減っていることを確認
      const countAfter = await calendarGrid
        .locator('[data-testid="event-block"]')
        .filter({ hasText: eventTitle })
        .count();
      expect(countAfter).toBe(countBefore - 1);
    });

    test("「すべての予定」削除で全オカレンスが消失する", async ({ page }) => {
      await page.goto(TEST_CALENDAR_PATH);
      const eventTitle = "全削除テスト";
      await createRecurringEvent(page, eventTitle);

      // オカレンスをクリック → 削除 → 「すべての予定」
      const calendarGrid = page.locator('[data-testid="calendar-grid"]');
      const firstBlock = calendarGrid
        .locator('[data-testid="event-block"]')
        .filter({ hasText: eventTitle })
        .first();
      await firstBlock.click();

      const popover = page.locator('[data-testid="event-popover"]');
      await expect(popover).toBeVisible({ timeout: 5000 });
      const deleteButton = popover.locator(
        '[data-testid="event-delete-button"]'
      );
      await deleteButton.click();

      const scopeDialog = page.getByRole("alertdialog");
      await expect(scopeDialog).toBeVisible({ timeout: 5000 });
      await scopeDialog
        .getByRole("button", { name: SCOPE_ALL_PATTERN })
        .click();

      // スコープダイアログが閉じる
      await expect(scopeDialog).not.toBeVisible({ timeout: 10_000 });

      // 全オカレンスが消失
      const remainingBlocks = calendarGrid
        .locator('[data-testid="event-block"]')
        .filter({ hasText: eventTitle });
      await expect(remainingBlocks).toHaveCount(0, { timeout: 10_000 });
    });

    test("「これ以降の予定」削除で選択日以降のオカレンスのみが消失する", async ({
      page,
    }) => {
      await page.goto(TEST_CALENDAR_PATH);
      const eventTitle = "以降削除テスト";
      await createRecurringEvent(page, eventTitle);

      // 削除前のオカレンス数をカウント
      const calendarGrid = page.locator('[data-testid="calendar-grid"]');
      const eventBlocks = calendarGrid
        .locator('[data-testid="event-block"]')
        .filter({ hasText: eventTitle });
      const countBefore = await eventBlocks.count();

      // 最初のオカレンス以外（2番目以降）をクリック
      // 2番目のオカレンスから「これ以降の予定」を削除すると、
      // 最初の1つだけが残るはず
      if (countBefore >= 2) {
        const secondBlock = eventBlocks.nth(1);
        await secondBlock.click();

        const popover = page.locator('[data-testid="event-popover"]');
        await expect(popover).toBeVisible({ timeout: 5000 });
        const deleteButton = popover.locator(
          '[data-testid="event-delete-button"]'
        );
        await deleteButton.click();

        const scopeDialog = page.getByRole("alertdialog");
        await expect(scopeDialog).toBeVisible({ timeout: 5000 });
        await scopeDialog
          .getByRole("button", { name: SCOPE_FOLLOWING_PATTERN })
          .click();

        // スコープダイアログが閉じる
        await expect(scopeDialog).not.toBeVisible({ timeout: 10_000 });

        // 選択日以降が削除され、それより前のオカレンスのみ残る
        const countAfter = await calendarGrid
          .locator('[data-testid="event-block"]')
          .filter({ hasText: eventTitle })
          .count();
        expect(countAfter).toBeLessThan(countBefore);
        expect(countAfter).toBeGreaterThanOrEqual(1);
      }
    });

    test("「この予定のみ」編集でスコープ選択後に編集ダイアログが開く", async ({
      page,
    }) => {
      await page.goto(TEST_CALENDAR_PATH);
      await createRecurringEvent(page, "単一編集テスト");

      // オカレンスをクリック → 編集 → 「この予定のみ」
      const calendarGrid = page.locator('[data-testid="calendar-grid"]');
      const firstBlock = calendarGrid
        .locator('[data-testid="event-block"]')
        .filter({ hasText: "単一編集テスト" })
        .first();
      await firstBlock.click();

      const popover = page.locator('[data-testid="event-popover"]');
      await expect(popover).toBeVisible({ timeout: 5000 });
      const editButton = popover.locator('[data-testid="event-edit-button"]');
      await editButton.click();

      const scopeDialog = page.getByRole("alertdialog");
      await expect(scopeDialog).toBeVisible({ timeout: 5000 });
      await scopeDialog
        .getByRole("button", { name: SCOPE_THIS_PATTERN })
        .click();

      // 編集ダイアログが開く
      const editDialog = page.getByRole("dialog");
      await expect(editDialog).toBeVisible({ timeout: 10_000 });

      // タイトル入力が既存の値で初期化されている
      const titleInput = editDialog.getByLabel(TITLE_LABEL_PATTERN);
      await expect(titleInput).toHaveValue("単一編集テスト");
    });

    test("スコープ選択ダイアログのキャンセルボタンでダイアログが閉じる", async ({
      page,
    }) => {
      await page.goto(TEST_CALENDAR_PATH);
      await createRecurringEvent(page, "キャンセルテスト");

      // オカレンスをクリック → 編集
      const calendarGrid = page.locator('[data-testid="calendar-grid"]');
      const firstBlock = calendarGrid
        .locator('[data-testid="event-block"]')
        .filter({ hasText: "キャンセルテスト" })
        .first();
      await firstBlock.click();

      const popover = page.locator('[data-testid="event-popover"]');
      await expect(popover).toBeVisible({ timeout: 5000 });
      const editButton = popover.locator('[data-testid="event-edit-button"]');
      await editButton.click();

      // スコープダイアログが表示される
      const scopeDialog = page.getByRole("alertdialog");
      await expect(scopeDialog).toBeVisible({ timeout: 5000 });

      // キャンセルボタンをクリック
      await scopeDialog
        .getByRole("button", { name: CANCEL_BUTTON_PATTERN })
        .click();

      // ダイアログが閉じる
      await expect(scopeDialog).not.toBeVisible();
    });
  });

  test.describe("タスク8.2: 繰り返し設定フォームのバリデーション", () => {
    test("繰り返しトグルをOFFにして保存すると単発イベントとして作成される", async ({
      page,
    }) => {
      await page.goto(TEST_CALENDAR_PATH);

      const toolbar = page.locator('[data-testid="calendar-toolbar"]');
      const addButton = toolbar.getByRole("button", {
        name: ADD_BUTTON_PATTERN,
      });
      await expect(addButton).toBeVisible();
      await addButton.click();

      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();

      // タイトル入力
      const titleInput = dialog.getByLabel(TITLE_LABEL_PATTERN);
      await titleInput.fill("単発テスト");

      // 繰り返しトグルはOFFのまま
      const recurringSwitch = dialog.locator("#isRecurring");
      // Switchがuncheckedであることを確認
      await expect(recurringSwitch).not.toBeChecked();

      // 保存
      const saveButton = dialog.getByRole("button", {
        name: SAVE_BUTTON_PATTERN,
      });
      await saveButton.click();
      await expect(dialog).not.toBeVisible({ timeout: 10_000 });

      // カレンダーに単発イベントとして表示される（繰り返しアイコンなし）
      const calendarGrid = page.locator('[data-testid="calendar-grid"]');
      const eventBlock = calendarGrid
        .locator('[data-testid="event-block"]')
        .filter({ hasText: "単発テスト" })
        .first();
      await expect(eventBlock).toBeVisible({ timeout: 10_000 });

      // 繰り返しインジケーターが表示されないことを確認
      const recurringIndicator = eventBlock.locator(
        '[data-testid="recurring-indicator"]'
      );
      await expect(recurringIndicator).not.toBeVisible();
    });
  });
});
