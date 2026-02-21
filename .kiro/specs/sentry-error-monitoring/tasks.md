# Implementation Plan

- [x] 1. `@sentry/nextjs` SDKのインストールと環境変数を定義する
  - Sentry Next.js公式SDKをプロジェクトに追加する
  - Sentry DSN、認証トークン、Organization/Projectの環境変数を `.env.example` に追記する
  - DSNはクライアント・サーバー両方でアクセスできる公開環境変数として定義し、認証トークンはビルド時のみ使用する変数として定義する
  - _Requirements: 1.1, 5.3, 5.4_

- [ ] 2. Sentry SDK初期化設定ファイルを作成する
- [ ] 2.1 (P) クライアントサイドのSentry初期化設定を作成する
  - ブラウザ環境向けのSentry初期化設定を定義する
  - DSN環境変数が未設定の場合はSentryを無効化し、アプリケーションの起動を妨げない
  - 開発環境ではトレースサンプルレートを高く、本番環境では低く設定する
  - 個人情報の自動収集はデフォルトで無効にする
  - _Requirements: 1.2, 2.1, 5.1, 5.2, 5.5_

- [ ] 2.2 (P) サーバーサイドのSentry初期化設定を作成する
  - Node.jsサーバーランタイム向けのSentry初期化設定を定義する
  - クライアント設定と同一のDSN管理・環境分離ロジックを適用する
  - DSN未設定時のグレースフル無効化を実装する
  - _Requirements: 1.3, 5.1, 5.2, 5.5_

- [ ] 2.3 (P) EdgeランタイムのSentry初期化設定を作成する
  - Edgeランタイム（Middleware等）向けのSentry初期化設定を定義する
  - サーバー設定と同様のDSN管理・環境分離ロジックを適用する
  - _Requirements: 1.4, 5.1, 5.2, 5.5_

- [ ] 3. Next.js App Router統合を設定する
- [ ] 3.1 サーバーサイド計装フックを作成する
  - Next.jsのinstrumentationフックを使い、ランタイム環境に応じてサーバーまたはEdge設定を動的にロードする
  - Server Components、Route Handlers、Server Actions、Middlewareで発生するリクエストエラーを自動捕捉するハンドラをエクスポートする
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 3.2 Next.js設定にSentryビルド統合を追加する
  - 既存のNext.js設定をSentryのビルドラッパーで囲み、自動計装とソースマップ処理を有効化する
  - ソースマップはSentryにのみアップロードし、クライアントには公開しない設定にする
  - 認証トークン未設定時はソースマップアップロードをスキップし、ビルド自体は正常に完了させる
  - CI環境でのみアップロードログを出力する設定にする
  - _Requirements: 1.5, 4.1, 4.2_

- [ ] 4. グローバルエラー境界を作成しSentryと連携する
  - アプリケーション全体のReactエラー境界を作成し、捕捉したエラーをSentryに送信する
  - ルートレイアウトを置換するため、HTMLとBODY要素を含む完全なページ構造にする
  - エラーリカバリ用のリトライボタンを提供する
  - Tailwind CSSはルートレイアウト外では適用できないため、最小限のインラインスタイルで対応する
  - _Requirements: 2.2, 2.3_

- [ ] 5. GitHub Actions CIワークフローにSentry環境変数を追加する
  - CIのビルドステップにSentry認証トークン・Organization・Projectの環境変数をGitHub Secretsから参照する形で追加する
  - ソースマップアップロードがCI環境で正常に動作することを確認する
  - _Requirements: 4.3_

- [ ] 6. 統合検証を行う
- [ ] 6.1 プロダクションビルドの成功を検証する
  - Sentry統合後に `npm run build` がエラーなく完了することを確認する
  - lint・型チェックがSentry関連ファイルでも通過することを確認する
  - _Requirements: 1.5, 4.1_

- [ ] 6.2 DSN未設定時の正常起動を検証する
  - DSN環境変数を設定しない状態で開発サーバーが正常に起動することを確認する
  - Sentryの設定ファイルがエラーをスローせず、アプリケーション機能に影響しないことを確認する
  - _Requirements: 5.5_
