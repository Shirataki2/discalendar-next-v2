# Research & Design Decisions

## Summary
- **Feature**: `bot-invite-flow`
- **Discovery Scope**: Extension（既存ダッシュボードへの機能追加）
- **Key Findings**:
  - 現行の `fetchGuilds()` は Discord API 取得結果と DB を照合し、BOT 参加済みギルドのみ返却。未参加ギルドの情報は破棄されている
  - 権限解析ユーティリティ（`parsePermissions`, `canManageGuild`）が既に存在し、MANAGE_GUILD / ADMINISTRATOR 判定に再利用可能
  - `DiscordGuild` 型に `permissions` ビットフィールドが含まれており、招待権限の判定に追加 API コールは不要

## Research Log

### 既存のギルド取得フロー分析
- **Context**: BOT 未参加ギルドをどの段階で識別できるか
- **Sources Consulted**: `app/dashboard/page.tsx`, `lib/guilds/service.ts`, `lib/discord/client.ts`
- **Findings**:
  - `getUserGuilds()` → Discord API `/users/@me/guilds` で全所属ギルド取得（`DiscordGuild[]`）
  - `getJoinedGuilds()` → Supabase `guilds` テーブルと照合、DB に存在するもののみ返却
  - BOT 未参加ギルド = Discord API レスポンスに存在するが DB に存在しないギルド
  - 現行では照合後に Discord 側の余剰データを破棄している
- **Implications**: `fetchGuilds()` を拡張し、未照合ギルドも返却すれば新規 API コール不要

### Discord BOT 招待 URL 仕様
- **Context**: 招待 URL の構成と必要パラメータ
- **Sources Consulted**: Discord Developer Documentation
- **Findings**:
  - BOT 招待 URL 形式: `https://discord.com/oauth2/authorize?client_id={CLIENT_ID}&scope=bot&permissions={PERMISSIONS}`
  - `guild_id` パラメータで事前にギルドを選択可能: `&guild_id={GUILD_ID}`
  - V2 では `INVITATION_URL` 環境変数で管理（固定 URL）
  - Next.js ではクライアント側で参照するため `NEXT_PUBLIC_` プレフィックスが必要
- **Implications**: `guild_id` パラメータ付加でギルド固定招待が可能だが、V2 互換性を考慮して基本 URL は環境変数から取得

### 権限判定の再利用性
- **Context**: 招待対象ギルドのフィルタリングに必要な権限判定
- **Sources Consulted**: `lib/discord/permissions.ts`
- **Findings**:
  - `parsePermissions()` で権限ビットフィールドを解析済み
  - `canManageGuild()` は ADMINISTRATOR / MANAGE_GUILD / MANAGE_MESSAGES / MANAGE_ROLES を判定
  - BOT 招待には MANAGE_GUILD または ADMINISTRATOR が必要（Discord 側の要件）
  - 現行の `canManageGuild()` は MANAGE_MESSAGES / MANAGE_ROLES も含むため、招待判定には別関数が必要
- **Implications**: `canInviteBot()` を新設し、ADMINISTRATOR / MANAGE_GUILD のみで判定

### タブ復帰時の状態更新
- **Context**: BOT 招待後にギルド一覧を自動更新する方法
- **Sources Consulted**: Web Visibility API
- **Findings**:
  - `document.visibilitychange` イベントでタブのフォーカス復帰を検知可能
  - `document.hasFocus()` と併用してより正確な復帰判定が可能
  - Server Action 経由でギルド一覧を再取得し、クライアント状態を更新
  - キャッシュの invalidation が必要（`lib/guilds/cache.ts` の `clearCachedGuilds` を活用）
- **Implications**: Client Component 内で `visibilitychange` リスナーを設置し、Server Action でデータ再取得

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Server Component 拡張 | 既存 `fetchGuilds()` を拡張して未参加ギルドも返却 | 既存パターンとの一貫性、追加 API コール不要 | 返却データ量が増加 | 選択 |
| 別 API エンドポイント | 未参加ギルド取得を別 Route Handler で提供 | 関心の分離 | 不要な複雑性、同じ Discord API を二重呼び出し | 不採用 |

## Design Decisions

### Decision: fetchGuilds 拡張方式
- **Context**: BOT 未参加ギルド情報をどのようにクライアントに渡すか
- **Alternatives Considered**:
  1. `fetchGuilds()` の戻り値を拡張して未参加ギルドも返す
  2. 新規 Server Action / Route Handler で未参加ギルド専用 API を作成
- **Selected Approach**: Option 1 — `fetchGuilds()` の戻り値に `invitableGuilds` フィールドを追加
- **Rationale**: 同じ Discord API レスポンスから分離するだけで済み、追加のネットワークコストがない。既存のキャッシュ機構もそのまま活用可能
- **Trade-offs**: 戻り値の型が拡張されるが、後方互換性は維持可能
- **Follow-up**: キャッシュにも未参加ギルド情報を含めるか、参加済みのみにするかの判断が必要

### Decision: 招待 URL のギルド固定
- **Context**: `guild_id` パラメータで招待先ギルドを事前選択するか
- **Alternatives Considered**:
  1. 固定 URL のみ（V2 互換）
  2. `guild_id` パラメータ付加でギルド固定
- **Selected Approach**: Option 2 — `guild_id` パラメータを付加
- **Rationale**: ユーザーが招待先ギルドを再選択する手間を省き、UX を向上させる
- **Trade-offs**: URL 構成が動的になるが、環境変数のベース URL にパラメータ追加するだけで複雑性は低い

## Risks & Mitigations
- Discord API のレート制限 — 既存のエラーハンドリングで対応済み、招待フロー自体は API コールを追加しない
- 環境変数未設定 — 招待ボタンを非表示にするフォールバックで対応（Req 2.4）
- タブ復帰時の過度な再取得 — デバウンス処理で連続再取得を防止

## References
- [Discord OAuth2 Authorize URL](https://discord.com/developers/docs/topics/oauth2#bot-authorization-flow) — BOT 招待 URL の仕様
- [Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API) — タブ復帰検知
