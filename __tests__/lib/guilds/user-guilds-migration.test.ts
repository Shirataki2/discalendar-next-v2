/**
 * Task 1.1: user_guilds テーブル作成マイグレーションのテスト
 *
 * Requirements:
 * - 1.1: user_id (UUID, auth.users FK) と guild_id (VARCHAR(32), guilds FK) カラム
 * - 1.2: (user_id, guild_id) 複合ユニーク制約
 * - 1.3: permissions カラム (BIGINT, DEFAULT 0)
 * - 1.4: updated_at カラム (TIMESTAMPTZ, DEFAULT NOW())
 * - 1.5: guilds ON DELETE CASCADE
 * - 1.6: auth.users ON DELETE CASCADE
 * - 2.1: RLS 有効化
 * - 2.2: SELECT ポリシー (auth.uid() = user_id)
 * - 2.3: INSERT ポリシー (auth.uid() = user_id)
 * - 2.4: UPDATE ポリシー (auth.uid() = user_id)
 * - 2.5: DELETE ポリシー (auth.uid() = user_id)
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SUPABASE_MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

function getUserGuildsMigrationSql(): string {
  const files = readdirSync(SUPABASE_MIGRATIONS_DIR);
  const migration = files.find(
    (f) => f.includes("user_guilds") && f.endsWith(".sql")
  );
  if (!migration) {
    throw new Error("user_guilds migration file not found");
  }
  return readFileSync(join(SUPABASE_MIGRATIONS_DIR, migration), "utf-8");
}

describe("Task 1.1: user_guilds table migration", () => {
  it("should have a migration file for user_guilds table", () => {
    const files = readdirSync(SUPABASE_MIGRATIONS_DIR);
    const migration = files.find(
      (f) => f.includes("user_guilds") && f.endsWith(".sql")
    );
    expect(migration).toBeDefined();
  });

  describe("Requirement 1: テーブルスキーマ", () => {
    it("should create user_guilds table", () => {
      const sql = getUserGuildsMigrationSql();
      expect(sql).toMatch(/CREATE\s+TABLE\s+user_guilds/i);
    });

    it("should define user_id as UUID with auth.users FK and ON DELETE CASCADE (Req 1.1, 1.6)", () => {
      const sql = getUserGuildsMigrationSql();
      expect(sql).toMatch(/user_id\s+UUID\s+NOT\s+NULL/i);
      expect(sql).toMatch(/REFERENCES\s+auth\.users/i);
      // auth.users FK に ON DELETE CASCADE
      expect(sql).toMatch(/REFERENCES\s+auth\.users.*ON\s+DELETE\s+CASCADE/i);
    });

    it("should define guild_id as VARCHAR(32) with guilds FK and ON DELETE CASCADE (Req 1.1, 1.5)", () => {
      const sql = getUserGuildsMigrationSql();
      expect(sql).toMatch(/guild_id\s+VARCHAR\(32\)\s+NOT\s+NULL/i);
      expect(sql).toMatch(
        /REFERENCES\s+guilds\s*\(\s*guild_id\s*\).*ON\s+DELETE\s+CASCADE/i
      );
    });

    it("should define permissions as BIGINT with DEFAULT 0 (Req 1.3)", () => {
      const sql = getUserGuildsMigrationSql();
      expect(sql).toMatch(/permissions\s+BIGINT\s+NOT\s+NULL\s+DEFAULT\s+0/i);
    });

    it("should define updated_at as TIMESTAMPTZ with DEFAULT NOW() (Req 1.4)", () => {
      const sql = getUserGuildsMigrationSql();
      expect(sql).toMatch(
        /updated_at\s+TIMESTAMPTZ\s+NOT\s+NULL\s+DEFAULT\s+NOW\(\)/i
      );
    });

    it("should define UNIQUE or PRIMARY KEY constraint on (user_id, guild_id) (Req 1.2)", () => {
      const sql = getUserGuildsMigrationSql();
      // Original migration has UNIQUE, later migration upgrades to PRIMARY KEY
      expect(sql).toMatch(
        /(UNIQUE|PRIMARY\s+KEY)\s*\(\s*user_id\s*,\s*guild_id\s*\)/i
      );
    });

    it("should create update_updated_at trigger using existing function", () => {
      const sql = getUserGuildsMigrationSql();
      expect(sql).toMatch(/CREATE\s+TRIGGER\s+update_user_guilds_updated_at/i);
      expect(sql).toMatch(/EXECUTE\s+FUNCTION\s+update_updated_at_column\(\)/i);
    });
  });

  describe("Requirement 2: RLSポリシー", () => {
    it("should enable RLS on user_guilds table (Req 2.1)", () => {
      const sql = getUserGuildsMigrationSql();
      expect(sql).toMatch(
        /ALTER\s+TABLE\s+user_guilds\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i
      );
    });

    it("should create SELECT policy with auth.uid() = user_id (Req 2.2)", () => {
      const sql = getUserGuildsMigrationSql();
      // SELECT ポリシーの存在を確認
      expect(sql).toMatch(/FOR\s+SELECT/i);
      expect(sql).toMatch(/TO\s+authenticated/i);
    });

    it("should create INSERT policy with auth.uid() = user_id (Req 2.3)", () => {
      const sql = getUserGuildsMigrationSql();
      expect(sql).toMatch(/FOR\s+INSERT/i);
    });

    it("should create UPDATE policy with auth.uid() = user_id (Req 2.4)", () => {
      const sql = getUserGuildsMigrationSql();
      expect(sql).toMatch(/FOR\s+UPDATE/i);
    });

    it("should create DELETE policy with auth.uid() = user_id (Req 2.5)", () => {
      const sql = getUserGuildsMigrationSql();
      expect(sql).toMatch(/FOR\s+DELETE/i);
    });

    it("should use auth.uid() = user_id condition in all RLS policies", () => {
      const sql = getUserGuildsMigrationSql();
      // auth.uid() = user_id が複数回使われていることを確認
      const matches = sql.match(/auth\.uid\(\)\s*=\s*user_id/gi);
      expect(matches).not.toBeNull();
      // SELECT(USING), INSERT(WITH CHECK), UPDATE(USING + WITH CHECK), DELETE(USING) = 少なくとも5箇所
      expect(matches!.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe("パフォーマンス用インデックス", () => {
    it("should create index on user_id", () => {
      const sql = getUserGuildsMigrationSql();
      expect(sql).toMatch(/CREATE\s+INDEX\s+idx_user_guilds_user_id/i);
    });

    it("should create composite index on (user_id, guild_id)", () => {
      const sql = getUserGuildsMigrationSql();
      expect(sql).toMatch(/CREATE\s+INDEX\s+idx_user_guilds_user_guild/i);
    });
  });
});
