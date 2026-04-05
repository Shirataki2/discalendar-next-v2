# Implementation Plan

- [x] 1. Session Replay integration をクライアント設定に追加
  - import文を名前空間インポート（`import * as Sentry`）に変更し、`Sentry.init()` で初期化する
  - `Sentry.replayIntegration()` を `integrations` 配列に追加する
  - プライバシーオプション（テキストマスク、入力マスク、メディアブロック）を設定する
  - 通常セッションのリプレイサンプリングレートを低い値に設定する
  - エラー発生セッションのリプレイサンプリングレートを100%に設定する
  - 既存の環境分離（`enabled` フラグ）が引き続き機能することを確認する
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3_

- [x] 2. ビルド・型チェック・既存テストの検証
  - 型チェックを実行してSession Replay設定に型エラーがないことを確認する
  - プロダクションビルドを実行して正常に完了することを確認する
  - 既存のSentry関連テストが引き続きパスすることを確認する
  - _Requirements: 1.1, 1.2, 1.3_
