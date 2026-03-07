/**
 * user_guilds テーブル作成マイグレーションのテスト
 *
 * Requirements:
 * - 1.1: user_id (UUID, auth.users FK) と guild_id (VARCHAR(32), guilds FK) カラム
 * - 1.2: (user_id, guild_id) PRIMARY KEY
 * - 1.3: permissions カラム (BIGINT, DEFAULT 0)
 * - 1.4: updated_at カラム (TIMESTAMPTZ, DEFAULT NOW())
 * - 1.5: guilds ON DELETE CASCADE
 * - 1.6: auth.users ON DELETE CASCADE
 * - 2.1: RLS 有効化
 * - 2.2: SELECT ポリシー (auth.uid() = user_id)
 * - 2.3: クライアント直接書き込み禁止（INSERT/UPDATE/DELETE ポリシーなし）
 * - 3.1: upsert_user_guild SECURITY DEFINER 関数
 * - 3.2: sync_user_guilds SECURITY DEFINER 関数
 * - 3.3: user_guild_ids SECURITY DEFINER 関数
 * - 3.4: REVOKE/GRANT による最小権限
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SUPABASE_MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

function getUserGuildsMigrationSql(): string {
  const files = readdirSync(SUPABASE_MIGRATIONS_DIR);
  const migration = files.find(
    (f) => f.includes("create_user_guilds_table") && f.endsWith(".sql")
  );
  if (!migration) {
    throw new Error("user_guilds migration file not found");
  }
  return readFileSync(join(SUPABASE_MIGRATIONS_DIR, migration), "utf-8");
}

describe("user_guilds table migration", () => {
  it("should have a migration file for user_guilds table", () => {
    const files = readdirSync(SUPABASE_MIGRATIONS_DIR);
    const migration = files.find(
      (f) => f.includes("create_user_guilds_table") && f.endsWith(".sql")
    );
    expect(migration).toBeDefined();
  });

  describe("テーブルスキーマ", () => {
    it("should create user_guilds table", () => {
      const sql = getUserGuildsMigrationSql();
      expect(sql).toMatch(/CREATE\s+TABLE\s+user_guilds/i);
    });

    it("should define user_id as UUID with auth.users FK and ON DELETE CASCADE (Req 1.1, 1.6)", () => {
      const sql = getUserGuildsMigrationSql();
      expect(sql).toMatch(/user_id\s+UUID\s+NOT\s+NULL/i);
      expect(sql).toMatch(/REFERENCES\s+auth\.users/i);
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

    it("should define PRIMARY KEY on (user_id, guild_id) (Req 1.2)", () => {
      const sql = getUserGuildsMigrationSql();
      expect(sql).toMatch(/PRIMARY\s+KEY\s*\(\s*user_id\s*,\s*guild_id\s*\)/i);
    });

    it("should create update_updated_at trigger using existing function", () => {
      const sql = getUserGuildsMigrationSql();
      expect(sql).toMatch(/CREATE\s+TRIGGER\s+update_user_guilds_updated_at/i);
      expect(sql).toMatch(/EXECUTE\s+FUNCTION\s+update_updated_at_column\(\)/i);
    });
  });

  describe("RLS ポリシー", () => {
    it("should enable RLS on user_guilds table (Req 2.1)", () => {
      const sql = getUserGuildsMigrationSql();
      expect(sql).toMatch(
        /ALTER\s+TABLE\s+user_guilds\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i
      );
    });

    it("should create SELECT policy with auth.uid() = user_id (Req 2.2)", () => {
      const sql = getUserGuildsMigrationSql();
      expect(sql).toMatch(/FOR\s+SELECT/i);
      expect(sql).toMatch(/TO\s+authenticated/i);
      expect(sql).toMatch(/auth\.uid\(\)\s*=\s*user_id/i);
    });

    it("should NOT have INSERT/UPDATE/DELETE policies for authenticated (Req 2.3)", () => {
      const sql = getUserGuildsMigrationSql();
      expect(sql).not.toMatch(/CREATE\s+POLICY.*FOR\s+INSERT/i);
      expect(sql).not.toMatch(/CREATE\s+POLICY.*FOR\s+UPDATE/i);
      expect(sql).not.toMatch(/CREATE\s+POLICY.*FOR\s+DELETE/i);
    });
  });

  describe("SECURITY DEFINER 関数", () => {
    it("should create upsert_user_guild function with TEXT param (Req 3.1)", () => {
      const sql = getUserGuildsMigrationSql();
      expect(sql).toMatch(/CREATE\s+FUNCTION\s+upsert_user_guild\s*\(/i);
      expect(sql).toMatch(/p_permissions\s+TEXT/i);
      expect(sql).toMatch(/SECURITY\s+DEFINER/i);
    });

    it("should create sync_user_guilds function with TEXT[] param and unnest (Req 3.2)", () => {
      const sql = getUserGuildsMigrationSql();
      expect(sql).toMatch(/CREATE\s+FUNCTION\s+sync_user_guilds\s*\(/i);
      expect(sql).toMatch(/p_permissions\s+TEXT\[\]/i);
      expect(sql).toMatch(/unnest/i);
    });

    it("should create user_guild_ids function with STABLE (Req 3.3)", () => {
      const sql = getUserGuildsMigrationSql();
      expect(sql).toMatch(/CREATE\s+FUNCTION\s+user_guild_ids\s*\(\)/i);
      expect(sql).toMatch(/STABLE/i);
    });

    it("should set search_path = public on all functions", () => {
      const sql = getUserGuildsMigrationSql();
      const matches = sql.match(/SET\s+search_path\s*=\s*public/gi) || [];
      expect(matches.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("REVOKE/GRANT（最小権限）", () => {
    it("should REVOKE ALL FROM PUBLIC on all functions (Req 3.4)", () => {
      const sql = getUserGuildsMigrationSql();
      expect(sql).toMatch(
        /REVOKE\s+ALL\s+ON\s+FUNCTION\s+upsert_user_guild.*FROM\s+PUBLIC/i
      );
      expect(sql).toMatch(
        /REVOKE\s+ALL\s+ON\s+FUNCTION\s+sync_user_guilds.*FROM\s+PUBLIC/i
      );
      expect(sql).toMatch(
        /REVOKE\s+ALL\s+ON\s+FUNCTION\s+user_guild_ids\(\)\s+FROM\s+PUBLIC/i
      );
    });

    it("should GRANT EXECUTE to authenticated on write functions", () => {
      const sql = getUserGuildsMigrationSql();
      expect(sql).toMatch(
        /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+upsert_user_guild.*TO\s+authenticated/i
      );
      expect(sql).toMatch(
        /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+sync_user_guilds.*TO\s+authenticated/i
      );
    });

    it("should GRANT EXECUTE on user_guild_ids to authenticated and service_role", () => {
      const sql = getUserGuildsMigrationSql();
      expect(sql).toMatch(
        /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+user_guild_ids\(\)\s+TO\s+authenticated/i
      );
      expect(sql).toMatch(
        /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+user_guild_ids\(\)\s+TO\s+service_role/i
      );
    });
  });
});
