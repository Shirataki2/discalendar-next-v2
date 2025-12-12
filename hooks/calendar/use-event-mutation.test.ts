/**
 * useEventMutationのユニットテスト
 *
 * タスク4.1: EventServiceを使用したミューテーション操作を管理するカスタムフックを作成する
 * - 作成・更新・削除の各操作のローディング状態を管理する
 * - EventServiceの各メソッドを呼び出してCRUD操作を実行する
 * - 操作成功時と失敗時のコールバックをサポートする
 * - エラー状態の保持とクリア機能を提供する
 *
 * Requirements: 1.4, 3.3, 4.2
 */
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  CalendarError,
  CreateEventInput,
  EventServiceInterface,
  MutationResult,
  UpdateEventInput,
} from "@/lib/calendar/event-service";
import type { CalendarEvent } from "@/lib/calendar/types";
import { useEventMutation } from "./use-event-mutation";

// モックEventService作成ヘルパー
function createMockEventService(
  overrides?: Partial<EventServiceInterface>
): EventServiceInterface {
  return {
    fetchEvents: vi.fn(),
    createEvent: vi.fn(),
    updateEvent: vi.fn(),
    deleteEvent: vi.fn(),
    ...overrides,
  };
}

// テスト用のモックCalendarEvent
const mockCalendarEvent: CalendarEvent = {
  id: "event-1",
  title: "テストイベント",
  start: new Date("2025-12-15T10:00:00Z"),
  end: new Date("2025-12-15T12:00:00Z"),
  allDay: false,
  color: "#3B82F6",
};

describe("useEventMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("初期状態", () => {
    it("should initialize with all loading states as false", () => {
      const mockService = createMockEventService();
      const { result } = renderHook(() => useEventMutation(mockService));

      expect(result.current.state.isCreating).toBe(false);
      expect(result.current.state.isUpdating).toBe(false);
      expect(result.current.state.isDeleting).toBe(false);
    });

    it("should initialize with error as null", () => {
      const mockService = createMockEventService();
      const { result } = renderHook(() => useEventMutation(mockService));

      expect(result.current.state.error).toBeNull();
    });
  });

  describe("createEvent (Req 1.4)", () => {
    it("should set isCreating to true while creating", async () => {
      let resolvePromise: (value: MutationResult<CalendarEvent>) => void;
      const pendingPromise = new Promise<MutationResult<CalendarEvent>>(
        (resolve) => {
          resolvePromise = resolve;
        }
      );

      const mockService = createMockEventService({
        createEvent: vi.fn().mockReturnValue(pendingPromise),
      });

      const { result } = renderHook(() => useEventMutation(mockService));

      act(() => {
        result.current.createEvent({
          guildId: "guild-123",
          title: "新しいイベント",
          startAt: new Date("2025-12-15T10:00:00Z"),
          endAt: new Date("2025-12-15T12:00:00Z"),
        });
      });

      expect(result.current.state.isCreating).toBe(true);

      // クリーンアップ
      await act(async () => {
        resolvePromise!({ success: true, data: mockCalendarEvent });
      });
    });

    it("should set isCreating to false after successful creation", async () => {
      const mockService = createMockEventService({
        createEvent: vi.fn().mockResolvedValue({
          success: true,
          data: mockCalendarEvent,
        }),
      });

      const { result } = renderHook(() => useEventMutation(mockService));

      await act(async () => {
        await result.current.createEvent({
          guildId: "guild-123",
          title: "新しいイベント",
          startAt: new Date("2025-12-15T10:00:00Z"),
          endAt: new Date("2025-12-15T12:00:00Z"),
        });
      });

      expect(result.current.state.isCreating).toBe(false);
    });

    it("should call EventService.createEvent with correct input", async () => {
      const createEventMock = vi.fn().mockResolvedValue({
        success: true,
        data: mockCalendarEvent,
      });
      const mockService = createMockEventService({
        createEvent: createEventMock,
      });

      const { result } = renderHook(() => useEventMutation(mockService));

      const input: CreateEventInput = {
        guildId: "guild-123",
        title: "新しいイベント",
        startAt: new Date("2025-12-15T10:00:00Z"),
        endAt: new Date("2025-12-15T12:00:00Z"),
        description: "説明",
        isAllDay: false,
      };

      await act(async () => {
        await result.current.createEvent(input);
      });

      expect(createEventMock).toHaveBeenCalledWith(input);
    });

    it("should return success result on successful creation", async () => {
      const mockService = createMockEventService({
        createEvent: vi.fn().mockResolvedValue({
          success: true,
          data: mockCalendarEvent,
        }),
      });

      const { result } = renderHook(() => useEventMutation(mockService));

      let createResult: MutationResult<CalendarEvent> | undefined;
      await act(async () => {
        createResult = await result.current.createEvent({
          guildId: "guild-123",
          title: "新しいイベント",
          startAt: new Date("2025-12-15T10:00:00Z"),
          endAt: new Date("2025-12-15T12:00:00Z"),
        });
      });

      expect(createResult?.success).toBe(true);
      if (createResult?.success) {
        expect(createResult.data).toEqual(mockCalendarEvent);
      }
    });

    it("should set error state on creation failure", async () => {
      const mockError: CalendarError = {
        code: "CREATE_FAILED",
        message: "イベントの作成に失敗しました。",
      };
      const mockService = createMockEventService({
        createEvent: vi.fn().mockResolvedValue({
          success: false,
          error: mockError,
        }),
      });

      const { result } = renderHook(() => useEventMutation(mockService));

      await act(async () => {
        await result.current.createEvent({
          guildId: "guild-123",
          title: "新しいイベント",
          startAt: new Date("2025-12-15T10:00:00Z"),
          endAt: new Date("2025-12-15T12:00:00Z"),
        });
      });

      expect(result.current.state.error).toEqual(mockError);
      expect(result.current.state.isCreating).toBe(false);
    });

    it("should call onSuccess callback after successful creation", async () => {
      const mockService = createMockEventService({
        createEvent: vi.fn().mockResolvedValue({
          success: true,
          data: mockCalendarEvent,
        }),
      });
      const onSuccess = vi.fn();

      const { result } = renderHook(() =>
        useEventMutation(mockService, { onSuccess })
      );

      await act(async () => {
        await result.current.createEvent({
          guildId: "guild-123",
          title: "新しいイベント",
          startAt: new Date("2025-12-15T10:00:00Z"),
          endAt: new Date("2025-12-15T12:00:00Z"),
        });
      });

      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it("should call onError callback after creation failure", async () => {
      const mockError: CalendarError = {
        code: "CREATE_FAILED",
        message: "イベントの作成に失敗しました。",
      };
      const mockService = createMockEventService({
        createEvent: vi.fn().mockResolvedValue({
          success: false,
          error: mockError,
        }),
      });
      const onError = vi.fn();

      const { result } = renderHook(() =>
        useEventMutation(mockService, { onError })
      );

      await act(async () => {
        await result.current.createEvent({
          guildId: "guild-123",
          title: "新しいイベント",
          startAt: new Date("2025-12-15T10:00:00Z"),
          endAt: new Date("2025-12-15T12:00:00Z"),
        });
      });

      expect(onError).toHaveBeenCalledWith(mockError);
    });
  });

  describe("updateEvent (Req 3.3)", () => {
    it("should set isUpdating to true while updating", async () => {
      let resolvePromise: (value: MutationResult<CalendarEvent>) => void;
      const pendingPromise = new Promise<MutationResult<CalendarEvent>>(
        (resolve) => {
          resolvePromise = resolve;
        }
      );

      const mockService = createMockEventService({
        updateEvent: vi.fn().mockReturnValue(pendingPromise),
      });

      const { result } = renderHook(() => useEventMutation(mockService));

      act(() => {
        result.current.updateEvent("event-1", { title: "更新されたタイトル" });
      });

      expect(result.current.state.isUpdating).toBe(true);

      // クリーンアップ
      await act(async () => {
        resolvePromise!({ success: true, data: mockCalendarEvent });
      });
    });

    it("should set isUpdating to false after successful update", async () => {
      const mockService = createMockEventService({
        updateEvent: vi.fn().mockResolvedValue({
          success: true,
          data: mockCalendarEvent,
        }),
      });

      const { result } = renderHook(() => useEventMutation(mockService));

      await act(async () => {
        await result.current.updateEvent("event-1", {
          title: "更新されたタイトル",
        });
      });

      expect(result.current.state.isUpdating).toBe(false);
    });

    it("should call EventService.updateEvent with correct id and input", async () => {
      const updateEventMock = vi.fn().mockResolvedValue({
        success: true,
        data: mockCalendarEvent,
      });
      const mockService = createMockEventService({
        updateEvent: updateEventMock,
      });

      const { result } = renderHook(() => useEventMutation(mockService));

      const input: UpdateEventInput = {
        title: "更新されたタイトル",
        description: "更新された説明",
      };

      await act(async () => {
        await result.current.updateEvent("event-1", input);
      });

      expect(updateEventMock).toHaveBeenCalledWith("event-1", input);
    });

    it("should return success result on successful update", async () => {
      const updatedEvent: CalendarEvent = {
        ...mockCalendarEvent,
        title: "更新されたタイトル",
      };
      const mockService = createMockEventService({
        updateEvent: vi.fn().mockResolvedValue({
          success: true,
          data: updatedEvent,
        }),
      });

      const { result } = renderHook(() => useEventMutation(mockService));

      let updateResult: MutationResult<CalendarEvent> | undefined;
      await act(async () => {
        updateResult = await result.current.updateEvent("event-1", {
          title: "更新されたタイトル",
        });
      });

      expect(updateResult?.success).toBe(true);
      if (updateResult?.success) {
        expect(updateResult.data.title).toBe("更新されたタイトル");
      }
    });

    it("should set error state on update failure", async () => {
      const mockError: CalendarError = {
        code: "UPDATE_FAILED",
        message: "イベントの更新に失敗しました。",
      };
      const mockService = createMockEventService({
        updateEvent: vi.fn().mockResolvedValue({
          success: false,
          error: mockError,
        }),
      });

      const { result } = renderHook(() => useEventMutation(mockService));

      await act(async () => {
        await result.current.updateEvent("event-1", { title: "更新テスト" });
      });

      expect(result.current.state.error).toEqual(mockError);
      expect(result.current.state.isUpdating).toBe(false);
    });

    it("should call onSuccess callback after successful update", async () => {
      const mockService = createMockEventService({
        updateEvent: vi.fn().mockResolvedValue({
          success: true,
          data: mockCalendarEvent,
        }),
      });
      const onSuccess = vi.fn();

      const { result } = renderHook(() =>
        useEventMutation(mockService, { onSuccess })
      );

      await act(async () => {
        await result.current.updateEvent("event-1", { title: "更新テスト" });
      });

      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it("should call onError callback after update failure", async () => {
      const mockError: CalendarError = {
        code: "UPDATE_FAILED",
        message: "イベントの更新に失敗しました。",
      };
      const mockService = createMockEventService({
        updateEvent: vi.fn().mockResolvedValue({
          success: false,
          error: mockError,
        }),
      });
      const onError = vi.fn();

      const { result } = renderHook(() =>
        useEventMutation(mockService, { onError })
      );

      await act(async () => {
        await result.current.updateEvent("event-1", { title: "更新テスト" });
      });

      expect(onError).toHaveBeenCalledWith(mockError);
    });
  });

  describe("deleteEvent (Req 4.2)", () => {
    it("should set isDeleting to true while deleting", async () => {
      let resolvePromise: (value: MutationResult<void>) => void;
      const pendingPromise = new Promise<MutationResult<void>>((resolve) => {
        resolvePromise = resolve;
      });

      const mockService = createMockEventService({
        deleteEvent: vi.fn().mockReturnValue(pendingPromise),
      });

      const { result } = renderHook(() => useEventMutation(mockService));

      act(() => {
        result.current.deleteEvent("event-1");
      });

      expect(result.current.state.isDeleting).toBe(true);

      // クリーンアップ
      await act(async () => {
        resolvePromise!({ success: true, data: undefined });
      });
    });

    it("should set isDeleting to false after successful deletion", async () => {
      const mockService = createMockEventService({
        deleteEvent: vi.fn().mockResolvedValue({
          success: true,
          data: undefined,
        }),
      });

      const { result } = renderHook(() => useEventMutation(mockService));

      await act(async () => {
        await result.current.deleteEvent("event-1");
      });

      expect(result.current.state.isDeleting).toBe(false);
    });

    it("should call EventService.deleteEvent with correct id", async () => {
      const deleteEventMock = vi.fn().mockResolvedValue({
        success: true,
        data: undefined,
      });
      const mockService = createMockEventService({
        deleteEvent: deleteEventMock,
      });

      const { result } = renderHook(() => useEventMutation(mockService));

      await act(async () => {
        await result.current.deleteEvent("event-1");
      });

      expect(deleteEventMock).toHaveBeenCalledWith("event-1");
    });

    it("should return success result on successful deletion", async () => {
      const mockService = createMockEventService({
        deleteEvent: vi.fn().mockResolvedValue({
          success: true,
          data: undefined,
        }),
      });

      const { result } = renderHook(() => useEventMutation(mockService));

      let deleteResult: MutationResult<void> | undefined;
      await act(async () => {
        deleteResult = await result.current.deleteEvent("event-1");
      });

      expect(deleteResult?.success).toBe(true);
    });

    it("should set error state on deletion failure", async () => {
      const mockError: CalendarError = {
        code: "DELETE_FAILED",
        message: "イベントの削除に失敗しました。",
      };
      const mockService = createMockEventService({
        deleteEvent: vi.fn().mockResolvedValue({
          success: false,
          error: mockError,
        }),
      });

      const { result } = renderHook(() => useEventMutation(mockService));

      await act(async () => {
        await result.current.deleteEvent("event-1");
      });

      expect(result.current.state.error).toEqual(mockError);
      expect(result.current.state.isDeleting).toBe(false);
    });

    it("should call onSuccess callback after successful deletion", async () => {
      const mockService = createMockEventService({
        deleteEvent: vi.fn().mockResolvedValue({
          success: true,
          data: undefined,
        }),
      });
      const onSuccess = vi.fn();

      const { result } = renderHook(() =>
        useEventMutation(mockService, { onSuccess })
      );

      await act(async () => {
        await result.current.deleteEvent("event-1");
      });

      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it("should call onError callback after deletion failure", async () => {
      const mockError: CalendarError = {
        code: "DELETE_FAILED",
        message: "イベントの削除に失敗しました。",
      };
      const mockService = createMockEventService({
        deleteEvent: vi.fn().mockResolvedValue({
          success: false,
          error: mockError,
        }),
      });
      const onError = vi.fn();

      const { result } = renderHook(() =>
        useEventMutation(mockService, { onError })
      );

      await act(async () => {
        await result.current.deleteEvent("event-1");
      });

      expect(onError).toHaveBeenCalledWith(mockError);
    });
  });

  describe("clearError", () => {
    it("should clear error state", async () => {
      const mockError: CalendarError = {
        code: "CREATE_FAILED",
        message: "イベントの作成に失敗しました。",
      };
      const mockService = createMockEventService({
        createEvent: vi.fn().mockResolvedValue({
          success: false,
          error: mockError,
        }),
      });

      const { result } = renderHook(() => useEventMutation(mockService));

      // まずエラーを発生させる
      await act(async () => {
        await result.current.createEvent({
          guildId: "guild-123",
          title: "テスト",
          startAt: new Date(),
          endAt: new Date(),
        });
      });

      expect(result.current.state.error).toEqual(mockError);

      // エラーをクリア
      act(() => {
        result.current.clearError();
      });

      expect(result.current.state.error).toBeNull();
    });
  });

  describe("concurrent operations", () => {
    it("should handle only one create operation at a time", async () => {
      let resolveFirst: (value: MutationResult<CalendarEvent>) => void;
      const firstPromise = new Promise<MutationResult<CalendarEvent>>(
        (resolve) => {
          resolveFirst = resolve;
        }
      );

      const createEventMock = vi.fn().mockReturnValueOnce(firstPromise);
      const mockService = createMockEventService({
        createEvent: createEventMock,
      });

      const { result } = renderHook(() => useEventMutation(mockService));

      // 最初の作成を開始
      act(() => {
        result.current.createEvent({
          guildId: "guild-123",
          title: "イベント1",
          startAt: new Date(),
          endAt: new Date(),
        });
      });

      expect(result.current.state.isCreating).toBe(true);

      // 最初の作成を完了
      await act(async () => {
        resolveFirst!({ success: true, data: mockCalendarEvent });
      });

      expect(result.current.state.isCreating).toBe(false);
    });

    it("should allow different operations to run independently", async () => {
      const mockService = createMockEventService({
        createEvent: vi.fn().mockResolvedValue({
          success: true,
          data: mockCalendarEvent,
        }),
        deleteEvent: vi.fn().mockResolvedValue({
          success: true,
          data: undefined,
        }),
      });

      const { result } = renderHook(() => useEventMutation(mockService));

      // 作成と削除を同時に実行
      await act(async () => {
        await Promise.all([
          result.current.createEvent({
            guildId: "guild-123",
            title: "新規イベント",
            startAt: new Date(),
            endAt: new Date(),
          }),
          result.current.deleteEvent("event-to-delete"),
        ]);
      });

      expect(result.current.state.isCreating).toBe(false);
      expect(result.current.state.isDeleting).toBe(false);
    });
  });

  describe("error handling edge cases", () => {
    it("should clear previous error on new successful operation", async () => {
      const mockError: CalendarError = {
        code: "CREATE_FAILED",
        message: "イベントの作成に失敗しました。",
      };

      const createEventMock = vi
        .fn()
        .mockResolvedValueOnce({ success: false, error: mockError })
        .mockResolvedValueOnce({ success: true, data: mockCalendarEvent });

      const mockService = createMockEventService({
        createEvent: createEventMock,
      });

      const { result } = renderHook(() => useEventMutation(mockService));

      // 失敗する操作
      await act(async () => {
        await result.current.createEvent({
          guildId: "guild-123",
          title: "テスト",
          startAt: new Date(),
          endAt: new Date(),
        });
      });

      expect(result.current.state.error).toEqual(mockError);

      // 成功する操作
      await act(async () => {
        await result.current.createEvent({
          guildId: "guild-123",
          title: "テスト2",
          startAt: new Date(),
          endAt: new Date(),
        });
      });

      expect(result.current.state.error).toBeNull();
    });
  });
});
