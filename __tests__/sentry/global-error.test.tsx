/**
 * Task 4: グローバルエラー境界のテスト
 *
 * Requirements:
 * - 2.2: global-error.tsx にSentryエラーレポートを統合し、アプリケーション全体のエラー境界として機能させる
 * - 2.3: Error Boundaryがエラーを捕捉した場合、エラーコンテキストを含めてSentryに送信する
 */
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockCaptureException = vi.fn();

vi.mock("@sentry/nextjs", () => ({
  captureException: mockCaptureException,
}));

const ERROR_MESSAGE_PATTERN = /予期しないエラーが発生しました/;
const RETRY_BUTTON_PATTERN = /もう一度試す/;

describe("GlobalError", () => {
  const mockReset = vi.fn();
  const testError = new Error("Test error message");

  beforeEach(() => {
    mockCaptureException.mockClear();
    mockReset.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it("エラー発生時にSentry.captureExceptionが呼ばれる", async () => {
    const { default: GlobalError } = await import("@/app/global-error");

    render(<GlobalError error={testError} reset={mockReset} />);

    expect(mockCaptureException).toHaveBeenCalledOnce();
    expect(mockCaptureException).toHaveBeenCalledWith(testError);
  });

  it("エラーメッセージが表示される", async () => {
    const { default: GlobalError } = await import("@/app/global-error");

    render(<GlobalError error={testError} reset={mockReset} />);

    expect(screen.getByText(ERROR_MESSAGE_PATTERN)).toBeInTheDocument();
  });

  it("リトライボタンが表示されクリックするとresetが呼ばれる", async () => {
    const user = userEvent.setup();
    const { default: GlobalError } = await import("@/app/global-error");

    render(<GlobalError error={testError} reset={mockReset} />);

    const retryButton = screen.getByRole("button", {
      name: RETRY_BUTTON_PATTERN,
    });
    expect(retryButton).toBeInTheDocument();

    await user.click(retryButton);
    expect(mockReset).toHaveBeenCalledOnce();
  });

  it("lang属性がjaに設定されたhtml要素を含む", async () => {
    const { default: GlobalError } = await import("@/app/global-error");

    render(<GlobalError error={testError} reset={mockReset} />);

    expect(document.documentElement.lang).toBe("ja");
  });

  it("digestプロパティを持つエラーでもcaptureExceptionが呼ばれる", async () => {
    const errorWithDigest = Object.assign(new Error("Server error"), {
      digest: "abc123",
    });
    const { default: GlobalError } = await import("@/app/global-error");

    render(<GlobalError error={errorWithDigest} reset={mockReset} />);

    expect(mockCaptureException).toHaveBeenCalledWith(errorWithDigest);
  });
});
