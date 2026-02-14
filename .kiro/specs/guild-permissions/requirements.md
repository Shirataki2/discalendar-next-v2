# Requirements Document

## Introduction

Discord ギルド内でのユーザー権限に基づいたアクセス制御機能を追加する。V2（Nuxt.js版）では Discord API から取得した権限ビットフィールドを解析し、`restricted` フラグと組み合わせてイベント編集の制限を実現していた。現行の Next.js 版では全認証ユーザーが全操作可能な状態であり、セキュリティ上の必須要件として権限チェック機能を移植する。

### 現行システムの状態
- `DiscordGuild.permissions` フィールドは型定義に存在するが、解析・利用されていない
- `guild_config` テーブル（`restricted` フラグ）は DB マイグレーション済み
- イベント CRUD の RLS ポリシーは全認証ユーザーに開放されている
- 権限チェックのサービス層・UI 層の実装が存在しない

### V2 の権限モデル（参照）
- Discord API からギルド内権限ビットフィールドを取得
- Administrator / Manage Guild / Manage Messages / Manage Roles のいずれかで「管理権限あり」と判定
- `restricted` フラグが有効な場合、管理権限のないユーザーはイベント編集不可

## Requirements

### Requirement 1: Discord 権限ビットフィールド解析
**Objective:** As a 開発者, I want Discord API の権限ビットフィールド文字列を個別の権限フラグに解析できる, so that ギルド内のユーザー権限を判定するロジックを構築できる

#### Acceptance Criteria
1. When 権限ビットフィールド文字列が渡された場合, the 権限解析ユーティリティ shall 各権限フラグ（administrator, manage_guild, manage_messages, manage_roles 等）をブール値に変換して返す
2. When 権限ビットフィールドが "0" または空文字列の場合, the 権限解析ユーティリティ shall すべての権限フラグを false として返す
3. The 権限解析ユーティリティ shall `canManageGuild()` ヘルパー関数を提供し、administrator / manage_guild / manage_messages / manage_roles のいずれかが true の場合に true を返す
4. The 権限解析ユーティリティ shall TypeScript の型安全性を維持し、各権限フラグを明示的なプロパティとして定義する

### Requirement 2: ギルド権限取得サービス
**Objective:** As a システム, I want ログインユーザーの特定ギルドにおける権限情報を取得できる, so that サーバーサイドとクライアントサイドの両方で権限チェックが可能になる

#### Acceptance Criteria
1. When ユーザーがギルドを選択した場合, the ギルド権限サービス shall Discord API から取得済みの権限ビットフィールドを解析してユーザーの権限情報を返す
2. When ユーザーが認証されていない場合, the ギルド権限サービス shall 権限取得リクエストを拒否し未認証エラーを返す
3. If 権限情報の取得に失敗した場合, the ギルド権限サービス shall エラーを返し、デフォルトで全権限を拒否する（フェイルセーフ）
4. The ギルド権限サービス shall Server Components と Client Components の両方から利用可能なインターフェースを提供する

### Requirement 3: ギルド設定（restricted フラグ）管理
**Objective:** As a ギルド管理者, I want ギルドの `restricted` フラグを確認・変更できる, so that イベント編集を管理権限のあるユーザーのみに制限できる

#### Acceptance Criteria
1. When ギルドの設定を読み込む場合, the ギルド設定サービス shall `guild_config` テーブルから `restricted` フラグの値を取得して返す
2. When `guild_config` レコードが存在しない場合, the ギルド設定サービス shall `restricted: false` をデフォルト値として返す
3. When 管理権限のあるユーザーが `restricted` フラグを変更した場合, the ギルド設定サービス shall `guild_config` テーブルを更新する（存在しない場合は新規作成）
4. If 管理権限のないユーザーがギルド設定を変更しようとした場合, the ギルド設定サービス shall 変更を拒否し権限不足エラーを返す

### Requirement 4: イベント操作の権限チェック
**Objective:** As a ギルドメンバー, I want ギルドの権限設定に基づいてイベントの作成・編集・削除が制御される, so that 不正なイベント操作を防止できる

#### Acceptance Criteria
1. While ギルドの `restricted` フラグが有効な場合, the イベントサービス shall 管理権限のないユーザーからのイベント作成・編集・削除リクエストを拒否する
2. While ギルドの `restricted` フラグが無効な場合, the イベントサービス shall すべての認証済みユーザーにイベント操作を許可する（現行の動作を維持）
3. When 権限のないユーザーがイベント操作を試みた場合, the イベントサービス shall 権限不足を示すエラーメッセージを返す
4. The イベントサービス shall イベント読み取り（表示）をすべての認証済みユーザーに許可する（restricted フラグに関係なく）

### Requirement 5: 権限ベースの UI 表示制御
**Objective:** As a ギルドメンバー, I want 自分の権限に応じて操作可能な UI 要素のみが表示・有効化される, so that 実行できない操作のボタンを押してエラーになることを避けられる

#### Acceptance Criteria
1. While ギルドの `restricted` フラグが有効で、ユーザーに管理権限がない場合, the ダッシュボード shall イベント作成ボタンを非活性（disabled）状態で表示する
2. While ギルドの `restricted` フラグが有効で、ユーザーに管理権限がない場合, the カレンダー UI shall イベントの編集・削除操作を非表示にする
3. While ユーザーに管理権限がある場合, the ダッシュボード shall ギルド設定パネル（restricted フラグの切り替え）へのアクセスを提供する
4. While ユーザーに管理権限がない場合, the ダッシュボード shall ギルド設定パネルへのアクセスを非表示にする
5. When 権限情報を読み込み中の場合, the UI shall 操作ボタンを一時的に非活性にし、ローディング状態を表示する

### Requirement 6: 権限チェック用 React Hook
**Objective:** As a 開発者, I want ギルド権限の状態を React コンポーネントで簡潔に利用できる, so that 権限ベースの UI 制御を一貫したパターンで実装できる

#### Acceptance Criteria
1. The 権限チェック Hook shall 現在選択中のギルドにおけるユーザーの権限情報を返す
2. The 権限チェック Hook shall `canManageGuild`（管理権限の有無）と `isRestricted`（ギルドの制限フラグ）と `canEditEvents`（イベント編集可否の最終判定）を返す
3. The 権限チェック Hook shall ローディング状態とエラー状態を返す
4. When ギルドが切り替えられた場合, the 権限チェック Hook shall 新しいギルドの権限情報を自動的に再取得する
