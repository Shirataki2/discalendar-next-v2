# Requirements Document

## Project Description (Input)
RFC 5545 RRULE準拠の繰り返しイベント機能

### 背景

競合の類似アプリにある機能であり、予定管理として必須の機能。

### 目的

Discordコミュニティのカレンダーで、毎日/毎週/毎月などの繰り返しイベントを作成・管理できるようにする。RFC 5545 RRULE規格に準拠し、将来的なiCalエクスポートにも対応可能な基盤を構築する。

### 作業内容

* `event_series` テーブル追加（RRULEルール保存）
* `rrule.js` ライブラリでオカレンス展開
* 設計案は `feature-expansion-plan.md` 8.1節に記載

### 受け入れ条件

- [ ] 毎日/毎週/毎月/毎年の基本繰り返しパターンでイベントを作成できる
- [ ] カスタム繰り返し（例: 毎週火・木、第2水曜日）を設定できる
- [ ] 繰り返しの終了条件（回数指定 / 日付指定 / 無期限）を設定できる
- [ ] カレンダー上に繰り返しイベントが正しく展開・表示される
- [ ] 単一オカレンスの編集・削除ができる（this occurrence）
- [ ] シリーズ全体の編集・削除ができる（all occurrences）
- [ ] 以降のオカレンスの編集・削除ができる（this and following）
- [ ] `event_series` テーブルがRRULE文字列を保存し、クエリ時に動的展開する
- [ ] 既存の単発イベントCRUDに影響がない

### 技術メモ

* `rrule.js` ライブラリの採用を検討（RFC 5545準拠のRRULEパーサー）
* パフォーマンス考慮: 表示範囲のオカレンスのみを展開（無限展開しない）
* 例外日（EXDATE）の管理方法を設計時に決定

### Metadata
- URL: [https://linear.app/ff2345/issue/DIS-15/rfc-5545-rrule準拠の繰り返しイベント機能を実装する](https://linear.app/ff2345/issue/DIS-15/rfc-5545-rrule準拠の繰り返しイベント機能を実装する)
- Identifier: DIS-15
- Status: Todo
- Priority: Medium
- Assignee: Tomoya Ishii
- Labels: Feature
- Project: [繰り返しイベント（RRULE）](https://linear.app/ff2345/project/繰り返しイベントrrule-fc8dd3e01b25). RFC 5545 RRULE準拠の繰り返しイベント機能。DBスキーマ・バックエンド・UI・編集パターンを段階的に実装する。
- Created: 2026-02-20T07:51:52.416Z
- Updated: 2026-02-22T14:52:11.795Z

### Sub-issues

- [DIS-41 event_seriesテーブルとRRULEスキーマを設計・作成する](https://linear.app/ff2345/issue/DIS-41/event-seriesテーブルとrruleスキーマを設計作成する)
- [DIS-42 rrule.jsを統合しオカレンス展開ロジックを実装する](https://linear.app/ff2345/issue/DIS-42/rrulejsを統合しオカレンス展開ロジックを実装する)
- [DIS-43 繰り返しイベント作成UIを実装する](https://linear.app/ff2345/issue/DIS-43/繰り返しイベント作成uiを実装する)
- [DIS-44 カレンダー上の繰り返しイベント表示を実装する](https://linear.app/ff2345/issue/DIS-44/カレンダー上の繰り返しイベント表示を実装する)
- [DIS-45 繰り返しイベントの編集・削除パターンを実装する](https://linear.app/ff2345/issue/DIS-45/繰り返しイベントの編集削除パターンを実装する)

## Introduction

本ドキュメントは、DiscalendarにRFC 5545 RRULE準拠の繰り返しイベント機能を追加するための要件を定義する。既存の単発イベントCRUD機能（`events`テーブル、`EventService`）を基盤として、繰り返しルールの定義・オカレンス展開・個別/一括編集パターンを実現する。

## Requirements

### Requirement 1: 繰り返しイベントシリーズの作成

**Objective:** ギルドメンバーとして、定期的な予定を繰り返しイベントとして一度に登録したい。これにより、毎回手動で同じ予定を作成する手間が省ける。

#### Acceptance Criteria

1. When ユーザーがイベント作成フォームで繰り返し設定を有効にする, the Calendar System shall 繰り返し頻度（毎日・毎週・毎月・毎年）の選択UIを表示する
2. When ユーザーが繰り返し頻度を選択する, the Calendar System shall 選択した頻度に対応するRFC 5545準拠のRRULE文字列を生成する
3. When ユーザーが繰り返しイベントの保存ボタンをクリックする, the Calendar System shall イベントシリーズをRRULEルールとともにデータベースに永続化する
4. When 繰り返しイベントが保存される, the Calendar System shall カレンダー上にオカレンスを展開して表示する
5. The Calendar System shall 繰り返し設定を無効のままイベントを保存した場合、既存の単発イベントと同じ動作を維持する

### Requirement 2: カスタム繰り返しルールの設定

**Objective:** ギルドメンバーとして、「毎週火・木」や「毎月第2水曜日」のような柔軟な繰り返しパターンを指定したい。これにより、不定期な定例予定にも対応できる。

#### Acceptance Criteria

1. When ユーザーが「毎週」頻度を選択する, the Calendar System shall 繰り返す曜日を複数選択できるUIを表示する
2. When ユーザーが「毎月」頻度を選択する, the Calendar System shall 日付指定（例: 毎月15日）またはn番目の曜日指定（例: 第2水曜日）を選択できるUIを表示する
3. When ユーザーが繰り返し間隔を指定する, the Calendar System shall 指定された間隔（例: 2週間ごと、3ヶ月ごと）でRRULEを生成する
4. The Calendar System shall カスタム設定を含むすべての繰り返しルールをRFC 5545 RRULE形式で保存する

### Requirement 3: 繰り返し終了条件の設定

**Objective:** ギルドメンバーとして、繰り返しの終了条件を柔軟に指定したい。これにより、期間限定の定例イベントも永続的なイベントも管理できる。

#### Acceptance Criteria

1. When ユーザーが繰り返し設定を有効にする, the Calendar System shall 終了条件の選択UI（無期限・回数指定・日付指定）を表示する
2. When ユーザーが「回数指定」を選択して回数を入力する, the Calendar System shall RRULE COUNTパラメータを設定する
3. When ユーザーが「日付指定」を選択して終了日を入力する, the Calendar System shall RRULE UNTILパラメータを設定する
4. When ユーザーが「無期限」を選択する, the Calendar System shall COUNTおよびUNTILパラメータなしのRRULEを生成する
5. If ユーザーが回数に0以下の値を入力する, then the Calendar System shall バリデーションエラーを表示し保存を中止する
6. If ユーザーが終了日にイベント開始日より前の日付を指定する, then the Calendar System shall バリデーションエラーを表示し保存を中止する

### Requirement 4: オカレンス展開とカレンダー表示

**Objective:** ギルドメンバーとして、繰り返しイベントの各オカレンスがカレンダー上に正しく表示されることを期待する。これにより、予定を一目で把握できる。

#### Acceptance Criteria

1. When カレンダーの表示範囲が変更される, the Calendar System shall 表示範囲内のオカレンスのみを動的に展開して表示する
2. The Calendar System shall 繰り返しイベントのオカレンスを単発イベントと視覚的に区別できるインジケーターを表示する
3. When ユーザーが繰り返しイベントのオカレンスをクリックする, the Calendar System shall プレビューに繰り返しルールの概要（例: 「毎週火曜日」）を表示する
4. The Calendar System shall 単発イベントと繰り返しイベントのオカレンスを同一のカレンダービュー上に混在表示する
5. While カレンダーに大量のオカレンスが存在する, the Calendar System shall 表示範囲外のオカレンスを展開せずパフォーマンスを維持する

### Requirement 5: 単一オカレンスの編集・削除

**Objective:** ギルドメンバーとして、繰り返しイベントの特定の回だけを変更・キャンセルしたい。これにより、例外的な予定変更に対応できる。

#### Acceptance Criteria

1. When ユーザーが繰り返しイベントのオカレンスで編集を選択する, the Calendar System shall 編集対象の選択ダイアログ（この予定のみ / すべての予定 / これ以降の予定）を表示する
2. When ユーザーが「この予定のみ」を選択して編集する, the Calendar System shall 該当オカレンスの変更内容を例外（exception）として保存し、シリーズの他のオカレンスに影響しない
3. When ユーザーが繰り返しイベントのオカレンスで削除を選択する, the Calendar System shall 削除対象の選択ダイアログ（この予定のみ / すべての予定 / これ以降の予定）を表示する
4. When ユーザーが「この予定のみ」の削除を確認する, the Calendar System shall 該当日をEXDATEとしてシリーズに記録し、そのオカレンスをカレンダーから除去する

### Requirement 6: シリーズ全体の編集・削除

**Objective:** ギルドメンバーとして、繰り返しイベント全体の設定を一括で変更・削除したい。これにより、定例会議の時間変更などを効率的に行える。

#### Acceptance Criteria

1. When ユーザーが「すべての予定」を選択して編集する, the Calendar System shall シリーズのマスターイベント情報（タイトル・時刻・説明等）を更新し、すべてのオカレンスに反映する
2. When ユーザーが「すべての予定」を選択して繰り返しルール自体を変更する, the Calendar System shall RRULEを更新し、オカレンスの展開結果を再計算する
3. When ユーザーが「すべての予定」の削除を確認する, the Calendar System shall イベントシリーズ全体と関連する例外データを完全に削除する
4. When シリーズ全体が編集される, the Calendar System shall 個別オカレンスの例外（exception）をリセットするかどうかの確認を表示する

### Requirement 7: これ以降のオカレンスの編集・削除

**Objective:** ギルドメンバーとして、特定の日付以降の繰り返しイベントだけを変更・削除したい。これにより、途中からのルール変更に柔軟に対応できる。

#### Acceptance Criteria

1. When ユーザーが「これ以降の予定」を選択して編集する, the Calendar System shall 元のシリーズを選択日の前日で終了させ、新しいルールのシリーズを選択日から作成する（シリーズ分割）
2. When ユーザーが「これ以降の予定」の削除を確認する, the Calendar System shall 元のシリーズのRRULEにUNTILパラメータを設定し、選択日以降のオカレンスを生成しない
3. When シリーズが分割される, the Calendar System shall 分割後の各シリーズが独立して編集・削除可能であることを保証する

### Requirement 8: データ永続化とRRULE管理

**Objective:** システムとして、繰り返しルールをRFC 5545準拠の形式で永続化し、一貫性のあるオカレンス展開を保証する。

#### Acceptance Criteria

1. The Calendar System shall 繰り返しルールをRFC 5545 RRULE文字列形式でデータベースに保存する
2. The Calendar System shall オカレンスの例外情報（日時変更・削除）をイベントシリーズに関連付けて保存する
3. The Calendar System shall RRULE文字列からオカレンスを展開する際、指定された日付範囲内の結果のみを返す
4. If データベースに不正なRRULE文字列が保存されている, then the Calendar System shall パースエラーをログに記録し、該当シリーズのオカレンスを空として扱う
5. The Calendar System shall イベントシリーズの作成・更新・削除操作にResult型パターンを適用し、エラー情報を呼び出し元に返す

### Requirement 9: 既存機能との互換性

**Objective:** システムとして、繰り返しイベント機能の追加が既存の単発イベントCRUD機能に影響しないことを保証する。

#### Acceptance Criteria

1. The Calendar System shall 既存の単発イベントの作成・取得・更新・削除の動作を変更しない
2. The Calendar System shall 既存の`events`テーブルのスキーマとRLSポリシーを破壊的に変更しない
3. When カレンダーの表示範囲のイベントを取得する, the Calendar System shall 単発イベントと繰り返しイベントのオカレンスを統合した結果を返す
4. The Calendar System shall 繰り返しイベントのオカレンスが既存のイベントプレビュー・編集ダイアログのUI構造と整合する形式で提供される
