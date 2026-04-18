import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PollSnapshot } from "@/lib/polls/types";

const mockResolveServerAuth = vi.fn();
const mockCanManageGuild = vi.fn();
const mockClosePollService = vi.fn();
const mockFinalizePollService = vi.fn();
const mockRevalidatePath = vi.fn();
const mockRedirect = vi.fn(() => {
  throw new Error("NEXT_REDIRECT");
});
const mockCaptureException = vi.fn();

vi.mock("@/lib/auth/server-auth", () => ({
  resolveServerAuth: (...args: unknown[]) => mockResolveServerAuth(...args),
}));

vi.mock("@/lib/discord/permissions", () => ({
  canManageGuild: (...args: unknown[]) => mockCanManageGuild(...args),
}));

vi.mock("@/lib/polls/poll-service", () => ({
  closePoll: (...args: unknown[]) => mockClosePollService(...args),
  finalizePoll: (...args: unknown[]) => mockFinalizePollService(...args),
}));

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}));

const VALID_POLL_ID = "11111111-1111-1111-1111-111111111111";
const VALID_OPTION_ID = "22222222-2222-2222-2222-222222222222";
const VALID_GUILD_ID = "123456789012345678";

function snapshotFixture(): PollSnapshot {
  return {
    poll: {
      id: VALID_POLL_ID,
      guild_id: VALID_GUILD_ID,
      title: "meetup",
      description: null,
      status: "closed",
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

function mockAuthorized(userId = "user-1") {
  mockResolveServerAuth.mockResolvedValue({
    success: true,
    auth: {
      supabase: {},
      userId,
      permissions: { administrator: true },
    },
  });
  mockCanManageGuild.mockReturnValue(true);
}

function mockUnauthorized() {
  mockResolveServerAuth.mockResolvedValue({
    success: false,
    error: { code: "UNAUTHORIZED", message: "Not authenticated" },
  });
}

function mockAuthorizedWithoutManagePermission() {
  mockResolveServerAuth.mockResolvedValue({
    success: true,
    auth: {
      supabase: {},
      userId: "user-1",
      permissions: { administrator: false },
    },
  });
  mockCanManageGuild.mockReturnValue(false);
}

describe("poll server actions", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("closePollAction", () => {
    it("未認証では /auth/login にリダイレクトする", async () => {
      mockUnauthorized();

      const { closePollAction } = await import("./actions");
      await expect(
        closePollAction({ pollId: VALID_POLL_ID, guildId: VALID_GUILD_ID })
      ).rejects.toThrow("NEXT_REDIRECT");

      expect(mockRedirect).toHaveBeenCalledWith("/auth/login");
      expect(mockClosePollService).not.toHaveBeenCalled();
    });

    it("管理権限がない場合は FORBIDDEN を返し Service を呼ばない", async () => {
      mockAuthorizedWithoutManagePermission();

      const { closePollAction } = await import("./actions");
      const result = await closePollAction({
        pollId: VALID_POLL_ID,
        guildId: VALID_GUILD_ID,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("FORBIDDEN");
      }
      expect(mockClosePollService).not.toHaveBeenCalled();
    });

    it("不正な UUID では INVALID_INPUT を返し Service を呼ばない", async () => {
      mockAuthorized();

      const { closePollAction } = await import("./actions");
      const result = await closePollAction({
        pollId: "not-a-uuid",
        guildId: VALID_GUILD_ID,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("INVALID_INPUT");
      }
      expect(mockClosePollService).not.toHaveBeenCalled();
    });

    it("成功時は revalidatePath を呼び snapshot を返す", async () => {
      mockAuthorized();
      mockClosePollService.mockResolvedValue({
        success: true,
        data: snapshotFixture(),
      });

      const { closePollAction } = await import("./actions");
      const result = await closePollAction({
        pollId: VALID_POLL_ID,
        guildId: VALID_GUILD_ID,
      });

      expect(result.success).toBe(true);
      expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/polls");
      expect(mockRevalidatePath).toHaveBeenCalledWith(
        `/dashboard/polls/${VALID_POLL_ID}`
      );
    });

    it("失敗時は details が削除された error を返し Sentry に送る", async () => {
      mockAuthorized();
      mockClosePollService.mockResolvedValue({
        success: false,
        error: {
          code: "INTERNAL",
          message: "db error",
          details: "internal stack trace should be stripped",
        },
      });

      const { closePollAction } = await import("./actions");
      const result = await closePollAction({
        pollId: VALID_POLL_ID,
        guildId: VALID_GUILD_ID,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(JSON.stringify(result.error)).not.toContain(
          "internal stack trace"
        );
      }
      expect(mockCaptureException).toHaveBeenCalled();
    });
  });

  describe("finalizePollAction", () => {
    it("管理権限がない場合は FORBIDDEN を返し Service を呼ばない", async () => {
      mockAuthorizedWithoutManagePermission();

      const { finalizePollAction } = await import("./actions");
      const result = await finalizePollAction({
        pollId: VALID_POLL_ID,
        guildId: VALID_GUILD_ID,
        optionId: null,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("FORBIDDEN");
      }
      expect(mockFinalizePollService).not.toHaveBeenCalled();
    });

    it("TIE_BREAK_REQUIRED は candidateOptionIds を含めて伝搬する", async () => {
      mockAuthorized();
      mockFinalizePollService.mockResolvedValue({
        success: false,
        error: {
          code: "TIE_BREAK_REQUIRED",
          message: "tie",
          candidateOptionIds: ["a", "b"],
        },
      });

      const { finalizePollAction } = await import("./actions");
      const result = await finalizePollAction({
        pollId: VALID_POLL_ID,
        guildId: VALID_GUILD_ID,
        optionId: null,
      });

      expect(result.success).toBe(false);
      if (!result.success && result.error.code === "TIE_BREAK_REQUIRED") {
        expect(result.error.candidateOptionIds).toEqual(["a", "b"]);
      } else {
        throw new Error("expected TIE_BREAK_REQUIRED");
      }
    });

    it("成功時は eventId を含む結果を返し revalidatePath を呼ぶ", async () => {
      mockAuthorized();
      mockFinalizePollService.mockResolvedValue({
        success: true,
        data: {
          snapshot: snapshotFixture(),
          eventId: "evt-new",
          warnings: [],
        },
      });

      const { finalizePollAction } = await import("./actions");
      const result = await finalizePollAction({
        pollId: VALID_POLL_ID,
        guildId: VALID_GUILD_ID,
        optionId: VALID_OPTION_ID,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.eventId).toBe("evt-new");
      }
      expect(mockRevalidatePath).toHaveBeenCalled();
    });

    it("FORBIDDEN は権限不足としてそのまま返す", async () => {
      mockAuthorized();
      mockFinalizePollService.mockResolvedValue({
        success: false,
        error: { code: "FORBIDDEN", message: "permission denied" },
      });

      const { finalizePollAction } = await import("./actions");
      const result = await finalizePollAction({
        pollId: VALID_POLL_ID,
        guildId: VALID_GUILD_ID,
        optionId: VALID_OPTION_ID,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("FORBIDDEN");
      }
    });
  });
});
