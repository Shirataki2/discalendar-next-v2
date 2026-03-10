/**
 * @discalendar/rrule-utils - RRULE 文字列の生成・パース・オカレンス展開・人間可読テキスト変換
 *
 * 純粋関数として実装。外部依存は `rrule` パッケージのみ。
 * Web・Bot 両方から共有パッケージとしてインポートして使用する。
 */
import type { Weekday as RRuleWeekday } from "rrule";
// biome-ignore lint/performance/noNamespaceImport: rrule CJS/ESM dual compatibility requires namespace import
import * as rruleModule from "rrule";

// rrule パッケージは CJS (UMD) と ESM の2形式で配布されている。
// Node.js/tsx は CJS → module.exports を default にラップ、
// Turbopack は ESM → 名前付きエクスポートを直接提供。
// 両環境で動作させるため namespace import + default フォールバック。
const rruleLib = (
  "default" in rruleModule
    ? (rruleModule as Record<string, unknown>).default
    : rruleModule
) as typeof rruleModule;
const { Frequency, RRule, RRuleSet } = rruleLib;

/** 繰り返し頻度 */
export type RecurrenceFrequency = "daily" | "weekly" | "monthly" | "yearly";

/** 曜日 (RFC 5545 準拠) */
export type Weekday = "MO" | "TU" | "WE" | "TH" | "FR" | "SA" | "SU";

const WEEKDAY_VALUES: readonly string[] = [
  "MO",
  "TU",
  "WE",
  "TH",
  "FR",
  "SA",
  "SU",
];

/** 値が有効な Weekday かどうかを判定する型ガード */
export function isWeekday(value: string): value is Weekday {
  return WEEKDAY_VALUES.includes(value);
}

/** 月の繰り返しモード */
export type MonthlyMode =
  | { type: "dayOfMonth"; day: number }
  | { type: "nthWeekday"; n: number; weekday: Weekday };

/** 終了条件 */
export type EndCondition =
  | { type: "never" }
  | { type: "count"; count: number }
  | { type: "until"; until: Date };

/** RRULE 生成入力 */
export type RruleBuildInput = {
  frequency: RecurrenceFrequency;
  interval: number;
  byDay?: Weekday[];
  monthlyMode?: MonthlyMode;
  endCondition: EndCondition;
  dtstart: Date;
};

/** オカレンス展開結果 */
export type OccurrenceExpansionResult = {
  dates: Date[];
  truncated: boolean;
};

/** RRULE バリデーション結果 */
export type RruleValidationResult = {
  valid: boolean;
  error?: string;
};

/** 頻度文字列から rrule.js の Frequency 定数へのマッピング */
const FREQUENCY_MAP: Record<
  RecurrenceFrequency,
  (typeof Frequency)[keyof typeof Frequency]
> = {
  daily: Frequency.DAILY,
  weekly: Frequency.WEEKLY,
  monthly: Frequency.MONTHLY,
  yearly: Frequency.YEARLY,
};

/** 曜日文字列から rrule.js の Weekday へのマッピング */
const WEEKDAY_MAP: Record<Weekday, RRuleWeekday> = {
  MO: RRule.MO,
  TU: RRule.TU,
  WE: RRule.WE,
  TH: RRule.TH,
  FR: RRule.FR,
  SA: RRule.SA,
  SU: RRule.SU,
};

/** 曜日の日本語表示 */
const WEEKDAY_JP: Record<Weekday, string> = {
  MO: "月",
  TU: "火",
  WE: "水",
  TH: "木",
  FR: "金",
  SA: "土",
  SU: "日",
};

/** 頻度の日本語表示 */
const FREQUENCY_JP: Record<RecurrenceFrequency, string> = {
  daily: "日",
  weekly: "週",
  monthly: "月",
  yearly: "年",
};

/** RRULE プレフィックスのパターン */
const RRULE_PREFIX_RE = /^RRULE:/;

/**
 * RRULE 文字列を生成する
 *
 * @param input - RRULE 生成入力
 * @returns RFC 5545 準拠の RRULE 文字列
 */
export function buildRruleString(input: RruleBuildInput): string {
  const { frequency, interval, byDay, monthlyMode, endCondition, dtstart } =
    input;

  const options: Partial<ConstructorParameters<typeof RRule>[0]> = {
    freq: FREQUENCY_MAP[frequency],
    interval,
    dtstart,
  };

  // 曜日指定
  if (byDay && byDay.length > 0) {
    options.byweekday = byDay.map((d) => WEEKDAY_MAP[d]);
  }

  // 月次モード
  if (frequency === "monthly" && monthlyMode) {
    if (monthlyMode.type === "dayOfMonth") {
      options.bymonthday = [monthlyMode.day];
    } else {
      // nthWeekday: n番目の曜日
      options.byweekday = [WEEKDAY_MAP[monthlyMode.weekday].nth(monthlyMode.n)];
    }
  }

  // 終了条件
  if (endCondition.type === "count") {
    options.count = endCondition.count;
  } else if (endCondition.type === "until") {
    options.until = endCondition.until;
  }

  const rule = new RRule(options);

  // RRule.toString() は dtstart 指定時に "DTSTART:...\nRRULE:..." 形式で出力するため
  // RRULE 部分のみを抽出する（DTSTART は event_series.start_at で別途管理）
  const output = rule.toString();
  const rruleLine = output
    .split("\n")
    .find((line) => line.startsWith("RRULE:"));
  if (rruleLine) {
    return rruleLine.replace(RRULE_PREFIX_RE, "");
  }
  // RRULE: プレフィックスのみの場合（DTSTART なし）
  return output.replace(RRULE_PREFIX_RE, "");
}

/**
 * RRULE 文字列 + EXDATE から範囲内のオカレンスを展開する
 *
 * @param rrule - RRULE 文字列
 * @param dtstart - シリーズ開始日時
 * @param rangeStart - 展開範囲の開始
 * @param rangeEnd - 展開範囲の終了
 * @param exdates - 除外日リスト
 * @returns オカレンス展開結果
 */
export function expandOccurrences(
  rrule: string,
  dtstart: Date,
  rangeStart: Date,
  rangeEnd: Date,
  exdates?: Date[]
): OccurrenceExpansionResult {
  if (!rrule || rrule.trim().length === 0) {
    return { dates: [], truncated: false };
  }

  try {
    const rruleSet = new RRuleSet();

    // RRULE文字列にプレフィックスがない場合は追加
    const rruleStr = rrule.startsWith("RRULE:") ? rrule : `RRULE:${rrule}`;

    // DTSTART を含む完全なRRULE文字列を構築
    const dtstartStr = `DTSTART:${formatDateUTC(dtstart)}`;
    const fullRruleStr = `${dtstartStr}\n${rruleStr}`;

    const rule = RRule.fromString(fullRruleStr);
    rruleSet.rrule(rule);

    // EXDATE の適用
    if (exdates && exdates.length > 0) {
      for (const exdate of exdates) {
        rruleSet.exdate(exdate);
      }
    }

    // 範囲内のオカレンスのみを展開 (inc=true で境界を含む)
    const dates = rruleSet.between(rangeStart, rangeEnd, true);

    return { dates, truncated: false };
  } catch {
    return { dates: [], truncated: false };
  }
}

/**
 * RRULE 文字列を人間可読テキストに変換する
 *
 * @param rrule - RRULE 文字列
 * @param dtstart - シリーズ開始日時
 * @returns 日本語の要約テキスト（例: 「毎週火・木曜日」）
 */
export function toSummaryText(rrule: string, dtstart: Date): string {
  if (!rrule || rrule.trim().length === 0) {
    return "";
  }

  try {
    const rruleStr = rrule.startsWith("RRULE:") ? rrule : `RRULE:${rrule}`;
    const dtstartStr = `DTSTART:${formatDateUTC(dtstart)}`;
    const fullRruleStr = `${dtstartStr}\n${rruleStr}`;

    const rule = RRule.fromString(fullRruleStr);
    const options = rule.origOptions;

    const parts: string[] = [];

    // 頻度と間隔
    const freq = getFrequencyKey(options.freq);
    if (!freq) {
      return "";
    }

    const interval = options.interval ?? 1;

    if (interval === 1) {
      parts.push(`毎${FREQUENCY_JP[freq]}`);
    } else {
      parts.push(`${interval}${FREQUENCY_JP[freq]}間ごと`);
    }

    // 曜日情報
    if (options.byweekday) {
      const weekdays = Array.isArray(options.byweekday)
        ? options.byweekday
        : [options.byweekday];

      const dayNames: string[] = [];
      for (const wd of weekdays) {
        const weekdayStr =
          typeof wd === "number" ? numberToWeekday(wd) : extractWeekdayStr(wd);
        if (weekdayStr) {
          dayNames.push(WEEKDAY_JP[weekdayStr]);
        }
      }

      if (dayNames.length > 0) {
        parts.push(`${dayNames.join("・")}曜日`);
      }
    }

    // 回数制限
    if (options.count) {
      parts.push(`${options.count}回`);
    }

    // 終了日
    if (options.until) {
      const until = options.until;
      parts.push(
        `${until.getUTCFullYear()}/${String(until.getUTCMonth() + 1).padStart(2, "0")}/${String(until.getUTCDate()).padStart(2, "0")}まで`
      );
    }

    return parts.join(" ");
  } catch {
    return "";
  }
}

/**
 * RRULE 文字列の妥当性を検証する
 *
 * @param rrule - RRULE 文字列
 * @returns バリデーション結果
 */
const MAX_RRULE_LENGTH = 1000;

export function validateRrule(rrule: string): RruleValidationResult {
  if (!rrule || rrule.trim().length === 0) {
    return { valid: false, error: "RRULE文字列が空です。" };
  }

  if (rrule.length > MAX_RRULE_LENGTH) {
    return {
      valid: false,
      error: `RRULE文字列が長すぎます（最大${MAX_RRULE_LENGTH}文字）。`,
    };
  }

  // FREQ が含まれていることを確認
  if (!rrule.includes("FREQ=")) {
    return { valid: false, error: "FREQ パラメータが必要です。" };
  }

  try {
    const rruleStr = rrule.startsWith("RRULE:") ? rrule : `RRULE:${rrule}`;
    // パースを試行して有効性を確認
    RRule.fromString(rruleStr);
    return { valid: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "不明なパースエラー";
    return { valid: false, error: message };
  }
}

// =============================================================================
// ヘルパー関数
// =============================================================================

/** Date を UTC の RRULE 日付文字列に変換する */
export function formatDateUTC(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const seconds = String(date.getUTCSeconds()).padStart(2, "0");
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/** Frequency 数値からキー文字列を取得する */
function getFrequencyKey(
  freq: (typeof Frequency)[keyof typeof Frequency] | undefined
): RecurrenceFrequency | null {
  if (freq === undefined) {
    return null;
  }
  for (const [key, value] of Object.entries(FREQUENCY_MAP)) {
    if (value === freq) {
      return key as RecurrenceFrequency;
    }
  }
  return null;
}

/** rrule.js の Weekday 数値を Weekday 文字列に変換する */
function numberToWeekday(n: number): Weekday | null {
  const map: Record<number, Weekday> = {
    0: "MO",
    1: "TU",
    2: "WE",
    3: "TH",
    4: "FR",
    5: "SA",
    6: "SU",
  };
  return map[n] ?? null;
}

/** rrule.js の Weekday オブジェクトから Weekday 文字列を抽出する */
function extractWeekdayStr(wd: unknown): Weekday | null {
  if (typeof wd === "number") {
    return numberToWeekday(wd);
  }

  // rrule.js の Weekday オブジェクト: { weekday: number, n?: number }
  if (wd && typeof wd === "object" && "weekday" in wd) {
    const weekday = (wd as { weekday: number }).weekday;
    return numberToWeekday(weekday);
  }

  return null;
}
