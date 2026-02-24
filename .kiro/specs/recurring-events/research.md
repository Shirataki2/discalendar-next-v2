# Research & Design Decisions

## Summary
- **Feature**: `recurring-events`
- **Discovery Scope**: Extension（既存イベントシステムへの大規模拡張）
- **Key Findings**:
  - `rrule` npm パッケージは TypeScript 型定義内蔵、RRuleSet で EXDATE/EXRULE をネイティブサポート、`between()` で範囲指定展開が可能
  - 既存の EventService・EventForm・CalendarEvent 型は拡張可能な設計だが、繰り返し関連のフィールドが一切存在しない
  - シリーズ分割（this and following）はトランザクション処理が必須で、Supabase RPC または複数クエリの逐次実行が必要

## Research Log

### rrule npm パッケージの調査
- **Context**: RFC 5545 RRULE のパース・生成・展開ライブラリの選定
- **Sources Consulted**:
  - [rrule - npm](https://www.npmjs.com/package/rrule)
  - [GitHub - jkbrzt/rrule](https://github.com/jkbrzt/rrule)
- **Findings**:
  - TypeScript 型定義内蔵（`@types` 不要）
  - RRule クラス: `all()`, `between(start, end)`, `toString()`, `toText()`
  - RRuleSet クラス: `rrule()`, `rdate()`, `exrule()`, `exdate()` — EXDATE をネイティブサポート
  - `rrulestr()` パーサー: iCalendar 文字列から RRule/RRuleSet オブジェクトを生成
  - TZID サポート（Intl API ベース）
  - 3.7k stars、713 commits、活発にメンテナンス
  - 制限: `byeaster` 未実装（本プロジェクトでは不要）
- **Implications**:
  - フロントエンド側で RRULE 生成・展開・EXDATE 管理が完結する
  - サーバー側は RRULE 文字列の保存・取得のみ（バリデーションはフロントで実行）
  - RRuleSet を使用することで EXDATE をシリーズと一体管理できる

### 代替ライブラリの検討
- **Context**: rrule 以外の選択肢の評価
- **Sources Consulted**:
  - [simple-rrule - npm](https://www.npmjs.com/package/simple-rrule)
  - [rrule-temporal - npm](https://www.npmjs.com/package/rrule-temporal)
  - [rfc5545-rrule - npm](https://www.npmjs.com/package/rfc5545-rrule)
- **Findings**:
  - `simple-rrule`: 軽量だが EXDATE/RRuleSet 相当の機能が不明
  - `rrule-temporal`: Temporal API ベースで最新だが、ブラウザ互換性が不安定
  - `rfc5545-rrule`: コミュニティ規模が小さい
- **Implications**: `rrule` が最もエコシステムが成熟し、EXDATE サポートも明確。採用決定。

### 既存 EventService パターンの分析
- **Context**: 繰り返しイベント機能を既存アーキテクチャにどう統合するか
- **Findings**:
  - `createEventService(supabase)` ファクトリパターンで DI 対応済み
  - Result 型パターン `{ success: true; data: T } | { success: false; error: CalendarError }` が統一されている
  - `CalendarErrorCode` に `FETCH_FAILED`, `CREATE_FAILED`, `UPDATE_FAILED`, `DELETE_FAILED` 等が定義済み
  - `fetchEvents()` は `guildId + startDate + endDate` で範囲クエリ済み
  - Server Actions は `authorizeEventOperation()` で権限チェック → EventService 呼び出しのパターン
- **Implications**:
  - EventService に繰り返し関連メソッドを追加する方針が自然
  - 新しいエラーコード `SERIES_NOT_FOUND`, `RRULE_PARSE_ERROR` の追加が必要
  - fetchEvents() の内部で event_series クエリ + RRULE 展開を統合する

### CalendarEvent 型の拡張方針
- **Context**: 繰り返しイベントのオカレンスを既存の CalendarEvent 型で表現する方法
- **Findings**:
  - 現在の CalendarEvent は `id`, `title`, `start`, `end`, `allDay`, `color`, `description`, `location`, `channel`, `notifications`
  - react-big-calendar は Event 型に追加プロパティを許容する
  - オカレンスは「仮想イベント」として CalendarEvent に変換可能
- **Implications**:
  - CalendarEvent にオプショナルフィールドを追加: `seriesId`, `isRecurring`, `rruleSummary`, `originalDate`
  - 既存コードは新フィールドを無視するため後方互換

### EXDATE 管理パターン
- **Context**: 単一オカレンスの削除・編集時の例外管理方法
- **Findings**:
  - パターン A: event_series.exdates に TIMESTAMPTZ[] として保存
  - パターン B: 別テーブル event_exceptions で管理
  - パターン C: RRuleSet の exdate() メソッドで管理し、文字列として保存
- **Implications**:
  - パターン A を採用: シンプルで、RRuleSet.exdate() と 1:1 対応
  - 編集例外は events テーブルに `series_id` + `original_date` で例外レコードとして保存
  - 削除例外は exdates 配列で管理（レコード不要）

### トランザクション処理（シリーズ分割）
- **Context**: 「これ以降の予定」編集時のシリーズ分割のアトミック性
- **Findings**:
  - Supabase JS クライアントには明示的トランザクション API がない
  - 選択肢 1: Supabase RPC（PL/pgSQL 関数）で DB 側トランザクション
  - 選択肢 2: Server Action 内で逐次クエリ（エラー時は手動ロールバック）
  - 選択肢 3: Edge Function でトランザクション管理
- **Implications**:
  - 選択肢 2 を採用: 既存パターンとの整合性、追加インフラ不要
  - 分割は 2 ステップ: 1) 元シリーズの UNTIL 更新、2) 新シリーズ作成
  - エラー時は元シリーズの UNTIL を元に戻す補償トランザクションで対応

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| A: EventService 拡張のみ | 既存 EventService にメソッド追加 | 最小変更、パターン統一 | ファイル肥大化（600行→1200行超） | テスト複雑性増大 |
| B: RecurringEventService 新設 | 完全分離した新サービス | 責任分離、テスト独立 | fetchEvents 統合のオーケストレーション必要 | 新パターン導入コスト |
| **C: ハイブリッド（採用）** | rrule-utils 分離 + EventService 拡張 + 新型定義 | 純粋関数テスト容易、既存パターン尊重、適度な分離 | ファイル数増加（3-4個） | ギャップ分析での推奨と一致 |

## Design Decisions

### Decision: rrule npm パッケージの採用
- **Context**: RFC 5545 RRULE の生成・パース・展開ライブラリが必要
- **Alternatives Considered**:
  1. `rrule` — 最大エコシステム、TypeScript 内蔵、EXDATE サポート
  2. `simple-rrule` — 軽量だが機能不足の可能性
  3. 自前実装 — RFC 5545 の完全実装は非現実的
- **Selected Approach**: `rrule` パッケージ
- **Rationale**: EXDATE/RRuleSet サポート、TypeScript 型内蔵、3.7k stars の実績
- **Trade-offs**: バンドルサイズ増加（tree-shaking 可能）
- **Follow-up**: 初回実装時にパフォーマンスベンチマーク実施

### Decision: ハイブリッドアーキテクチャ
- **Context**: 繰り返しイベント機能を既存システムにどう統合するか
- **Selected Approach**: rrule-utils（純粋関数）+ EventService 拡張 + 型定義拡張
- **Rationale**: RRULE ロジックを純粋関数に分離しテスト容易性を確保しつつ、EventService のインターフェース統一を維持
- **Trade-offs**: ファイル数増加 vs テスト・保守性向上

### Decision: EXDATE を配列カラムで管理
- **Context**: 単一オカレンス削除時の例外情報の永続化方法
- **Selected Approach**: event_series テーブルの `exdates TIMESTAMPTZ[]` カラム
- **Rationale**: RRuleSet.exdate() と 1:1 対応、JOIN 不要でクエリがシンプル
- **Trade-offs**: 配列が肥大化する可能性（実用上は数十件程度で問題なし）

### Decision: 編集例外を events テーブルで管理
- **Context**: 単一オカレンス編集時の例外レコードの保存先
- **Selected Approach**: events テーブルに `series_id` + `original_date` カラムを追加し、例外レコードとして INSERT
- **Rationale**: 既存の CalendarEvent 型変換をそのまま利用可能、別テーブル不要
- **Trade-offs**: events テーブルの責務が若干拡大

### Decision: Server Action 内逐次クエリでシリーズ分割
- **Context**: 「これ以降の予定」編集時のアトミック性
- **Selected Approach**: Server Action 内で 2 ステップ実行 + 補償トランザクション
- **Rationale**: 既存パターンとの整合性、Supabase RPC 不要でシンプル
- **Trade-offs**: 厳密なアトミック性は保証されないが、補償ロジックで実用上十分

## Risks & Mitigations
- **大量オカレンス展開のパフォーマンス** — `between()` で表示範囲のみ展開、useMemo でメモ化
- **RRULE パースエラー** — try-catch でエラーをログ記録し、該当シリーズを空配列として扱う
- **シリーズ分割の非アトミック性** — 補償トランザクション（元シリーズの UNTIL 復元）で対応
- **events テーブルの後方互換** — `series_id` と `original_date` は NULL 許容で追加、既存データに影響なし

## References
- [rrule - npm](https://www.npmjs.com/package/rrule) — RFC 5545 RRULE ライブラリ
- [GitHub - jkbrzt/rrule](https://github.com/jkbrzt/rrule) — ソースコード・ドキュメント
- [RFC 5545 - Internet Calendaring and Scheduling](https://tools.ietf.org/html/rfc5545) — iCalendar 仕様
