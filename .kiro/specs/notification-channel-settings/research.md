# Research & Design Decisions

## Summary
- **Feature**: `notification-channel-settings`
- **Discovery Scope**: Extension（既存ギルド設定システムの拡張）
- **Key Findings**:
  - Discord BOT API `GET /guilds/{guild.id}/channels` でチャンネル一覧取得可能（スレッドは含まない）
  - チャンネル権限計算には `permission_overwrites` の階層的適用が必要（@everyone → role → member）
  - `event_settings` テーブルに INSERT/UPDATE RLSポリシーの追加が必須

## Research Log

### Discord API: チャンネル一覧取得
- **Context**: BOTトークンでギルドのテキストチャンネル一覧を取得する方法の調査
- **Sources Consulted**: [Discord API Docs - Guild Resource](https://docs.discord.com/developers/resources/guild), [Channel Resource](https://docs.discord.com/developers/resources/channel)
- **Findings**:
  - `GET /guilds/{guild.id}/channels` はチャンネルオブジェクトの配列を返す（スレッドは含まない）
  - BOTトークン認証（`Authorization: Bot {token}`）が必要
  - チャンネルオブジェクトの主要フィールド: `id`, `name`, `type`, `parent_id`, `position`, `permission_overwrites`
  - テキストチャンネルは `type=0` (GUILD_TEXT)
  - カテゴリチャンネルは `type=4` (GUILD_CATEGORY)
- **Implications**: 既存の `getUserGuilds()` と同様のパターンで新関数を追加可能。ただし認証ヘッダーが `Bearer` ではなく `Bot` になる点に注意

### Discord API: 権限計算アルゴリズム
- **Context**: BOTが特定チャンネルに `SEND_MESSAGES` 権限を持つか判定する方法
- **Sources Consulted**: [Discord API Docs - Permissions](https://docs.discord.com/developers/topics/permissions)
- **Findings**:
  - `SEND_MESSAGES` = `1 << 11` (0x0000000000000800)
  - `VIEW_CHANNEL` = `1 << 10` (0x0000000000000400)
  - 権限計算アルゴリズム（2フェーズ）:
    1. ギルドレベル: @everyone ロール + ユーザーの全ロールを OR 結合
    2. チャンネルレベル: overwrites を階層適用（@everyone deny/allow → role deny/allow → member deny/allow）
  - ADMINISTRATOR 権限保持者はすべての権限チェックをバイパス
  - VIEW_CHANNEL が拒否されるとメッセージ送信も暗黙的にブロック
- **Implications**:
  - 権限計算にはBOTのロール情報が必要 → `GET /guilds/{guild.id}/members/{user.id}` でBOTメンバー情報を取得するか、簡易アプローチとして `permission_overwrites` のみで判定
  - 簡易アプローチ: BOTのギルドレベル権限が十分であれば、チャンネルレベルのdenyのみチェックすれば実用的
  - 完全なアルゴリズム実装は複雑度が高いため、初期実装ではBOTがADMINISTRATOR権限を持つ前提で簡略化も検討可能

### Overwrite Object 構造
- **Context**: `permission_overwrites` 配列の要素構造
- **Sources Consulted**: [Discord API Docs - Channel Resource](https://docs.discord.com/developers/resources/channel)
- **Findings**:
  - `id`: snowflake（ロールIDまたはユーザーID）
  - `type`: 0=ロール, 1=メンバー
  - `allow`: 許可ビットフィールド文字列
  - `deny`: 拒否ビットフィールド文字列
- **Implications**: BOTのユーザーIDと@everyoneロールID（=guild_id）でフィルタリングし、deny ビットに SEND_MESSAGES が含まれるかチェック

### 既存サービスパターン分析
- **Context**: `guild-config-service.ts` のパターンを踏襲するための分析
- **Findings**:
  - ファクトリ関数 `createXxxService(supabase)` パターン
  - インターフェース定義 → ファクトリ関数で実装を返す
  - Result型: `{ success: true; data: T } | { success: false; error: XxxError }`
  - エラー型: `{ code: string; message: string; details?: string }`
  - DB Row型（snake_case）→ ドメイン型（camelCase）の変換関数
  - PGRST116（not found）はデフォルト値を返すパターン
- **Implications**: `EventSettingsService` を同一パターンで作成。テスト方法も `guild-config-service.test.ts` を参考に

### RLSポリシー調査
- **Context**: `event_settings` テーブルの書き込みポリシー不在
- **Findings**:
  - 現在は SELECT ポリシーのみ（`authenticated_users_can_read_event_settings`）
  - `guild_config` テーブルも同様に SELECT のみだが、Server Action内のSupabaseクライアントはユーザーセッション付き
  - Server Action内で使用する `createClient()` はユーザー認証付きのため、RLSの INSERT/UPDATE ポリシーが必要
- **Implications**: マイグレーションで INSERT/UPDATE ポリシーを追加。Server Action内で `canManageGuild()` チェック後にのみ呼び出すため、RLS側は `authenticated` ユーザーに対して許可するシンプルなポリシーで十分

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| 既存パターン拡張 | guild-config-service と同一パターンで EventSettingsService を新規作成 | 一貫性が高い、テストパターンが確立済み | ファイル数増加 | 推奨 |
| actions.ts に統合 | Server Action内でSupabaseクエリを直接実行 | ファイル数最小 | 責務混在、テスト困難 | 非推奨 |
| Bot API プロキシ | チャンネル取得をBot側のAPIに委譲 | セキュリティ分離 | 追加インフラ必要、レイテンシ増加 | 将来検討 |

## Design Decisions

### Decision: BOT API呼び出しをServer Action経由で実行
- **Context**: Discord BOT APIの呼び出しをどこで行うか
- **Alternatives Considered**:
  1. クライアントから直接呼び出し — BOTトークン漏洩リスク
  2. Server Action経由 — サーバーサイドでBOTトークンを安全に使用
  3. 専用APIルート — 過剰な設計
- **Selected Approach**: Server Action経由でBOT API呼び出し
- **Rationale**: 既存パターン（`updateGuildConfig` Server Action）と一致。BOTトークンはサーバーサイドでのみ使用され、クライアントに露出しない
- **Trade-offs**: Server Actionの応答待ちが発生するが、許容範囲内
- **Follow-up**: Server Action内でのDiscord APIレート制限ハンドリング

### Decision: 権限計算の簡略化アプローチ
- **Context**: チャンネルレベルの権限計算をどこまで正確に実装するか
- **Alternatives Considered**:
  1. 完全な権限計算アルゴリズム — 正確だがBOTメンバー情報取得が追加で必要
  2. permission_overwrites のdenyチェックのみ — 実用的だが一部ケースで不正確
  3. チャンネル一覧表示時に権限マークのみ付与し、保存時にBOTから実際に送信テスト — 最も確実だが複雑
- **Selected Approach**: `permission_overwrites` のdenyチェック（BOTユーザーID + @everyoneロール）で簡易判定。`SEND_MESSAGES` と `VIEW_CHANNEL` の両方を確認
- **Rationale**: 初期実装として十分な正確性。BOTが通常ADMINISTRATOR権限を持つDiscalendarのユースケースではほとんどのケースをカバー
- **Trade-offs**: ロールレベルのoverwriteは未対応（BOTのロール一覧が必要なため）。将来的に完全アルゴリズムへの拡張は可能
- **Follow-up**: 権限チェックが不正確なケースが報告された場合、BOTメンバー情報取得を追加

### Decision: RLSポリシーはシンプルな authenticated 許可
- **Context**: `event_settings` への書き込みRLSポリシーの設計
- **Alternatives Considered**:
  1. `authenticated` ユーザーに INSERT/UPDATE を許可（Server Action で権限チェック）
  2. RLSポリシー内でギルドメンバーシップを検証（複雑なSQL）
  3. service_role を使用してRLSバイパス（Bot専用パターンの流用）
- **Selected Approach**: Option 1 — `guild_config` テーブルと同一パターン
- **Rationale**: 権限チェックは Server Action 層で `resolveServerAuth()` + `canManageGuild()` により実施済み。RLSは最低限の認証チェックのみ担当
- **Trade-offs**: RLS単体ではギルド管理者のみの制限を強制できないが、Server Actionが常に介在するため問題なし

## Risks & Mitigations
- **BOTトークン未設定**: 環境変数 `DISCORD_BOT_TOKEN` が未設定の場合、Server Actionが明確なエラーメッセージを返す
- **Discord APIレート制限**: 429レスポンスのハンドリングとリトライ情報の返却
- **権限計算の不正確性**: 初期実装では簡易チェック。UI上で「権限を確認できませんでした」の警告表示を検討
- **RLSマイグレーション適用**: ローカル環境と本番環境での適用順序に注意

## References
- [Discord API - Guild Resource](https://docs.discord.com/developers/resources/guild) — `GET /guilds/{guild.id}/channels` エンドポイント
- [Discord API - Channel Resource](https://docs.discord.com/developers/resources/channel) — Channel Object構造、Overwrite Object
- [Discord API - Permissions](https://docs.discord.com/developers/topics/permissions) — 権限ビットフィールド、権限計算アルゴリズム
