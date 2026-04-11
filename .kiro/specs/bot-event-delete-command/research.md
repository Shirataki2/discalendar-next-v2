# Research & Design Decisions

## Summary
- **Feature**: `bot-event-delete-command`
- **Discovery Scope**: Extension (Discord Bot 既存コマンド/サービス層への機能追加)
- **Key Findings**:
  - `/edit` (`packages/bot/src/commands/edit.ts`) が既に「権限チェック → イベント検索 → 操作実行」パターンを完成させており、`/delete` はそのテンプレートを踏襲できる。
  - `list.ts` がページネーションで `createMessageComponentCollector` を使用済みで、ボタン式確認 UI のパターンを再利用できる。
  - Web 側 `lib/calendar/event-service.ts` の `deleteEvent` は `events` テーブルに対し `id` + `guild_id` の複合条件で DELETE する単純な実装。Bot 側でも同じスキーマで複製すればよい。

## Research Log

### 既存削除実装の確認 (Web)
- **Context**: Web の `deleteEventAction` がどう実装されているか把握し、Bot 側で同等の挙動を実現する。
- **Sources Consulted**: `app/dashboard/actions.ts:446`, `lib/calendar/event-service.ts:1312`
- **Findings**:
  - Web は `authorizeEventOperation(guildId, "delete")` で権限チェックを行い、`eventService.deleteEvent(guildId, id)` を呼ぶ。
  - サービス層 `deleteEvent` は Supabase の `events` テーブルに対して `id = eventId` AND `guild_id = guildId` で DELETE し、エラーは `classifySupabaseError(error, "delete")` で変換、成功時 `data: undefined` を返す。
  - 物理削除（IDOR 防止のため `guild_id` 必須）。
- **Implications**: Bot 側 `deleteEvent` も同じ guild_id スコープでの物理削除を行う。引数順は他関数と一貫性を取り `(eventId, guildId)` または `(guildId, id)` を選択。Bot 既存 `getEventById(eventId, guildId)` / `updateEvent(eventId, guildId, payload)` の慣習に合わせて **`(eventId, guildId)`** で揃える。

### Bot 既存パターンの調査
- **Context**: 編集系コマンドで権限チェックや検索処理がどう実装されているかを確認し、新規 `/delete` を最小コストで実装する。
- **Sources Consulted**: `packages/bot/src/commands/edit.ts`, `packages/bot/src/commands/list.ts`, `packages/bot/src/services/attendee-service.ts`, `packages/bot/src/utils/permissions.ts`
- **Findings**:
  - `edit.ts` の `handleInlinePath` が「`deferReply()` → `getGuildConfig` → `restricted` 判定 → `findEventByName` → 結果に応じた応答」フローを既に確立。
  - `findEventByName(guildId, eventName)` は ILIKE 部分一致検索で先頭一致を返す（`attendee-service.ts:181`）。
  - `hasManagementPermission(member)` は Administrator / ManageGuild / ManageRoles / ManageMessages のいずれかを保有していれば true を返す（`utils/permissions.ts:10`）。
  - イベント未発見時のヒント表示は `edit.ts:buildEventNotFoundMessage` に既存実装あり（`getEventsByGuildId(guildId, "future")` で直近5件を案内）。
- **Implications**: `/delete` コマンドは `edit.ts` の権限/検索フローをほぼそのまま再利用できる。`buildEventNotFoundMessage` 相当の関数も `delete.ts` 内で同じ構造で書く（共通化はスコープ外、必要なら後続イシューで抽出）。

### Discord.js 確認ボタン UI パターン
- **Context**: 削除確認のためのボタン表示と操作待ち受け方法を確定する。
- **Sources Consulted**: `packages/bot/src/commands/list.ts:148-289`（ButtonBuilder + ActionRowBuilder + createMessageComponentCollector）
- **Findings**:
  - `list.ts` で `ActionRowBuilder<ButtonBuilder>` + `ButtonStyle.Secondary` を使い、`reply.createMessageComponentCollector({ componentType: ComponentType.Button, time })` で操作を受け付けるパターンが確立済み。
  - `collector.on("collect", ...)` の中で `i.user.id !== interaction.user.id` を判定して他ユーザーをエフェメラルで弾いている。
  - 終了時 `collector.on("end", ...)` で `editReply({ components: [] })` してボタンを取り除いている。
  - discord.js v14 の `ButtonStyle.Danger`（赤）が破壊的操作の慣例。
- **Implications**: `/delete` の確認 UI は `list.ts` の collector パターンを踏襲する。タイムアウトは `COLLECTOR_TIMEOUT_MS` 相当の定数を `delete.ts` 内に新設（60_000ms）。`customId` は他コマンドと衝突しないよう `delete-confirm` / `delete-cancel` を採用（イベント ID は collector スコープで局所変数として保持し、customId に埋め込まない）。

### Result 型・エラー分類規約
- **Context**: 新規 `deleteEvent` 関数のエラーハンドリング規約。
- **Sources Consulted**: `packages/bot/src/types/result.ts`, `packages/bot/src/services/classify-error.ts`
- **Findings**:
  - `ServiceResult<T>` は `{ success: true; data: T } | { success: false; error: ServiceError }` の判別共用体。
  - `classifySupabaseError(error, "delete")` を呼ぶことで `DELETE_FAILED` などのドメインコードに変換される。
- **Implications**: `deleteEvent` は他関数と同じテンプレートで Result 型を返す。例外 try/catch は他関数に倣って **付けない**（Supabase クライアントは reject ではなく `{ data, error }` を返す）。

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Extension on existing edit/list patterns (採用) | `edit.ts` の権限/検索ロジック + `list.ts` の collector パターンをそのままなぞる | 新規概念ゼロ、レビュー容易、テスト容易 | ヒントメッセージや権限フローが微妙に重複 (DRY 違反候補) | 重複は軽微で後続イシューで抽出可能 |
| 共通 helper を抽出してから実装 | `buildEventNotFoundMessage` / restricted 判定を utils 化してから両コマンドで再利用 | DRY 改善 | 既存 `edit.ts` の修正が必要、コミット粒度肥大化、回帰リスク | DIS-87 のスコープ外。別イシューで対応推奨 |

## Design Decisions

### Decision: 確認 UI は collector 方式 (awaitMessageComponent ではなく `createMessageComponentCollector`)
- **Context**: 単発確認なので `awaitMessageComponent` も成立するが、プロジェクト内のパターン統一を優先する。
- **Alternatives Considered**:
  1. `awaitMessageComponent({ filter, time })` — 1回限り受信のシンプル API
  2. `reply.createMessageComponentCollector(...)` — `list.ts` と同じパターン
- **Selected Approach**: `createMessageComponentCollector` を採用し、`max: 1` 相当の早期 stop で1回のみ受信する。
- **Rationale**: `list.ts` と同じパターンに揃えることで読み手の認知負荷を最小化。`collect` イベント内で `collector.stop()` を呼べば 1 回限りの操作受信を実現できる。
- **Trade-offs**: コード行数が若干増えるが、他コマンドと一貫性が取れる。
- **Follow-up**: コードレビュー時に「`awaitMessageComponent` の方が短い」という指摘が出る可能性。一貫性根拠で説明する。

### Decision: 確認 UI を ephemeral で送る
- **Context**: 削除候補イベント名・日時が他のサーバーメンバーに見える必要はない。
- **Alternatives Considered**:
  1. ephemeral=true（実行ユーザーにのみ表示）
  2. 通常メッセージ（チャンネル全員に表示）
- **Selected Approach**: `interaction.deferReply({ ephemeral: true })` で初手から ephemeral で応答する。
- **Rationale**: `requirements.md` Requirement 3.3 で明示されており、誤操作のチャットスパム化を防げる。
- **Trade-offs**: ephemeral メッセージの編集後もエフェメラル属性が維持される (discord.js v14 の挙動)。問題なし。
- **Follow-up**: なし。

### Decision: Bot サービス関数のシグネチャは `deleteEvent(eventId, guildId)`
- **Context**: 引数順を Web 側 (`deleteEvent(guildId, id)`) に合わせるか、Bot 既存の `getEventById(eventId, guildId)` / `updateEvent(eventId, guildId, payload)` に合わせるかの判断。
- **Alternatives Considered**:
  1. `(guildId, eventId)` — Web と一致
  2. `(eventId, guildId)` — Bot 既存と一致
- **Selected Approach**: `(eventId, guildId)` を採用（Bot 内一貫性）。
- **Rationale**: Bot 内部のレビューしやすさを優先。コマンド層からの呼び出しは1箇所のみのため Web との差は影響小。
- **Trade-offs**: Web 開発者が Bot 側を読むときに微妙な違和感。コメントで明示。
- **Follow-up**: なし。

## Risks & Mitigations
- **誤削除のリスク** — ephemeral 確認 UI + Danger ボタン + コマンド実行者のみ操作可能で軽減。タイムアウト時はキャンセル扱い。
- **権限チェック漏れ** — `edit.ts` と同じテンプレートを踏襲し、テストで restricted ON/OFF 両系統を検証する。
- **インタラクション応答タイムアウト (3秒)** — `deferReply` を即時呼ぶことで回避。
- **collector の停止漏れ** — `collect` イベント末尾で必ず `collector.stop()` を呼び、`end` で `editReply({ components: [] })` でボタン除去。

## References
- discord.js v14 ButtonBuilder / ButtonStyle — `packages/bot/src/commands/list.ts`
- discord.js v14 createMessageComponentCollector — `packages/bot/src/commands/list.ts:256`
- 既存 Web 削除実装 — `lib/calendar/event-service.ts:1312`
