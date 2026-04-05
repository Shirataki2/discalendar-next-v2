# Implementation Plan

- [ ] 1. PostHogIdentifyProvider の実装とテスト
- [x] 1.1 PostHogIdentifyProvider コンポーネントを作成する
  - Supabase Auth の `onAuthStateChange` リスナーで認証状態の変化を監視する
  - セッション確立時（SIGNED_IN / INITIAL_SESSION）に PostHog の identify を user.id で呼び出す
  - セッション消失時（SIGNED_OUT / session が null）に PostHog の reset を呼び出す
  - PostHog SDK が未初期化の場合は何もせずスキップする
  - アンマウント時に subscription を解除する
  - `"use client"` ディレクティブでクライアントサイド限定にする
  - _Requirements: 1.1, 1.2, 1.3, 3.1, 3.2, 4.1, 4.2, 4.3_

- [x] 1.2 (P) PostHogIdentifyProvider のユニットテストを作成する
  - SIGNED_IN イベントで identify が userId 付きで呼ばれることを検証する
  - INITIAL_SESSION イベント（リロード時）で identify が呼ばれることを検証する
  - SIGNED_OUT イベントで reset が呼ばれることを検証する
  - セッションが null の場合に reset が呼ばれることを検証する
  - アンマウント時に subscription 解除されることを検証する
  - children がそのまま描画されることを検証する
  - SentryUserProvider テストと同じモックパターン（vi.mock posthog-js, vi.mock supabase/client）を使用する
  - _Requirements: 5.1, 5.2_

- [ ] 2. ユーザープロパティ送信ユーティリティの実装とテスト
- [x] 2.1 setPostHogUserProperties ユーティリティ関数を作成する
  - PostHog の people.set API を使ってユーザープロパティ（guild_count）を送信する機能を追加する
  - PostHog SDK が未初期化の場合はエラーなくスキップする
  - 既存の analytics/client モジュールに配置する
  - _Requirements: 2.1, 2.2, 4.2_

- [x] 2.2 (P) setPostHogUserProperties のユニットテストを作成する
  - guild_count プロパティが people.set で送信されることを検証する
  - SDK 未初期化時にエラーがスローされないことを検証する
  - _Requirements: 5.1, 5.2_

- [ ] 3. Root Layout への統合
- [ ] 3.1 PostHogIdentifyProvider を Root Layout に組み込む
  - PostHogProvider の内側、SentryUserProvider の前に PostHogIdentifyProvider を配置する
  - Provider の順序が正しいことを確認する（PostHogProvider > PostHogIdentifyProvider > SentryUserProvider > ThemeProvider）
  - _Requirements: 4.1, 4.3_
