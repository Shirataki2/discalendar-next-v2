import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, validateDate } from "./datetime.js";

describe("formatDateTime", () => {
  it("should format UTC date as JST YYYY/MM/DD HH:MM", () => {
    // 2024-01-15T03:30:00Z = 2024-01-15 12:30 JST
    const date = new Date("2024-01-15T03:30:00Z");
    expect(formatDateTime(date)).toBe("2024/01/15 12:30");
  });

  it("should handle midnight UTC (09:00 JST)", () => {
    const date = new Date("2024-06-01T00:00:00Z");
    expect(formatDateTime(date)).toBe("2024/06/01 09:00");
  });

  it("should handle date crossing day boundary in JST", () => {
    // 2024-12-31T15:30:00Z = 2025-01-01 00:30 JST
    const date = new Date("2024-12-31T15:30:00Z");
    expect(formatDateTime(date)).toBe("2025/01/01 00:30");
  });
});

describe("formatDate", () => {
  it("should format as YYYY/MM/DD in JST", () => {
    const date = new Date("2024-03-15T00:00:00Z");
    expect(formatDate(date)).toBe("2024/03/15");
  });

  it("should handle date crossing day boundary in JST", () => {
    // 2024-12-31T16:00:00Z = 2025-01-01 01:00 JST
    const date = new Date("2024-12-31T16:00:00Z");
    expect(formatDate(date)).toBe("2025/01/01");
  });
});

describe("validateDate", () => {
  it("should accept valid date", () => {
    expect(
      validateDate({ year: 2024, month: 6, day: 15, hour: 14, minute: 30 })
    ).toBe(true);
  });

  it("should reject year out of range", () => {
    expect(validateDate({ year: 1969, month: 1, day: 1 })).toBe(false);
    expect(validateDate({ year: 2100, month: 1, day: 1 })).toBe(false);
  });

  it("should reject invalid month", () => {
    expect(validateDate({ year: 2024, month: 0, day: 1 })).toBe(false);
    expect(validateDate({ year: 2024, month: 13, day: 1 })).toBe(false);
  });

  it("should reject day 31 for 30-day months", () => {
    expect(validateDate({ year: 2024, month: 4, day: 31 })).toBe(false);
    expect(validateDate({ year: 2024, month: 6, day: 31 })).toBe(false);
    expect(validateDate({ year: 2024, month: 9, day: 31 })).toBe(false);
    expect(validateDate({ year: 2024, month: 11, day: 31 })).toBe(false);
  });

  it("should handle February leap year", () => {
    expect(validateDate({ year: 2024, month: 2, day: 29 })).toBe(true);
    expect(validateDate({ year: 2023, month: 2, day: 29 })).toBe(false);
    expect(validateDate({ year: 2000, month: 2, day: 29 })).toBe(true);
    expect(validateDate({ year: 1900, month: 2, day: 29 })).toBe(false);
  });

  it("should reject February day > 29", () => {
    expect(validateDate({ year: 2024, month: 2, day: 30 })).toBe(false);
  });

  it("should reject invalid hour/minute", () => {
    expect(validateDate({ year: 2024, month: 1, day: 1, hour: 24 })).toBe(
      false
    );
    expect(
      validateDate({ year: 2024, month: 1, day: 1, hour: 0, minute: 60 })
    ).toBe(false);
  });

  it("should default hour/minute to 0", () => {
    expect(validateDate({ year: 2024, month: 1, day: 1 })).toBe(true);
  });
});
