/**
 * Task 1.2: RLS ポリシーと ownership 取得関数のマイグレーションテスト
 *
 * Requirements:
 * - 1.5: RLS で認証済みユーザーが同一ギルドの出欠データを参照できる
 * - 1.6: RLS でユーザーが自分の user_id に一致するレコードのみ INSERT/UPDATE/DELETE できる
 * - claim_rsvp_ownership(): Bot 経由で作成された user_id = NULL のレコードを Web ユーザーが引き取れる
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SUPABASE_MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

function getRlsMigrationSql(): string {
  const files = readdirSync(SUPABASE_MIGRATIONS_DIR).sort();
  const rlsMigration = files.find(
    (f) =>
      f.includes("event_attendees") && f.includes("rls") && f.endsWith(".sql")
  );
  if (!rlsMigration) {
    throw new Error("event_attendees RLS migration file not found");
  }
  return readFileSync(join(SUPABASE_MIGRATIONS_DIR, rlsMigration), "utf-8");
}

describe("Task 1.2: event_attendees RLS ポリシーと ownership 取得関数", () => {
  it("マイグレーションファイルが存在する", () => {
    const files = readdirSync(SUPABASE_MIGRATIONS_DIR);
    const rlsMigration = files.find(
      (f) =>
        f.includes("event_attendees") && f.includes("rls") && f.endsWith(".sql")
    );
    expect(rlsMigration).toBeDefined();
  });

  describe("RLS 有効化", () => {
    it("event_attendees テーブルで RLS を有効化する", () => {
      const sql = getRlsMigrationSql();
      expect(sql).toMatch(
        /ALTER\s+TABLE\s+event_attendees\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i
      );
    });
  });

  describe("SELECT ポリシー (Req 1.5)", () => {
    it("認証済みユーザーの SELECT ポリシーを作成する", () => {
      const sql = getRlsMigrationSql();
      expect(sql).toMatch(
        /CREATE\s+POLICY.*ON\s+event_attendees\s+FOR\s+SELECT\s+TO\s+authenticated/is
      );
    });

    it("user_guild_ids() でギルドメンバーシップをフィルタする", () => {
      const sql = getRlsMigrationSql();
      expect(sql).toMatch(
        /guild_id\s+IN\s*\(\s*SELECT\s+user_guild_ids\(\)\s*\)/i
      );
    });
  });

  describe("INSERT ポリシー (Req 1.6)", () => {
    it("自分の user_id に一致するレコードのみ INSERT 可", () => {
      const sql = getRlsMigrationSql();
      expect(sql).toMatch(
        /CREATE\s+POLICY.*ON\s+event_attendees\s+FOR\s+INSERT\s+TO\s+authenticated/is
      );
      expect(sql).toMatch(/user_id\s*=\s*auth\.uid\(\)/i);
    });
  });

  describe("UPDATE ポリシー (Req 1.6)", () => {
    it("自分の user_id に一致するレコードのみ UPDATE 可", () => {
      const sql = getRlsMigrationSql();
      expect(sql).toMatch(
        /CREATE\s+POLICY.*ON\s+event_attendees\s+FOR\s+UPDATE\s+TO\s+authenticated/is
      );
    });
  });

  describe("DELETE ポリシー (Req 1.6)", () => {
    it("自分の user_id に一致するレコードのみ DELETE 可", () => {
      const sql = getRlsMigrationSql();
      expect(sql).toMatch(
        /CREATE\s+POLICY.*ON\s+event_attendees\s+FOR\s+DELETE\s+TO\s+authenticated/is
      );
    });
  });

  describe("claim_rsvp_ownership 関数", () => {
    it("SECURITY DEFINER 関数として作成される", () => {
      const sql = getRlsMigrationSql();
      expect(sql).toMatch(/CREATE\s+FUNCTION\s+claim_rsvp_ownership/i);
      expect(sql).toMatch(/SECURITY\s+DEFINER/i);
    });

    it("discord_user_id が一致し user_id IS NULL のレコードのみ更新する", () => {
      const sql = getRlsMigrationSql();
      expect(sql).toMatch(/discord_user_id\s*=\s*p_discord_user_id/i);
      expect(sql).toMatch(/user_id\s+IS\s+NULL/i);
    });

    it("user_id を設定する UPDATE 文を含む", () => {
      const sql = getRlsMigrationSql();
      expect(sql).toMatch(/SET\s+user_id\s*=\s*p_user_id/i);
    });
  });
});
