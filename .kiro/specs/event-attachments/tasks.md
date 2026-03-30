# Implementation Plan

- [x] 1. DBマイグレーション・Storageインフラ構築
  - eventsテーブルとevent_seriesテーブルに添付ファイルメタデータ用のJSONBカラムを追加する（デフォルト空配列、NOT NULL）
  - イベント添付ファイル用のプライベートStorageバケットを作成する（ファイルサイズ上限10MB、許可MIMEタイプ: 画像4種 + PDF）
  - ギルドメンバーのみがアップロード・閲覧・削除できるStorage RLSポリシーを作成する（パス先頭のguild_idとuser_guild_ids()関数で検証）
  - 既存データに影響を与えないことを確認する（カラム追加はデフォルト値付きのため安全）
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4_

- [ ] 2. 型定義・サービス層構築
- [ ] 2.1 Attachment型・バリデーション定数の定義と既存型への統合
  - 添付ファイルメタデータの型（ファイル名・Storageパス・MIMEタイプ・バイト数）を定義する
  - アップロード中ファイルの状態型（進捗・ステータス・エラー）を定義する
  - バリデーション定数（ファイルサイズ上限10MB、許可MIMEタイプ5種、1イベント最大5件）を定義する
  - 既存のEventRecord・EventSeriesRecord・CalendarEvent型にattachmentsフィールドを追加する
  - CreateEventInput・UpdateEventInputにattachmentsフィールドを追加する
  - _Requirements: 1.1, 1.2_

- [ ] 2.2 attachment-serviceの実装（Signed URL生成・ファイル削除・パス生成）
  - 複数の添付ファイルに対するSigned URL一括生成機能を実装する（有効期限1時間）
  - Storageからのファイル一括削除機能を実装する（部分失敗はログ記録、全体としては成功扱い）
  - guild_id・event_id・UUIDプレフィックス付きファイル名によるStorageパス生成ロジックを実装する
  - 既存のcreateEventServiceパターンに倣い、ファクトリ関数で初期化する
  - Result型パターンでエラーハンドリングを統一する
  - サービスのユニットテストを作成する（パス生成・Signed URL生成・削除のモック検証）
  - _Requirements: 2.2, 3.1, 3.2, 3.3, 7.2_

- [ ] 3. (P) ファイルアップロード機能
- [ ] 3.1 useFileUploadフックの実装
  - ファイル選択時のクライアントサイドバリデーション（サイズ上限・MIMEタイプ・件数上限）を実装する
  - Supabase Storage SDKによるファイルアップロードと進捗追跡を実装する
  - 既存添付ファイルの管理（編集時の初期値設定）を実装する
  - 添付ファイル削除の記録（pendingDeletions）を実装する
  - 件数上限到達の判定ロジックを実装する
  - バリデーションロジックのユニットテストを作成する
  - _Requirements: 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4_

- [ ] 3.2 FileUploaderコンポーネントの実装
  - ドラッグ&ドロップゾーンとファイル選択ボタンを備えたアップロード領域を実装する
  - アップロード中の各ファイルにプログレスバーを表示する
  - アップロード済みファイルのサムネイル（画像）またはファイル名（PDF）と削除ボタンを表示する
  - 件数上限到達時にアップロード領域を無効化し、メッセージを表示する
  - 削除ボタンクリック時の確認UIを実装する
  - バリデーションエラーのインライン表示を実装する
  - Storybookストーリー（空状態・アップロード中・アップロード済み・上限到達・エラー）を作成する
  - コンポーネントのテストを作成する（ファイル選択→プレビュー→削除のUI操作）
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.4, 7.1, 7.3_

- [ ] 4. (P) 添付ファイル表示機能
- [ ] 4.1 AttachmentDisplay・ImageLightboxコンポーネントの実装
  - 画像ファイルをサムネイルグリッドで表示するセクションを実装する
  - PDFファイルをアイコン・ファイル名・サイズ付きダウンロードリンクとして表示する
  - 添付ファイルが0件の場合はセクション自体を非表示にする
  - 画像クリックで拡大表示するライトボックスモーダルを実装する（shadcn/ui Dialogベース）
  - ダウンロードリンククリックでファイルダウンロードを開始する
  - Storybookストーリー（画像のみ・PDFのみ・混在・空・ライトボックス表示）を作成する
  - コンポーネントのテストを作成する（画像プレビュー表示・PDFリンク表示・空時の非表示）
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 5. イベントフォーム統合
- [ ] 5.1 EventForm・useEventFormの拡張とFileUploader統合
  - EventFormDataにattachmentsフィールドを追加し、useEventFormの状態管理を拡張する
  - EventForm内のNotificationFieldセクションと同階層にFileUploaderセクションを配置する
  - 編集時に既存添付ファイルをFileUploaderの初期値として渡す
  - FileUploaderからのattachments変更をフォームデータに反映するコールバックを接続する
  - _Requirements: 4.1, 4.2_

- [ ] 5.2 EventDialog・Server Actionsの更新
  - EventDialogのデータ変換関数（toCreateEventInput・toUpdateEventInput）にattachmentsを含める
  - イベント作成・更新のServer Actionでattachmentsメタデータをデータベースに保存する
  - イベント更新時に削除対象ファイル（pendingDeletions）をSupabase Storageから削除する処理を追加する
  - 繰り返しイベント用のServer Action（createRecurringEventAction等）にも同様のattachments対応を追加する
  - _Requirements: 4.1, 4.2, 7.2_

- [ ] 6. イベント表示統合
- [ ] 6.1 添付ファイルURL取得Server Actionの実装
  - attachment-serviceのgetSignedUrlsを呼び出すServer Actionを追加する
  - 認証・ギルドメンバーシップチェックを既存パターンに従い実施する
  - エラー時のフォールバック表示用にResult型で返す
  - _Requirements: 3.1, 3.2, 6.1, 6.2_

- [ ] 6.2 EventPopoverへのAttachmentDisplay統合
  - EventPopoverのdescriptionセクションの下にAttachmentDisplayを配置する
  - イベント詳細表示時にSigned URL取得Server Actionを呼び出してURLを解決する
  - CalendarEvent型のattachmentsフィールドをAttachmentDisplayに渡す
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
