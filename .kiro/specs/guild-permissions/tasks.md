# Implementation Plan

- [ ] 1. 権限解析基盤の構築
- [ ] 1.1 (P) Discord 権限ビットフィールド解析ユーティリティを作成する
  - Discord 権限ビットフィールド文字列を受け取り、各管理権限フラグ（administrator, manageGuild, manageChannels, manageMessages, manageRoles, manageEvents）をブール値として返す `parsePermissions` 関数を実装する
  - BigInt を使用してビット演算を行い、64 ビット超のフラグ（manageEvents = 1 << 33 等）に対応する
  - 入力が空文字列または "0" の場合はすべてのフラグを false として返す
  - `canManageGuild` ヘルパー関数を実装し、administrator / manageGuild / manageMessages / manageRoles のいずれかが true なら true を返す
  - 解析結果の型 `DiscordPermissions` とフラグ定数 `DISCORD_PERMISSION_FLAGS` を定義する
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 1.2 (P) parsePermissions のユニットテストを作成する
  - 全フラグ ON（administrator ビットフィールド等）、全フラグ OFF（"0"）、空文字列のケースを検証する
  - 個別フラグの解析精度を検証する（manageGuild のみ ON、manageRoles のみ ON 等）
  - `canManageGuild` の判定ロジックを検証する（各管理権限の単独 true、全て false、複数 true の組み合わせ）
  - 不正な入力（非数値文字列）に対するエッジケースを検証する
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 2. ギルド設定サービスの構築
- [ ] 2.1 (P) GuildConfigService を作成する
  - Supabase クライアントを受け取るファクトリ関数 `createGuildConfigService` を実装する
  - `getGuildConfig(guildId)`: guild_config テーブルから restricted フラグを取得する。レコードが存在しない場合は `restricted: false` をデフォルト値として返す
  - `upsertGuildConfig(guildId, config)`: guild_config テーブルに restricted フラグを挿入または更新する（PostgreSQL の UPSERT を使用）
  - 既存の `MutationResult<T>` パターンに従い、成功/失敗を型安全に返す
  - `GuildConfig` 型（guildId, restricted）を定義する
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 2.2 (P) GuildConfigService のユニットテストを作成する
  - `getGuildConfig`: レコードが存在する場合の取得、レコードが存在しない場合のデフォルト値返却を検証する
  - `upsertGuildConfig`: 新規作成（INSERT）と既存更新（UPDATE）の両パターンを検証する
  - DB エラー時のエラーレスポンスを検証する
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 3. ギルド一覧の権限情報拡張
  - 既存の `Guild` 型を拡張した `GuildWithPermissions` 型を定義し、解析済み権限情報を含める
  - `fetchGuilds()` の処理フローを拡張し、Discord API から取得済みの `DiscordGuild.permissions` フィールドを `parsePermissions` で解析して `GuildWithPermissions` として返す
  - 未認証時はフェイルセーフとして全権限を拒否する（全フラグ false のデフォルト権限を付与）
  - 権限解析に失敗した場合もフェイルセーフとしてデフォルト権限を返す
  - 既存のキャッシュ機構との整合性を維持する
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 4. イベント操作権限チェック関数の作成
  - `checkEventPermission` 関数を実装し、操作種別（create/update/delete/read）、ギルド設定、ユーザー権限に基づいて操作の可否を判定する
  - read 操作は常に許可する
  - restricted フラグが無効な場合はすべての操作を許可する（現行動作を維持）
  - restricted フラグが有効な場合、`canManageGuild` が false のユーザーの create/update/delete 操作を拒否する
  - 判定結果は `PermissionCheckResult`（allowed + reason）として返す
  - `CalendarErrorCode` に `PERMISSION_DENIED` を追加する
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 5. 権限チェック用 React Hook の作成
  - `useGuildPermissions` Hook を実装し、guildId, permissionsBitfield, restricted を入力として受け取る
  - `canManageGuild`（管理権限の有無）、`isRestricted`（ギルドの制限フラグ）、`canEditEvents`（イベント編集可否の最終判定）を派生状態として返す
  - ローディング状態とエラー状態を管理し、権限情報が未提供の場合は適切な初期状態を返す
  - ギルド切り替え時（guildId 変更時）に権限情報を自動的に再計算する
  - `useMemo` で不要な再計算を防止する
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 6. Server Actions への権限チェック統合
- [ ] 6.1 ギルド設定更新の Server Action を作成する
  - `updateGuildConfig` Server Action を実装し、guildId, restricted, permissionsBitfield を受け取る
  - 認証チェック後に `parsePermissions` → `canManageGuild` で管理権限を検証する
  - 権限がある場合のみ `GuildConfigService.upsertGuildConfig` を呼び出す
  - 権限がない場合は PERMISSION_DENIED エラーを返す
  - 更新成功時に `revalidatePath` でダッシュボードを再検証する
  - _Requirements: 3.3, 3.4_

- [ ] 6.2 イベント操作の Server Actions に権限チェックを追加する
  - 既存のイベント作成・更新・削除の Server Actions（または対応するサービス呼び出し箇所）に `checkEventPermission` を組み込む
  - 認証チェックの直後、DB 操作の前に権限チェックを実行する
  - 権限チェックに失敗した場合は PERMISSION_DENIED エラーを返し、DB 操作を実行しない
  - restricted フラグが無効なギルドでは既存の動作を維持する（全認証ユーザーに操作を許可）
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 7. UI への権限制御統合
- [ ] 7.1 ギルド設定パネルコンポーネントを作成する
  - `GuildSettingsPanel` コンポーネントを実装し、管理権限のあるユーザーにのみ表示する
  - shadcn/ui の Switch コンポーネントで restricted フラグのトグルを提供する
  - トグル変更時に `updateGuildConfig` Server Action を呼び出す
  - ローディング状態の表示と、成功/エラーのフィードバックを提供する
  - 管理権限がない場合はコンポーネント全体を非表示にする
  - Storybook ストーリー（管理者表示、非管理者非表示、ローディング状態）を作成する
  - _Requirements: 5.3, 5.4_

- [ ] 7.2 ダッシュボードとカレンダーに権限ベースの表示制御を適用する
  - ダッシュボードの Server Component で `GuildWithPermissions` と `GuildConfig` を取得し、Client Component に渡す
  - `useGuildPermissions` Hook を使用して権限状態を取得する
  - `canEditEvents` が false の場合、イベント作成ボタンを disabled にする
  - `canEditEvents` が false の場合、カレンダー上のイベント編集・削除操作を非表示にする
  - `isLoading` が true の場合、操作ボタンを一時的に disabled にしローディング状態を表示する
  - ギルド設定パネルをダッシュボードに配置し、`canManageGuild` に基づいて表示/非表示を制御する
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ]* 8. 権限チェック統合テスト
  - Server Action `updateGuildConfig` の統合テスト: 管理権限ありの場合に DB が更新されること、管理権限なしの場合に PERMISSION_DENIED が返ることを検証する
  - イベント操作の権限チェック統合テスト: restricted ギルドでの管理者による操作成功、一般ユーザーによる操作拒否を検証する
  - `fetchGuilds` 拡張の統合テスト: Discord API レスポンスから `GuildWithPermissions` が正しく生成されることを検証する
  - `checkEventPermission` のユニットテスト: restricted/非 restricted × 管理権限あり/なし × 各操作タイプ（create/update/delete/read）の全組み合わせを検証する
  - _Requirements: 1.1, 2.1, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4_
