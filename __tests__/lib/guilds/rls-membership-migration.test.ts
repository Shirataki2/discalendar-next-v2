/**
 * RLS ポリシーのメンバーシップベース移行マイグレーションのテスト
 *
 * Requirements:
 * - 5.1: guild_config RLS 移行
 * - 5.2: event_settings RLS 移行
 * - 5.3: events RLS 移行
 * - 5.4: SELECT ポリシー維持
 * - 5.5: べき等マイグレーション
 * - 6.1: upsert_event_settings メンバーシップ検証
 * - 6.2: メンバーシップ不在時の例外
 * - 6.3: 既存 auth.uid() チェック保持
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SUPABASE_MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

function getRlsMigrationSql(): string {
  const files = readdirSync(SUPABASE_MIGRATIONS_DIR);
  const migration = files.find(
    (f) => f.includes("migrate_rls_to_membership_based") && f.endsWith(".sql")
  );
  if (!migration) {
    throw new Error("RLS membership migration file not found");
  }
  return readFileSync(join(SUPABASE_MIGRATIONS_DIR, migration), "utf-8");
}

describe("RLS ポリシーのメンバーシップベース移行", () => {
  describe("guild_config ポリシー移行 (Req 5.1)", () => {
    it("should drop old INSERT policy idempotently", () => {
      const sql = getRlsMigrationSql();
      expect(sql).toMatch(
        /DROP\s+POLICY\s+IF\s+EXISTS\s+"authenticated_users_can_insert_guild_config"\s+ON\s+guild_config/i
      );
    });

    it("should drop old UPDATE policy idempotently", () => {
      const sql = getRlsMigrationSql();
      expect(sql).toMatch(
        /DROP\s+POLICY\s+IF\s+EXISTS\s+"authenticated_users_can_update_guild_config"\s+ON\s+guild_config/i
      );
    });

    it("should create new INSERT policy with user_guild_ids()", () => {
      const sql = getRlsMigrationSql();
      expect(sql).toMatch(
        /CREATE\s+POLICY\s+"members_can_insert_guild_config".*ON\s+guild_config.*FOR\s+INSERT/is
      );
      expect(sql).toMatch(
        /guild_config[\s\S]*FOR\s+INSERT[\s\S]*WITH\s+CHECK\s*\(guild_id\s+IN\s*\(\s*SELECT\s+user_guild_ids\(\)\s*\)\)/i
      );
    });

    it("should create new UPDATE policy with user_guild_ids()", () => {
      const sql = getRlsMigrationSql();
      expect(sql).toMatch(
        /CREATE\s+POLICY\s+"members_can_update_guild_config".*ON\s+guild_config.*FOR\s+UPDATE/is
      );
    });
  });

  describe("event_settings ポリシー移行 (Req 5.2)", () => {
    it("should drop old INSERT and UPDATE policies idempotently", () => {
      const sql = getRlsMigrationSql();
      expect(sql).toMatch(
        /DROP\s+POLICY\s+IF\s+EXISTS\s+"authenticated_users_can_insert_event_settings"\s+ON\s+event_settings/i
      );
      expect(sql).toMatch(
        /DROP\s+POLICY\s+IF\s+EXISTS\s+"authenticated_users_can_update_event_settings"\s+ON\s+event_settings/i
      );
    });

    it("should create new membership-based INSERT and UPDATE policies", () => {
      const sql = getRlsMigrationSql();
      expect(sql).toMatch(
        /CREATE\s+POLICY\s+"members_can_insert_event_settings"/i
      );
      expect(sql).toMatch(
        /CREATE\s+POLICY\s+"members_can_update_event_settings"/i
      );
    });
  });

  describe("events ポリシー移行 (Req 5.3)", () => {
    it("should drop old INSERT, UPDATE, DELETE policies idempotently", () => {
      const sql = getRlsMigrationSql();
      expect(sql).toMatch(
        /DROP\s+POLICY\s+IF\s+EXISTS\s+"authenticated_users_can_insert_events"\s+ON\s+events/i
      );
      expect(sql).toMatch(
        /DROP\s+POLICY\s+IF\s+EXISTS\s+"authenticated_users_can_update_events"\s+ON\s+events/i
      );
      expect(sql).toMatch(
        /DROP\s+POLICY\s+IF\s+EXISTS\s+"authenticated_users_can_delete_events"\s+ON\s+events/i
      );
    });

    it("should create new membership-based INSERT, UPDATE, DELETE policies", () => {
      const sql = getRlsMigrationSql();
      expect(sql).toMatch(/CREATE\s+POLICY\s+"members_can_insert_events"/i);
      expect(sql).toMatch(/CREATE\s+POLICY\s+"members_can_update_events"/i);
      expect(sql).toMatch(/CREATE\s+POLICY\s+"members_can_delete_events"/i);
    });
  });

  describe("event_series ポリシー移行", () => {
    it("should drop old INSERT, UPDATE, DELETE policies idempotently", () => {
      const sql = getRlsMigrationSql();
      expect(sql).toMatch(
        /DROP\s+POLICY\s+IF\s+EXISTS\s+"authenticated_users_can_insert_event_series"\s+ON\s+event_series/i
      );
      expect(sql).toMatch(
        /DROP\s+POLICY\s+IF\s+EXISTS\s+"authenticated_users_can_update_event_series"\s+ON\s+event_series/i
      );
      expect(sql).toMatch(
        /DROP\s+POLICY\s+IF\s+EXISTS\s+"authenticated_users_can_delete_event_series"\s+ON\s+event_series/i
      );
    });

    it("should create new membership-based INSERT, UPDATE, DELETE policies", () => {
      const sql = getRlsMigrationSql();
      expect(sql).toMatch(
        /CREATE\s+POLICY\s+"members_can_insert_event_series"/i
      );
      expect(sql).toMatch(
        /CREATE\s+POLICY\s+"members_can_update_event_series"/i
      );
      expect(sql).toMatch(
        /CREATE\s+POLICY\s+"members_can_delete_event_series"/i
      );
    });
  });

  describe("SELECT ポリシー維持 (Req 5.4)", () => {
    it("should NOT drop any SELECT policies", () => {
      const sql = getRlsMigrationSql();
      expect(sql).not.toMatch(/DROP\s+POLICY.*can_read/i);
    });

    it("should NOT create new SELECT policies", () => {
      const sql = getRlsMigrationSql();
      expect(sql).not.toMatch(/CREATE\s+POLICY.*FOR\s+SELECT/i);
    });
  });

  describe("べき等実行 (Req 5.5)", () => {
    it("should use DROP POLICY IF EXISTS for all dropped policies", () => {
      const sql = getRlsMigrationSql();
      const dropStatements = sql.match(/DROP\s+POLICY/gi) || [];
      const dropIfExistsStatements =
        sql.match(/DROP\s+POLICY\s+IF\s+EXISTS/gi) || [];
      expect(dropStatements.length).toBe(dropIfExistsStatements.length);
      expect(dropStatements.length).toBeGreaterThan(0);
    });
  });

  describe("user_guild_ids() を全ポリシーで使用", () => {
    it("should reference user_guild_ids() in all new policies", () => {
      const sql = getRlsMigrationSql();
      const references = sql.match(/user_guild_ids\(\)/gi) || [];
      // 4 tables × varying policies:
      // guild_config: INSERT(1) + UPDATE(2) = 3
      // event_settings: INSERT(1) + UPDATE(2) = 3
      // events: INSERT(1) + UPDATE(2) + DELETE(1) = 4
      // event_series: INSERT(1) + UPDATE(2) + DELETE(1) = 4
      // Total = 14
      expect(references.length).toBeGreaterThanOrEqual(14);
    });
  });
});

describe("upsert_event_settings メンバーシップ検証", () => {
  describe("認証チェック保持 (Req 6.3)", () => {
    it("should keep existing auth.uid() IS NULL check", () => {
      const sql = getRlsMigrationSql();
      expect(sql).toMatch(/auth\.uid\(\)\s+IS\s+NULL/i);
    });

    it("should raise Unauthorized exception for unauthenticated users", () => {
      const sql = getRlsMigrationSql();
      expect(sql).toMatch(
        /RAISE\s+EXCEPTION\s+'Unauthorized:\s+user\s+must\s+be\s+authenticated'/i
      );
    });
  });

  describe("メンバーシップ検証 (Req 6.1, 6.2)", () => {
    it("should check user_guilds table for membership", () => {
      const sql = getRlsMigrationSql();
      expect(sql).toMatch(
        /SELECT\s+1\s+FROM\s+user_guilds\s+WHERE\s+user_id\s*=\s*auth\.uid\(\)\s+AND\s+guild_id\s*=\s*p_guild_id/i
      );
    });

    it("should raise Forbidden exception when membership not found", () => {
      const sql = getRlsMigrationSql();
      expect(sql).toMatch(
        /RAISE\s+EXCEPTION\s+'Forbidden:\s+user\s+is\s+not\s+a\s+member\s+of\s+this\s+guild'/i
      );
    });

    it("should check membership AFTER auth check", () => {
      const sql = getRlsMigrationSql();
      const authCheckPos = sql.search(/auth\.uid\(\)\s+IS\s+NULL/i);
      const membershipCheckPos = sql.search(/SELECT\s+1\s+FROM\s+user_guilds/i);
      expect(authCheckPos).toBeLessThan(membershipCheckPos);
    });
  });

  describe("関数定義", () => {
    it("should use SECURITY DEFINER", () => {
      const sql = getRlsMigrationSql();
      expect(sql).toMatch(/SECURITY\s+DEFINER/i);
    });

    it("should set search_path to public", () => {
      const sql = getRlsMigrationSql();
      expect(sql).toMatch(/SET\s+search_path\s*=\s*public/i);
    });

    it("should use out_ prefix for return columns", () => {
      const sql = getRlsMigrationSql();
      expect(sql).toMatch(/out_guild_id\s+TEXT/i);
      expect(sql).toMatch(/out_channel_id\s+TEXT/i);
    });

    it("should restrict execution to authenticated role only", () => {
      const sql = getRlsMigrationSql();
      expect(sql).toMatch(/REVOKE\s+ALL.*FROM\s+PUBLIC/i);
      expect(sql).toMatch(/GRANT\s+EXECUTE.*TO\s+authenticated/i);
    });
  });
});
