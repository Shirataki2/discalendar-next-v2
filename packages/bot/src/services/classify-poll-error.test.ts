import { describe, expect, it } from "vitest";
import { classifyPollError } from "./classify-poll-error.js";

describe("classifyPollError", () => {
  it("Postgres unique violation (23505) を POLL_NOT_FOUND ではなく INVALID_INPUT にマップする", () => {
    const result = classifyPollError(
      { code: "23505", message: "duplicate key value" },
      "castVote"
    );
    expect(result.code).toBe("INVALID_INPUT");
    if (result.code === "INVALID_INPUT") {
      expect(result.details).toContain("duplicate");
    }
  });

  it("Postgres foreign key violation (23503) を INVALID_INPUT にマップする", () => {
    const result = classifyPollError(
      { code: "23503", message: "foreign key constraint" },
      "castVote"
    );
    expect(result.code).toBe("INVALID_INPUT");
  });

  it("Postgres check constraint violation (23514) を INVALID_INPUT にマップする", () => {
    const result = classifyPollError(
      { code: "23514", message: "check constraint violation: option limit" },
      "createPoll"
    );
    expect(result.code).toBe("INVALID_INPUT");
  });

  it("PostgREST PGRST116 (no rows) を POLL_NOT_FOUND にマップする", () => {
    const result = classifyPollError(
      { code: "PGRST116", message: "no rows returned" },
      "getPoll"
    );
    expect(result.code).toBe("POLL_NOT_FOUND");
  });

  it("Postgres insufficient privilege (42501) を FORBIDDEN にマップする", () => {
    const result = classifyPollError(
      { code: "42501", message: "permission denied" },
      "closePoll"
    );
    expect(result.code).toBe("FORBIDDEN");
  });

  it("未知のエラーコードは INTERNAL にマップする", () => {
    const result = classifyPollError(
      { code: "unknown-code", message: "something broke" },
      "finalizePoll"
    );
    expect(result.code).toBe("INTERNAL");
  });

  it("code なしのエラーは INTERNAL にマップする", () => {
    const result = classifyPollError({ message: "boom" }, "finalizePoll");
    expect(result.code).toBe("INTERNAL");
  });

  it("details をエラーに含める", () => {
    const result = classifyPollError(
      { code: "23503", message: "fk", details: "poll_id=uuid" },
      "castVote"
    );
    if (result.code === "INVALID_INPUT") {
      expect(result.details).toBe("poll_id=uuid");
    }
  });
});
