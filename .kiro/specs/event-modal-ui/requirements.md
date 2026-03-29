# Requirements Document

## Introduction

Discord Botの `/create` および `/edit` コマンドにおけるイベント入力UIを、11個のスラッシュオプション方式からDiscordモーダル（TextInput フォーム）方式に移行する。これにより、直感的なフォーム入力体験を提供し、イベント作成・編集のUXを大幅に改善する。

**スコープ**: Phase 1（基本モーダル）のみ。色・通知設定やボタン/セレクトメニューによる拡張はPhase 2として別イシューで対応。

## Requirements

### Requirement 1: イベント作成モーダル表示

**Objective:** Discordユーザーとして、`/create` コマンド実行時にモーダルフォームが表示されることで、直感的にイベント情報を入力したい

#### Acceptance Criteria

1. When ユーザーが `/create` コマンドを実行した時, the Bot shall タイトル・説明・開始日時・終了日時・終日フラグの5つのフィールドを含むモーダルを表示する
2. The Bot shall モーダルのタイトルフィールドを必須入力（Short形式）として表示する
3. The Bot shall モーダルの説明フィールドを任意入力（Paragraph形式）として表示する
4. The Bot shall モーダルの開始日時フィールドにプレースホルダーとして入力フォーマット例（例: `2025/03/29 15:00`）を表示する
5. The Bot shall モーダルの終了日時フィールドにプレースホルダーとして入力フォーマット例を表示する
6. The Bot shall モーダルの終日フラグフィールドに入力方法の説明（例: `true` または `false`）をプレースホルダーとして表示する

### Requirement 2: イベント編集モーダル表示（プリフィル）

**Objective:** Discordユーザーとして、`/edit` コマンド実行時に既存イベントの値がプリフィルされたモーダルが表示されることで、変更箇所のみを修正したい

#### Acceptance Criteria

1. When ユーザーが `/edit` コマンドでイベントを指定して実行した時, the Bot shall 対象イベントの既存値をプリフィルしたモーダルを表示する
2. The Bot shall 編集モーダルに既存のタイトル・説明・開始日時・終了日時・終日フラグをプリフィルして表示する
3. If 指定されたイベントが存在しない場合, the Bot shall エラーメッセージをエフェメラルメッセージとして返信する

### Requirement 3: 日時テキストパース

**Objective:** Discordユーザーとして、柔軟な日時フォーマットでテキスト入力できることで、厳格なフォーマットを覚える負担なくイベントを作成・編集したい

#### Acceptance Criteria

1. The Bot shall `YYYY/MM/DD HH:mm` 形式の日時テキストを正しくパースする
2. The Bot shall `MM/DD HH:mm` 形式（年省略）の日時テキストを現在年として正しくパースする
3. The Bot shall `YYYY-MM-DD HH:mm` 形式（ハイフン区切り）の日時テキストを正しくパースする
4. If 日時テキストがいずれのサポート形式にも一致しない場合, the Bot shall パースエラーとして具体的なエラーメッセージを返す

### Requirement 4: 入力バリデーション

**Objective:** Discordユーザーとして、無効な入力に対して明確なエラーメッセージを受け取ることで、入力を修正して再試行したい

#### Acceptance Criteria

1. If タイトルが未入力の場合, the Bot shall タイトル必須のエラーメッセージをエフェメラルメッセージとして返信する
2. If 開始日時が無効なフォーマットの場合, the Bot shall 開始日時のフォーマットエラーメッセージをエフェメラルメッセージとして返信する
3. If 終了日時が無効なフォーマットの場合, the Bot shall 終了日時のフォーマットエラーメッセージをエフェメラルメッセージとして返信する
4. If 開始日時が終了日時以降の場合, the Bot shall 日時の前後関係エラーメッセージをエフェメラルメッセージとして返信する
5. If 終日フラグの値が `true` / `false` 以外の場合, the Bot shall 終日フラグのフォーマットエラーメッセージをエフェメラルメッセージとして返信する

### Requirement 5: イベント永続化

**Objective:** Discordユーザーとして、モーダルで入力した情報がSupabaseに正しく保存されることで、WebアプリやBot間でイベント情報が同期されるようにしたい

#### Acceptance Criteria

1. When モーダル送信でバリデーションが成功した時 and コマンドが `/create` の場合, the Bot shall Supabaseにイベントを新規作成する
2. When モーダル送信でバリデーションが成功した時 and コマンドが `/edit` の場合, the Bot shall Supabaseの既存イベントを更新する
3. If Supabaseへの保存が失敗した場合, the Bot shall 保存エラーメッセージをエフェメラルメッセージとして返信する

### Requirement 6: 結果フィードバック

**Objective:** Discordユーザーとして、イベント作成・更新後にイベント詳細を確認できることで、入力内容が正しく反映されたことを確認したい

#### Acceptance Criteria

1. When イベントの作成が成功した時, the Bot shall イベント詳細を含むEmbed形式の返信を表示する
2. When イベントの更新が成功した時, the Bot shall 更新後のイベント詳細を含むEmbed形式の返信を表示する
3. The Bot shall 結果Embedにタイトル・説明・開始日時・終了日時・終日フラグを含める

### Requirement 7: ModalSubmitInteractionハンドリング

**Objective:** Botとして、モーダル送信イベントを適切にルーティングすることで、作成と編集を正しく処理したい

#### Acceptance Criteria

1. The Bot shall `interactionCreate` イベントで `ModalSubmitInteraction` を処理するハンドラを登録する
2. The Bot shall モーダルの `customId` によって作成（`event-create`）と編集（`event-edit:{eventId}`）を識別する
3. If 不明な `customId` のモーダル送信を受信した場合, the Bot shall 処理をスキップする

### Requirement 8: 権限チェック

**Objective:** ギルド管理者として、制限付きギルドでの権限チェックがモーダル経由でも既存と同様に機能することで、セキュリティポリシーが維持されるようにしたい

#### Acceptance Criteria

1. While ギルドが制限付き（restricted）設定の場合, when ユーザーが `/create` をモーダル経由で実行した時, the Bot shall 既存のスラッシュオプション版と同じ権限チェックを適用する
2. While ギルドが制限付き（restricted）設定の場合, when ユーザーが `/edit` をモーダル経由で実行した時, the Bot shall 既存のスラッシュオプション版と同じ権限チェックを適用する

### Requirement 9: 後方互換性

**Objective:** 既存ユーザーとして、モーダルUI移行後も既存のスラッシュオプション方式が引き続き利用できることで、移行期間中の混乱を避けたい

#### Acceptance Criteria

1. The Bot shall 既存の `/create` コマンドのスラッシュオプション版を引き続き動作させる
2. The Bot shall 既存の `/edit` コマンドのスラッシュオプション版を引き続き動作させる

## Project Description (Input)

Bot: イベント作成・編集をモーダルUIに移行する

## 背景

現在のBotの `/create` コマンドは11個の必須オプション（名前、開始年/月/日/時/分、終了年/月/日/時/分）を一度に指定する必要があり、UXが非常に悪い。モーダルを使うことでフォーム形式の直感的な入力体験を提供する。

## 目的

`/create` と `/edit` コマンドでDiscordモーダル（TextInput）を使い、イベント情報をフォーム入力できるようにする。

## 制約

* Discordモーダルは **最大5つの ActionRow**（各1つのTextInput）のみサポート
* TextInputは Short（1行）または Paragraph（複数行）のみ。Integer/Select/Booleanは使用不可
* 日時入力はテキスト形式（例: `2025/03/29 15:00`）でパースする必要がある
* 色・通知設定はモーダルに収まらないため、作成後のボタン/セレクトメニューで対応するか、Phase 2として分離

## スコープ

### Phase 1: 基本モーダル（このイシュー）

* `/create` 実行 → モーダル表示（タイトル、説明、開始日時、終了日時、終日フラグ）
* `/edit <event>` 実行 → 既存値をプリフィルしたモーダル表示
* モーダルsubmit → バリデーション → Supabase保存 → 結果Embed返信
* interactionEvent ハンドラ（`interactionCreate` で `ModalSubmitInteraction` を処理）

### Phase 2: 拡張（別イシュー）

* 作成後にボタン/セレクトメニューで色・通知を設定
* 繰り返しイベント対応

## 技術メモ

* discord.js v14: `ModalBuilder`, `TextInputBuilder`, `ActionRowBuilder<TextInputBuilder>` を使用
* モーダルの customId で create/edit を識別（例: `event-create`, `event-edit:{eventId}`）
* 日時パースには柔軟なフォーマット対応が必要（`YYYY/MM/DD HH:mm`, `MM/DD HH:mm` 等）
* 既存の `/create` `/edit` コマンドのスラッシュオプション版は当面残し、モーダル版と並行運用

## 受け入れ条件

* [ ] `/create` コマンド実行時にモーダルが表示される
* [ ] モーダルに5つのフィールド（タイトル、説明、開始日時、終了日時、終日）が表示される
* [ ] 編集時（`/edit`）に既存イベントの値がモーダルにプリフィルされる
* [ ] モーダル送信時に日時文字列が正しくパースされる
* [ ] 無効な日時入力に対してエラーメッセージが返される
* [ ] 開始日時 >= 終了日時の場合にバリデーションエラーが返される
* [ ] 正常な入力でSupabaseにイベントが作成/更新される
* [ ] 作成/更新後にイベント詳細のEmbed返信が表示される
* [ ] `ModalSubmitInteraction` ハンドラが `interactionCreate` イベントに登録されている
* [ ] 権限チェック（restricted guild）が既存と同様に動作する
* [ ] 既存のスラッシュオプション版コマンドが引き続き動作する（並行運用）

## 参考

* [https://discordjs.guide/interactions/modals.html](<https://discordjs.guide/interactions/modals.html>)
* discord.js: ModalBuilder, TextInputBuilder, ActionRowBuilder

## Metadata
* URL: [https://linear.app/ff2345/issue/DIS-138/bot-イベント作成編集をモーダルuiに移行する](https://linear.app/ff2345/issue/DIS-138/bot-イベント作成編集をモーダルuiに移行する)
* Identifier: DIS-138
* Status: Backlog
* Priority: Medium
* Assignee: Tomoya Ishii
* Labels: Bot, Feature
* Created: 2026-03-28T17:08:11.063Z
* Updated: 2026-03-28T17:11:32.217Z

## Sub-issues

* [DIS-139 モーダルビルダーと日時パーサーのユーティリティを実装](https://linear.app/ff2345/issue/DIS-139/モーダルビルダーと日時パーサーのユーティリティを実装)
* [DIS-140 /create コマンドをモーダル表示に対応させる](https://linear.app/ff2345/issue/DIS-140/create-コマンドをモーダル表示に対応させる)
* [DIS-141 /edit コマンドをモーダル表示（プリフィル付き）に対応させる](https://linear.app/ff2345/issue/DIS-141/edit-コマンドをモーダル表示プリフィル付きに対応させる)
* [DIS-142 ModalSubmitInteraction ハンドラを実装し interactionCreate に登録](https://linear.app/ff2345/issue/DIS-142/modalsubmitinteraction-ハンドラを実装し-interactioncreate-に登録)
