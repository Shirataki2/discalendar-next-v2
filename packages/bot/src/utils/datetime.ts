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
