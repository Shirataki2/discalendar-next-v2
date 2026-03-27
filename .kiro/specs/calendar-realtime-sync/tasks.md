# Implementation Plan

- [x] 1. (P) REPLICA IDENTITY マイグレーション
  - eventsテーブルとevent_seriesテーブルのREPLICA IDENTITYをFULLに設定するマイグレーションを作成する
  - UPDATE/DELETEのRealtimeペイロードでold recordを受信可能にする
  - _Requirements: 1.3, 3.3_

- [x] 2. Realtime 型定義と RealtimeHandler
- [x] 2.1 (P) Realtime ペイロード型と差分更新ハンドラーの実装
  - Supabase Realtime Postgres Changesのペイロード型を定義する（INSERT/UPDATE/DELETEの判別共用体）
  - 単発イベント（series_id が null）に対するINSERTハンドラーを実装する。新規EventRecordをCalendarEventに変換して配列に追加する
  - UPDATEハンドラーを実装する。該当IDのイベントを新データで置換する
  - DELETEハンドラーを実装する。該当IDのイベントを配列から除外する
  - INSERT時に重複ID（楽観的更新で既に存在）の場合はUPDATEとして処理する
  - 既存の `toCalendarEvent()` 変換関数を再利用する
  - 全ハンドラーはimmutable updateで新しい配列参照を返す
  - _Requirements: 3.1, 3.2, 3.3, 4.2_
  - _Contracts: RealtimeEventHandlers Service_

- [x]* 2.2 RealtimeHandler ユニットテスト
  - handleInsert: 新規EventRecordがCalendarEvent配列に追加されること
  - handleUpdate: 既存IDのイベントが新データで置換されること
  - handleDelete: 指定IDのイベントが配列から除外されること
  - handleInsert（重複ID）: 既存IDと同じレコードが来た場合UPDATEとして処理されること
  - _Requirements: 3.1, 3.2, 3.3, 4.2_

- [ ] 3. useRealtimeSync フック
- [ ] 3.1 チャネル購読とギルドスコープフィルタリング
  - guildIdを受け取り、eventsテーブルとevent_seriesテーブルのPostgres Changesチャネルを作成・購読する
  - INSERT/UPDATEイベントに `guild_id=eq.{guildId}` のサーバーサイドフィルタを設定する
  - DELETEイベントはサーバーサイドフィルタ不可のため、ローカルstateからIDを検索してguild_idを確認する
  - guildIdがnullの場合は購読を開始しない
  - guildId変更時に旧チャネルを解除し、新チャネルを作成する
  - 同一テーブルへの重複購読チャネルを防止する
  - 購読ステータス（disconnected/connecting/connected/error）をstate管理する
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 5.4_
  - _Contracts: UseRealtimeSyncParams, UseRealtimeSyncReturn_

- [ ] 3.2 イベントルーティングとリフェッチトリガー
  - eventsテーブルのペイロードでseries_idがnullの場合、RealtimeHandlerに差分更新を委譲する
  - eventsテーブルのペイロードでseries_idが非null（例外レコード）の場合、差分更新をスキップしリフェッチをトリガーする
  - event_seriesテーブルの全変更（INSERT/UPDATE/DELETE）でリフェッチをトリガーする
  - リフェッチトリガーはデバウンスして短時間の連続変更を集約する
  - _Requirements: 1.3, 1.4, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 3.3 ライフサイクル管理（タブ可視性・再接続・クリーンアップ）
  - コンポーネントアンマウント時に全アクティブチャネルの購読を解除する
  - `document.visibilitychange`を監視し、hidden→visible遷移時にフルリフェッチをトリガーする
  - Supabase SDKの自動再接続を活用し、再接続成功時にフルリフェッチをトリガーする
  - WebSocket接続エラー時はstatus: "error"を設定し、既存の手動リフェッチで機能を維持する（グレースフルデグラデーション）
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 3.4 ミューテーション追跡による競合回避
  - 進行中ミューテーションのエンティティIDを`pendingMutationIds` Setで管理する
  - `trackMutationStart(entityId)`: IDをSetに追加し、該当エンティティのRealtimeイベント即時反映を保留する
  - `trackMutationEnd(entityId)`: IDをSetから削除し、フルリフェッチをトリガーして最新状態を反映する
  - 保留中にRealtimeイベントが来た場合、ミューテーション完了後のリフェッチで正しい状態に収束する
  - _Requirements: 4.1, 4.3_

- [ ] 4. (P) useEventMutation ミューテーション追跡コールバック拡張
  - 既存のuseEventMutationフックのパラメータに `onMutationStart` と `onMutationEnd` コールバックを追加する
  - 各ミューテーション（create/update/delete）の開始時にonMutationStartを呼び出す（entityIdを渡す）
  - 各ミューテーションの完了時（成功・失敗問わず）にonMutationEndを呼び出す
  - 新規作成時はentityIdが未確定のため、一時IDまたはリフェッチで対応する
  - 既存の動作に影響を与えないよう、コールバックはオプショナルとする
  - _Requirements: 4.1, 4.3_
  - _Contracts: UseEventMutationParams_

- [ ] 5. CalendarContainer 統合
  - CalendarContainerでuseRealtimeSyncフックを呼び出し、guildId・supabaseクライアント・events・actions・refetchコールバックを渡す
  - useEventMutationの呼び出しにuseRealtimeSyncが返すtrackMutationStart/trackMutationEndをonMutationStart/onMutationEndとして接続する
  - Realtimeの購読ステータスに応じたUIフィードバック（接続中・エラー等）は将来対応とし、現時点では内部ステータス管理のみとする
  - 既存のfetchEvents手動リフェッチパターンは維持し、Realtimeを追加レイヤーとして組み込む
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.3, 5.1, 5.2, 5.3, 5.4_

- [ ]* 6. useRealtimeSync 統合テスト
  - guildId変更時にチャネルが切り替わること（旧購読解除 + 新購読開始）
  - アンマウント時にチャネルが解除されること
  - 進行中ミューテーションIDのRealtimeイベントが保留されること
  - eventsテーブルの例外レコード（series_id非null）受信時にリフェッチがトリガーされること
  - visibilitychange（hidden→visible）でリフェッチがトリガーされること
  - _Requirements: 2.2, 4.1, 4.3, 5.1, 5.2_
