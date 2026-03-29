// ICS Builder - RFC 5545 compliant ICS text generator
// Pure functions with no external dependencies

const CRLF = "\r\n";
const DOMAIN = "discalendar.app";
const PRODID = "-//Discalendar//Discalendar//EN";
const MAX_LINE_OCTETS = 75;

// --- Types ---

export type IcsEvent = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  isAllDay: boolean;
  startAt: string;
  endAt: string;
  location: string | null;
  createdAt: string;
  updatedAt: string;
};

export type IcsSeries = {
  id: string;
  name: string;
  description: string | null;
  color: string;
  isAllDay: boolean;
  rrule: string;
  dtstart: string;
  durationMinutes: number;
  location: string | null;
  exdates: string[];
  createdAt: string;
  updatedAt: string;
};

export type IcsException = {
  id: string;
  seriesId: string;
  name: string;
  description: string | null;
  color: string;
  isAllDay: boolean;
  startAt: string;
  endAt: string;
  location: string | null;
  originalDate: string;
  createdAt: string;
  updatedAt: string;
};

export type BuildCalendarParams = {
  calendarName: string;
  events: IcsEvent[];
  series: IcsSeries[];
  exceptions: IcsException[];
};

// --- Helper Functions (Task 2.1) ---

export function generateUid(id: string): string {
  return `${id}@${DOMAIN}`;
}

export function formatDateTimeToIcs(iso: string): string {
  const d = new Date(iso);
  const y = d.getUTCFullYear().toString();
  const m = (d.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = d.getUTCDate().toString().padStart(2, "0");
  const h = d.getUTCHours().toString().padStart(2, "0");
  const min = d.getUTCMinutes().toString().padStart(2, "0");
  const s = d.getUTCSeconds().toString().padStart(2, "0");
  return `${y}${m}${day}T${h}${min}${s}Z`;
}

export function formatDateToIcs(iso: string): string {
  const d = new Date(iso);
  const y = d.getUTCFullYear().toString();
  const m = (d.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = d.getUTCDate().toString().padStart(2, "0");
  return `${y}${m}${day}`;
}

export function escapeText(text: string): string {
  if (text === "") {
    return "";
  }
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const buf = encoder.encode(line);
  if (buf.length <= MAX_LINE_OCTETS) {
    return line;
  }

  const decoder = new TextDecoder();
  const parts: string[] = [];
  let offset = 0;
  let isFirst = true;

  while (offset < buf.length) {
    const limit = isFirst ? MAX_LINE_OCTETS : MAX_LINE_OCTETS - 1;
    let end = offset + limit;
    if (end >= buf.length) {
      end = buf.length;
    } else {
      // Don't split multibyte characters: walk back to a valid UTF-8 boundary
      while (end > offset && isUtf8Continuation(buf[end])) {
        end -= 1;
      }
    }
    const chunk = decoder.decode(buf.subarray(offset, end));
    parts.push(isFirst ? chunk : ` ${chunk}`);
    offset = end;
    isFirst = false;
  }

  return parts.join(CRLF);
}

function isUtf8Continuation(byte: number): boolean {
  // biome-ignore lint/suspicious/noBitwiseOperators: intentional UTF-8 continuation byte check
  return (byte & 0xc0) === 0x80;
}

function addDateTimeProps(
  lines: string[],
  isAllDay: boolean,
  startIso: string,
  endIso: string
): void {
  if (isAllDay) {
    lines.push(`DTSTART;VALUE=DATE:${formatDateToIcs(startIso)}`);
    lines.push(`DTEND;VALUE=DATE:${formatDateToIcs(endIso)}`);
  } else {
    lines.push(`DTSTART:${formatDateTimeToIcs(startIso)}`);
    lines.push(`DTEND:${formatDateTimeToIcs(endIso)}`);
  }
}

function addOptionalTextProp(
  lines: string[],
  propName: string,
  value: string | null
): void {
  if (value !== null) {
    lines.push(`${propName}:${escapeText(value)}`);
  }
}

// --- VEVENT Generators (Task 2.2 & 2.3) ---

function formatSingleEvent(event: IcsEvent): string {
  const lines: string[] = [];
  lines.push("BEGIN:VEVENT");
  lines.push(`UID:${generateUid(event.id)}`);
  lines.push(`DTSTAMP:${formatDateTimeToIcs(event.updatedAt)}`);
  addDateTimeProps(lines, event.isAllDay, event.startAt, event.endAt);
  lines.push(`SUMMARY:${escapeText(event.name)}`);
  addOptionalTextProp(lines, "DESCRIPTION", event.description);
  addOptionalTextProp(lines, "LOCATION", event.location);
  lines.push("END:VEVENT");
  return lines.map(foldLine).join(CRLF);
}

function addMinutesToIso(iso: string, minutes: number): string {
  const d = new Date(iso);
  d.setUTCMinutes(d.getUTCMinutes() + minutes);
  return d.toISOString();
}

function formatSeriesEvent(series: IcsSeries): string {
  const endIso = addMinutesToIso(series.dtstart, series.durationMinutes);
  const lines: string[] = [];
  lines.push("BEGIN:VEVENT");
  lines.push(`UID:${generateUid(series.id)}`);
  lines.push(`DTSTAMP:${formatDateTimeToIcs(series.updatedAt)}`);
  addDateTimeProps(lines, series.isAllDay, series.dtstart, endIso);
  lines.push(`SUMMARY:${escapeText(series.name)}`);
  lines.push(`RRULE:${series.rrule}`);
  if (series.exdates.length > 0) {
    if (series.isAllDay) {
      const formatted = series.exdates.map(formatDateToIcs).join(",");
      lines.push(`EXDATE;VALUE=DATE:${formatted}`);
    } else {
      const formatted = series.exdates.map(formatDateTimeToIcs).join(",");
      lines.push(`EXDATE:${formatted}`);
    }
  }
  addOptionalTextProp(lines, "DESCRIPTION", series.description);
  addOptionalTextProp(lines, "LOCATION", series.location);
  lines.push("END:VEVENT");
  return lines.map(foldLine).join(CRLF);
}

function formatExceptionEvent(exception: IcsException): string {
  const lines: string[] = [];
  lines.push("BEGIN:VEVENT");
  lines.push(`UID:${generateUid(exception.seriesId)}`);
  lines.push(`DTSTAMP:${formatDateTimeToIcs(exception.updatedAt)}`);
  if (exception.isAllDay) {
    lines.push(
      `RECURRENCE-ID;VALUE=DATE:${formatDateToIcs(exception.originalDate)}`
    );
  } else {
    lines.push(`RECURRENCE-ID:${formatDateTimeToIcs(exception.originalDate)}`);
  }
  addDateTimeProps(
    lines,
    exception.isAllDay,
    exception.startAt,
    exception.endAt
  );
  lines.push(`SUMMARY:${escapeText(exception.name)}`);
  addOptionalTextProp(lines, "DESCRIPTION", exception.description);
  addOptionalTextProp(lines, "LOCATION", exception.location);
  lines.push("END:VEVENT");
  return lines.map(foldLine).join(CRLF);
}

// --- Main Builder (Task 2.1) ---

export function buildCalendar(params: BuildCalendarParams): string {
  const parts: string[] = [];

  // VCALENDAR header
  parts.push("BEGIN:VCALENDAR");
  parts.push("VERSION:2.0");
  parts.push(`PRODID:${PRODID}`);
  parts.push(foldLine(`X-WR-CALNAME:${escapeText(params.calendarName)}`));

  // Single events (Req 2.1-2.6)
  for (const event of params.events) {
    parts.push(formatSingleEvent(event));
  }

  // Recurring series (Req 3.1-3.4)
  for (const series of params.series) {
    parts.push(formatSeriesEvent(series));
  }

  // Exception occurrences (Req 3.5)
  for (const exception of params.exceptions) {
    parts.push(formatExceptionEvent(exception));
  }

  parts.push("END:VCALENDAR");

  return parts.join(CRLF) + CRLF;
}
