/**
 * useRealtimeSyncのユニットテスト
 *
 * タスク3: Supabase Realtimeサブスクリプション管理・イベントルーティング・
 * ライフサイクル管理・ミューテーション追跡による競合回避
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 3.1-3.6, 4.1, 4.3, 5.1-5.4
 */
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CalendarEvent, EventRecord } from "@/lib/calendar/types";
import type { CalendarActions } from "./use-calendar-state";
import {
  useRealtimeSync,
  type UseRealtimeSyncParams,
} from "./use-realtime-sync";

// ─── Supabase Realtime チャネルモック ────────────────────

type PostgresChangesCallback = (payload: Record<string, unknown>) => void;

interface ChannelSubscription {
  table: string;
  event: string;
  filter?: string;
  callback: PostgresChangesCallback;
}

function createMockChannel() {
  const subscriptions: ChannelSubscription[] = [];
  let subscribedStatus: "SUBSCRIBED" | "CHANNEL_ERROR" = "SUBSCRIBED";
  let subscribeCallback: ((status: string) => void) | null = null;

  const channel = {
    on: vi.fn(
      (
        _type: string,
        opts: { event: string; schema: string; table: string; filter?: string },
        callback: PostgresChangesCallback,
      ) => {
        subscriptions.push({
          table: opts.table,
          event: opts.event,
          filter: opts.filter,
          callback,
        });
        return channel;
      },
    ),
    subscribe: vi.fn((cb?: (status: string) => void) => {
      subscribeCallback = cb ?? null;
      if (cb) {
        cb(subscribedStatus);
      }
      return channel;
    }),
    unsubscribe: vi.fn().mockResolvedValue("ok"),
    _subscriptions: subscriptions,
    _setSubscribeStatus: (status: "SUBSCRIBED" | "CHANNEL_ERROR") => {
      subscribedStatus = status;
    },
    _triggerSubscribeCallback: (status: string) => {
      subscribeCallback?.(status);
    },
  };

  return channel;
}

function createMockSupabase() {
  const channels: ReturnType<typeof createMockChannel>[] = [];

  const supabase = {
    channel: vi.fn((name: string) => {
      const ch = createMockChannel();
      channels.push(ch);
      return ch;
    }),
    removeChannel: vi.fn().mockResolvedValue("ok"),
    _channels: channels,
  };

  return supabase;
}

// ─── テスト用ファクトリ ──────────────────────────────

function createCalendarEvent(
  overrides: Partial<CalendarEvent> = {},
): CalendarEvent {
  return {
    id: "event-1",
    title: "テストイベント",
    start: new Date("2026-03-28T10:00:00Z"),
    end: new Date("2026-03-28T12:00:00Z"),
    allDay: false,
    color: "#3788d8",
    ...overrides,
  };
}

function createEventRecord(overrides: Partial<EventRecord> = {}): EventRecord {
  return {
    id: "event-1",
    guild_id: "guild-123",
    name: "テストイベント",
    description: null,
    color: "#3788d8",
    is_all_day: false,
    start_at: "2026-03-28T10:00:00Z",
    end_at: "2026-03-28T12:00:00Z",
    location: null,
    channel_id: null,
    channel_name: null,
    notifications: [],
    series_id: null,
    original_date: null,
    created_at: "2026-03-28T00:00:00Z",
    updated_at: "2026-03-28T00:00:00Z",
    ...overrides,
  };
}

function createMockActions(): CalendarActions {
  return {
    setViewMode: vi.fn(),
    setSelectedDate: vi.fn(),
    navigateToToday: vi.fn(),
    setLoading: vi.fn(),
    setError: vi.fn(),
    clearError: vi.fn(),
    setEvents: vi.fn(),
    clearEvents: vi.fn(),
    startFetching: vi.fn(),
    completeFetchingSuccess: vi.fn(),
    completeFetchingError: vi.fn(),
  };
}

function createDefaultParams(
  overrides: Partial<UseRealtimeSyncParams> = {},
): UseRealtimeSyncParams {
  return {
    guildId: "guild-123",
    // biome-ignore lint/suspicious/noExplicitAny: test mock
    supabase: createMockSupabase() as any,
    events: [],
    actions: createMockActions(),
    onRefetchNeeded: vi.fn(),
    ...overrides,
  };
}

// ─── テストスイート ──────────────────────────────────

describe("useRealtimeSync", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ─── 3.1 チャネル購読とギルドスコープフィルタリング ──────

  describe("3.1 チャネル購読とギルドスコープフィルタリング", () => {
    it("guildIdが指定されている場合、チャネルを作成して購読する", () => {
      const params = createDefaultParams();
      const mockSupabase = params.supabase as unknown as ReturnType<
        typeof createMockSupabase
      >;

      renderHook(() => useRealtimeSync(params));

      expect(mockSupabase.channel).toHaveBeenCalled();
      const channel = mockSupabase._channels[0];
      expect(channel.subscribe).toHaveBeenCalled();
    });

    it("eventsテーブルとevent_seriesテーブルの両方を購読する", () => {
      const params = createDefaultParams();
      const mockSupabase = params.supabase as unknown as ReturnType<
        typeof createMockSupabase
      >;

      renderHook(() => useRealtimeSync(params));

      const channel = mockSupabase._channels[0];
      const tables = channel._subscriptions.map((s) => s.table);
      expect(tables).toContain("events");
      expect(tables).toContain("event_series");
    });

    it("INSERT/UPDATEイベントにguild_idフィルタを設定する", () => {
      const params = createDefaultParams({ guildId: "guild-456" });
      const mockSupabase = params.supabase as unknown as ReturnType<
        typeof createMockSupabase
      >;

      renderHook(() => useRealtimeSync(params));

      const channel = mockSupabase._channels[0];
      const filteredSubs = channel._subscriptions.filter((s) => s.filter);
      // INSERT/UPDATE for events + event_series = 4 subscriptions with filter
      expect(filteredSubs.length).toBeGreaterThanOrEqual(4);
      for (const sub of filteredSubs) {
        expect(sub.filter).toBe("guild_id=eq.guild-456");
      }
    });

    it("DELETEイベントにもguild_idフィルタを設定する", () => {
      const params = createDefaultParams();
      const mockSupabase = params.supabase as unknown as ReturnType<
        typeof createMockSupabase
      >;

      renderHook(() => useRealtimeSync(params));

      const channel = mockSupabase._channels[0];
      const deleteSubs = channel._subscriptions.filter(
        (s) => s.event === "DELETE",
      );
      expect(deleteSubs.length).toBeGreaterThan(0);
      for (const sub of deleteSubs) {
        expect(sub.filter).toBe(`guild_id=eq.${params.guildId}`);
      }
    });

    it("guildIdがnullの場合は購読を開始しない", () => {
      const params = createDefaultParams({ guildId: null });
      const mockSupabase = params.supabase as unknown as ReturnType<
        typeof createMockSupabase
      >;

      renderHook(() => useRealtimeSync(params));

      expect(mockSupabase.channel).not.toHaveBeenCalled();
    });

    it("guildId変更時に旧チャネルを解除し、新チャネルを作成する", () => {
      const mockSupabase = createMockSupabase();
      const params = createDefaultParams({
        guildId: "guild-old",
        // biome-ignore lint/suspicious/noExplicitAny: test mock
        supabase: mockSupabase as any,
      });

      const { rerender } = renderHook(
        (props: UseRealtimeSyncParams) => useRealtimeSync(props),
        { initialProps: params },
      );

      const oldChannel = mockSupabase._channels[0];
      expect(oldChannel.subscribe).toHaveBeenCalled();

      // ギルド変更
      rerender({ ...params, guildId: "guild-new" });

      // 旧チャネル解除
      expect(mockSupabase.removeChannel).toHaveBeenCalledWith(oldChannel);
      // 新チャネル作成
      expect(mockSupabase._channels.length).toBe(2);
    });

    it("購読成功時にステータスがconnectedになる", () => {
      const params = createDefaultParams();

      const { result } = renderHook(() => useRealtimeSync(params));

      expect(result.current.status).toBe("connected");
    });

    it("購読失敗時にステータスがerrorになる", () => {
      const mockSupabase = createMockSupabase();
      const params = createDefaultParams({
        // biome-ignore lint/suspicious/noExplicitAny: test mock
        supabase: mockSupabase as any,
      });

      // チャネルモックのsubscribeステータスをエラーに設定
      // subscribe前にステータスを変更する必要がある
      const originalChannel = mockSupabase.channel;
      mockSupabase.channel = vi.fn((name: string) => {
        const ch = createMockChannel();
        ch._setSubscribeStatus("CHANNEL_ERROR");
        mockSupabase._channels.push(ch);
        return ch;
      });

      const { result } = renderHook(() => useRealtimeSync(params));

      expect(result.current.status).toBe("error");
    });

    it("同一テーブルへの重複購読チャネルを防止する", () => {
      const mockSupabase = createMockSupabase();
      const params = createDefaultParams({
        // biome-ignore lint/suspicious/noExplicitAny: test mock
        supabase: mockSupabase as any,
      });

      // 同じguildIdで二回レンダリング
      const { rerender } = renderHook(
        (props: UseRealtimeSyncParams) => useRealtimeSync(props),
        { initialProps: params },
      );

      rerender(params);

      // チャネルは1つだけ
      expect(mockSupabase._channels.length).toBe(1);
    });
  });

  // ─── 3.2 イベントルーティングとリフェッチトリガー ────────

  describe("3.2 イベントルーティングとリフェッチトリガー", () => {
    it("eventsテーブルINSERT（series_id null）でRealtimeHandlerに差分更新を委譲する", () => {
      const events = [createCalendarEvent({ id: "existing" })];
      const mockActions = createMockActions();
      const params = createDefaultParams({ events, actions: mockActions });
      const mockSupabase = params.supabase as unknown as ReturnType<
        typeof createMockSupabase
      >;

      renderHook(() => useRealtimeSync(params));

      // eventsテーブルのINSERTコールバックを見つける
      const channel = mockSupabase._channels[0];
      const eventInsertSub = channel._subscriptions.find(
        (s) => s.table === "events" && s.event === "INSERT",
      );

      // INSERTイベントを発火
      act(() => {
        eventInsertSub?.callback({
          eventType: "INSERT",
          new: createEventRecord({ id: "new-event", series_id: null }),
          old: {},
        });
      });

      // actions.setEventsが呼ばれる
      expect(mockActions.setEvents).toHaveBeenCalled();
    });

    it("eventsテーブルUPDATE（series_id null）でRealtimeHandlerに差分更新を委譲する", () => {
      const events = [createCalendarEvent({ id: "event-1" })];
      const mockActions = createMockActions();
      const params = createDefaultParams({ events, actions: mockActions });
      const mockSupabase = params.supabase as unknown as ReturnType<
        typeof createMockSupabase
      >;

      renderHook(() => useRealtimeSync(params));

      const channel = mockSupabase._channels[0];
      const eventUpdateSub = channel._subscriptions.find(
        (s) => s.table === "events" && s.event === "UPDATE",
      );

      act(() => {
        eventUpdateSub?.callback({
          eventType: "UPDATE",
          new: createEventRecord({
            id: "event-1",
            name: "更新済み",
            series_id: null,
          }),
          old: { id: "event-1" },
        });
      });

      expect(mockActions.setEvents).toHaveBeenCalled();
    });

    it("eventsテーブルDELETEでRealtimeHandlerに差分更新を委譲する", () => {
      const events = [createCalendarEvent({ id: "event-1" })];
      const mockActions = createMockActions();
      const params = createDefaultParams({ events, actions: mockActions });
      const mockSupabase = params.supabase as unknown as ReturnType<
        typeof createMockSupabase
      >;

      renderHook(() => useRealtimeSync(params));

      const channel = mockSupabase._channels[0];
      const eventDeleteSub = channel._subscriptions.find(
        (s) => s.table === "events" && s.event === "DELETE",
      );

      act(() => {
        eventDeleteSub?.callback({
          eventType: "DELETE",
          new: {},
          old: { id: "event-1" },
        });
      });

      expect(mockActions.setEvents).toHaveBeenCalled();
    });

    it("eventsテーブルINSERT（series_id非null=例外レコード）でリフェッチをトリガーする", () => {
      const onRefetchNeeded = vi.fn();
      const params = createDefaultParams({ onRefetchNeeded });
      const mockSupabase = params.supabase as unknown as ReturnType<
        typeof createMockSupabase
      >;

      renderHook(() => useRealtimeSync(params));

      const channel = mockSupabase._channels[0];
      const eventInsertSub = channel._subscriptions.find(
        (s) => s.table === "events" && s.event === "INSERT",
      );

      act(() => {
        eventInsertSub?.callback({
          eventType: "INSERT",
          new: createEventRecord({
            id: "exception-1",
            series_id: "series-1",
          }),
          old: {},
        });
      });

      // デバウンス後にリフェッチ
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(onRefetchNeeded).toHaveBeenCalled();
    });

    it("event_seriesテーブルの全変更でリフェッチをトリガーする", () => {
      const onRefetchNeeded = vi.fn();
      const params = createDefaultParams({ onRefetchNeeded });
      const mockSupabase = params.supabase as unknown as ReturnType<
        typeof createMockSupabase
      >;

      renderHook(() => useRealtimeSync(params));

      const channel = mockSupabase._channels[0];
      const seriesInsertSub = channel._subscriptions.find(
        (s) => s.table === "event_series" && s.event === "INSERT",
      );

      act(() => {
        seriesInsertSub?.callback({
          eventType: "INSERT",
          new: { id: "series-1", guild_id: "guild-123" },
          old: {},
        });
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(onRefetchNeeded).toHaveBeenCalled();
    });

    it("短時間の連続変更をデバウンスして集約する", () => {
      const onRefetchNeeded = vi.fn();
      const params = createDefaultParams({ onRefetchNeeded });
      const mockSupabase = params.supabase as unknown as ReturnType<
        typeof createMockSupabase
      >;

      renderHook(() => useRealtimeSync(params));

      const channel = mockSupabase._channels[0];
      const seriesInsertSub = channel._subscriptions.find(
        (s) => s.table === "event_series" && s.event === "INSERT",
      );

      // 3回連続でリフェッチトリガー
      act(() => {
        seriesInsertSub?.callback({
          eventType: "INSERT",
          new: { id: "s1", guild_id: "guild-123" },
          old: {},
        });
        seriesInsertSub?.callback({
          eventType: "INSERT",
          new: { id: "s2", guild_id: "guild-123" },
          old: {},
        });
        seriesInsertSub?.callback({
          eventType: "INSERT",
          new: { id: "s3", guild_id: "guild-123" },
          old: {},
        });
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      // 1回だけリフェッチ
      expect(onRefetchNeeded).toHaveBeenCalledTimes(1);
    });

    it("DELETEでローカルstateに該当IDが存在しない場合は無視する（他ギルドのDELETE）", () => {
      const events = [createCalendarEvent({ id: "event-1" })];
      const mockActions = createMockActions();
      const params = createDefaultParams({ events, actions: mockActions });
      const mockSupabase = params.supabase as unknown as ReturnType<
        typeof createMockSupabase
      >;

      renderHook(() => useRealtimeSync(params));

      const channel = mockSupabase._channels[0];
      const eventDeleteSub = channel._subscriptions.find(
        (s) => s.table === "events" && s.event === "DELETE",
      );

      act(() => {
        eventDeleteSub?.callback({
          eventType: "DELETE",
          new: {},
          old: { id: "unknown-event" },
        });
      });

      // 存在しないIDなので setEvents は呼ばれない
      expect(mockActions.setEvents).not.toHaveBeenCalled();
    });
  });

  // ─── 3.3 ライフサイクル管理 ────────────────────────

  describe("3.3 ライフサイクル管理", () => {
    it("アンマウント時にチャネル購読を解除する", () => {
      const mockSupabase = createMockSupabase();
      const params = createDefaultParams({
        // biome-ignore lint/suspicious/noExplicitAny: test mock
        supabase: mockSupabase as any,
      });

      const { unmount } = renderHook(() => useRealtimeSync(params));

      const channel = mockSupabase._channels[0];
      unmount();

      expect(mockSupabase.removeChannel).toHaveBeenCalledWith(channel);
    });

    it("visibilitychange（hidden→visible）でリフェッチをトリガーする", () => {
      const onRefetchNeeded = vi.fn();
      const params = createDefaultParams({ onRefetchNeeded });

      renderHook(() => useRealtimeSync(params));

      // hidden→visible遷移をシミュレート
      act(() => {
        Object.defineProperty(document, "visibilityState", {
          value: "visible",
          writable: true,
          configurable: true,
        });
        document.dispatchEvent(new Event("visibilitychange"));
      });

      expect(onRefetchNeeded).toHaveBeenCalled();
    });

    it("visibilitychangeでhidden状態のときはリフェッチしない", () => {
      const onRefetchNeeded = vi.fn();
      const params = createDefaultParams({ onRefetchNeeded });

      renderHook(() => useRealtimeSync(params));

      act(() => {
        Object.defineProperty(document, "visibilityState", {
          value: "hidden",
          writable: true,
          configurable: true,
        });
        document.dispatchEvent(new Event("visibilitychange"));
      });

      expect(onRefetchNeeded).not.toHaveBeenCalled();
    });

    it("アンマウント時にvisibilitychangeリスナーを解除する", () => {
      const removeEventListenerSpy = vi.spyOn(
        document,
        "removeEventListener",
      );
      const params = createDefaultParams();

      const { unmount } = renderHook(() => useRealtimeSync(params));
      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "visibilitychange",
        expect.any(Function),
      );
    });

    it("初期ステータスがconnecting→connected遷移する", () => {
      const params = createDefaultParams();

      const { result } = renderHook(() => useRealtimeSync(params));

      // subscribeコールバックが同期的にSUBSCRIBEDを返すので即connected
      expect(result.current.status).toBe("connected");
    });
  });

  // ─── 3.4 ミューテーション追跡による競合回避 ──────────

  describe("3.4 ミューテーション追跡による競合回避", () => {
    it("trackMutationStartで進行中エンティティを追跡する", () => {
      const mockActions = createMockActions();
      const events = [createCalendarEvent({ id: "event-1" })];
      const params = createDefaultParams({ events, actions: mockActions });
      const mockSupabase = params.supabase as unknown as ReturnType<
        typeof createMockSupabase
      >;

      const { result } = renderHook(() => useRealtimeSync(params));

      // ミューテーション開始
      act(() => {
        result.current.trackMutationStart("event-1");
      });

      // Realtimeイベント受信（保留されるべき）
      const channel = mockSupabase._channels[0];
      const eventUpdateSub = channel._subscriptions.find(
        (s) => s.table === "events" && s.event === "UPDATE",
      );

      act(() => {
        eventUpdateSub?.callback({
          eventType: "UPDATE",
          new: createEventRecord({ id: "event-1", name: "外部更新" }),
          old: { id: "event-1" },
        });
      });

      // 進行中のため setEvents は呼ばれない
      expect(mockActions.setEvents).not.toHaveBeenCalled();
    });

    it("trackMutationEndでミューテーション完了を通知しリフェッチする", () => {
      const onRefetchNeeded = vi.fn();
      const params = createDefaultParams({ onRefetchNeeded });

      const { result } = renderHook(() => useRealtimeSync(params));

      act(() => {
        result.current.trackMutationStart("event-1");
      });

      act(() => {
        result.current.trackMutationEnd("event-1");
      });

      // デバウンス後にリフェッチ
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(onRefetchNeeded).toHaveBeenCalled();
    });

    it("ミューテーション非進行中のエンティティのRealtimeイベントは即時適用する", () => {
      const events = [createCalendarEvent({ id: "event-1" })];
      const mockActions = createMockActions();
      const params = createDefaultParams({ events, actions: mockActions });
      const mockSupabase = params.supabase as unknown as ReturnType<
        typeof createMockSupabase
      >;

      const { result } = renderHook(() => useRealtimeSync(params));

      // event-2のミューテーションを追跡（event-1は無関係）
      act(() => {
        result.current.trackMutationStart("event-2");
      });

      const channel = mockSupabase._channels[0];
      const eventUpdateSub = channel._subscriptions.find(
        (s) => s.table === "events" && s.event === "UPDATE",
      );

      // event-1のRealtimeイベントは即時適用されるべき
      act(() => {
        eventUpdateSub?.callback({
          eventType: "UPDATE",
          new: createEventRecord({ id: "event-1", name: "外部更新" }),
          old: { id: "event-1" },
        });
      });

      expect(mockActions.setEvents).toHaveBeenCalled();
    });

    it("DELETE時に進行中ミューテーションのIDは保留する", () => {
      const events = [createCalendarEvent({ id: "event-1" })];
      const mockActions = createMockActions();
      const params = createDefaultParams({ events, actions: mockActions });
      const mockSupabase = params.supabase as unknown as ReturnType<
        typeof createMockSupabase
      >;

      const { result } = renderHook(() => useRealtimeSync(params));

      act(() => {
        result.current.trackMutationStart("event-1");
      });

      const channel = mockSupabase._channels[0];
      const eventDeleteSub = channel._subscriptions.find(
        (s) => s.table === "events" && s.event === "DELETE",
      );

      act(() => {
        eventDeleteSub?.callback({
          eventType: "DELETE",
          new: {},
          old: { id: "event-1" },
        });
      });

      // 進行中のため setEvents は呼ばれない
      expect(mockActions.setEvents).not.toHaveBeenCalled();
    });
  });
});
