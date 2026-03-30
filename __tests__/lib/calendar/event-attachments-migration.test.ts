/**
 * Task 1: DBマイグレーション・Storageインフラ構築テスト
 *
 * Requirements:
 * - 1.1: eventsテーブルにattachmentsカラム（JSONB型、デフォルト'[]'::jsonb、NULL不可）
 * - 1.2: attachments各要素にname, path, type, sizeを含む
 * - 1.3: event_seriesテーブルに同様のattachmentsカラム
 * - 1.4: 既存データに影響を与えないマイグレーション
 * - 2.1: event-attachmentsバケット作成
 * - 2.2: events/{event_id}/{filename}パス構造
 * - 2.3: ファイルサイズ上限10MiB
 * - 3.1: アップロードRLSポリシー（ギルドメンバーのみ）
 * - 3.2: 閲覧RLSポリシー（ギルドメンバーのみ）
 * - 3.3: 削除RLSポリシー（ギルドメンバーのみ）
 * - 3.4: 未認証ユーザーアクセス拒否
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SUPABASE_MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

function getAttachmentsMigrationSql(): string {
  const files = readdirSync(SUPABASE_MIGRATIONS_DIR);
  const migration = files.find(
    (f) => f.includes("event_attachments") && f.endsWith(".sql")
  );
  if (!migration) {
    throw new Error("event_attachments migration file not found");
  }
  return readFileSync(join(SUPABASE_MIGRATIONS_DIR, migration), "utf-8");
}

// === カラム追加パターン ===
const ALTER_EVENTS_ATTACHMENTS_PATTERN =
  /ALTER\s+TABLE\s+events\s+ADD\s+COLUMN\s+attachments\s+JSONB\s+NOT\s+NULL\s+DEFAULT\s+'\[\]'::jsonb/i;
const ALTER_EVENT_SERIES_ATTACHMENTS_PATTERN =
  /ALTER\s+TABLE\s+event_series\s+ADD\s+COLUMN\s+attachments\s+JSONB\s+NOT\s+NULL\s+DEFAULT\s+'\[\]'::jsonb/i;

// === Storageバケット作成パターン ===
const INSERT_BUCKET_PATTERN = /INSERT\s+INTO\s+storage\.buckets/i;
const BUCKET_NAME_PATTERN = /event-attachments/;
const BUCKET_PUBLIC_FALSE_PATTERN = /false/;
const FILE_SIZE_LIMIT_PATTERN = /10485760/; // 10MB in bytes
const ALLOWED_MIME_TYPES_PATTERN =
  /image\/jpeg.*image\/png.*image\/gif.*image\/webp.*application\/pdf/is;

// === Storage RLS ポリシーパターン ===
const POLICY_INSERT_STORAGE_PATTERN =
  /CREATE\s+POLICY.*ON\s+storage\.objects\s+FOR\s+INSERT\s+TO\s+authenticated/is;
const POLICY_SELECT_STORAGE_PATTERN =
  /CREATE\s+POLICY.*ON\s+storage\.objects\s+FOR\s+SELECT\s+TO\s+authenticated/is;
const POLICY_DELETE_STORAGE_PATTERN =
  /CREATE\s+POLICY.*ON\s+storage\.objects\s+FOR\s+DELETE\s+TO\s+authenticated/is;

// RLSポリシーがuser_guild_ids()を使用していることを検証
const USER_GUILD_IDS_IN_POLICY_PATTERN = /user_guild_ids\(\)/;
// storage.foldername を使ってguild_idを取得していることを検証
const STORAGE_FOLDERNAME_PATTERN = /storage\.foldername/i;
// bucket_id条件を検証
const BUCKET_ID_CHECK_PATTERN = /bucket_id\s*=\s*'event-attachments'/;

describe("Task 1: DBマイグレーション・Storageインフラ構築", () => {
  it("event_attachments マイグレーションファイルが存在する", () => {
    const files = readdirSync(SUPABASE_MIGRATIONS_DIR);
    const migration = files.find(
      (f) => f.includes("event_attachments") && f.endsWith(".sql")
    );
    expect(migration).toBeDefined();
  });

  describe("Req 1.1, 1.3, 1.4: テーブルスキーマ拡張", () => {
    it("eventsテーブルにattachmentsカラムを追加する", () => {
      const sql = getAttachmentsMigrationSql();
      expect(sql).toMatch(ALTER_EVENTS_ATTACHMENTS_PATTERN);
    });

    it("event_seriesテーブルにattachmentsカラムを追加する", () => {
      const sql = getAttachmentsMigrationSql();
      expect(sql).toMatch(ALTER_EVENT_SERIES_ATTACHMENTS_PATTERN);
    });

    it("デフォルト値が空配列で既存データに影響しない", () => {
      const sql = getAttachmentsMigrationSql();
      // DEFAULT '[]'::jsonb が両テーブルに設定されている
      const defaultMatches = sql.match(/DEFAULT\s+'\[\]'::jsonb/gi);
      expect(defaultMatches).not.toBeNull();
      expect(defaultMatches!.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Req 2.1, 2.3: Storageバケット構成", () => {
    it("event-attachmentsバケットを作成する", () => {
      const sql = getAttachmentsMigrationSql();
      expect(sql).toMatch(INSERT_BUCKET_PATTERN);
      expect(sql).toMatch(BUCKET_NAME_PATTERN);
    });

    it("バケットはプライベート（public=false）である", () => {
      const sql = getAttachmentsMigrationSql();
      // INSERT文のVALUES内でfalse（public=false）を含む
      expect(sql).toMatch(BUCKET_PUBLIC_FALSE_PATTERN);
    });

    it("ファイルサイズ上限が10MiB（10485760バイト）である", () => {
      const sql = getAttachmentsMigrationSql();
      expect(sql).toMatch(FILE_SIZE_LIMIT_PATTERN);
    });

    it("許可MIMEタイプに画像4種とPDFが含まれる", () => {
      const sql = getAttachmentsMigrationSql();
      expect(sql).toMatch(ALLOWED_MIME_TYPES_PATTERN);
    });
  });

  describe("Req 3.1, 3.2, 3.3, 3.4: Storage RLSポリシー", () => {
    it("アップロード用INSERTポリシーを作成する", () => {
      const sql = getAttachmentsMigrationSql();
      expect(sql).toMatch(POLICY_INSERT_STORAGE_PATTERN);
    });

    it("閲覧用SELECTポリシーを作成する", () => {
      const sql = getAttachmentsMigrationSql();
      expect(sql).toMatch(POLICY_SELECT_STORAGE_PATTERN);
    });

    it("削除用DELETEポリシーを作成する", () => {
      const sql = getAttachmentsMigrationSql();
      expect(sql).toMatch(POLICY_DELETE_STORAGE_PATTERN);
    });

    it("RLSポリシーがuser_guild_ids()を使用してメンバーシップを検証する", () => {
      const sql = getAttachmentsMigrationSql();
      expect(sql).toMatch(USER_GUILD_IDS_IN_POLICY_PATTERN);
    });

    it("storage.foldernameでパスからguild_idを取得する", () => {
      const sql = getAttachmentsMigrationSql();
      expect(sql).toMatch(STORAGE_FOLDERNAME_PATTERN);
    });

    it("ポリシーがevent-attachmentsバケットに限定される", () => {
      const sql = getAttachmentsMigrationSql();
      expect(sql).toMatch(BUCKET_ID_CHECK_PATTERN);
    });

    it("ポリシーはauthenticatedロールのみに設定される（未認証拒否）", () => {
      const sql = getAttachmentsMigrationSql();
      // 3つのポリシー全てがTO authenticatedを持つ
      const authenticatedMatches = sql.match(/TO\s+authenticated/gi);
      expect(authenticatedMatches).not.toBeNull();
      expect(authenticatedMatches!.length).toBeGreaterThanOrEqual(3);
    });
  });
});
