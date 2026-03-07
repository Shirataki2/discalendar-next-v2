# Research & Design Decisions

## Summary
- **Feature**: `user-guilds-membership`
- **Discovery Scope**: Extension（既存システムへの拡張）
- **Key Findings**:
  - Supabase公式ドキュメントは `auth.users(id)` への FK + `ON DELETE CASCADE` パターンを推奨
  - PostgreSQL BIGINT カラムは `@supabase/supabase-js` で string として返却される（安全な型マッピング）
  - RLS の EXISTS サブクエリは `SECURITY DEFINER` + `STABLE` 関数でラップすることで 10x のパフォーマンス改善が可能

## Research Log

### auth.users への外部キー参照パターン
- **Context**: `user_guilds.user_id` が `auth.users(id)` を参照する必要がある
- **Sources Consulted**:
  - [Supabase User Management Docs](https://supabase.com/docs/guides/auth/managing-user-data)
  - [Supabase Cascade Deletes Docs](https://supabase.com/docs/guides/database/postgres/cascade-deletes)
- **Findings**:
  - 公式推奨パターン: `id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE`
  - **主キーのみを参照すること**（`auth.users` の `id` は主キー）
  - Supabase 管理テーブルのカラム・インデックス・制約は変更される可能性があるため、主キー以外の参照は避ける
  - `public.profiles` テーブルの公式例がこのパターンを使用
- **Implications**: `user_guilds.user_id` は `auth.users(id)` への FK + `ON DELETE CASCADE` で安全に定義できる

### PostgreSQL BIGINT と supabase-js クライアント
- **Context**: Discord 権限ビットフィールドは最大 53 ビット超。BIGINT カラムの JS クライアント側の扱いを確認
- **Sources Consulted**:
  - [postgrest-js Issue #419](https://github.com/supabase/postgrest-js/issues/419)
  - [supabase Issue #22338](https://github.com/supabase/supabase/issues/22338)
  - [supabase-js Issue #863](https://github.com/supabase/supabase-js/issues/863)
- **Findings**:
  - `@supabase/supabase-js` は BIGINT カラムを **string** として返却する（PostgREST 経由）
  - `Number.MAX_SAFE_INTEGER` (9,007,199,254,740,991) を超える値は number 型にすると丸め誤差が発生
  - Discord 権限ビットフィールドは最大 50+ ビット使用するため、MAX_SAFE_INTEGER を超える可能性がある
  - 型生成（`supabase gen types`）では number 型として生成されるため、手動で string に修正する必要がある
- **Implications**:
  - `user_guilds.permissions` は BIGINT で格納し、JS 側では string として受け取る
  - `parsePermissions()` は既に string を引数とするため、既存の権限解析パイプラインと整合する
  - TypeScript の型定義では `permissions` を `string` として明示的に定義する

### RLS サブクエリのパフォーマンス最適化
- **Context**: 既存テーブルの RLS ポリシーを `EXISTS (SELECT 1 FROM user_guilds WHERE ...)` に移行する際のパフォーマンス懸念
- **Sources Consulted**:
  - [SupaExplorer RLS Performance Best Practices](https://supaexplorer.com/best-practices/supabase-postgres/security-rls-performance/)
  - [Supabase RLS Discussion #14576](https://github.com/orgs/supabase/discussions/14576)
  - [Supabase Row Level Security Docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- **Findings**:
  - RLS ポリシー内の EXISTS サブクエリは**行ごとに実行される**（10,000 行 = 10,000 回のサブクエリ）
  - **最適化パターン**: `SECURITY DEFINER` + `STABLE` 関数でメンバーシップ検索をラップ
    ```sql
    CREATE FUNCTION user_guild_ids()
    RETURNS SETOF VARCHAR(32)
    LANGUAGE SQL SECURITY DEFINER STABLE
    AS $$ SELECT guild_id FROM user_guilds WHERE user_id = auth.uid(); $$;
    ```
  - `STABLE` マーカーにより PostgreSQL がトランザクション内で結果をキャッシュ
  - `~450ms` → `~45ms`（10x 高速化）の実績報告あり
  - **インデックス**: `(user_id, guild_id)` の複合インデックスが必須
- **Implications**:
  - RLS ポリシーでは `guild_id IN (SELECT user_guild_ids())` パターンを採用
  - `user_guilds` テーブルに `(user_id, guild_id)` 複合インデックスを作成
  - `user_guild_ids()` 関数を `SECURITY DEFINER STABLE` で定義

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| A: 新サービスのみ | user_guilds 専用サービス、既存ファイル変更なし | 影響範囲最小 | 同期・RLS移行が別作業になる | 単体では価値が限定的 |
| B: 既存ファイル改変 | fetchGuilds / resolveServerAuth に直接組み込み | ファイル数最小 | 既存テスト影響大、レビュー複雑 | リスク高 |
| **C: ハイブリッド（採用）** | 新サービス + 段階的統合 + フェーズドRLS移行 | 段階的導入、ロールバック可能、テスト容易 | フェーズ間の整合性管理が必要 | フェーズ1-3の段階的実装 |

## Design Decisions

### Decision: BIGINT + string 型でのパーミッション格納
- **Context**: Discord 権限ビットフィールドを DB に永続化する型選択
- **Alternatives Considered**:
  1. TEXT 型で文字列格納 -- 柔軟だが DB 側でのビット演算不可
  2. BIGINT 型 -- DB 側でビット演算可能、JS では string で受信
  3. NUMERIC 型 -- 精度保証だが PostgreSQL のビット演算がやや煩雑
- **Selected Approach**: BIGINT 型
- **Rationale**: PostgreSQL の BIGINT は 8 バイトで最大 2^63-1 をサポート。Discord 権限は現時点で 50+ ビットだが BIGINT の範囲内。`@supabase/supabase-js` が string で返却するため、既存の `parsePermissions(string)` とシームレスに統合可能
- **Trade-offs**: 型生成で number になるため手動型定義が必要 / DB 側のビット演算が利用可能（将来の RLS 高度化に対応）
- **Follow-up**: `supabase gen types` 実行後に permissions の型を手動確認

### Decision: SECURITY DEFINER 関数による RLS 最適化
- **Context**: RLS ポリシーで `user_guilds` をサブクエリする際のパフォーマンス
- **Selected Approach**: `user_guild_ids()` 関数を `SECURITY DEFINER STABLE` で定義し、RLS ポリシーから参照
- **Rationale**: 行ごとのサブクエリ実行を回避し、トランザクション内キャッシュで 10x 高速化
- **Trade-offs**: 関数追加により DDL が増加 / SECURITY DEFINER のセキュリティ監査が必要
- **Follow-up**: ベンチマークテストでパフォーマンス改善を検証

### Decision: フェーズド移行戦略
- **Context**: 空の `user_guilds` テーブルで RLS を移行すると全書き込みがブロックされる
- **Selected Approach**: 3 フェーズに分割
  1. テーブル作成 + サービス層 + 同期開始（データ蓄積期間）
  2. resolveServerAuth の 3-tier 化（DB フォールバック追加）
  3. RLS ポリシー移行（データ蓄積後に実施）
- **Rationale**: Phase 1 でデータが蓄積された後に Phase 3 を実行することで、空テーブルによる書き込みブロックを回避
- **Trade-offs**: フェーズ間に一時的に `WITH CHECK(true)` が残存（既存と同じセキュリティレベル）
- **Follow-up**: Phase 1 デプロイ後、user_guilds のレコード数を監視し Phase 3 の実行タイミングを判断

## Risks & Mitigations
- **空テーブルでの RLS 移行によるサービス停止** -- Phase 1 でデータ蓄積後に Phase 3 を実行。Phase 3 マイグレーションにはロールバック SQL を同梱
- **BIGINT の JS クライアント丸め誤差** -- string 型で受け取り、`parsePermissions()` で BigInt 変換する既存パイプラインを活用
- **auth.users FK の Supabase 内部変更リスク** -- 公式ドキュメント推奨パターンに従い、主キー（id）のみを参照
- **event_series テーブルの RLS が漏れる** -- requirements には明示されていないが、同一の `WITH CHECK(true)` パターンを持つため Phase 3 で一括移行対象に含める

## References
- [Supabase User Management](https://supabase.com/docs/guides/auth/managing-user-data) -- auth.users FK パターン
- [Supabase Cascade Deletes](https://supabase.com/docs/guides/database/postgres/cascade-deletes) -- ON DELETE CASCADE ベストプラクティス
- [postgrest-js BIGINT Issue](https://github.com/supabase/postgrest-js/issues/419) -- BIGINT の string 返却挙動
- [SupaExplorer RLS Performance](https://supaexplorer.com/best-practices/supabase-postgres/security-rls-performance/) -- SECURITY DEFINER + STABLE 最適化パターン
- [Supabase RLS Docs](https://supabase.com/docs/guides/database/postgres/row-level-security) -- RLS ポリシー設計ガイド
