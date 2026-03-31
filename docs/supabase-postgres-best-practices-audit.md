# Supabase Postgres ベストプラクティス監査レポート

**監査日**: 2026-04-01
**対象**: Discalendar Next - 全マイグレーション (31ファイル) + アプリケーション層クエリ
**基準**: [Supabase Postgres Best Practices](https://supabase.com/docs/guides/database/overview) 全8カテゴリ・31ルール

---

## 総合評価サマリー

| カテゴリ | 影響度 | 評価 | 対応すべき項目 |
|----------|--------|------|---------------|
| Query Performance | CRITICAL | 良好 | -- |
| Connection Management | CRITICAL | 良好 | -- |
| **Security & RLS** | **CRITICAL** | **要改善あり** | `auth.uid()` の `(SELECT ...)` ラップ、`append_notification` の search_path |
| Schema Design | HIGH | 良好 | UUIDv7移行は長期検討 |
| Concurrency & Locking | MEDIUM-HIGH | 良好 | -- |
| Data Access Patterns | MEDIUM | 良好 | -- |
| Monitoring & Diagnostics | LOW-MEDIUM | 確認不可 | Supabase Dashboard で定期確認推奨 |
| Advanced Features | LOW | 該当なし | -- |

### 対応優先度

1. **HIGH -- RLSパフォーマンス最適化**: `auth.uid()` を `(SELECT auth.uid())` にラップ（`user_guilds`, `event_attendees` のポリシー）
2. **MEDIUM -- `append_notification` に `SET search_path = public` を追加**: セキュリティ上のベストプラクティス遵守
3. **MEDIUM -- UUIDv7への将来的な移行検討**: `events`, `event_series` のデータ量が増大した場合のインデックス効率改善

---

## 1. Query Performance (CRITICAL) -- 評価: 良好

### 適合している点

- **インデックス設計が優秀**: `events(guild_id, start_at, end_at)` の複合インデックス、`event_series(guild_id)`, `event_series(dtstart)` など、主要なWHERE句・JOIN列にインデックスが存在
- **パーシャルインデックスの活用**: `idx_events_series_id WHERE series_id IS NOT NULL`, `idx_ics_feed_tokens_guild_active WHERE revoked_at IS NULL`, `idx_attendees_event_id WHERE event_id IS NOT NULL` など、NULL値が多いカラムで効果的に使用
- **旧インデックスの整理**: `idx_events_guild_start` を `idx_events_guild_start_end` で置換し、冗長なインデックスを削除済み

### 指摘事項

| 重要度 | 内容 | 対象 |
|--------|------|------|
| LOW | `events.notifications` (JSONB) にGINインデックスなし | 現時点ではJSONBフィルタクエリを実行していないため問題なし。将来 `@>` 等で検索する場合は必要 |
| LOW | `event_attendees.user_id` にインデックスなし | RLSポリシー `user_id = auth.uid()` で使用。行数が少ない間は影響軽微だが、スケール時に要検討 |

---

## 2. Connection Management (CRITICAL) -- 評価: 良好

### 適合している点

- **Supabase管理のコネクションプール**: Supabase が提供するPgBouncer (transaction mode) を使用しており、アプリ側での直接接続管理は不要
- **クライアント生成パターンが適切**: `lib/supabase/server.ts` はリクエストごとに `createClient()` で新規作成 (Fluid compute対応)、`lib/supabase/client.ts` はブラウザ用シングルトン
- **Bot**: `packages/bot/src/services/supabase.ts` で service_role キーにより直接接続 (バックエンドプロセスとして適切)

### 指摘事項

| 重要度 | 内容 | 対象 |
|--------|------|------|
| INFO | Prepared statement の考慮 | Supabase JS SDK はREST API (PostgREST) 経由のため、prepared statement 問題は該当しない。Edge Function も同様 |

---

## 3. Security & RLS (CRITICAL) -- 評価: 要改善あり

### 適合している点

- **全テーブルでRLS有効化済み**: `guilds`, `events`, `event_series`, `event_settings`, `guild_config`, `user_guilds`, `event_attendees`, `ics_feed_tokens`, `storage.objects`
- **最小権限の原則**: `REVOKE ALL FROM PUBLIC` + `GRANT TO authenticated` パターンを全SECURITY DEFINER関数で適用
- **SECURITY DEFINER関数に `SET search_path = public`** を設定済み (`upsert_event_settings`, `user_guild_ids`, `sync_user_guilds`, `upsert_user_guild`, `ensure_guilds`, `get_or_create_ics_feed_token`, `regenerate_ics_feed_token`, `claim_rsvp_ownership`)
- **書き込みはSECURITY DEFINER関数経由のみ** (`user_guilds`, `ics_feed_tokens`) -- クライアント直接書き込みを禁止
- **カラムレベルGRANT** でanonロールの閲覧範囲を制限 (`channel_id`, `channel_name`, `notifications` を除外)

### 指摘事項

| 重要度 | 内容 | 対象 |
|--------|------|------|
| **HIGH** | **RLSポリシーで `auth.uid()` がサブクエリにラップされていない** | `user_guilds` テーブルの `USING (auth.uid() = user_id)` や `event_attendees` の `WITH CHECK (user_id = auth.uid())`。行ごとに関数が呼び出され、パフォーマンスが低下する |
| MEDIUM | **anonポリシーのサブクエリ未最適化** | `anon_can_read_public_events` と `anon_can_read_public_event_series` が行ごとにサブクエリ `SELECT guild_id FROM guilds WHERE is_public = true AND deleted_at IS NULL` を実行する可能性がある |
| LOW | `append_notification` に `SET search_path` が未設定 | SECURITY DEFINER関数だが search_path が明示されていない (`20260101212853` マイグレーション) |

### 修正案

#### HIGH: `auth.uid()` を `(SELECT auth.uid())` にラップ

```sql
-- 修正前:
USING (auth.uid() = user_id)

-- 修正後（行ごとの関数呼び出しを1回にキャッシュ）:
USING ((SELECT auth.uid()) = user_id)
```

影響ポリシー:
- `user_guilds`: `users_can_select_own_user_guilds`
- `event_attendees`: `users_can_insert_own_rsvp`, `users_can_update_own_rsvp`, `users_can_delete_own_rsvp`
- `storage.objects`: `owner_can_delete_attachments` (`owner = auth.uid()`)

#### LOW: `append_notification` に `SET search_path` を追加

```sql
CREATE OR REPLACE FUNCTION append_notification(event_id UUID, notification JSONB)
RETURNS void AS $$
-- ... 既存のロジック ...
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;  -- 追加
```

---

## 4. Schema Design (HIGH) -- 評価: 良好

### 適合している点

- **外部キーにインデックス設定済み**: `events.guild_id`, `event_series.guild_id`, `event_attendees.guild_id`, `event_attendees.event_id`, `event_attendees.event_series_id` -- 全FK列にインデックスあり
- **`timestamptz` の使用**: 全タイムスタンプカラムで `TIMESTAMPTZ` を使用 (`timestamp` without timezone は不使用)
- **snake_case 識別子**: テーブル名・カラム名すべてが小文字snake_case
- **CHECK制約**: `channel_id` のsnowflake形式バリデーション、`rrule` の長さ制限、`status` の列挙値制約
- **パーシャルユニーク制約**: `idx_events_series_original_date_unique WHERE series_id IS NOT NULL AND original_date IS NOT NULL`

### 指摘事項

| 重要度 | 内容 | 対象 |
|--------|------|------|
| MEDIUM | **UUIDv4をPKに使用** | `events`, `event_series`, `event_attendees`, `ics_feed_tokens` で `gen_random_uuid()` (UUIDv4) をPKとして使用。UUIDv4はランダムなためB-treeインデックスのフラグメンテーションが発生する。UUIDv7 (時系列順序あり) への移行を検討 |
| MEDIUM | **`guilds.id` が `SERIAL` (int4)** | `SERIAL` は2.1Bで枯渇。ただしこのカラムは実質未使用 (`guild_id VARCHAR(32)` が実際のキー) のため影響は限定的 |
| LOW | `VARCHAR(N)` vs `TEXT` | `guild_id VARCHAR(32)`, `name VARCHAR(100)` 等は制約として意図的に使っているため問題なし。PostgreSQLでは `TEXT` と `VARCHAR(N)` のパフォーマンスは同等 |

---

## 5. Concurrency & Locking (MEDIUM-HIGH) -- 評価: 良好

### 適合している点

- **UPSERT による競合回避**: `ensure_guilds`, `upsert_user_guild`, `sync_user_guilds`, `get_or_create_ics_feed_token` で `ON CONFLICT` を活用
- **アトミックなトークン再生成**: `regenerate_ics_feed_token` は PL/pgSQL トランザクション内で revoke + insert をアトミック実行
- **短いトランザクション**: アプリ側ではHTTP呼び出しの後にDB操作を実行しており、トランザクション内での外部API呼び出しは見当たらない

### 指摘事項

特になし。現在の規模では問題は見当たらない。

---

## 6. Data Access Patterns (MEDIUM) -- 評価: 良好

### 適合している点

- **N+1回避**: `lib/calendar/cross-guild-event-service.ts` は `.in("guild_id", guildIds)` でバッチクエリを使用しN+1を回避
- **UPSERT活用**: `event_attendees` の出欠登録で `upsert` を使用 (`onConflict: "event_id,discord_user_id"`)
- **LIMIT設定**: Bot側のクエリに適切な `.limit(100)`, `.limit(1000)` を設定
- **バッチINSERT**: `ensure_guilds` と `sync_user_guilds` で `unnest()` を使ったバルクupsert

### 指摘事項

| 重要度 | 内容 | 対象 |
|--------|------|------|
| LOW | OFFSET型ページネーション未使用 (問題なし) | 現時点ではカーソルベースもOFFSETベースも使用していない (LIMITのみ)。データ量が増えてページネーションが必要になった際はカーソルベースを採用すべき |
| INFO | `cross-guild-event-service.ts` で3回の独立クエリ | 単発イベント・シリーズ・例外レコードを別々に取得。PostgRESTの制約上JOINベースの一括取得は困難なため妥当 |

---

## 7. Monitoring & Diagnostics (LOW-MEDIUM) -- 評価: 確認不可

Supabase Dashboard で `pg_stat_statements` やVACUUM/ANALYZE設定は管理されていると想定。マイグレーションファイルには言及なし。

### 推奨事項

| 重要度 | 内容 |
|--------|------|
| INFO | Supabase Dashboard > Database > Query Performance で高コストクエリを定期的に確認 |
| INFO | `events` テーブルが10万行を超えたら `autovacuum_analyze_scale_factor` のチューニングを検討 |

---

## 8. Advanced Features (LOW) -- 評価: 該当なし

フルテキスト検索やJSONBでの複雑なフィルタクエリは現時点で使用されていないため、`tsvector` やGINインデックスの追加は不要。

---

## 付録: 検査対象の全テーブル・関数一覧

### テーブル

| テーブル | PK | RLS | インデックス数 |
|----------|-----|-----|---------------|
| `guilds` | `id` SERIAL | 有効 | 2 (`guild_id`, `public_slug` partial) |
| `events` | `id` UUID | 有効 | 4 (`guild_id`, `start_at`, `guild_id+start_at+end_at`, `series_id` partial) |
| `event_series` | `id` UUID | 有効 | 2 (`guild_id`, `dtstart`) |
| `event_settings` | `id` SERIAL | 有効 | 1 (`guild_id` UNIQUE) |
| `guild_config` | `guild_id` VARCHAR | 有効 | 0 (PKのみ) |
| `user_guilds` | `(user_id, guild_id)` | 有効 | 0 (PKのみ) |
| `event_attendees` | `id` UUID | 有効 | 4 (`event_id` partial, `series+occurrence` partial, `guild_id`, `discord_user_id`) |
| `ics_feed_tokens` | `id` UUID | 有効 | 2 (`guild_id` partial unique, `token` partial) |

### SECURITY DEFINER 関数

| 関数 | search_path | REVOKE/GRANT |
|------|-------------|-------------|
| `user_guild_ids()` | `public` | authenticated, service_role |
| `sync_user_guilds(...)` | `public` | authenticated |
| `upsert_user_guild(...)` | `public` | authenticated |
| `upsert_event_settings(...)` | `public` | authenticated |
| `ensure_guilds(...)` | `public` | authenticated |
| `get_or_create_ics_feed_token(...)` | `public` | authenticated |
| `regenerate_ics_feed_token(...)` | `public` | authenticated |
| `claim_rsvp_ownership(...)` | `public` | authenticated |
| `append_notification(...)` | **未設定** | なし (要修正) |
| `update_updated_at_column()` | 未設定 | -- (トリガー関数) |
