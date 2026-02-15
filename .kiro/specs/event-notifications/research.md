# Research & Design Decisions

## Summary
- **Feature**: `event-notifications`
- **Discovery Scope**: Extension（既存イベントフォーム・サービス層の拡張）
- **Key Findings**:
  - DB `events.notifications` JSONB カラムは既存。ユーザー通知設定と Bot 通知ログが同一カラムに共存する設計
  - V2 は通知設定を `{key, num, type}` の JSON 文字列配列として保存。Next.js 版ではネイティブ JSONB で型安全に管理
  - 新規外部依存なし。shadcn/ui の既存コンポーネント（Badge, Select, Input, Button）で UI を構成可能

## Research Log

### JSONB カラムのスキーマ設計
- **Context**: `events.notifications` カラムと `append_notification()` 関数の役割分担を明確化する必要
- **Sources Consulted**: `supabase/migrations/20260101212853_add_bot_settings_and_notifications.sql`, V2 bot コード (`refs/DisCalendarV2/bot/src/tasks/notify.rs`)
- **Findings**:
  - `append_notification()` の allowed_keys は `timestamp`, `status`, `error`（Bot が通知送信結果を記録する用途）
  - V2 のユーザー設定は `{key, num, type}` 構造（Web UI が直接 INSERT/UPDATE）
  - 同一カラムに異なる構造のオブジェクトが混在する可能性あり
- **Implications**:
  - Web UI は `num` フィールドを持つオブジェクトのみを「ユーザー通知設定」として扱う
  - Bot ログ（`timestamp`, `status`）はフィルタリングで除外
  - 将来的にカラム分離が望ましいが、現時点では V2 互換のアプローチを採用

### V2 通知設定の内部構造
- **Context**: V2 の `NotificationBtn.vue` と `NewEvent.vue` の実装パターン調査
- **Sources Consulted**: `refs/DisCalendarV2/web/components/buttons/NotificationBtn.vue`, `refs/DisCalendarV2/web/pages/dashboard/_id.vue`
- **Findings**:
  - V2 の単位は日本語文字列: `"週間前"`, `"日前"`, `"時間前"`, `"分前"`
  - `key` はインクリメンタルな number（0, 1, 2, ...）
  - 数値範囲: 1〜100（V2）、要件では 1〜99 に変更
  - 保存時に各通知を `JSON.stringify()` して文字列配列として送信
- **Implications**:
  - Next.js 版では単位を英語列挙型（`minutes`, `hours`, `days`, `weeks`）に変更し、表示ラベルのみ日本語化
  - `key` は `crypto.randomUUID()` で一意性を保証（V2 のインクリメンタル方式より堅牢）
  - JSONB ネイティブ保存により `JSON.stringify()` は不要

### 既存フォームのサブコンポーネントパターン
- **Context**: EventForm のフィールド構成パターンを把握
- **Sources Consulted**: `components/calendar/event-form.tsx`
- **Findings**:
  - 各フィールドはインライン定義のサブコンポーネント（`TitleField`, `DateTimeField`, `ColorField`, `LocationField`）
  - 共通パターン: `Label` + 入力コンポーネント + エラーメッセージ表示
  - `useEventForm` フックで状態・バリデーション・タッチ状態を一括管理
- **Implications**:
  - `NotificationField` は独立コンポーネントとして作成（複雑度が高く、既存サブコンポーネントより機能が多い）
  - 通知状態は `useEventForm` に統合し、既存パターンとの一貫性を維持

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| A: EventForm 内インライン | 既存サブコンポーネントと同じパターンで通知 UI を追加 | 追加ファイルなし、統一パターン | EventForm 肥大化、テスト困難 | 却下：通知 UI は他のフィールドより複雑 |
| B: 独立コンポーネント | `notification-field.tsx` として分離 | テスト・Storybook独立、関心分離 | ファイル数増加 | **採用**：複雑度に見合った分離 |

## Design Decisions

### Decision: 通知単位の内部表現
- **Context**: V2 は日本語文字列（`"時間前"` 等）を直接保存
- **Alternatives Considered**:
  1. V2 互換の日本語文字列を使用
  2. 英語列挙型（`minutes`, `hours`, `days`, `weeks`）を使用
- **Selected Approach**: 英語列挙型
- **Rationale**: 多言語対応の拡張性、コード内での可読性、Bot 側との連携で言語依存を排除
- **Trade-offs**: V2 との直接互換性は失われるが、データ移行スクリプトで対応可能
- **Follow-up**: Bot 側の通知処理コードが英語列挙型を解釈できるか確認

### Decision: 通知キーの生成方式
- **Context**: 各通知設定の一意識別子が必要
- **Alternatives Considered**:
  1. インクリメンタル number（V2 方式）
  2. `crypto.randomUUID()`
- **Selected Approach**: `crypto.randomUUID()`
- **Rationale**: 追加・削除の順序に依存しない一意性保証、React の `key` prop として直接使用可能
- **Trade-offs**: 文字列のため V2 の number key よりデータサイズが大きいが、最大 10 件のため無視できる

### Decision: NotificationField のコンポーネント分離
- **Context**: 通知設定 UI を EventForm 内のインラインか独立コンポーネントか
- **Selected Approach**: 独立コンポーネント `notification-field.tsx`
- **Rationale**: 通知追加・削除・バリデーション・チップ表示を含む複合 UI であり、単一フィールド（`TitleField` 等）より明らかに複雑。独立テスト・Storybook が可能
- **Trade-offs**: ファイル数は増えるが、保守性とテスタビリティが向上

## Risks & Mitigations
- **JSONB 混在リスク**: Bot ログとユーザー設定が同一カラムに共存 → `num` フィールドの有無でフィルタリング。将来的にカラム分離を検討
- **Bot 互換性リスク**: 英語列挙型への変更が Bot 処理に影響 → Bot 側で両形式に対応するマッピングを実装（本仕様のスコープ外）

## References
- V2 NotificationBtn: `refs/DisCalendarV2/web/components/buttons/NotificationBtn.vue`
- V2 NewEvent 統合: `refs/DisCalendarV2/web/pages/dashboard/_id.vue`
- DB Migration: `supabase/migrations/20260101212853_add_bot_settings_and_notifications.sql`
- shadcn/ui Badge: `components/ui/badge.tsx`
- shadcn/ui Select: `components/ui/select.tsx`
