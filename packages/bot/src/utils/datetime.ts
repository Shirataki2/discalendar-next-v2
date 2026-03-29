const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const DATE_FORMATTER = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function formatDateTime(date: Date): string {
  const parts = DATE_TIME_FORMATTER.formatToParts(date);
  const get = (type: string): string =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}/${get("month")}/${get("day")} ${get("hour")}:${get("minute")}`;
}

export function formatDate(date: Date): string {
  const parts = DATE_FORMATTER.formatToParts(date);
  const get = (type: string): string =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}/${get("month")}/${get("day")}`;
}

type DateInput = {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
};

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function maxDaysInMonth(year: number, month: number): number {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }
  if ([4, 6, 9, 11].includes(month)) {
    return 30;
  }
  return 31;
}

export type DateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

/** JSTパーツをUTC ISO文字列に変換する */
export function jstPartsToUtcIso(parts: DateTimeParts): string {
  const JST_OFFSET_HOURS = 9;
  const utc = new Date(
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour - JST_OFFSET_HOURS,
      parts.minute
    )
  );
  return utc.toISOString();
}

export type ParseDateTimeResult =
  | { success: true; data: DateTimeParts }
  | { success: false; error: string };

// YYYY/MM/DD HH:mm or YYYY-MM-DD HH:mm
const FULL_DATE_PATTERN =
  /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})\s+(\d{1,2}):(\d{2})$/;

// MM/DD HH:mm (年省略)
const SHORT_DATE_PATTERN = /^(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})$/;

export function parseDateTimeText(text: string): ParseDateTimeResult {
  const trimmed = text.trim();
  if (trimmed === "") {
    return { success: false, error: "日時を入力してください" };
  }

  let parts: DateTimeParts;

  const fullMatch = trimmed.match(FULL_DATE_PATTERN);
  if (fullMatch) {
    parts = {
      year: Number(fullMatch[1]),
      month: Number(fullMatch[2]),
      day: Number(fullMatch[3]),
      hour: Number(fullMatch[4]),
      minute: Number(fullMatch[5]),
    };
  } else {
    const shortMatch = trimmed.match(SHORT_DATE_PATTERN);
    if (shortMatch) {
      parts = {
        year: new Date().getFullYear(),
        month: Number(shortMatch[1]),
        day: Number(shortMatch[2]),
        hour: Number(shortMatch[3]),
        minute: Number(shortMatch[4]),
      };
    } else {
      return {
        success: false,
        error: "日時のフォーマットが不正です。例: 2025/03/29 15:00",
      };
    }
  }

  if (!validateDate(parts)) {
    return { success: false, error: "無効な日付です" };
  }

  return { success: true, data: parts };
}

export function validateDate(input: DateInput): boolean {
  const { year, month, day, hour = 0, minute = 0 } = input;

  const inRange = (v: number, min: number, max: number) => v >= min && v <= max;

  if (!inRange(year, 1970, 2099)) {
    return false;
  }
  if (!inRange(month, 1, 12)) {
    return false;
  }
  if (!inRange(day, 1, maxDaysInMonth(year, month))) {
    return false;
  }
  if (!inRange(hour, 0, 23)) {
    return false;
  }
  if (!inRange(minute, 0, 59)) {
    return false;
  }

  return true;
}
