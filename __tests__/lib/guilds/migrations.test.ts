/**
 * Task 1: データベーススキーマの構築テスト
 *
 * Requirements:
 * - 1.1: guildsテーブルの作成（id, guild_id, name, avatar_url, locale）
 * - 1.2: guild_idカラムへのインデックス設定
 * - 1.3: Row Level Security (RLS) の有効化と認証済みユーザー読み取りポリシー
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SUPABASE_MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

// Top-level regex patterns for schema validation
const CREATE_TABLE_GUILDS_PATTERN = /CREATE TABLE.*guilds/i;
const ID_SERIAL_PRIMARY_KEY_PATTERN = /id\s+SERIAL\s+PRIMARY\s+KEY/i;
const GUILD_ID_UNIQUE_NOT_NULL_PATTERN =
  /guild_id\s+VARCHAR.*UNIQUE\s+NOT\s+NULL/i;
const NAME_NOT_NULL_PATTERN = /name\s+VARCHAR.*NOT\s+NULL/i;
const AVATAR_URL_PATTERN = /avatar_url\s+VARCHAR/i;
const LOCALE_DEFAULT_PATTERN = /locale\s+VARCHAR.*NOT\s+NULL.*DEFAULT/i;
const CREATE_INDEX_GUILD_ID_PATTERN = /CREATE\s+INDEX.*guild_id/i;
const ENABLE_RLS_PATTERN =
  /ALTER\s+TABLE\s+guilds\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i;
const CREATE_POLICY_PATTERN = /CREATE\s+POLICY/i;
const ON_GUILDS_PATTERN = /ON\s+guilds/i;
const FOR_SELECT_PATTERN = /FOR\s+SELECT/i;
const TO_AUTHENTICATED_PATTERN = /TO\s+authenticated/i;

/**
 * Helper to get guilds migration file content
 */
function getGuildsMigrationSql(): string {
  const files = readdirSync(SUPABASE_MIGRATIONS_DIR);
  const guildsMigration = files.find(
    (f) => f.includes("guilds") && f.endsWith(".sql")
  );
  if (!guildsMigration) {
    throw new Error("Guilds migration file not found");
  }
  return readFileSync(join(SUPABASE_MIGRATIONS_DIR, guildsMigration), "utf-8");
}

describe("Task 1: Database Schema - guilds table", () => {
  describe("Task 1.1: guilds table migration", () => {
    it("should have a migration file for guilds table", () => {
      const files = readdirSync(SUPABASE_MIGRATIONS_DIR);
      const guildsMigration = files.find(
        (f) => f.includes("guilds") && f.endsWith(".sql")
      );
      expect(guildsMigration).toBeDefined();
    });

    it("should create guilds table with correct schema", () => {
      const sql = getGuildsMigrationSql();

      // Check table creation
      expect(sql).toMatch(CREATE_TABLE_GUILDS_PATTERN);

      // Check columns - id as SERIAL PRIMARY KEY
      expect(sql).toMatch(ID_SERIAL_PRIMARY_KEY_PATTERN);

      // Check guild_id column with UNIQUE NOT NULL
      expect(sql).toMatch(GUILD_ID_UNIQUE_NOT_NULL_PATTERN);

      // Check name column with NOT NULL
      expect(sql).toMatch(NAME_NOT_NULL_PATTERN);

      // Check avatar_url column (nullable)
      expect(sql).toMatch(AVATAR_URL_PATTERN);

      // Check locale column with NOT NULL and default value
      expect(sql).toMatch(LOCALE_DEFAULT_PATTERN);
    });

    it("should create index on guild_id column", () => {
      const sql = getGuildsMigrationSql();

      // Check index creation on guild_id
      expect(sql).toMatch(CREATE_INDEX_GUILD_ID_PATTERN);
    });
  });

  describe("Task 1.2: Row Level Security policy", () => {
    it("should enable RLS on guilds table", () => {
      const sql = getGuildsMigrationSql();

      // Check RLS enablement
      expect(sql).toMatch(ENABLE_RLS_PATTERN);
    });

    it("should create SELECT policy for authenticated users", () => {
      const sql = getGuildsMigrationSql();

      // Check policy creation for SELECT
      expect(sql).toMatch(CREATE_POLICY_PATTERN);
      expect(sql).toMatch(ON_GUILDS_PATTERN);
      expect(sql).toMatch(FOR_SELECT_PATTERN);
      expect(sql).toMatch(TO_AUTHENTICATED_PATTERN);
    });
  });
});
