# Research & Design Decisions

## Summary
- **Feature**: `notification-dedup`
- **Discovery Scope**: Extension（既存通知システムへの重複防止機構追加）
- **Key Findings**:
  - `checkEventNotifications`が唯一の送信エントリポイント。ここにガードを追加すれば全通知をカバーできる
  - 繰り返しイベントのIDは `series:{id}:occ:{ISO日時}` 形式で、notification_keyと組み合わせれば一意に識別可能
  - BotはSupabase service_role keyを使用しているためRLSバイパス。新テーブルにRLSポリシーは不要

## Research Log

### 既存通知フローの分析
- **Context**: 重複防止の挿入ポイントを特定するため、`notify.ts`の処理フローを調査
- **Findings**:
  - `processNotifications`（L67-151）: 1分間隔で全ギルドのイベント・シリーズを取得し、各イベントに対して`checkEventNotifications`を呼び出す
  - `checkEventNotifications`（L218-268）: イベントの通知設定を走査し、現在時刻と通知時刻の差が1分未満なら`channel.send()`で送信
  - `processSeriesNotifications`（L161-216）: 繰り返しイベントを展開し、各オカレンスを`toEventRecord`で擬似EventRecordに変換して`checkEventNotifications`に渡す
  - `SENTINEL_NOTIFICATION`（key: `__start__`）: イベント開始時刻の通知。通常の通知と同じフローで処理される
- **Implications**: `checkEventNotifications`内、`channel.send()`の前にガードを追加すれば、全通知パス（単発・繰り返し・センチネル）を一箇所でカバーできる

### イベントIDの一意性
- **Context**: 送信済みレコードのキー設計に必要な識別子の調査
- **Findings**:
  - 単発イベント: `event.id`はUUID（DBのPK）
  - 繰り返しオカレンス: `series:{series_id}:occ:{ISO日時}` 形式（`toEventRecord` L43-65で生成）
  - 通知タイプ: `NotificationPayload.key`で識別（例: `"30m"`, `"1h"`, `"__start__"`）
  - `(event_id, guild_id, notification_key)` の3カラムで全通知を一意に識別可能
- **Implications**: ユニーク制約はこの3カラムの複合キーで設定

### Supabaseアクセスパターン
- **Context**: 新サービスの設計パターンを既存コードから抽出
- **Findings**:
  - 全サービスが`getSupabaseClient()`でシングルトンクライアントを取得
  - `ServiceResult<T>`パターンで統一（`{ success: true, data } | { success: false, error }`）
  - エラーは`classifySupabaseError()`で分類
  - service_role keyによりRLSバイパス
- **Implications**: 新しい`sent-notification-service.ts`も同じパターンに従う

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| DB永続化 + 送信前チェック | sent_notificationsテーブルにUPSERTし、重複をDBレベルで防止 | 再起動耐性あり、べき等性保証 | DB負荷増（通知ごとに1クエリ追加） | 採用。要件と一致 |
| メモリ内Set | プロセス内Setで送信済みを管理 | 高速、DB負荷なし | 再起動で消失、要件を満たさない | 不採用 |
| Redis/外部キャッシュ | TTL付きキーで管理 | 高速 + 永続性 | インフラ追加コスト | 現規模では過剰 |

## Design Decisions

### Decision: DB永続化方式
- **Context**: Bot再起動後も送信済み状態を保持する必要がある（Requirement 1, 2）
- **Alternatives Considered**:
  1. メモリ内Set — 再起動で消失するため不適格
  2. Redis — 永続性あるがインフラ追加が必要
  3. Supabaseテーブル — 既存インフラ内で完結
- **Selected Approach**: Supabase `sent_notifications`テーブル
- **Rationale**: 既存のSupabaseインフラを活用でき、service_role keyでアクセス可能。通知頻度（1分間隔）に対してDB負荷は十分許容範囲
- **Trade-offs**: 通知ごとにDB問い合わせが発生するが、バッチクエリで軽減可能
- **Follow-up**: 通知数が大幅に増加した場合、バッチチェックの最適化を検討

### Decision: クリーンアップ方式
- **Context**: 送信済みレコードの無限蓄積を防ぐ（Requirement 3）
- **Alternatives Considered**:
  1. Bot起動時に一回クリーンアップ — 長期間起動し続けると蓄積
  2. 通知チェックサイクル内で定期実行 — 毎分は過剰
  3. 別タイマーで定期実行 — 柔軟だがタイマー管理が増える
- **Selected Approach**: 通知処理サイクルの最後に、一定間隔（1時間ごと）でクリーンアップ実行
- **Rationale**: 追加のタイマー不要、既存の`processNotifications`内で管理できる
- **Trade-offs**: クリーンアップタイミングが通知処理に依存する
- **Follow-up**: なし

### Decision: 送信前チェックの粒度
- **Context**: 個別チェック vs バッチチェック
- **Selected Approach**: `checkEventNotifications`内でイベント単位でバッチチェック（1イベントの全通知キーを一括確認）
- **Rationale**: 通知設定は通常1-3件程度。イベントごとに1クエリで十分
- **Follow-up**: なし

## Risks & Mitigations
- **DB負荷増加**: 通知ごとにSELECT+INSERTが追加される → バッチクエリで軽減。現規模（数百イベント）では問題なし
- **レースコンディション**: 複数Botインスタンスが同時送信 → UNIQUEの制約でDBレベルで防止。DUPLICATE errorは送信済みとして扱う
- **クリーンアップ漏れ**: クリーンアップが失敗しても通知処理は継続 → エラーログのみ、致命的でない

## References
- Supabase UPSERT: `onConflict`オプションで既存レコードを無視可能
- 既存パターン: `packages/bot/src/services/event-service.ts`（ServiceResultパターン）
