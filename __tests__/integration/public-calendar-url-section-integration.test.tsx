/**
 * 管理画面の公開URL設定UIの統合テスト
 *
 * Task 6.3: 管理画面の公開URL設定UIの動作確認テスト
 * - 公開URLの生成・コピー・無効化が正常に動作する
 * - 無効化時に確認ダイアログが表示される
 * - スラッグ再生成後に新しいURLが表示される
 *
 * Requirements: 1.1, 1.2, 1.3, 1.5, 5.1, 5.2, 5.3, 5.4, 5.5
 */
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Server Actions モック
const mockTogglePublicCalendar = vi.fn();
const mockRegeneratePublicSlugAction = vi.fn();

vi.mock("@/app/dashboard/actions", () => ({
  togglePublicCalendar: (...args: unknown[]) =>
    mockTogglePublicCalendar(...args),
  regeneratePublicSlugAction: (...args: unknown[]) =>
    mockRegeneratePublicSlugAction(...args),
}));

/** <code> 要素内のURLテキストを検証するヘルパー */
function expectUrlInCodeElement(slug: string) {
  const codeElements = document.querySelectorAll("code");
  const found = Array.from(codeElements).some((el) =>
    el.textContent?.includes(`/cal/${slug}`)
  );
  // biome-ignore lint/suspicious/noMisplacedAssertion: helper called from test blocks
  expect(found).toBe(true);
}

describe("Task 6.3: 管理画面の公開URL設定UI統合テスト", () => {
  let PublicCalendarUrlSection: typeof import("@/components/guilds/public-calendar-url-section").PublicCalendarUrlSection;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/components/guilds/public-calendar-url-section");
    PublicCalendarUrlSection = mod.PublicCalendarUrlSection;
  });

  afterEach(() => {
    cleanup();
  });

  describe("初期表示", () => {
    it("公開設定がオフの場合、URL生成を促すメッセージを表示する", () => {
      render(
        <PublicCalendarUrlSection
          guildId="12345678901234567"
          isPublic={false}
          publicSlug={null}
        />
      );

      expect(
        screen.getByText("トグルをオンにすると公開URLが生成されます。")
      ).toBeInTheDocument();
      expect(screen.getByText("カレンダーを公開する")).toBeInTheDocument();
    });

    it("公開設定がオンの場合、公開URLとコピーボタンを表示する", () => {
      render(
        <PublicCalendarUrlSection
          guildId="12345678901234567"
          isPublic={true}
          publicSlug="abc123def456"
        />
      );

      expectUrlInCodeElement("abc123def456");
      expect(screen.getByText("コピー")).toBeInTheDocument();
    });

    it("公開設定がオンの場合、URL再生成ボタンを表示する", () => {
      render(
        <PublicCalendarUrlSection
          guildId="12345678901234567"
          isPublic={true}
          publicSlug="abc123def456"
        />
      );

      expect(screen.getByText("URLを再生成")).toBeInTheDocument();
    });
  });

  describe("公開URLの生成", () => {
    it("トグルをオンにするとServer Actionが呼ばれ、URLが表示される", async () => {
      const user = userEvent.setup();

      mockTogglePublicCalendar.mockResolvedValue({
        success: true,
        data: { isPublic: true, publicSlug: "newslug12345" },
      });

      render(
        <PublicCalendarUrlSection
          guildId="12345678901234567"
          isPublic={false}
          publicSlug={null}
        />
      );

      const toggle = screen.getByRole("switch");
      await user.click(toggle);

      await waitFor(
        () => {
          expect(mockTogglePublicCalendar).toHaveBeenCalledWith({
            guildId: "12345678901234567",
            enabled: true,
          });
        },
        { timeout: 3000 }
      );

      await waitFor(
        () => {
          expectUrlInCodeElement("newslug12345");
        },
        { timeout: 3000 }
      );
    });
  });

  describe("コピー機能", () => {
    it("コピーボタンをクリックするとclipboard APIが呼ばれ、フィードバックが表示される", async () => {
      const user = userEvent.setup();

      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: mockWriteText },
        writable: true,
        configurable: true,
      });

      render(
        <PublicCalendarUrlSection
          guildId="12345678901234567"
          isPublic={true}
          publicSlug="abc123def456"
        />
      );

      const copyButton = screen.getByText("コピー");
      await user.click(copyButton);

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith(
          expect.stringContaining("/cal/abc123def456")
        );
      });

      await waitFor(() => {
        expect(screen.getByText("コピーしました")).toBeInTheDocument();
      });
    });
  });

  describe("公開設定の無効化", () => {
    it("トグルをオフにすると確認ダイアログが表示される", async () => {
      const user = userEvent.setup();

      render(
        <PublicCalendarUrlSection
          guildId="12345678901234567"
          isPublic={true}
          publicSlug="abc123def456"
        />
      );

      const toggle = screen.getByRole("switch");
      await user.click(toggle);

      await waitFor(() => {
        expect(
          screen.getByText("公開カレンダーを無効にしますか？")
        ).toBeInTheDocument();
      });

      expect(
        screen.getByText(
          "無効にすると、既存の共有URLからアクセスできなくなります。再度有効にすると、同じURLで再公開できます。"
        )
      ).toBeInTheDocument();
    });

    it("確認ダイアログでキャンセルすると無効化されない", async () => {
      const user = userEvent.setup();

      render(
        <PublicCalendarUrlSection
          guildId="12345678901234567"
          isPublic={true}
          publicSlug="abc123def456"
        />
      );

      const toggle = screen.getByRole("switch");
      await user.click(toggle);

      await waitFor(() => {
        expect(
          screen.getByText("公開カレンダーを無効にしますか？")
        ).toBeInTheDocument();
      });

      // ダイアログ内のキャンセルボタンを特定
      const dialog = screen.getByRole("alertdialog");
      const cancelButton = within(dialog).getByText("キャンセル");
      await user.click(cancelButton);

      expect(mockTogglePublicCalendar).not.toHaveBeenCalled();
      expectUrlInCodeElement("abc123def456");
    });

    it("確認ダイアログで無効化を実行するとServer Actionが呼ばれる", async () => {
      const user = userEvent.setup();

      mockTogglePublicCalendar.mockResolvedValue({
        success: true,
        data: { isPublic: false, publicSlug: null },
      });

      render(
        <PublicCalendarUrlSection
          guildId="12345678901234567"
          isPublic={true}
          publicSlug="abc123def456"
        />
      );

      const toggle = screen.getByRole("switch");
      await user.click(toggle);

      await waitFor(() => {
        expect(
          screen.getByText("公開カレンダーを無効にしますか？")
        ).toBeInTheDocument();
      });

      const confirmButton = screen.getByText("無効にする");
      await user.click(confirmButton);

      await waitFor(
        () => {
          expect(mockTogglePublicCalendar).toHaveBeenCalledWith({
            guildId: "12345678901234567",
            enabled: false,
          });
        },
        { timeout: 3000 }
      );

      await waitFor(
        () => {
          expect(
            screen.getByText("トグルをオンにすると公開URLが生成されます。")
          ).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });
  });

  describe("スラッグ再生成", () => {
    it("再生成ボタンをクリックすると確認ダイアログが表示される", async () => {
      const user = userEvent.setup();

      render(
        <PublicCalendarUrlSection
          guildId="12345678901234567"
          isPublic={true}
          publicSlug="abc123def456"
        />
      );

      const regenerateButton = screen.getByText("URLを再生成");
      await user.click(regenerateButton);

      await waitFor(() => {
        expect(screen.getByText("URLを再生成しますか？")).toBeInTheDocument();
      });

      expect(
        screen.getByText(
          "現在のURLは無効になり、新しいURLが発行されます。既存の共有リンクは使用できなくなります。"
        )
      ).toBeInTheDocument();
    });

    it("再生成確認後にServer Actionが呼ばれ、新しいURLが表示される", async () => {
      const user = userEvent.setup();

      mockRegeneratePublicSlugAction.mockResolvedValue({
        success: true,
        data: { publicSlug: "newslugabc12" },
      });

      render(
        <PublicCalendarUrlSection
          guildId="12345678901234567"
          isPublic={true}
          publicSlug="abc123def456"
        />
      );

      expectUrlInCodeElement("abc123def456");

      const regenerateButton = screen.getByText("URLを再生成");
      await user.click(regenerateButton);

      await waitFor(() => {
        expect(screen.getByText("URLを再生成しますか？")).toBeInTheDocument();
      });

      const dialog = screen.getByRole("alertdialog");
      const confirmButton = within(dialog).getByText("再生成する");
      await user.click(confirmButton);

      await waitFor(
        () => {
          expect(mockRegeneratePublicSlugAction).toHaveBeenCalledWith({
            guildId: "12345678901234567",
          });
        },
        { timeout: 3000 }
      );

      await waitFor(
        () => {
          expectUrlInCodeElement("newslugabc12");
        },
        { timeout: 3000 }
      );
    });

    it("再生成ダイアログでキャンセルするとURLは変更されない", async () => {
      const user = userEvent.setup();

      render(
        <PublicCalendarUrlSection
          guildId="12345678901234567"
          isPublic={true}
          publicSlug="abc123def456"
        />
      );

      const regenerateButton = screen.getByText("URLを再生成");
      await user.click(regenerateButton);

      await waitFor(() => {
        expect(screen.getByText("URLを再生成しますか？")).toBeInTheDocument();
      });

      const dialog = screen.getByRole("alertdialog");
      const cancelButton = within(dialog).getByText("キャンセル");
      await user.click(cancelButton);

      expect(mockRegeneratePublicSlugAction).not.toHaveBeenCalled();
      expectUrlInCodeElement("abc123def456");
    });

    it("公開設定がオフの場合、再生成ボタンが表示されない", () => {
      render(
        <PublicCalendarUrlSection
          guildId="12345678901234567"
          isPublic={false}
          publicSlug={null}
        />
      );

      expect(screen.queryByText("URLを再生成")).not.toBeInTheDocument();
    });
  });

  describe("エラーハンドリング", () => {
    it("有効化失敗時にエラーメッセージが表示される", async () => {
      const user = userEvent.setup();

      mockTogglePublicCalendar.mockResolvedValue({
        success: false,
        error: {
          code: "SLUG_GENERATION_FAILED",
          message: "スラッグの生成に失敗しました。",
        },
      });

      render(
        <PublicCalendarUrlSection
          guildId="12345678901234567"
          isPublic={false}
          publicSlug={null}
        />
      );

      const toggle = screen.getByRole("switch");
      await user.click(toggle);

      await waitFor(
        () => {
          expect(
            screen.getByText("スラッグの生成に失敗しました。")
          ).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it("再生成失敗時にエラーメッセージが表示される", async () => {
      const user = userEvent.setup();

      mockRegeneratePublicSlugAction.mockResolvedValue({
        success: false,
        error: {
          code: "SLUG_GENERATION_FAILED",
          message: "スラッグの生成に失敗しました。",
        },
      });

      render(
        <PublicCalendarUrlSection
          guildId="12345678901234567"
          isPublic={true}
          publicSlug="abc123def456"
        />
      );

      const regenerateButton = screen.getByText("URLを再生成");
      await user.click(regenerateButton);

      await waitFor(() => {
        expect(screen.getByText("URLを再生成しますか？")).toBeInTheDocument();
      });

      const dialog = screen.getByRole("alertdialog");
      const confirmButton = within(dialog).getByText("再生成する");
      await user.click(confirmButton);

      await waitFor(
        () => {
          expect(
            screen.getByText("スラッグの生成に失敗しました。")
          ).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });
  });
});
