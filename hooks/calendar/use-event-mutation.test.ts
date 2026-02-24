/**
 * useEventMutationのユニットテスト
 *
 * タスク4.1: Server Actionsを使用したミューテーション操作を管理するカスタムフックを作成する
 * - 作成・更新・削除の各操作のローディング状態を管理する
 * - Server Actions経由でCRUD操作を実行する
 * - 操作成功時と失敗時のコールバックをサポートする
 * - エラー状態の保持とクリア機能を提供する
 *
 * Requirements: 1.4, 3.3, 4.2
 */
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  CalendarError,
  CreateEventInput,
  MutationResult,
  UpdateEventInput,
} from "@/lib/calendar/event-service";
import type { CalendarEvent } from "@/lib/calendar/types";
import { useEventMutation } from "./use-event-mutation";

// Server Actionsのモック
vi.mock("@/app/dashboard/actions", () => ({
  createEventAction: vi.fn(),
  updateEventAction: vi.fn(),
  deleteEventAction: vi.fn(),
}));

import {
  createEventAction,
  deleteEventAction,
  updateEventAction,
} from "@/app/dashboard/actions";

const mockCreateEventAction = vi.mocked(createEventAction);
const mockUpdateEventAction = vi.mocked(updateEventAction);
const mockDeleteEventAction = vi.mocked(deleteEventAction);

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
      const { result } = renderHook(() => useEventMutation("guild-123"));

      expect(result.current.state.isCreating).toBe(false);
      expect(result.current.state.isUpdating).toBe(false);
      expect(result.current.state.isDeleting).toBe(false);
    });

    it("should initialize with error as null", () => {
      const { result } = renderHook(() => useEventMutation("guild-123"));

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

      mockCreateEventAction.mockReturnValue(pendingPromise);

      const { result } = renderHook(() => useEventMutation("guild-123"));

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
      mockCreateEventAction.mockResolvedValue({
        success: true,
        data: mockCalendarEvent,
      });

      const { result } = renderHook(() => useEventMutation("guild-123"));

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

    it("should call createEventAction with correct input", async () => {
      mockCreateEventAction.mockResolvedValue({
        success: true,
        data: mockCalendarEvent,
      });

      const { result } = renderHook(() => useEventMutation("guild-123"));

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

      expect(mockCreateEventAction).toHaveBeenCalledWith({
        guildId: "guild-123",
        eventData: input,
      });
    });

    it("should return success result on successful creation", async () => {
      mockCreateEventAction.mockResolvedValue({
        success: true,
        data: mockCalendarEvent,
      });

      const { result } = renderHook(() => useEventMutation("guild-123"));

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
      mockCreateEventAction.mockResolvedValue({
        success: false,
        error: mockError,
      });

      const { result } = renderHook(() => useEventMutation("guild-123"));

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
      mockCreateEventAction.mockResolvedValue({
        success: true,
        data: mockCalendarEvent,
      });
      const onSuccess = vi.fn();

      const { result } = renderHook(() =>
        useEventMutation("guild-123", { onSuccess })
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
      mockCreateEventAction.mockResolvedValue({
        success: false,
        error: mockError,
      });
      const onError = vi.fn();

      const { result } = renderHook(() =>
        useEventMutation("guild-123", { onError })
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

      mockUpdateEventAction.mockReturnValue(pendingPromise);

      const { result } = renderHook(() => useEventMutation("guild-123"));

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
      mockUpdateEventAction.mockResolvedValue({
        success: true,
        data: mockCalendarEvent,
      });

      const { result } = renderHook(() => useEventMutation("guild-123"));

      await act(async () => {
        await result.current.updateEvent("event-1", {
          title: "更新されたタイトル",
        });
      });

      expect(result.current.state.isUpdating).toBe(false);
    });

    it("should call updateEventAction with correct id and input", async () => {
      mockUpdateEventAction.mockResolvedValue({
        success: true,
        data: mockCalendarEvent,
      });

      const { result } = renderHook(() => useEventMutation("guild-123"));

      const input: UpdateEventInput = {
        title: "更新されたタイトル",
        description: "更新された説明",
      };

      await act(async () => {
        await result.current.updateEvent("event-1", input);
      });

      expect(mockUpdateEventAction).toHaveBeenCalledWith({
        guildId: "guild-123",
        eventId: "event-1",
        eventData: input,
      });
    });

    it("should return success result on successful update", async () => {
      const updatedEvent: CalendarEvent = {
        ...mockCalendarEvent,
        title: "更新されたタイトル",
      };
      mockUpdateEventAction.mockResolvedValue({
        success: true,
        data: updatedEvent,
      });

      const { result } = renderHook(() => useEventMutation("guild-123"));

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
      mockUpdateEventAction.mockResolvedValue({
        success: false,
        error: mockError,
      });

      const { result } = renderHook(() => useEventMutation("guild-123"));

      await act(async () => {
        await result.current.updateEvent("event-1", { title: "更新テスト" });
      });

      expect(result.current.state.error).toEqual(mockError);
      expect(result.current.state.isUpdating).toBe(false);
    });

    it("should call onSuccess callback after successful update", async () => {
      mockUpdateEventAction.mockResolvedValue({
        success: true,
        data: mockCalendarEvent,
      });
      const onSuccess = vi.fn();

      const { result } = renderHook(() =>
        useEventMutation("guild-123", { onSuccess })
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
      mockUpdateEventAction.mockResolvedValue({
        success: false,
        error: mockError,
      });
      const onError = vi.fn();

      const { result } = renderHook(() =>
        useEventMutation("guild-123", { onError })
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

      mockDeleteEventAction.mockReturnValue(pendingPromise);

      const { result } = renderHook(() => useEventMutation("guild-123"));

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
      mockDeleteEventAction.mockResolvedValue({
        success: true,
        data: undefined,
      });

      const { result } = renderHook(() => useEventMutation("guild-123"));

      await act(async () => {
        await result.current.deleteEvent("event-1");
      });

      expect(result.current.state.isDeleting).toBe(false);
    });

    it("should call deleteEventAction with correct id", async () => {
      mockDeleteEventAction.mockResolvedValue({
        success: true,
        data: undefined,
      });

      const { result } = renderHook(() => useEventMutation("guild-123"));

      await act(async () => {
        await result.current.deleteEvent("event-1");
      });

      expect(mockDeleteEventAction).toHaveBeenCalledWith({
        guildId: "guild-123",
        eventId: "event-1",
      });
    });

    it("should return success result on successful deletion", async () => {
      mockDeleteEventAction.mockResolvedValue({
        success: true,
        data: undefined,
      });

      const { result } = renderHook(() => useEventMutation("guild-123"));

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
      mockDeleteEventAction.mockResolvedValue({
        success: false,
        error: mockError,
      });

      const { result } = renderHook(() => useEventMutation("guild-123"));

      await act(async () => {
        await result.current.deleteEvent("event-1");
      });

      expect(result.current.state.error).toEqual(mockError);
      expect(result.current.state.isDeleting).toBe(false);
    });

    it("should call onSuccess callback after successful deletion", async () => {
      mockDeleteEventAction.mockResolvedValue({
        success: true,
        data: undefined,
      });
      const onSuccess = vi.fn();

      const { result } = renderHook(() =>
        useEventMutation("guild-123", { onSuccess })
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
      mockDeleteEventAction.mockResolvedValue({
        success: false,
        error: mockError,
      });
      const onError = vi.fn();

      const { result } = renderHook(() =>
        useEventMutation("guild-123", { onError })
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
      mockCreateEventAction.mockResolvedValue({
        success: false,
        error: mockError,
      });

      const { result } = renderHook(() => useEventMutation("guild-123"));

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

      mockCreateEventAction.mockReturnValueOnce(firstPromise);

      const { result } = renderHook(() => useEventMutation("guild-123"));

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
      mockCreateEventAction.mockResolvedValue({
        success: true,
        data: mockCalendarEvent,
      });
      mockDeleteEventAction.mockResolvedValue({
        success: true,
        data: undefined,
      });

      const { result } = renderHook(() => useEventMutation("guild-123"));

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

      mockCreateEventAction
        .mockResolvedValueOnce({ success: false, error: mockError })
        .mockResolvedValueOnce({ success: true, data: mockCalendarEvent });

      const { result } = renderHook(() => useEventMutation("guild-123"));

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
