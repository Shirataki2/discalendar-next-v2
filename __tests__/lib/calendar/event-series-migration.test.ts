/**
 * Task 1.1: event_series テーブルマイグレーションテスト
 *
 * Requirements:
 * - 8.1: RRULE文字列をRFC 5545形式でデータベースに保存
 * - 8.2: オカレンスの例外情報をイベントシリーズに関連付けて保存
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SUPABASE_MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

// event_series テーブルスキーマ検証パターン
const CREATE_TABLE_EVENT_SERIES_PATTERN = /CREATE\s+TABLE\s+event_series/i;
const ID_UUID_PK_PATTERN =
  /id\s+UUID\s+PRIMARY\s+KEY\s+DEFAULT\s+gen_random_uuid\(\)/i;
const GUILD_ID_FK_PATTERN =
  /guild_id\s+VARCHAR\(32\)\s+NOT\s+NULL\s+REFERENCES\s+guilds\(guild_id\)\s+ON\s+DELETE\s+CASCADE/i;
const NAME_NOT_NULL_PATTERN = /name\s+VARCHAR\(255\)\s+NOT\s+NULL/i;
const DESCRIPTION_TEXT_PATTERN = /description\s+TEXT/i;
const COLOR_DEFAULT_PATTERN =
  /color\s+VARCHAR\(7\)\s+NOT\s+NULL\s+DEFAULT\s+'#3B82F6'/i;
const IS_ALL_DAY_PATTERN =
  /is_all_day\s+BOOLEAN\s+NOT\s+NULL\s+DEFAULT\s+false/i;
const RRULE_NOT_NULL_PATTERN = /rrule\s+TEXT\s+NOT\s+NULL/i;
const DTSTART_PATTERN = /dtstart\s+TIMESTAMPTZ\s+NOT\s+NULL/i;
const DURATION_MINUTES_PATTERN =
  /duration_minutes\s+INTEGER\s+NOT\s+NULL\s+DEFAULT\s+60/i;
const LOCATION_PATTERN = /location\s+VARCHAR\(255\)/i;
const CHANNEL_ID_PATTERN = /channel_id\s+VARCHAR\(32\)/i;
const CHANNEL_NAME_PATTERN = /channel_name\s+VARCHAR\(100\)/i;
const NOTIFICATIONS_JSONB_PATTERN =
  /notifications\s+JSONB\s+NOT\s+NULL\s+DEFAULT\s+'\[\]'/i;
const EXDATES_ARRAY_PATTERN =
  /exdates\s+TIMESTAMPTZ\[\]\s+NOT\s+NULL\s+DEFAULT\s+'\{\}'/i;
const CREATED_AT_PATTERN =
  /created_at\s+TIMESTAMPTZ\s+NOT\s+NULL\s+DEFAULT\s+NOW\(\)/i;
const UPDATED_AT_PATTERN =
  /updated_at\s+TIMESTAMPTZ\s+NOT\s+NULL\s+DEFAULT\s+NOW\(\)/i;

// インデックスパターン
const INDEX_GUILD_ID_PATTERN =
  /CREATE\s+INDEX\s+idx_event_series_guild_id\s+ON\s+event_series\(guild_id\)/i;
const INDEX_DTSTART_PATTERN =
  /CREATE\s+INDEX\s+idx_event_series_dtstart\s+ON\s+event_series\(dtstart\)/i;

// RLS パターン
const ENABLE_RLS_PATTERN =
  /ALTER\s+TABLE\s+event_series\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i;
const POLICY_SELECT_PATTERN =
  /CREATE\s+POLICY.*ON\s+event_series\s+FOR\s+SELECT\s+TO\s+authenticated/is;
const POLICY_INSERT_PATTERN =
  /CREATE\s+POLICY.*ON\s+event_series\s+FOR\s+INSERT\s+TO\s+authenticated/is;
const POLICY_UPDATE_PATTERN =
  /CREATE\s+POLICY.*ON\s+event_series\s+FOR\s+UPDATE\s+TO\s+authenticated/is;
const POLICY_DELETE_PATTERN =
  /CREATE\s+POLICY.*ON\s+event_series\s+FOR\s+DELETE\s+TO\s+authenticated/is;

// updated_at トリガーパターン
const TRIGGER_PATTERN =
  /CREATE\s+TRIGGER.*update_event_series_updated_at.*ON\s+event_series/is;

function getEventSeriesMigrationSql(): string {
  const files = readdirSync(SUPABASE_MIGRATIONS_DIR);
  const migration = files.find(
    (f) => f.includes("event_series") && f.endsWith(".sql")
  );
  if (!migration) {
    throw new Error("event_series migration file not found");
  }
  return readFileSync(join(SUPABASE_MIGRATIONS_DIR, migration), "utf-8");
}

describe("Task 1.1: event_series テーブルマイグレーション", () => {
  it("event_series マイグレーションファイルが存在する", () => {
    const files = readdirSync(SUPABASE_MIGRATIONS_DIR);
    const migration = files.find(
      (f) => f.includes("event_series") && f.endsWith(".sql")
    );
    expect(migration).toBeDefined();
  });

  describe("テーブルスキーマ", () => {
    it("event_series テーブルを正しいカラム定義で作成する", () => {
      const sql = getEventSeriesMigrationSql();

      expect(sql).toMatch(CREATE_TABLE_EVENT_SERIES_PATTERN);
      expect(sql).toMatch(ID_UUID_PK_PATTERN);
      expect(sql).toMatch(GUILD_ID_FK_PATTERN);
      expect(sql).toMatch(NAME_NOT_NULL_PATTERN);
      expect(sql).toMatch(DESCRIPTION_TEXT_PATTERN);
      expect(sql).toMatch(COLOR_DEFAULT_PATTERN);
      expect(sql).toMatch(IS_ALL_DAY_PATTERN);
      expect(sql).toMatch(RRULE_NOT_NULL_PATTERN);
      expect(sql).toMatch(DTSTART_PATTERN);
      expect(sql).toMatch(DURATION_MINUTES_PATTERN);
      expect(sql).toMatch(LOCATION_PATTERN);
      expect(sql).toMatch(CHANNEL_ID_PATTERN);
      expect(sql).toMatch(CHANNEL_NAME_PATTERN);
      expect(sql).toMatch(NOTIFICATIONS_JSONB_PATTERN);
      expect(sql).toMatch(EXDATES_ARRAY_PATTERN);
      expect(sql).toMatch(CREATED_AT_PATTERN);
      expect(sql).toMatch(UPDATED_AT_PATTERN);
    });
  });

  describe("インデックス", () => {
    it("guild_id にインデックスを作成する", () => {
      const sql = getEventSeriesMigrationSql();
      expect(sql).toMatch(INDEX_GUILD_ID_PATTERN);
    });

    it("dtstart にインデックスを作成する", () => {
      const sql = getEventSeriesMigrationSql();
      expect(sql).toMatch(INDEX_DTSTART_PATTERN);
    });
  });

  describe("Row Level Security", () => {
    it("RLS を有効化する", () => {
      const sql = getEventSeriesMigrationSql();
      expect(sql).toMatch(ENABLE_RLS_PATTERN);
    });

    it("認証済みユーザーに CRUD ポリシーを設定する", () => {
      const sql = getEventSeriesMigrationSql();
      expect(sql).toMatch(POLICY_SELECT_PATTERN);
      expect(sql).toMatch(POLICY_INSERT_PATTERN);
      expect(sql).toMatch(POLICY_UPDATE_PATTERN);
      expect(sql).toMatch(POLICY_DELETE_PATTERN);
    });
  });

  describe("トリガー", () => {
    it("updated_at 自動更新トリガーを設定する", () => {
      const sql = getEventSeriesMigrationSql();
      expect(sql).toMatch(TRIGGER_PATTERN);
    });
  });
});
