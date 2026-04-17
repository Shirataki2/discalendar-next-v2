# Research & Design Decisions: event-poll

## Summary

- **Feature**: `event-poll`
- **Discovery Scope**: Complex Integration（Bot + Web + DB 三層にまたがる新機能。既存 `events` / `event_series` へ昇格する経路を持つ）
- **Key Findings**:
  - Bot 側の短命インタラクション（delete.ts の `createMessageComponentCollector`）は投票のような長命フローには不適。既存の `handlers/modal-submit.ts` と同様に、**`customId` プレフィックスで振り分ける永続グローバルハンドラ** (`handlers/poll-vote.ts`) を新設する必要がある。
  - Web 側は `app/dashboard/actions.ts` の `sanitizeResult()` + `classifySupabaseError()` + `MutationResult` パターンが確立しており、`finalize` / `close` の確定ルートは Bot/Web 共通の Poll Finalization Service（`packages/bot` からも Web Server Action からも呼べない代わりに、Web は Node ランタイムで `@supabase/ssr` + Bot は `service_key`）で**ロジックを両サイドに二重実装**する方針を採用。
  - Supabase Realtime は既に `hooks/calendar/use-realtime-sync.ts` でパターンが確立されている。`event_polls` / `event_poll_votes` に対して同パターンを再利用し、新たに `hooks/polls/use-poll-realtime.ts` を作る。

## Research Log

### Bot スラッシュコマンドの共通パターン
- **Context**: `/poll` 用のコマンド構造を既存と揃えるため、`delete.ts` を精査。
- **Sources Consulted**: `packages/bot/src/commands/delete.ts`, `packages/bot/src/commands/edit.ts`, `packages/bot/src/bot.ts`
- **Findings**:
  - Command 型 = `{ data: SlashCommandBuilder, execute(interaction) }` を `satisfies Command` で default export する（`packages/bot/src/types/command.ts`）。
  - サブコマンドは `SlashCommandBuilder.addSubcommand(sub => ...)` で定義可能。
  - 管理者権限チェックは `hasManagementPermission(member)` + `guild_config.restricted` を確認する二段構え。
  - 3秒タイムアウト対策として、Supabase 呼び出し直前に `deferReply({ ephemeral: true })` または `deferUpdate()` する。
- **Implications**: `/poll` も `SlashCommandBuilder.addSubcommand()` で `create` / `close` / `finalize` を束ね、`deleteCommand` と同じヘッダ／権限チェックを流用する。

### ボタンインタラクションの寿命とグローバル振り分け
- **Context**: 投票メッセージのボタンは数時間〜数日押され続ける必要があり、コマンド内 Collector では対応不能。
- **Sources Consulted**: `packages/bot/src/handlers/modal-submit.ts`, `packages/bot/src/bot.ts` (`handleInteraction`)
- **Findings**:
  - 既存の modal も `customId` プレフィックス (`MODAL_CUSTOM_IDS`) をパースして処理を分岐するグローバルハンドラ方式を採用。
  - `interactionCreate` イベントで `interaction.isButton()` / `interaction.isStringSelectMenu()` を分岐させれば、再起動後もボタン押下を処理できる。
- **Implications**: `packages/bot/src/handlers/poll-vote.ts` を新設し、`customId` 先頭が `poll:` のボタンインタラクションをルーティングする。`bot.ts::handleInteraction` にも isButton 分岐を追加する。

### Supabase Realtime と既存パターン
- **Context**: Web 側で投票状況をリアルタイム反映するため。
- **Sources Consulted**: `hooks/calendar/use-realtime-sync.ts`, `supabase/migrations/20260328023023_add_realtime_publication_for_events.sql`
- **Findings**:
  - `supabase_realtime` publication に対して `ALTER PUBLICATION ... ADD TABLE` でテーブルを登録するマイグレーションが既にパターン化。
  - `REPLICA IDENTITY FULL` マイグレーション（`20260327162902_*`）で変更後の完全行を取得できるようにする運用。
  - `use-realtime-sync.ts` は `pendingMutationIdsRef` で自分の更新を抑制する実装。
- **Implications**: `event_polls` / `event_poll_options` / `event_poll_votes` を publication に追加するマイグレーションを含める。

### Web Server Action パターン
- **Context**: Web の「確定」「締切」ボタン経路を安全に設計。
- **Sources Consulted**: `app/dashboard/actions.ts`, `lib/supabase/server.ts`, `packages/bot/src/services/classify-error.ts`
- **Findings**:
  - すべての Server Action は `"use server"` + `createClient()` で user 検証 → Service 呼び出し → `sanitizeResult()` で details を剥がして返却。
  - `classifySupabaseError()` は Postgres エラーコード (23505 / 23503 / 40001) を `CONFLICT` / `NOT_FOUND` / `TRANSIENT` 等のドメインコードにマッピング。
- **Implications**: `app/dashboard/polls/actions.ts` に `finalizePoll` / `closePoll` / `castVote`（Web 投票は v2 以降に先送り）を実装し、`lib/polls/poll-service.ts` に finalize のコアロジックを寄せる。Bot 側も `packages/bot/src/services/poll-service.ts` で同ロジックを共有（両サイドで同一 SQL / Result を返す）。

### イベント昇格の整合性（event_series との混在）
- **Context**: Requirement 7 — 投票確定で作られたイベントが繰り返しイベント系列を壊さないか。
- **Sources Consulted**: `supabase/migrations/20260223010510_add_series_columns_to_events.sql`, `supabase/migrations/20260224021349_add_event_series_constraints.sql`
- **Findings**:
  - `events.series_id` は nullable で、NULL なら単発イベント扱い。CHECK 制約で `series_id IS NULL OR series_order IS NOT NULL` 等の整合性が保証されている。
  - 既存の通知・RSVP・ICS は `events.series_id` を問わず動作。
- **Implications**: Poll Finalization Service は `events.series_id = NULL` の INSERT のみを行う。既存の RSVP・通知ハンドラを変更する必要はない。

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| A. Bot 専用モデル + Web は読み取りのみ | 確定は Bot スラッシュ (`/poll finalize`) のみ | 実装シンプル、整合点が1つ | 受け入れ条件 5.6（Web 確定ボタン）を満たせない | 不採用 |
| B. 共通サービス層（Bot + Web が同じ SQL を発行） | `poll-service` を Bot と Web で二重実装し、同一マイグレーションのテーブルを操作 | 両 UI から確定可能、テスタビリティ高 | 二重実装のドリフトリスク | **採用**。SQL と Result 型を揃える |
| C. Edge Function / RPC に集約 | Supabase RPC で finalize を実装し Bot/Web から呼び出す | ロジック一点集約 | RPC 実行環境のデバッグコスト、既存パターン逸脱 | 却下（現在 RPC は ICS 生成のみで特殊ケース） |

**選択**: Option B。両サイドで同一 Result 型 + 同一エラーコード (`POLL_NOT_FOUND` / `POLL_ALREADY_FINALIZED` / `TIE_BREAK_REQUIRED` / `EVENT_CREATE_FAILED`) を返すテストを書いてドリフトを抑制する。

## Design Decisions

### Decision: Bot の投票ボタンは永続ハンドラで処理する
- **Context**: 投票は作成から数日間ボタンが押される可能性がある。
- **Alternatives Considered**:
  1. コマンド内 `createMessageComponentCollector` — 最大時間制限があり再起動で失われる（却下）
  2. グローバル `interactionCreate` で `customId` プレフィックス分岐（採用）
- **Selected Approach**: `packages/bot/src/handlers/poll-vote.ts` を新設し、`poll:<pollId>:<optionId>:<choice>` 形式の customId をパースして処理する。
- **Rationale**: 既存 `modal-submit.ts` と同じ流儀で、Bot 再起動後も Discord メッセージが生きていれば投票が続行できる。
- **Trade-offs**: customId に pollId と optionId を埋め込むため最大 100 文字制限を意識した短い ID（uuid ではなく短縮ハッシュ）が必要。→ uuid を base36 相当に短縮して使う検討だが、Discord の customId 制限 100 文字内なら uuid × 2 + choice で収まるため uuid のままで採用。
- **Follow-up**: customId パーサの単体テストを必須。

### Decision: Web の「確定」操作は Server Action からサービスを直接呼ぶ
- **Context**: Web 管理者が Bot を介さず確定したい。
- **Alternatives Considered**:
  1. Web から Bot に HTTP / queue で指示を送る — インフラ複雑化（却下）
  2. Web Server Action が Supabase を直接叩く — 採用
- **Selected Approach**: Web 側 `lib/polls/poll-service.ts` が Service Role ではなく認証済み `createClient()`（Cookie 認証）を使い、RLS ポリシーに従って更新する。Bot の書き込み経路とは RLS で分離する。
- **Rationale**: 既存の dashboard/actions パターンと一貫。service_key を Next ランタイムに持ち込まなくて済む。
- **Trade-offs**: Web 経路は認証済みユーザーの権限 RLS に依存するため、`manage_events` 相当の RLS ポリシーを設計する必要がある。
- **Follow-up**: `v_guild_members` ビューや `has_guild_management` 関数が未定義なら新設する。

### Decision: 投票候補の日時は UTC 保存、表示は Discord タイムスタンプに委譲
- **Context**: TZ 考慮を単純化。
- **Alternatives Considered**: ギルド設定 TZ を Bot 側で変換 / 採用: Discord `<t:unix:F>` に委譲
- **Selected Approach**: `event_poll_options.starts_at / ends_at` は `timestamptz`、埋め込み表示は `<t:timestamp:F>`（Discord がユーザーローカルに変換）。
- **Rationale**: 既存 `events` も同方針。
- **Trade-offs**: ICS や Web の表示は `date-fns-tz` 等で明示変換が必要だが、既存と同じ。

## Risks & Mitigations

- **R1: 投票メッセージが 2MB Embed 制限を超える** — 候補×回答者名展開で肥大化するリスク。→ ○の回答者は最大 20 名まで表示、それ以上は `他 N 名` と略す。
- **R2: 同時確定競合** — Web と Bot で同時に finalize が走る可能性。→ `event_polls.status` 遷移を `UPDATE ... WHERE status = 'closed' OR status = 'open'` の条件更新 + `RETURNING` で検出し、二重実行を冪等化。
- **R3: Discord customId の 100 文字制限** — uuid 2 個 + choice (`yes/maybe/no` 最大 5 文字) + 区切り = 80 文字程度で収まることを単体テストで固定化する。
- **R4: Realtime で匿名ユーザーに投票者を漏洩** — RLS で `event_poll_votes` の SELECT はギルドメンバーに限定し、Realtime publication も RLS を尊重する設定にする。
- **R5: 確定時に `events` INSERT 失敗** — Trigger ベースの CASCADE ではなく、Service 層で明示的なトランザクション（Supabase の `rpc` 内 SQL 関数 or `postgres_changes` 相当の保証なし、実装上は楽観ロック再トライ）を行う。

## References

- [discord.js v14 Button Components](https://discord.js.org/docs/packages/discord.js/14.x/ButtonBuilder:Class) — 投票ボタンの組み立て
- [Supabase Realtime Row-Level Security](https://supabase.com/docs/guides/realtime/postgres-changes#row-level-security) — 投票表示の権限整合
- `supabase/migrations/20260328023023_add_realtime_publication_for_events.sql` — publication 追加の先行実装
- `packages/bot/src/handlers/modal-submit.ts` — グローバル永続インタラクションの既存パターン
