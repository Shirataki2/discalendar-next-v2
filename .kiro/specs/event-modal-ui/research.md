# Research & Design Decisions

## Summary
- **Feature**: `event-modal-ui`
- **Discovery Scope**: Extension（既存Bot コマンドへのModal UI追加）
- **Key Findings**:
  - discord.js v14 の `ModalBuilder` / `TextInputBuilder` は安定しており、`setValue()` でプリフィル値の設定が可能
  - `showModal()` は interaction への最初のレスポンスとして呼ぶ必要がある（`deferReply()` の後には呼べない）
  - Discordモーダルは最大5つの `ActionRow`（各1つの `TextInput`）のみサポート

## Research Log

### discord.js Modal API の制約と使用パターン

- **Context**: `/create` と `/edit` コマンドでモーダルを表示するために、discord.js v14 のModal APIの仕様を確認
- **Sources Consulted**:
  - discord.js Guide: https://discordjs.guide/interactions/modals.html
  - discord.js v14.25.1 API Docs: `ModalBuilder`, `TextInputBuilder`, `APITextInputComponent`
- **Findings**:
  - `ModalBuilder`: `setCustomId()`, `setTitle()`, `addComponents()` でモーダルを構築
  - `TextInputBuilder`: `setCustomId()`, `setLabel()`, `setStyle()`, `setPlaceholder()`, `setRequired()`, `setMinLength()`, `setMaxLength()`, `setValue()` が利用可能
  - `TextInputStyle.Short`（1行）と `TextInputStyle.Paragraph`（複数行）の2種類
  - `interaction.showModal(modal)` でモーダルを表示
  - `interaction.isModalSubmit()` で `ModalSubmitInteraction` を判別
  - `interaction.fields.getTextInputValue('customId')` で入力値を取得
  - モーダルは最大5つの `ActionRow` を持てる（各1つの `TextInput`）
- **Implications**:
  - 5フィールド制限はPhase 1のスコープ（タイトル、説明、開始日時、終了日時、終日フラグ）に合致
  - `setValue()` でプリフィル可能なので、編集モーダルは既存値をセットできる
  - 色・通知はモーダルに収まらないためPhase 2（別イシュー）で対応する判断は妥当

### showModal() と deferReply() の排他性

- **Context**: 既存の `/edit` コマンドは `interaction.deferReply()` を最初に呼んでいるが、モーダル表示と両立できるか確認
- **Sources Consulted**: discord.js Guide, Discord API ドキュメント
- **Findings**:
  - `showModal()` は interaction に対する最初のレスポンスである必要がある
  - `deferReply()` を呼んだ後に `showModal()` を呼ぶことはできない（Discord APIの仕様）
  - `showModal()` の後は `ModalSubmitInteraction` として新しい interaction が発生する
- **Implications**:
  - `/edit` コマンドのフロー変更が必要: `deferReply()` の前にイベント検索・モーダル表示を行う
  - イベント検索の遅延（Supabase呼び出し）が3秒のinteractionタイムアウト内に収まる必要がある（通常は問題なし）
  - モーダル版では `deferReply()` を呼ばず、`showModal()` を直接呼ぶ

### 日時テキストパーサーの要件

- **Context**: モーダルの TextInput はテキスト入力のみ。日時を文字列としてパースする必要がある
- **Sources Consulted**: 既存の `utils/datetime.ts`、要件定義
- **Findings**:
  - 既存の `validateDate()` は `{ year, month, day, hour?, minute? }` オブジェクトを受け取る
  - テキスト文字列 → DateTimeパーツへの変換関数が存在しない
  - サポートすべきフォーマット: `YYYY/MM/DD HH:mm`, `MM/DD HH:mm`, `YYYY-MM-DD HH:mm`
  - 年省略時は現在年をデフォルトとする
- **Implications**:
  - `parseDateTimeText()` 関数を `utils/datetime.ts` に追加する必要あり
  - 正規表現ベースのパーサーで十分（外部ライブラリ不要）
  - パース結果は既存の `DateTimeParts` 型に統合できる

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| A: 既存コマンド拡張 | create.ts/edit.ts 内でモーダル表示を追加 | 最小限の新規ファイル | ビジネスロジック重複、ファイル肥大化 | 後方互換性は容易 |
| B: モーダル専用モジュール | handlers/modal-submit.ts + utils/modal.ts を新規作成 | 関心分離が明確 | ビジネスロジック共通化が必要 | テスト容易性が高い |
| C: ハイブリッド | コマンドでモーダル表示 + ハンドラで送信処理 | バランスが良い | やや複雑 | サブイシュー構成と整合 |

## Design Decisions

### Decision: ハイブリッドアプローチ（Option C）の採用

- **Context**: モーダル表示はコマンド execute 内で行う必要があるが、ModalSubmit 処理は別の interaction として届く
- **Alternatives Considered**:
  1. Option A — 全てコマンドファイル内に実装
  2. Option B — 完全に独立したモジュール
  3. Option C — コマンド側でモーダル表示、ハンドラ側で送信処理
- **Selected Approach**: Option C — discord.jsの仕組み上、モーダル表示（コマンド interaction）とモーダル送信（ModalSubmit interaction）は異なるイベントとして到着するため、自然な分離
- **Rationale**: コマンドの `execute` 内で `showModal()` を呼ぶのは discord.js の設計に沿っている。ModalSubmit の処理は別の interaction ハンドラで受け取るのが正しいパターン
- **Trade-offs**: ファイル数は増えるが、責務が明確でテストしやすい
- **Follow-up**: 既存コマンドのスラッシュオプション版との並行運用パス

### Decision: customId によるモーダルルーティング

- **Context**: ModalSubmitInteraction を作成と編集で区別する仕組みが必要
- **Selected Approach**: `event-create` と `event-edit:{eventId}` のcustomIdパターンを使用
- **Rationale**: customId にイベントIDを埋め込むことで、ModalSubmit 時にDBへの追加クエリなしで対象イベントを特定できる
- **Trade-offs**: customId の最大長は100文字。UUIDのイベントIDを含めても十分な余裕がある

### Decision: 外部ライブラリ不使用の日時パーサー

- **Context**: モーダルのテキスト入力から日時をパースする必要がある
- **Selected Approach**: 正規表現ベースの自前パーサー
- **Rationale**: サポートフォーマットが3種類と限定的。date-fns等の `parse` を使うほどではなく、既存の `validateDate` と統合しやすい
- **Trade-offs**: 将来フォーマット追加時は正規表現を追加する必要があるが、現時点では最もシンプル

## Risks & Mitigations

- **DB遅延によるinteractionタイムアウト**: `/edit` でイベント検索後に `showModal()` を呼ぶため、3秒以内に完了する必要がある → Supabase呼び出しは通常100ms以下なのでリスクは低い
- **日時パースのエッジケース**: 年跨ぎ時の年推定（12月に「1/1 00:00」と入力）→ Phase 1では現在年固定とし、必要に応じて改善
- **既存テストへの影響**: `/create` と `/edit` の execute 関数を変更するため既存テストの更新が必要 → テスト変更は最小限に抑える設計

## References

- [discord.js Guide - Modals](https://discordjs.guide/interactions/modals.html) — モーダルの作成と処理の公式ガイド
- [discord.js v14 API - ModalBuilder](https://discord.js.org/docs/packages/discord.js/14.25.1) — ModalBuilder, TextInputBuilder の型定義
- [Discord API - Text Input](https://discord.com/developers/docs/components/reference#text-input) — TextInput コンポーネントの仕様
