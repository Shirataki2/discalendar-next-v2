# Implementation Plan

- [x] 1. 認証 Server Action のエラーキャプチャ追加
- [x] 1.1 (P) signOut のエラーを Sentry にキャプチャする
  - signOut でセッション破棄に失敗した場合に captureException を呼び出す
  - 既存の console.error は維持し、captureException を追加する
  - エラーメッセージに操作名 `[signOut]` とエラー詳細を含める
  - _Requirements: 1.2, 2.1, 2.2, 3.3_

- [x] 2. ダッシュボード Server Actions のエラーキャプチャ追加
- [x] 2.1 (P) ギルド設定・通知チャンネル操作のエラーキャプチャ
  - ギルド設定更新（upsertGuildConfig）の失敗時に captureException を追加する
  - 通知チャンネル設定更新（upsertEventSettings）の失敗時に captureException を追加する
  - 既存の console.error に加えて captureException を呼び出す
  - エラーメッセージに操作名とエラー詳細を含める
  - _Requirements: 1.1, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3_

- [x] 2.2 (P) 公開カレンダー操作のエラーキャプチャ
  - 公開カレンダーの有効化/無効化の失敗時に captureException を追加する
  - 公開スラッグ再生成の失敗時に captureException を追加する
  - sanitizeResult の前にキャプチャし、details 情報をエラーメッセージに含める
  - _Requirements: 1.1, 2.1, 2.2, 3.1, 3.2_

- [x] 2.3 (P) ICSフィードトークン操作のエラーキャプチャ
  - トークン取得・生成の失敗時に captureException を追加する
  - トークン再生成の失敗時に captureException を追加する
  - _Requirements: 1.1, 2.1, 2.2, 3.1, 3.2_

- [x] 2.4 (P) チャンネル取得・添付ファイル操作のエラーキャプチャ
  - ギルドチャンネル一覧取得の失敗時に captureException を追加する
  - 添付ファイルURL取得の失敗時に captureException を追加する
  - _Requirements: 1.1, 1.4, 2.1, 2.2, 3.1, 3.2_

- [x] 3. エラーキャプチャのテスト
- [x] 3.1 signOut のキャプチャテスト
  - signOut でサービスエラー発生時に captureException が呼ばれることを検証する
  - _Requirements: 1.2, 3.3_

- [x] 3.2 ダッシュボード Actions のキャプチャテスト
  - 各対象アクションでサービスエラー時に captureException が呼ばれることを検証する
  - バリデーション・認証エラー時に captureException が呼ばれないことを検証する
  - エラーメッセージに操作名が含まれることを検証する
  - _Requirements: 1.1, 1.4, 2.1, 2.3, 3.1_
