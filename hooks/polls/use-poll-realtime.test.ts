import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PollSnapshot } from "@/lib/polls/types";
import { usePollRealtime } from "./use-poll-realtime";

type SubscribeCallback = (status: string) => void;
type ChangeHandler = () => void;

function buildSnapshot(status: "open" | "closed" = "open"): PollSnapshot {
  return {
    poll: {
      id: "poll-1",
      guild_id: "guild-1",
      title: "meetup",
      description: null,
      status,
      channel_id: "c1",
      message_id: null,
      created_by: "u1",
      finalized_by: null,
      finalized_option_id: null,
      finalized_event_id: null,
      created_at: "2026-04-18T00:00:00Z",
      updated_at: "2026-04-18T00:00:00Z",
    },
    options: [],
    aggregates: [],
  };
}

function createFakeClient() {
  const onHandlers: ChangeHandler[] = [];
  let subscribeCallback: SubscribeCallback | null = null;
  const removedChannels: unknown[] = [];

  const channel = {
    on: vi.fn((_event: unknown, _filter: unknown, handler: ChangeHandler) => {
      onHandlers.push(handler);
      return channel;
    }),
    subscribe: vi.fn((cb: SubscribeCallback) => {
      subscribeCallback = cb;
      return channel;
    }),
  };

  const client = {
    channel: vi.fn(() => channel),
    removeChannel: vi.fn((ch: unknown) => {
      removedChannels.push(ch);
      return Promise.resolve();
    }),
  };

  return {
    client,
    channel,
    triggerChange: () => {
      for (const handler of onHandlers) {
        handler();
      }
    },
    fireSubscribeStatus: (status: string) => {
      subscribeCallback?.(status);
    },
    removedChannels,
  };
}

describe("usePollRealtime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("初期 snapshot を返し、subscribed で isLive=true になる", () => {
    const { client, fireSubscribeStatus } = createFakeClient();
    const fetchSnapshot = vi.fn().mockResolvedValue(buildSnapshot());

    const { result } = renderHook(() =>
      usePollRealtime({
        client: client as never,
        guildId: "guild-1",
        pollId: "poll-1",
        initialSnapshot: buildSnapshot(),
        fetchSnapshot,
      })
    );

    expect(result.current.snapshot.poll.id).toBe("poll-1");
    expect(result.current.isLive).toBe(false);

    act(() => {
      fireSubscribeStatus("SUBSCRIBED");
    });
    expect(result.current.isLive).toBe(true);
  });

  it("Realtime 変更後 300ms デバウンスで fetchSnapshot が呼ばれる", async () => {
    const { client, triggerChange, fireSubscribeStatus } = createFakeClient();
    const updated = buildSnapshot("closed");
    const fetchSnapshot = vi.fn().mockResolvedValue(updated);

    const { result } = renderHook(() =>
      usePollRealtime({
        client: client as never,
        guildId: "guild-1",
        pollId: "poll-1",
        initialSnapshot: buildSnapshot("open"),
        fetchSnapshot,
      })
    );

    act(() => {
      fireSubscribeStatus("SUBSCRIBED");
    });

    act(() => {
      triggerChange();
      triggerChange();
      triggerChange();
    });

    // 250ms 経過でまだ呼ばれない
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });
    expect(fetchSnapshot).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    // debounce で 1 回だけ呼ばれる
    expect(fetchSnapshot).toHaveBeenCalledTimes(1);

    // fetchSnapshot の Promise 解決後の setState が反映されるまで待つ
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(result.current.snapshot.poll.status).toBe("closed");
  });

  it("CHANNEL_ERROR で isLive=false になり、30 秒ポーリングにフォールバックする", async () => {
    const { client, fireSubscribeStatus } = createFakeClient();
    const fetchSnapshot = vi.fn().mockResolvedValue(buildSnapshot());

    const { result } = renderHook(() =>
      usePollRealtime({
        client: client as never,
        guildId: "guild-1",
        pollId: "poll-1",
        initialSnapshot: buildSnapshot(),
        fetchSnapshot,
      })
    );

    act(() => {
      fireSubscribeStatus("CHANNEL_ERROR");
    });
    expect(result.current.isLive).toBe(false);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });
    expect(fetchSnapshot).toHaveBeenCalled();
  });

  it("unmount で channel が removeChannel される", async () => {
    const { client, removedChannels, fireSubscribeStatus } = createFakeClient();

    const { unmount } = renderHook(() =>
      usePollRealtime({
        client: client as never,
        guildId: "guild-1",
        pollId: "poll-1",
        initialSnapshot: buildSnapshot(),
        fetchSnapshot: vi.fn().mockResolvedValue(null),
      })
    );
    act(() => {
      fireSubscribeStatus("SUBSCRIBED");
    });
    unmount();
    expect(removedChannels.length).toBe(1);
  });
});
