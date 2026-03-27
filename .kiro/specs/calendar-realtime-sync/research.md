# Research & Design Decisions

---
**Purpose**: Supabase Realtimeカレンダー同期機能の設計調査ログ
---

## Summary
- **Feature**: `calendar-realtime-sync`
- **Discovery Scope**: Complex Integration（既存カレンダーシステムへのRealtime統合）
- **Key Findings**:
  - DELETEイベントはサーバーサイドフィルタ不可 — クライアント側guild_idチェック必須
  - REPLICA IDENTITY FULLが未設定 — DELETE/UPDATEでold recordを取得するにはマイグレーション必要
  - 楽観的更新はドラッグ&ドロップのみ実装済み — 他ミューテーションは手動リフェッチ

## Research Log

### Supabase Realtime Postgres Changes API
- **Context**: Realtimeサブスクリプションの正確なAPI仕様の確認
- **Sources Consulted**: [Supabase公式ドキュメント](https://supabase.com/docs/guides/realtime/postgres-changes)
- **Findings**:
  - `supabase.channel('name').on('postgres_changes', { event, schema, table, filter }, callback).subscribe()` でテーブル変更を購読
  - `filter`パラメータで`eq`, `neq`, `lt`, `gt`, `in`等のサーバーサイドフィルタ可能（例: `guild_id=eq.xxx`）
  - **DELETEイベントはフィルタ不可** — 全DELETEが配信される
  - ペイロード: INSERT → `payload.new`, UPDATE → `payload.new` + `payload.old`, DELETE → `payload.old`（REPLICA IDENTITY FULL設定時のみ）
  - RLS有効 + REPLICA IDENTITY FULLの場合、DELETEの`old`にはプライマリキーのみ含まれる
  - チャネル名は`'realtime'`以外の任意文字列
  - `in`フィルタは最大100値
- **Implications**:
  - eventsとevent_seriesの`guild_id`フィルタはINSERT/UPDATEに有効だがDELETEには効かない
  - DELETEはクライアント側でguild_idを検証する必要がある
  - REPLICA IDENTITY FULLのマイグレーションが必要

### DELETEイベントのold record取得
- **Context**: DELETE時に削除されたレコードのguild_idを検証する方法
- **Sources Consulted**: Supabase公式ドキュメント、PostgreSQL REPLICA IDENTITY
- **Findings**:
  - デフォルトのREPLICA IDENTITYではDELETEのpayload.oldにはPKのみ含まれる
  - `ALTER TABLE xxx REPLICA IDENTITY FULL` で全カラムが含まれるようになる
  - RLS有効テーブルでは、REPLICA IDENTITY FULLでもDELETEの`old`にPKのみの制約がある
  - 代替案: DELETEイベント受信時に、ローカルstateからidで検索してguild_idを確認
- **Implications**:
  - RLS制約によりREPLICA IDENTITY FULLでもDELETEのold recordが制限される可能性
  - ローカルstate参照によるguild_idフィルタが最も確実なアプローチ

### 楽観的UI更新との競合解消
- **Context**: ローカル楽観的更新とRealtimeイベントが同一エンティティに到達した場合の処理
- **Sources Consulted**: [Medium - Scalable Real-Time Systems](https://medium.com/@ansh91627/building-scalable-real-time-systems-a-deep-dive-into-supabase-realtime-architecture-and-eccb01852f2b)
- **Findings**:
  - 一般的パターン: ミューテーション進行中のエンティティIDを追跡し、Realtimeイベントを保留
  - ミューテーション完了後に保留イベントを適用 or フルリフェッチ
  - `updated_at`タイムスタンプで新しいデータのみ適用する戦略も有効
  - CRDTは本ユースケースには過剰（単一DB、Last-Write-Winsで十分）
- **Implications**:
  - 「進行中ミューテーションSet」でRealtime更新を保留するパターンを採用
  - ミューテーション完了後はフルリフェッチで最新状態を保証

### 既存コードベースの状態管理パターン
- **Context**: Realtimeイベントをどのレイヤーで処理すべきか
- **Sources Consulted**: コードベース調査
- **Findings**:
  - CalendarContainerが全状態を`useCalendarState()`で管理（純粋React hooks）
  - Context API / Zustand / Jotai等の外部状態管理なし
  - `actions.setEvents()`で直接state更新可能
  - `actions.completeFetchingSuccess()`はisLoading制御付き
  - AbortControllerパターンでリクエストキャンセル対応済み
- **Implications**:
  - 新規カスタムフックをCalendarContainerレベルで統合するのが最も自然
  - 既存の`actions`インターフェースを活用してstate更新可能
  - 外部状態管理の導入は不要

### event_seriesのRealtime更新の複雑性
- **Context**: event_seriesの変更がカレンダー表示に与える影響
- **Sources Consulted**: コードベース調査（event-service.ts）
- **Findings**:
  - event_seriesの変更は単純なレコード差し替えでは処理できない
  - RRULE展開（occurrence expansion）がクライアント側で必要
  - 現在の`fetchEventsWithSeries`は3クエリ（単発 + シリーズ + 例外）を実行
  - event_seriesの変更時はRRULE再展開が必要
- **Implications**:
  - event_seriesのINSERT/UPDATE/DELETEはフルリフェッチで処理するのが安全
  - 単発events（series_id IS NULL）のみ差分更新が現実的

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| カスタムフック + 差分更新 | 単発eventsは差分更新、event_seriesはリフェッチ | 高レスポンス、帯域効率 | 差分ロジックの複雑性 | 推奨 |
| フルリフェッチトリガー | 全RealtimeイベントでfetchEvents()を発火 | 実装シンプル、正確性保証 | 不要なAPI呼び出し、レイテンシ | 代替案 |
| RxDB/SignalDB統合 | 外部ライブラリでオフラインファースト | 堅牢な同期、オフライン対応 | 大規模な依存追加、学習コスト | 過剰 |

## Design Decisions

### Decision: 単発eventsは差分更新、event_seriesはフルリフェッチ
- **Context**: event_seriesのRRULE展開はクライアント側で複雑な処理が必要
- **Alternatives Considered**:
  1. 全テーブル差分更新 — event_seriesのRRULE再展開ロジックが必要
  2. 全テーブルフルリフェッチ — シンプルだが単発eventsの即時性が犠牲
  3. ハイブリッド — 単発は差分、シリーズはリフェッチ
- **Selected Approach**: ハイブリッド（Option 3）
- **Rationale**: 単発eventsは`toCalendarEvent()`で即座に変換可能。event_seriesはRRULE展開・例外マージが必要で差分処理が非現実的
- **Trade-offs**: 単発eventsの即時反映 vs event_series変更時の若干のレイテンシ
- **Follow-up**: event_series変更頻度が高い場合、クライアント側RRULE展開の最適化を検討

### Decision: 進行中ミューテーションSetによる競合回避
- **Context**: 楽観的更新とRealtime通知の競合防止
- **Alternatives Considered**:
  1. updated_atタイムスタンプ比較 — 正確だがRealtime payloadのタイミング依存
  2. ミューテーションID追跡 — エンティティ単位で保留
  3. 全Realtimeイベントを常時適用 — 楽観的更新の巻き戻りリスク
- **Selected Approach**: ミューテーションID追跡（Option 2）
- **Rationale**: エンティティ単位の保留が最もシンプルかつ安全。ミューテーション完了後にフルリフェッチで整合性保証
- **Trade-offs**: ミューテーション中の他ユーザー変更が遅延する可能性（ミューテーション完了後に反映）

### Decision: 再接続時フルリフェッチ
- **Context**: WebSocket切断後の見逃しイベント補完
- **Alternatives Considered**:
  1. タイムスタンプベース差分取得 — `updated_at > lastSyncTime`で差分クエリ
  2. フルリフェッチ — 現在の表示範囲を再取得
  3. イベントバッファリング — Supabase側でバッファ（未サポート）
- **Selected Approach**: フルリフェッチ（Option 2）
- **Rationale**: 既存の`fetchEvents()`をそのまま利用可能。表示範囲のみ取得するため負荷は限定的
- **Trade-offs**: 全レコード再取得のコスト vs 実装シンプルさ

## Risks & Mitigations
- DELETEフィルタ不可 → ローカルstate参照でguild_id検証
- REPLICA IDENTITY未設定 → マイグレーション追加（FULL設定）
- WebSocket切断 → Supabase SDK自動再接続 + フルリフェッチ
- event_series RRULE展開の負荷 → リフェッチにデバウンス適用
- 同一エンティティの楽観的更新 + Realtime競合 → 進行中ミューテーションSetで保留

## References
- [Supabase Realtime Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes) — 公式API仕様
- [Building Scalable Real-Time Systems (Medium)](https://medium.com/@ansh91627/building-scalable-real-time-systems-a-deep-dive-into-supabase-realtime-architecture-and-eccb01852f2b) — 楽観的UIパターン
- [Supabase Realtime GitHub](https://github.com/supabase/realtime) — ソースコード・Issue
