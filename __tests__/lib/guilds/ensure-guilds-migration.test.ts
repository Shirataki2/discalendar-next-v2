/**
 * ensure_guilds 関数マイグレーションのテスト
 *
 * Requirements:
 * - ensure_guilds SECURITY DEFINER 関数の存在
 * - REVOKE/GRANT による最小権限
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SUPABASE_MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

function getEnsureGuildsMigrationSql(): string {
  const files = readdirSync(SUPABASE_MIGRATIONS_DIR);
  const migration = files.find(
    (f) => f.includes("add_ensure_guilds_function") && f.endsWith(".sql")
  );

  if (!migration) {
    throw new Error("ensure_guilds migration file not found");
  }

  return readFileSync(join(SUPABASE_MIGRATIONS_DIR, migration), "utf-8");
}

describe("ensure_guilds migration", () => {
  const sql = getEnsureGuildsMigrationSql();

  it("should create ensure_guilds function as SECURITY DEFINER with CREATE OR REPLACE", () => {
    expect(sql).toMatch(
      /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+ensure_guilds\s*\(/i
    );
    expect(sql).toMatch(/SECURITY\s+DEFINER/i);
  });

  it("should accept guild_ids, names, and avatar_urls arrays", () => {
    expect(sql).toMatch(/p_guild_ids\s+VARCHAR\(32\)\[\]/i);
    expect(sql).toMatch(/p_names\s+VARCHAR\(100\)\[\]/i);
    expect(sql).toMatch(/p_avatar_urls\s+VARCHAR\(512\)\[\]/i);
  });

  it("should use ON CONFLICT DO UPDATE for idempotent upsert", () => {
    expect(sql).toMatch(/ON\s+CONFLICT\s*\(guild_id\)\s*DO\s+UPDATE/i);
  });

  it("should revoke all from PUBLIC", () => {
    expect(sql).toMatch(
      /REVOKE\s+ALL\s+ON\s+FUNCTION\s+ensure_guilds.*FROM\s+PUBLIC/i
    );
  });

  it("should grant execute to authenticated role", () => {
    expect(sql).toMatch(
      /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+ensure_guilds.*TO\s+authenticated/i
    );
  });

  it("should handle empty array input gracefully", () => {
    expect(sql).toMatch(/array_length.*IS\s+NULL/i);
  });
});
