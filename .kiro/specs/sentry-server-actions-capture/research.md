# Research Log: sentry-server-actions-capture

## Summary

Server Actions のエラーキャプチャ拡大に向けた軽量ディスカバリー。既存の `captureException` 使用箇所と未対応箇所を特定した。

## Discovery Scope

- **分類**: Extension（既存システムの拡張）
- **対象ファイル**: `app/dashboard/actions.ts`, `app/auth/actions.ts`
- **新規依存**: なし（`@sentry/nextjs` は既にインストール済み）

## Research Log

### Topic 1: 現在の captureException 使用状況

**調査結果**:

`app/dashboard/actions.ts` で3箇所使用中:
1. `resolveServerAuth` — `user_guilds` upsert 失敗 (L221)
2. `upsertRsvpAction` — `claim_rsvp_ownership` RPC 失敗 (L988)
3. `deleteAttachmentFilesAction` — 添付ファイル削除失敗 (L1495)

`app/auth/actions.ts`:
- `signOut` — `console.error` のみ、`captureException` なし

**含意**: 大部分のServer Actionエラーパスは `sanitizeResult` 経由で Result 型を返すのみで Sentry 報告なし。

### Topic 2: エラーパスの分類

**カテゴリ**:
1. **バリデーションエラー**: guild_id 形式不正、RSVP ステータス不正 → ユーザー入力起因、Sentry 報告不要
2. **認証エラー**: 未認証、権限不足 → Sentry 報告不要（正常フロー）
3. **サービス層エラー**: Supabase 操作失敗、RPC 失敗 → Sentry 報告必須
4. **外部API失敗**: Discord API（fetchGuildChannels, refreshGuilds）→ Sentry 報告必須

**決定**: バリデーション・認証エラーは除外し、サービス層・外部APIエラーのみキャプチャ対象とする。

### Topic 3: 対象 Server Actions と追加箇所

| Action | エラーパス | 現状 | 対応 |
|--------|-----------|------|------|
| `signOut` (auth) | supabase.auth.signOut 失敗 | console.error のみ | captureException 追加 |
| `updateGuildConfig` | service.upsertGuildConfig 失敗 | sanitizeResult のみ | captureException 追加 |
| `updateNotificationChannel` | service.upsertEventSettings 失敗 | console.error のみ | captureException 追加 |
| `togglePublicCalendar` | enable/disable 失敗 | なし | captureException 追加 |
| `regeneratePublicSlugAction` | regeneratePublicSlug 失敗 | なし | captureException 追加 |
| `getOrCreateIcsFeedToken` | サービス失敗 | なし | captureException 追加 |
| `regenerateIcsFeedToken` | サービス失敗 | なし | captureException 追加 |
| `getAttachmentUrlsAction` | サービス失敗 | なし | captureException 追加 |
| `fetchGuildChannels` | Discord API / DB 失敗 | なし | captureException 追加 |
| `refreshGuilds` | fetchGuilds 失敗 | なし | captureException 追加 |

**注記**: `createEventAction`, `updateEventAction`, `deleteEventAction` 等は `sanitizeResult(await eventService.xxx())` パターンで、サービス内部でエラーが分類されるが Sentry 報告はない。ただしこれらはサービス層（`event-service.ts`）が Result 型を返すため、Server Action 側でエラーをキャプチャする必要がある。

## Architecture Decisions

- **D1**: バリデーション・認証エラーはキャプチャ対象外とする（ノイズ防止）
- **D2**: サービス層が返す Result 型のエラーをキャプチャ対象とする
- **D3**: 既存の `new Error("[操作名] 詳細: ${message}")` フォーマットを踏襲する
- **D4**: `sanitizeResult` を呼ぶ前にキャプチャする（details 情報を保持するため）

## Risks

- **R1**: サービス層内部で既に captureException している箇所（`lib/guilds/service.ts`, `lib/guilds/fetch-guilds.ts`）と重複する可能性 → Server Action 側では追加しない（既にカバー済み）
