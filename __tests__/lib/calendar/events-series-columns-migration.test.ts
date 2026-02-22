/**
 * Task 1.2: events テーブルへの繰り返し関連カラム追加テスト
 *
 * Requirements:
 * - 8.2: オカレンスの例外情報をイベントシリーズに関連付けて保存
 * - 9.2: 既存の events テーブルのスキーマを破壊的に変更しない
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SUPABASE_MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

// events テーブル拡張パターン
const ALTER_TABLE_EVENTS_PATTERN = /ALTER\s+TABLE\s+events/i;
const SERIES_ID_FK_PATTERN =
  /series_id\s+UUID\s+REFERENCES\s+event_series\(id\)\s+ON\s+DELETE\s+SET\s+NULL/i;
const ORIGINAL_DATE_PATTERN = /original_date\s+TIMESTAMPTZ/i;

// パーシャルインデックスパターン
const PARTIAL_INDEX_PATTERN =
  /CREATE\s+INDEX\s+idx_events_series_id\s+ON\s+events\(series_id\)\s+WHERE\s+series_id\s+IS\s+NOT\s+NULL/i;

// ADD COLUMN パターン
const ADD_COLUMN_SERIES_ID_PATTERN = /ADD\s+COLUMN\s+series_id/i;
const ADD_COLUMN_ORIGINAL_DATE_PATTERN = /ADD\s+COLUMN\s+original_date/i;
const NOT_NULL_PATTERN = /NOT\s+NULL/i;

function getEventsSeriesColumnsMigrationSql(): string {
  const files = readdirSync(SUPABASE_MIGRATIONS_DIR);
  const migration = files.find(
    (f) => f.includes("add_series_columns") && f.endsWith(".sql")
  );
  if (!migration) {
    throw new Error("events series columns migration file not found");
  }
  return readFileSync(join(SUPABASE_MIGRATIONS_DIR, migration), "utf-8");
}

describe("Task 1.2: events テーブルへの繰り返し関連カラム追加", () => {
  it("マイグレーションファイルが存在する", () => {
    const files = readdirSync(SUPABASE_MIGRATIONS_DIR);
    const migration = files.find(
      (f) => f.includes("add_series_columns") && f.endsWith(".sql")
    );
    expect(migration).toBeDefined();
  });

  describe("カラム追加", () => {
    it("events テーブルに ALTER TABLE で変更を加える", () => {
      const sql = getEventsSeriesColumnsMigrationSql();
      expect(sql).toMatch(ALTER_TABLE_EVENTS_PATTERN);
    });

    it("series_id カラムを外部キー付きで追加する（ON DELETE SET NULL）", () => {
      const sql = getEventsSeriesColumnsMigrationSql();
      expect(sql).toMatch(SERIES_ID_FK_PATTERN);
    });

    it("original_date カラムを追加する", () => {
      const sql = getEventsSeriesColumnsMigrationSql();
      expect(sql).toMatch(ORIGINAL_DATE_PATTERN);
    });
  });

  describe("インデックス", () => {
    it("series_id にパーシャルインデックスを作成する", () => {
      const sql = getEventsSeriesColumnsMigrationSql();
      expect(sql).toMatch(PARTIAL_INDEX_PATTERN);
    });
  });

  describe("既存データ互換性", () => {
    it("ADD COLUMN を使用する（既存データに影響なし）", () => {
      const sql = getEventsSeriesColumnsMigrationSql();
      expect(sql).toMatch(ADD_COLUMN_SERIES_ID_PATTERN);
      expect(sql).toMatch(ADD_COLUMN_ORIGINAL_DATE_PATTERN);
    });

    it("NOT NULL 制約を含まない（NULL 許容で既存行を維持）", () => {
      const sql = getEventsSeriesColumnsMigrationSql();
      const lines = sql.split("\n");
      for (const line of lines) {
        if (ADD_COLUMN_SERIES_ID_PATTERN.test(line)) {
          expect(line).not.toMatch(NOT_NULL_PATTERN);
        }
        if (ADD_COLUMN_ORIGINAL_DATE_PATTERN.test(line)) {
          expect(line).not.toMatch(NOT_NULL_PATTERN);
        }
      }
    });
  });
});
