# Research & Design Decisions

## Summary
- **Feature**: `guild-permissions`
- **Discovery Scope**: Extension（既存システムへの権限レイヤー追加）
- **Key Findings**:
  - Discord 権限ビットフィールドは BigInt で処理が必要（64ビット超のフラグ存在）
  - `guild_config` テーブルと RLS ポリシーは既存マイグレーションで準備済み
  - 既存の `DiscordGuild.permissions` フィールドを活用でき、追加の Discord API 呼び出しは不要

## Research Log

### Discord 権限ビットフィールドの仕様
- **Context**: 権限解析ユーティリティの設計に必要な公式仕様の確認
- **Sources Consulted**: [Discord Developer Docs - Permissions](https://docs.discord.com/developers/topics/permissions)
- **Findings**:
  - 権限は可変長整数を文字列にシリアライズして返される
  - API v8 以降、すべての権限は文字列として返される
  - ビット位置が 32 を超えるフラグが存在（例: MANAGE_THREADS = 1 << 34）
  - JavaScript の Number は 32 ビットのビット演算しかサポートしないため、BigInt が必要
  - 管理権限に関連するフラグ:
    - `ADMINISTRATOR` = `1n << 3n` (0x8)
    - `MANAGE_GUILD` = `1n << 5n` (0x20)
    - `MANAGE_MESSAGES` = `1n << 13n` (0x2000)
    - `MANAGE_ROLES` = `1n << 28n` (0x10000000)
    - `MANAGE_EVENTS` = `1n << 33n` (0x200000000)
- **Implications**: `BigInt` を使用してビット演算を行う。`Number` での演算は不正確になるリスクがある

### 既存の権限データフロー
- **Context**: 追加の Discord API 呼び出しが必要かの判断
- **Sources Consulted**: `lib/discord/client.ts`, `lib/discord/types.ts`, `app/dashboard/page.tsx`
- **Findings**:
  - `getUserGuilds()` が Discord API `/users/@me/guilds` を呼び出し、`DiscordGuild[]` を返す
  - `DiscordGuild.permissions` フィールドに権限ビットフィールド文字列が含まれている
  - 現在は `fetchGuilds()` 内でギルド一覧取得時に権限データも取得されているが、破棄されている
  - ギルド一覧はキャッシュされている（TTL: 5分）
- **Implications**: 追加の Discord API 呼び出しは不要。既存の `fetchGuilds()` フローで取得済みの `permissions` フィールドを保存・活用する

### guild_config テーブルの状態
- **Context**: restricted フラグの DB スキーマ確認
- **Sources Consulted**: `supabase/migrations/20260101212853_add_bot_settings_and_notifications.sql`
- **Findings**:
  - `guild_config` テーブルは既にマイグレーション済み
  - スキーマ: `guild_id VARCHAR(32) PRIMARY KEY`, `restricted BOOLEAN NOT NULL DEFAULT false`
  - RLS: 認証ユーザーは読み取り可能（`SELECT` ポリシーのみ）
  - `INSERT` / `UPDATE` / `DELETE` ポリシーが存在しない
- **Implications**: guild_config の書き込み用 RLS ポリシーの追加が必要。ただし Discord 権限はアプリ側でのみ判定可能なため、RLS ではなくサービス層で権限チェックを行い、Server Actions 経由で更新する

### イベント RLS ポリシーの制約
- **Context**: RLS レベルでの権限チェック実現可能性
- **Sources Consulted**: `supabase/migrations/20251208005740_add_events_crud_rls_policies.sql`
- **Findings**:
  - 現在の RLS は全認証ユーザーに INSERT/UPDATE/DELETE を許可
  - Discord 権限ビットフィールドは Supabase のユーザーメタデータに含まれていない
  - RLS で Discord 権限を直接チェックすることは技術的に困難
- **Implications**: イベント操作の権限チェックはアプリケーション層（サービス層 + Server Actions）で実装する。RLS は認証チェックのみに留める

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| アプリ層権限チェック | サービス層で権限判定、Server Actions で制御 | 既存パターンとの整合性、Discord 権限の柔軟な判定 | クライアントバイパスのリスク（Server Actions で緩和） | **採用** |
| RLS 拡張 | PostgreSQL RLS でイベント操作を制限 | DB レベルのセキュリティ | Discord 権限情報が DB に不在、複雑なポリシー | 不採用 |
| Middleware 権限チェック | Next.js Middleware で全リクエストを検証 | 一元管理 | Middleware では Supabase クライアントの制約あり | 不採用 |

## Design Decisions

### Decision: 権限データの保存と受け渡し方式
- **Context**: Discord API から取得した権限情報をどのように保存・受け渡すか
- **Alternatives Considered**:
  1. 権限情報をユーザーセッション/JWT に埋め込む
  2. 権限情報を DB に保存して都度読み取る
  3. 既存のギルド取得フローで権限を解析し、コンポーネントに props で渡す
- **Selected Approach**: 選択肢 3 — `fetchGuilds()` で取得済みの `DiscordGuild.permissions` を解析し、Server Component から Client Component に props として渡す
- **Rationale**: 追加の API 呼び出しや DB スキーマ変更が不要。既存のキャッシュ機構（5分 TTL）も活用できる
- **Trade-offs**: 権限情報のリアルタイム性は Discord API の呼び出しタイミングに依存する（キャッシュ期間中は古い権限情報が使われる可能性）
- **Follow-up**: 権限変更の即時反映が必要な場合、キャッシュ無効化の仕組みを検討

### Decision: guild_config の更新方式
- **Context**: restricted フラグの更新を安全に行う方法
- **Alternatives Considered**:
  1. API Route で REST エンドポイントを作成
  2. Server Actions で直接更新
- **Selected Approach**: Server Actions — `updateGuildConfig()` アクションとして実装
- **Rationale**: Next.js App Router のパターンに準拠。フォーム送信やボタンクリックから直接呼び出し可能。CSRF 保護が組み込み
- **Trade-offs**: REST API としての再利用性は低い（Bot 側からの利用が必要になった場合は API Route 追加が必要）

## Risks & Mitigations
- **権限情報の古さ**: キャッシュ TTL（5分）内は古い権限情報が使われる → ギルド設定変更時にキャッシュを無効化するオプションを用意
- **クライアントサイドのバイパス**: UI の非活性だけでは不十分 → Server Actions 内で必ず権限チェックを実行
- **BigInt のブラウザ互換性**: 権限解析は Server Component / Server Action で実行するため、ブラウザ互換性の問題はない

## References
- [Discord Developer Docs - Permissions](https://docs.discord.com/developers/topics/permissions) — 公式の権限ビットフィールド仕様
- [V2 実装 (Rust)](refs/DisCalendarV2/api/src/routes/guilds/user.rs) — 既存の権限解析ロジック
- [V2 実装 (Vue)](refs/DisCalendarV2/web/components/calendar/ServerSetting.vue) — 既存の UI 権限制御
