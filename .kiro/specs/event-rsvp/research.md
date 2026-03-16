# Research & Design Decisions: event-rsvp

## Summary
- **Feature**: `event-rsvp`
- **Discovery Scope**: Extension（既存イベントシステムへのRSVP機能追加）
- **Key Findings**:
  - Supabase `user.id` はUUID、Discord IDは `auth.jwt()->'user_metadata'->>'provider_id'` で取得
  - 既存RLSポリシーは `user_guild_ids()` 関数で同一ギルドメンバーシップを検証
  - Bot は `service_role` で RLS バイパスするため、テーブル設計は Web RLS とBot直接書き込みの両方を考慮

## Research Log

### ユーザー識別: Supabase UUID vs Discord ID
- **Context**: `event_attendees` テーブルで誰が RSVP したかを特定する方法
- **Sources Consulted**: `lib/supabase/server.ts`, `supabase/migrations/`, `app/dashboard/actions.ts`
- **Findings**:
  - Web: `supabase.auth.getUser()` → `user.id` は Supabase UUID
  - Discord ID は JWT claims: `auth.jwt()->'user_metadata'->>'provider_id'`
  - Bot: Discord interaction から `interaction.user.id` で Discord ID を直接取得、service_role で書き込み
  - 既存 `user_guilds` テーブルは `user_id UUID` (Supabase) + `guild_id VARCHAR(32)` で管理
- **Implications**:
  - `event_attendees` は `user_id UUID` (Supabase UUID) を主キーとするのが RLS と整合
  - Bot は service_role で書き込むため、Discord ID → Supabase UUID のマッピングが必要
  - 代替案: `discord_user_id VARCHAR(32)` を使用し、RLS で JWT の provider_id と照合
  - **採用**: `user_id UUID` + `discord_user_id VARCHAR(32)` の両方を保持。Web は user_id で RLS、Bot は discord_user_id で upsert

### 既存 RLS パターン
- **Context**: `event_attendees` の RLS ポリシー設計
- **Sources Consulted**: `supabase/migrations/20251206000001_create_events_table.sql`
- **Findings**:
  - SELECT: `TO authenticated USING (true)` — 認証済みユーザーは全イベントを閲覧可
  - WRITE: SECURITY DEFINER 関数経由、または `user_guild_ids()` でギルドメンバーシップ検証
  - `update_updated_at_column()` トリガー関数が存在
- **Implications**:
  - SELECT: 同一ギルドメンバーに限定（`guild_id` を `event_attendees` に持たせてフィルタ）
  - INSERT/UPDATE/DELETE: `auth.uid() = user_id` で自分のレコードのみ操作可

### 繰り返しイベントの RSVP 管理
- **Context**: `event_series` の各オカレンスに対する RSVP をどう管理するか
- **Sources Consulted**: `supabase/migrations/20260223002232_create_event_series_table.sql`, `lib/calendar/event-service.ts`
- **Findings**:
  - 繰り返しイベントは `event_series` テーブルに RRULE で定義
  - 個別オカレンスは物理レコードを持たず、フェッチ時に動的展開
  - 単発イベントは `events` テーブルに物理レコード
- **Implications**:
  - `event_attendees` には `event_id UUID NULL` + `event_series_id UUID NULL` + `occurrence_date DATE NULL` の柔軟なスキーマが必要
  - 単発イベント: `event_id` で紐付け
  - 繰り返しイベント: `event_series_id` + `occurrence_date` で紐付け
  - CHECK 制約で排他的参照を保証

### EventPopover 拡張ポイント
- **Context**: RSVP ボタンと参加者一覧の配置
- **Sources Consulted**: `components/calendar/event-popover.tsx`
- **Findings**:
  - shadcn/ui `Dialog` ベース、Props: `event`, `open`, `onClose`, `onEdit`, `onDelete`
  - 構造: タイトル → 日時 → 場所 → チャンネル → 説明 → 編集/削除ボタン
  - アイコンベースのレイアウト（lucide-react）
- **Implications**:
  - RSVP セクションは説明の後、編集/削除ボタンの前に配置
  - 参加者サマリー + ボタン群を新しいセクションとして追加
  - EventPopover は Server Component ではないため、RSVP データのフェッチ方法を検討

### Bot スラッシュコマンドパターン
- **Context**: `/rsvp` コマンドの設計
- **Sources Consulted**: `packages/bot/src/commands/create.ts`, `packages/bot/src/types/`
- **Findings**:
  - `{ data: SlashCommandBuilder, execute: (interaction) => Promise<void> } satisfies Command`
  - `interaction.guild.id` でギルド特定、`interaction.user.id` で Discord ユーザー特定
  - `hasManagementPermission()` による権限チェック（RSVP では不要 — 全メンバー回答可）
  - Ephemeral reply でユーザーにのみ表示
- **Implications**:
  - `/rsvp` コマンドは権限チェック不要（全メンバーが利用可能）
  - イベント選択は名前ベースの Autocomplete が望ましい（文字列オプション + autocomplete）

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| 既存パターン拡張 | Server Action + Supabase RLS の既存アーキテクチャに RSVP を追加 | 学習コスト0、一貫性維持 | EventPopover へのデータフェッチが追加ラウンドトリップ | **採用** |
| リアルタイム購読 | Supabase Realtime で RSVP 変更を即時反映 | 複数ユーザーの操作がリアルタイム反映 | 複雑度増、初期スコープ外 | 将来拡張として検討 |

## Design Decisions

### Decision: ユーザー識別方式
- **Context**: Web と Bot の両方から RSVP を管理するため、ユーザー識別の統一が必要
- **Alternatives Considered**:
  1. `user_id UUID` のみ — Supabase UUID で統一。Bot は Discord ID → UUID のマッピングが必要
  2. `discord_user_id VARCHAR(32)` のみ — Discord ID で統一。RLS で JWT claims から取得
  3. 両方保持 — `user_id UUID NULL` + `discord_user_id VARCHAR(32) NOT NULL`
- **Selected Approach**: Option 3（両方保持）
- **Rationale**: Web は `user_id` で RLS 制御、Bot は `discord_user_id` で service_role upsert。表示時は `discord_user_id` + `discord_username` + `discord_avatar_url` を使用
- **Trade-offs**: カラム数増加だが、両チャネルからのアクセスが自然になる
- **Follow-up**: Bot 経由の RSVP で `user_id` が NULL のケース（Supabase アカウント未作成ユーザー）の挙動確認

### Decision: 繰り返しイベント RSVP のデータモデル
- **Context**: 繰り返しイベントの各オカレンスは物理レコードを持たない
- **Alternatives Considered**:
  1. `event_id` のみ — 繰り返しイベントの RSVP は未サポート
  2. `event_series_id` + `occurrence_date` — オカレンス単位で管理
- **Selected Approach**: Option 2
- **Rationale**: 要件 6 で明示的にオカレンス単位の RSVP が求められている
- **Trade-offs**: CHECK 制約で排他的参照が必要（単発 vs 繰り返しの整合性）

### Decision: Bot → Web の Ownership 取得パターン
- **Context**: Bot 経由で `user_id = NULL` のレコードが作成された後、同じ Discord ユーザーが Web からログインして操作する場合の整合性
- **Alternatives Considered**:
  1. (A) SECURITY DEFINER 関数で ownership 取得 — Web 初回 RSVP 操作時に `discord_user_id` 一致 & `user_id IS NULL` のレコードに `user_id` を設定
  2. (B) UPSERT を `discord_user_id` ベースに統一 — RLS も `discord_user_id` で照合
- **Selected Approach**: Option A（SECURITY DEFINER 関数）
- **Rationale**: 既存の RLS パターン（`auth.uid()` ベース）を維持しつつ、Bot 経由レコードの互換性を確保。`claim_rsvp_ownership()` は upsert 前に呼び出す
- **Trade-offs**: SECURITY DEFINER 関数が1つ増えるが、RLS ポリシーの一貫性を保てる
- **Follow-up**: テストで Bot → Web の ownership 取得フローを検証

### Decision: Web Server Action での Discord ユーザー情報取得
- **Context**: `event_attendees` の NOT NULL カラム（`discord_user_id`, `discord_username`）に Server Action 内で値を設定する方法
- **Selected Approach**: `supabase.auth.getUser()` → `user.user_metadata` から取得
  - `provider_id` → `discord_user_id`
  - `full_name` → `discord_username`
  - `avatar_url` → `discord_avatar_url`
- **Rationale**: Discord OAuth ログイン時に Supabase が自動的に `user_metadata` に Discord 情報を保存するため、追加の API 呼び出し不要

### Decision: RSVP トグル動作
- **Context**: 同じステータスを再クリックしたときの挙動
- **Selected Approach**: 同じステータスをクリック → レコード削除（未回答に戻す）
- **Rationale**: 要件 2.4 で明示。直感的な UX（トグルボタンの一般的な挙動）

## Risks & Mitigations
- **Risk**: Bot 経由の RSVP で Supabase アカウントが存在しないユーザー → `user_id` NULL を許容し、表示は discord_user_id ベース
- **Risk**: 繰り返しイベントの大量オカレンスに対する RSVP クエリ性能 → `(event_series_id, occurrence_date)` 複合インデックス
- **Risk**: 楽観的更新のロールバック失敗 → React の `useOptimistic` + エラー時の状態リセット

## References
- Supabase RLS: 既存マイグレーション `20251206000001_create_events_table.sql` のパターンに準拠
- feature-expansion-plan.md 8.2節: RSVP スキーマの初期設計案
