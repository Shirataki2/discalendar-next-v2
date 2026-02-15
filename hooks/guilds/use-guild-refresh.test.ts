/**
 * useGuildRefresh のユニットテスト
 *
 * Task 4.2: useGuildRefresh Hook の作成
 * - Page Visibility API の visibilitychange でタブ復帰を検知する
 * - タブ復帰時に refreshGuilds Server Action を呼び出す
 * - 連続再取得防止のため最低 30 秒のインターバルを設ける
 * - enabled: false の場合はリスナーを登録しない
 * - isRefreshing 状態を公開する
 *
 * Requirements: 5.1, 5.2
 */
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// refreshGuilds Server Action モック
const mockRefreshGuilds = vi.fn();
vi.mock("@/app/dashboard/actions", () => ({
  refreshGuilds: (...args: unknown[]) => mockRefreshGuilds(...args),
}));

import { useGuildRefresh } from "./use-guild-refresh";

describe("useGuildRefresh", () => {
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    addEventListenerSpy = vi.spyOn(document, "addEventListener");
    removeEventListenerSpy = vi.spyOn(document, "removeEventListener");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("enabled: true の場合 visibilitychange リスナーを登録する", () => {
    const onRefresh = vi.fn();
    renderHook(() => useGuildRefresh({ onRefresh, enabled: true }));

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function)
    );
  });

  it("enabled: false の場合リスナーを登録しない", () => {
    const onRefresh = vi.fn();
    renderHook(() => useGuildRefresh({ onRefresh, enabled: false }));

    expect(addEventListenerSpy).not.toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function)
    );
  });

  it("アンマウント時にリスナーを解除する", () => {
    const onRefresh = vi.fn();
    const { unmount } = renderHook(() =>
      useGuildRefresh({ onRefresh, enabled: true })
    );

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function)
    );
  });

  it("タブが visible に戻った時に refreshGuilds を呼び出す", async () => {
    const onRefresh = vi.fn();
    mockRefreshGuilds.mockResolvedValueOnce({
      guilds: [{ guildId: "g1", name: "Guild 1" }],
      invitableGuilds: [],
      guildPermissions: {},
    });

    renderHook(() => useGuildRefresh({ onRefresh, enabled: true }));

    // visibilitychange イベントを発火
    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      writable: true,
    });
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(mockRefreshGuilds).toHaveBeenCalledTimes(1);
    expect(onRefresh).toHaveBeenCalledWith({
      guilds: [{ guildId: "g1", name: "Guild 1" }],
      invitableGuilds: [],
      guildPermissions: {},
    });
  });

  it("タブが hidden の場合は refreshGuilds を呼び出さない", async () => {
    const onRefresh = vi.fn();
    renderHook(() => useGuildRefresh({ onRefresh, enabled: true }));

    Object.defineProperty(document, "visibilityState", {
      value: "hidden",
      writable: true,
    });
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(mockRefreshGuilds).not.toHaveBeenCalled();
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("最低 30 秒のインターバルで連続再取得を防止する", async () => {
    const onRefresh = vi.fn();
    mockRefreshGuilds.mockResolvedValue({
      guilds: [],
      invitableGuilds: [],
      guildPermissions: {},
    });

    renderHook(() => useGuildRefresh({ onRefresh, enabled: true }));

    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      writable: true,
    });

    // 1回目: 成功
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(mockRefreshGuilds).toHaveBeenCalledTimes(1);

    // 直後の2回目: インターバル内なのでスキップ
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(mockRefreshGuilds).toHaveBeenCalledTimes(1);

    // 30秒経過後の3回目: 成功
    vi.advanceTimersByTime(30_000);
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(mockRefreshGuilds).toHaveBeenCalledTimes(2);
  });

  it("isRefreshing は再取得中に true になる", async () => {
    const onRefresh = vi.fn();
    let resolveRefresh: (value: unknown) => void;
    mockRefreshGuilds.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRefresh = resolve;
      })
    );

    const { result } = renderHook(() =>
      useGuildRefresh({ onRefresh, enabled: true })
    );

    expect(result.current.isRefreshing).toBe(false);

    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      writable: true,
    });

    // refreshGuilds を開始（まだ resolve していない）
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(result.current.isRefreshing).toBe(true);

    // resolve して完了
    await act(async () => {
      resolveRefresh!({
        guilds: [],
        invitableGuilds: [],
        guildPermissions: {},
      });
    });

    expect(result.current.isRefreshing).toBe(false);
  });

  it("enabled が false に変更された場合リスナーを解除する", () => {
    const onRefresh = vi.fn();
    const { rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useGuildRefresh({ onRefresh, enabled }),
      { initialProps: { enabled: true } }
    );

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function)
    );

    rerender({ enabled: false });

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function)
    );
  });

  it("refreshGuilds がエラーを返した場合 onRefresh を呼び出さない", async () => {
    const onRefresh = vi.fn();
    mockRefreshGuilds.mockResolvedValueOnce({
      guilds: [],
      invitableGuilds: [],
      guildPermissions: {},
      error: { type: "api_error", message: "Failed" },
    });

    renderHook(() => useGuildRefresh({ onRefresh, enabled: true }));

    Object.defineProperty(document, "visibilityState", {
      value: "visible",
      writable: true,
    });
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(mockRefreshGuilds).toHaveBeenCalledTimes(1);
    expect(onRefresh).not.toHaveBeenCalled();
  });
});
