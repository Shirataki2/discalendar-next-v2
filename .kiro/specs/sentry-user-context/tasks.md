# Implementation Plan

- [x] 1. SentryUserProvider の作成とルートレイアウトへの統合
- [x] 1.1 SentryUserProvider コンポーネントを作成する
  - Supabaseクライアントの `onAuthStateChange` を購読し、認証イベントに応じてSentryユーザーコンテキストを設定する
  - SIGNED_IN および INITIAL_SESSION イベントでユーザーIDをSentryに設定する
  - SIGNED_OUT イベントでSentryユーザーコンテキストをクリアする
  - アンマウント時に購読を解除する
  - 送信するユーザー情報はSupabaseユーザーID（UUID）のみとする
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 3.2_

- [x] 1.2 SentryUserProvider のテストを作成する
  - SIGNED_IN イベントで `setUser` にユーザーIDが渡されることを検証する
  - INITIAL_SESSION イベントで `setUser` が呼ばれることを検証する（リロードケース）
  - SIGNED_OUT イベントで `setUser(null)` が呼ばれることを検証する
  - アンマウント時に `onAuthStateChange` の購読が解除されることを検証する
  - セッションが null の場合に `setUser(null)` が呼ばれることを検証する
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 3.2_

- [x] 1.3 ルートレイアウトに SentryUserProvider を配置する
  - `app/layout.tsx` に SentryUserProvider を追加し、既存のProviderツリーに統合する
  - _Requirements: 1.1, 1.2_

- [x] 2. サーバーサイドのSentryユーザーコンテキスト設定
- [x] 2.1 (P) ダッシュボードレイアウトでSentryユーザーコンテキストを設定する
  - `app/dashboard/layout.tsx` の認証済みユーザー取得後にSentryユーザーコンテキストを設定する
  - 送信するユーザー情報はSupabaseユーザーID（UUID）のみとする
  - _Requirements: 1.3, 3.2, 3.3_

- [x] 2.2 (P) ログアウトServer ActionでSentryユーザーコンテキストをクリアする
  - `app/auth/actions.ts` の signOut 関数内でSentryユーザーコンテキストをクリアする
  - セッション破棄の前にクリアを実行する
  - _Requirements: 2.1, 3.3_

- [x] 2.3 サーバーサイドのSentryユーザーコンテキスト設定のテストを作成する
  - ダッシュボードレイアウトで認証済みユーザーのIDがSentryに設定されることを検証する
  - signOut Action内でSentryユーザーコンテキストがクリアされることを検証する
  - `sendDefaultPii: false` が変更されていないことを確認する
  - _Requirements: 1.3, 2.1, 3.1, 3.3_
