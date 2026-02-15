# Requirements Document

## Introduction

V2（Nuxt.js版）で提供されていたイベント通知設定機能をNext.js版に移植する。ユーザーはイベントごとに最大10件の通知タイミングを設定でき、Discord Botが指定時間前にチャンネルへ通知を送信する。DBインフラ（`events.notifications` JSONBカラム、`event_settings`テーブル、`append_notification()`関数）は既に準備済みのため、UIコンポーネント・型定義・サービス層の実装が主な対象となる。

## Requirements

### Requirement 1: 通知設定UI

**Objective:** イベント作成者として、イベントに対して通知タイミングを視覚的に設定したい。予定の見逃しを防ぐため。

#### Acceptance Criteria

1. When ユーザーがイベントフォームを開いたとき, the EventForm shall 通知設定セクションを表示する
2. The 通知設定UI shall 数値入力（1〜99）と単位選択（分前・時間前・日前・週間前）の組み合わせで通知タイミングを指定できるインターフェースを提供する
3. When ユーザーが通知タイミングを入力して追加操作を行ったとき, the EventForm shall 設定済み通知をチップ（タグ）形式のリストとして表示する
4. When ユーザーがチップの削除ボタンを押したとき, the EventForm shall 該当通知をリストから削除する
5. While イベントに通知が10件設定されている間, the EventForm shall 新たな通知の追加を無効化し、上限に達している旨を表示する
6. If 数値が1未満または99を超える値が入力された場合, the EventForm shall バリデーションエラーを表示し追加を拒否する

### Requirement 2: 通知データの永続化

**Objective:** イベント作成者として、設定した通知タイミングがイベントと共に保存・復元されてほしい。設定が消えないようにするため。

#### Acceptance Criteria

1. When ユーザーが通知設定を含むイベントを保存したとき, the EventService shall 通知データを`events.notifications` JSONBカラムに永続化する
2. When 既存イベントを編集フォームで開いたとき, the EventForm shall 保存済みの通知設定をチップリストとして復元表示する
3. When ユーザーが既存イベントの通知設定を変更して保存したとき, the EventService shall 通知データを更新後の内容で上書き保存する
4. When ユーザーが全ての通知を削除して保存したとき, the EventService shall 通知データを空配列として保存する

### Requirement 3: 型定義とデータモデル

**Objective:** 開発者として、通知データに型安全な定義があってほしい。バグの混入を防ぎコード品質を維持するため。

#### Acceptance Criteria

1. The 型定義 shall 通知タイミングを表す型（数値・単位・一意キー）を提供する
2. The 型定義 shall 単位として「分前」「時間前」「日前」「週間前」の4種類を列挙型で定義する
3. The EventRecord型 shall `notifications`フィールドを含む
4. The CreateEventInput型およびUpdateEventInput型 shall オプショナルな`notifications`フィールドを含む

### Requirement 4: アクセシビリティ

**Objective:** 全てのユーザーとして、通知設定UIがキーボード操作やスクリーンリーダーで利用可能であってほしい。インクルーシブなユーザー体験を提供するため。

#### Acceptance Criteria

1. The 通知設定UI shall キーボードのみで通知の追加・削除操作を完了できる
2. The 通知チップ shall 各チップに適切なARIAラベル（通知内容を説明するテキスト）を持つ
3. The 通知設定セクション shall スクリーンリーダーが通知の件数と上限を読み上げられるよう適切なARIA属性を持つ
4. When 通知が追加または削除されたとき, the EventForm shall スクリーンリーダーに対して操作結果をライブリージョンで通知する

### Requirement 5: バリデーションとエラーハンドリング

**Objective:** イベント作成者として、無効な通知設定に対してわかりやすいフィードバックを受けたい。正しい設定を行うため。

#### Acceptance Criteria

1. If 同一の通知タイミング（同じ数値と単位の組み合わせ）が既に存在する場合, the EventForm shall 重複エラーを表示し追加を拒否する
2. If 通知データの保存に失敗した場合, the EventService shall エラーメッセージをユーザーに表示する
3. The EventForm shall 通知設定なし（0件）でもイベントを正常に保存できる
