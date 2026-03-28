/**
 * IcsFeedUrlSection コンポーネントのテスト
 *
 * Task 5.1, 5.2, 5.3: ICSフィードURL表示・コピー・トークン再生成
 * - 公開ギルド: トークンなしURL表示
 * - 非公開ギルド: トークン付きURL表示 + トークン再生成ボタン
 * - コピーボタンクリック → クリップボード書き込み + フィードバック
 * - トークン再生成 → 確認ダイアログ → 新URL表示
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
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
const mockGetOrCreateIcsFeedToken = vi.fn();
const mockRegenerateIcsFeedToken = vi.fn();

vi.mock("@/app/dashboard/actions", () => ({
  getOrCreateIcsFeedToken: (...args: unknown[]) =>
    mockGetOrCreateIcsFeedToken(...args),
  regenerateIcsFeedToken: (...args: unknown[]) =>
    mockRegenerateIcsFeedToken(...args),
}));

/** フィードURLを含む <code> 要素が存在するか検証するヘルパー */
function expectUrlInCodeElement(urlSubstring: string) {
  const codeElements = document.querySelectorAll("code");
  const found = Array.from(codeElements).some((el) =>
    el.textContent?.includes(urlSubstring)
  );
  // biome-ignore lint/suspicious/noMisplacedAssertion: helper called from test blocks
  expect(found).toBe(true);
}

describe("IcsFeedUrlSection", () => {
  let IcsFeedUrlSection: typeof import("@/components/guilds/ics-feed-url-section").IcsFeedUrlSection;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/components/guilds/ics-feed-url-section");
    IcsFeedUrlSection = mod.IcsFeedUrlSection;
  });

  afterEach(() => {
    cleanup();
  });

  describe("5.1: 初期表示", () => {
    it("公開ギルドの場合、トークンなしのフィードURLを表示する", () => {
      render(
        <IcsFeedUrlSection
          feedUrl="https://example.supabase.co/functions/v1/ics-feed?guild_id=12345678901234567"
          guildId="12345678901234567"
          isPublic={true}
        />
      );

      expectUrlInCodeElement(
        "https://example.supabase.co/functions/v1/ics-feed?guild_id=12345678901234567"
      );
    });

    it("非公開ギルドの場合、トークン付きのフィードURLを表示する", () => {
      render(
        <IcsFeedUrlSection
          feedUrl="https://example.supabase.co/functions/v1/ics-feed?guild_id=12345678901234567&token=abc123"
          guildId="12345678901234567"
          isPublic={false}
        />
      );

      expectUrlInCodeElement(
        "ics-feed?guild_id=12345678901234567&token=abc123"
      );
    });

    it("コピーボタンが表示される", () => {
      render(
        <IcsFeedUrlSection
          feedUrl="https://example.supabase.co/functions/v1/ics-feed?guild_id=12345678901234567"
          guildId="12345678901234567"
          isPublic={true}
        />
      );

      expect(screen.getByText("コピー")).toBeInTheDocument();
    });

    it("非公開ギルドの場合、トークン再生成ボタンが表示される", () => {
      render(
        <IcsFeedUrlSection
          feedUrl="https://example.supabase.co/functions/v1/ics-feed?guild_id=12345678901234567&token=abc123"
          guildId="12345678901234567"
          isPublic={false}
        />
      );

      expect(screen.getByText("トークンを再生成")).toBeInTheDocument();
    });

    it("公開ギルドの場合、トークン再生成ボタンが表示されない", () => {
      render(
        <IcsFeedUrlSection
          feedUrl="https://example.supabase.co/functions/v1/ics-feed?guild_id=12345678901234567"
          guildId="12345678901234567"
          isPublic={true}
        />
      );

      expect(screen.queryByText("トークンを再生成")).not.toBeInTheDocument();
    });

    it("feedUrlが空の場合、ローディング表示ではなくURL取得を促すメッセージを表示する", () => {
      render(
        <IcsFeedUrlSection
          feedUrl=""
          guildId="12345678901234567"
          isPublic={false}
        />
      );

      expect(
        screen.getByText(
          "フィードURLの取得に失敗しました。ページを再読み込みしてください。"
        )
      ).toBeInTheDocument();
    });
  });

  describe("5.1: コピー機能", () => {
    it("コピーボタンをクリックするとclipboard APIが呼ばれ、フィードバックが表示される", async () => {
      const user = userEvent.setup();
      const feedUrl =
        "https://example.supabase.co/functions/v1/ics-feed?guild_id=12345678901234567";

      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: mockWriteText },
        writable: true,
        configurable: true,
      });

      render(
        <IcsFeedUrlSection
          feedUrl={feedUrl}
          guildId="12345678901234567"
          isPublic={true}
        />
      );

      const copyButton = screen.getByText("コピー");
      await user.click(copyButton);

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith(feedUrl);
      });

      await waitFor(() => {
        expect(screen.getByText("コピーしました")).toBeInTheDocument();
      });
    });

    it("コピー失敗時にエラーメッセージが表示される", async () => {
      const user = userEvent.setup();

      const mockWriteText = vi
        .fn()
        .mockRejectedValue(new Error("Clipboard API not supported"));
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: mockWriteText },
        writable: true,
        configurable: true,
      });

      render(
        <IcsFeedUrlSection
          feedUrl="https://example.supabase.co/functions/v1/ics-feed?guild_id=12345678901234567"
          guildId="12345678901234567"
          isPublic={true}
        />
      );

      const copyButton = screen.getByText("コピー");
      await user.click(copyButton);

      await waitFor(() => {
        expect(
          screen.getByText("URLのコピーに失敗しました。")
        ).toBeInTheDocument();
      });
    });
  });

  describe("5.2: トークン再生成", () => {
    it("再生成ボタンをクリックすると確認ダイアログが表示される", async () => {
      const user = userEvent.setup();

      render(
        <IcsFeedUrlSection
          feedUrl="https://example.supabase.co/functions/v1/ics-feed?guild_id=12345678901234567&token=abc123"
          guildId="12345678901234567"
          isPublic={false}
        />
      );

      const regenerateButton = screen.getByText("トークンを再生成");
      await user.click(regenerateButton);

      await waitFor(() => {
        expect(
          screen.getByText("トークンを再生成しますか？")
        ).toBeInTheDocument();
      });

      expect(
        screen.getByText(
          "現在のトークンは無効になり、新しいトークンが発行されます。既存のICSフィードURLは使用できなくなります。"
        )
      ).toBeInTheDocument();
    });

    it("確認ダイアログでキャンセルするとServer Actionが呼ばれない", async () => {
      const user = userEvent.setup();

      render(
        <IcsFeedUrlSection
          feedUrl="https://example.supabase.co/functions/v1/ics-feed?guild_id=12345678901234567&token=abc123"
          guildId="12345678901234567"
          isPublic={false}
        />
      );

      const regenerateButton = screen.getByText("トークンを再生成");
      await user.click(regenerateButton);

      await waitFor(() => {
        expect(
          screen.getByText("トークンを再生成しますか？")
        ).toBeInTheDocument();
      });

      const dialog = screen.getByRole("alertdialog");
      const cancelButton = within(dialog).getByText("キャンセル");
      await user.click(cancelButton);

      expect(mockRegenerateIcsFeedToken).not.toHaveBeenCalled();
    });

    it("確認ダイアログで再生成を実行するとServer Actionが呼ばれ、新しいURLが表示される", async () => {
      const user = userEvent.setup();

      mockRegenerateIcsFeedToken.mockResolvedValue({
        success: true,
        data: {
          token: "newtoken456",
          feedUrl:
            "https://example.supabase.co/functions/v1/ics-feed?guild_id=12345678901234567&token=newtoken456",
        },
      });

      render(
        <IcsFeedUrlSection
          feedUrl="https://example.supabase.co/functions/v1/ics-feed?guild_id=12345678901234567&token=oldtoken123"
          guildId="12345678901234567"
          isPublic={false}
        />
      );

      // 旧URLが表示されていることを確認
      expectUrlInCodeElement("token=oldtoken123");

      const regenerateButton = screen.getByText("トークンを再生成");
      await user.click(regenerateButton);

      await waitFor(() => {
        expect(
          screen.getByText("トークンを再生成しますか？")
        ).toBeInTheDocument();
      });

      const dialog = screen.getByRole("alertdialog");
      const confirmButton = within(dialog).getByText("再生成する");
      await user.click(confirmButton);

      await waitFor(
        () => {
          expect(mockRegenerateIcsFeedToken).toHaveBeenCalledWith(
            "12345678901234567"
          );
        },
        { timeout: 3000 }
      );

      await waitFor(
        () => {
          expectUrlInCodeElement("token=newtoken456");
        },
        { timeout: 3000 }
      );
    });

    it("再生成失敗時にエラーメッセージが表示される", async () => {
      const user = userEvent.setup();

      mockRegenerateIcsFeedToken.mockResolvedValue({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "トークンの再生成に失敗しました。",
        },
      });

      render(
        <IcsFeedUrlSection
          feedUrl="https://example.supabase.co/functions/v1/ics-feed?guild_id=12345678901234567&token=abc123"
          guildId="12345678901234567"
          isPublic={false}
        />
      );

      const regenerateButton = screen.getByText("トークンを再生成");
      await user.click(regenerateButton);

      await waitFor(() => {
        expect(
          screen.getByText("トークンを再生成しますか？")
        ).toBeInTheDocument();
      });

      const dialog = screen.getByRole("alertdialog");
      const confirmButton = within(dialog).getByText("再生成する");
      await user.click(confirmButton);

      await waitFor(
        () => {
          expect(
            screen.getByText("トークンの再生成に失敗しました。")
          ).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });
  });
});
