# Requirements Document

## Project Description (Input)
DIS-87: Bot イベント削除コマンド (/delete) の実装。Discord BotにイベントID指定またはイベント名検索によるイベント削除機能を追加する。Webの deleteEventAction() に相当するBot側コマンドを実装し、event-service.ts に deleteEvent() 関数を追加する。削除前にはボタン式の確認プロンプトを表示し、restricted モードでは管理権限を持つユーザーのみが削除可能とする。受け入れ条件: (1) Botからイベントを削除できる、(2) 削除前に確認メッセージが表示される、(3) restricted モードでは権限のあるユーザーのみ削除可能。

## Introduction

Discord Bot (`@discalendar/bot`) に `/delete` スラッシュコマンドを追加し、Web 側 `deleteEventAction()` と等価なイベント削除機能を提供する。ユーザーはイベント名（部分一致）でイベントを検索し、ボタン式の確認プロンプトを経て削除を確定できる。Bot のサービス層 (`event-service.ts`) には新たに `deleteEvent(eventId, guildId)` 関数を追加し、`guild_id` スコープで論理的に隔離された安全な物理削除を行う。`/edit` および `/create` と整合する権限モデル（restricted モード時の管理権限チェック）を踏襲し、サーバー管理者が安心して使える破壊的操作 UX を実現する。

## Requirements

### Requirement 1: /delete スラッシュコマンドの提供

**Objective:** Discord サーバー管理者として、Bot から既存イベントを削除できるようにしたい。理由は、Web ダッシュボードを開かずにサーバー内の不要なイベントを片付けたいため。

#### Acceptance Criteria

1. The Discord Bot shall `/delete` という名前のスラッシュコマンドを Discord に登録する
2. The Discord Bot shall `/delete` コマンドに対し、必須の `event` 文字列オプション（削除対象イベント名、最大100文字）を持たせる
3. When ユーザーが `/delete` をギルド外（DM等）で実行した時、the Discord Bot shall 「このコマンドはサーバーでのみ実行可能です」というエフェメラルメッセージを返し、処理を中断する
4. When ユーザーが `/delete event:<名前>` を実行した時、the Discord Bot shall まず deferReply 等で応答を保留し、3秒以内のインタラクション応答制限を超えないようにする
5. The Discord Bot shall `/delete` の説明文を「既存の予定を削除します」と日本語で設定する

### Requirement 2: イベント検索と単一イベント特定

**Objective:** Bot ユーザーとして、イベント名の一部を入力するだけで対象イベントを特定したい。理由は、内部 UUID を覚えなくても直感的に操作できるようにするため。

#### Acceptance Criteria

1. When ユーザーが `/delete event:<クエリ>` を実行した時、the Discord Bot shall `findEventByName(guildId, クエリ)` を用いて部分一致でイベントを検索する
2. If 検索結果が空の場合、the Discord Bot shall 「『<クエリ>』に一致するイベントが見つかりませんでした」というエラー埋め込みを返し、`getEventsByGuildId(guildId, "future")` で取得した直近イベント名（最大5件）をヒントとして併記する
3. If 検索でサービスエラーが発生した場合、the Discord Bot shall ロガーに `error` レベルでエラー詳細を記録し、ユーザーには「イベントの検索に失敗しました」というエラー埋め込みのみを返す
4. The Discord Bot shall 検索一致した最初のイベントを削除候補として確認プロンプトに渡す

### Requirement 3: 削除前の確認プロンプト

**Objective:** Bot ユーザーとして、誤操作を防ぐために削除前に内容と確認ボタンを目視確認したい。理由は、イベント削除は不可逆な破壊的操作であり、間違えた場合の影響が大きいため。

#### Acceptance Criteria

1. When 削除候補イベントが特定できた時、the Discord Bot shall そのイベントの埋め込み（`createEventEmbed`）を「以下の予定を削除します。よろしいですか？」というメッセージとともに表示する
2. The Discord Bot shall 確認メッセージに「削除する」（ButtonStyle.Danger）と「キャンセル」（ButtonStyle.Secondary）の2つのボタンを ActionRow で添付する
3. The Discord Bot shall 確認メッセージをエフェメラル（実行ユーザーにのみ表示）として送信する
4. While 確認プロンプト表示中、the Discord Bot shall コマンド実行ユーザー本人のボタン操作のみを受け付け、他のユーザーがボタンを押した場合はエフェメラルで「このボタンを操作できるのはコマンド実行者のみです」と返す
5. When 確認プロンプト表示から60秒経過し操作がない場合、the Discord Bot shall ボタンを非活性化し「タイムアウトしました。削除はキャンセルされました」とメッセージを更新する
6. When ユーザーが「キャンセル」ボタンを押下した時、the Discord Bot shall 「削除をキャンセルしました」とメッセージを更新し、ボタンを非活性化する

### Requirement 4: 権限チェック（restricted モード対応）

**Objective:** サーバー管理者として、通常モードでは誰でも削除できるが restricted モードでは管理権限保持者のみが削除できるようにしたい。理由は、`/edit` および `/create` と一貫した権限ポリシーで誤削除や悪意ある削除から守るため。

#### Acceptance Criteria

1. The Discord Bot shall コマンド実行時、`getGuildConfig(guildId)` でギルド設定を取得し restricted フラグを判定する
2. If `getGuildConfig` がエラーを返した場合、the Discord Bot shall ロガーにエラーを記録し、ユーザーに「ギルド設定の取得に失敗しました」とエフェメラルで返して処理を中断する
3. While ギルド設定の `restricted` が true の場合、the Discord Bot shall コマンド実行ユーザーが `hasManagementPermission` を満たすかを判定する
4. If restricted モードで権限が不足している場合、the Discord Bot shall 「このコマンドを実行するためには『管理者』『サーバー管理』『ロールの管理』『メッセージの管理』のいずれかの権限が必要です」というエフェメラルメッセージを返し、処理を中断する
5. While restricted フラグが false の場合、the Discord Bot shall 権限チェックをスキップしすべてのギルドメンバーに削除を許可する

### Requirement 5: 削除実行とサービス層関数

**Objective:** バックエンド開発者として、Bot のサービス層に Web 側と等価な削除関数を持たせたい。理由は、guild_id スコープでの安全な削除処理を一元化し、コマンド層から薄く呼び出せるようにするため。

#### Acceptance Criteria

1. The Bot Event Service shall `deleteEvent(eventId: string, guildId: string): Promise<ServiceResult<void>>` という新しい関数をエクスポートする
2. When `deleteEvent` が呼ばれた時、the Bot Event Service shall Supabase の `events` テーブルに対し `id = eventId` かつ `guild_id = guildId` の複合条件で DELETE クエリを実行する
3. If Supabase が DELETE 中にエラーを返した場合、the Bot Event Service shall `classifySupabaseError(error, "delete")` でドメインエラーコードに変換し `{ success: false, error }` を返す
4. If Supabase エラーが発生した場合、the Bot Event Service shall ロガーに `eventId`, `guildId`, `error` を含めて `error` レベルでログを残す
5. When DELETE が成功した時、the Bot Event Service shall `{ success: true, data: undefined }` を返す
6. The Bot Event Service shall 既存の `getEventById`, `updateEvent` 等と同じ Result 型パターン (`ServiceResult<T>`) を踏襲する

### Requirement 6: 削除確定後のフィードバック

**Objective:** Bot ユーザーとして、削除操作の結果（成功・失敗）を即座に把握したい。理由は、コマンドが正常に完了したか分からないと不安になり再実行してしまうため。

#### Acceptance Criteria

1. When ユーザーが「削除する」ボタンを押下した時、the Discord Bot shall サービス層 `deleteEvent(eventId, guildId)` を呼び出し結果を待つ
2. When `deleteEvent` が成功した時、the Discord Bot shall 確認メッセージを「予定を削除しました: <イベント名>」というメッセージに更新し、ボタンを非活性化する
3. If `deleteEvent` が失敗した時、the Discord Bot shall ロガーにエラーを記録し、ユーザーには「予定の削除に失敗しました」というエラー埋め込みでメッセージを更新する
4. The Discord Bot shall 削除成功時の応答メッセージにも実行ユーザーにのみ表示されるエフェメラル属性を維持する

### Requirement 7: 観測性とエラーハンドリング

**Objective:** 運用担当者として、削除操作のログとエラー追跡を行いたい。理由は、本番環境で問題が起きた際の原因特定とユーザーサポートに役立てるため。

#### Acceptance Criteria

1. The Discord Bot shall 削除成功時に `info` レベルでギルド ID、ユーザー ID、削除したイベント ID とイベント名を構造化ログとして残す
2. If 想定外の例外（ネットワーク・Supabase・Discord API 等）が発生した場合、the Discord Bot shall ロガーに `error` レベルで例外を記録し、ユーザーへの応答が破綻しないようインタラクションへフォールバック応答を返す
3. The Discord Bot shall 既存コマンド (`create`, `edit`, `list` 等) と同じ logger インスタンスとログ形式を使用する
