# Requirements Document

## Introduction
本番環境のDiscalendarアプリケーションにおいて、エラーが `console.error` でしか記録されず、ユーザー影響のあるエラーの検知・対応が遅れている。Sentry（`@sentry/nextjs`）を導入し、Next.js App Routerの全レイヤー（Server Components、Client Components、Server Actions、Route Handlers）でエラーを自動捕捉・通知できるようにする。これにより、本番環境の安定性を継続的に監視し、障害対応の迅速化を実現する。

## Requirements

### Requirement 1: SDK初期化と基本設定
**Objective:** As a 開発者, I want Sentry SDKがNext.js App Routerに正しく統合されている状態, so that アプリケーション全体のエラーを自動捕捉できる

#### Acceptance Criteria
1. The Discalendar shall `@sentry/nextjs` SDKを依存関係に含み、アプリケーション起動時にSentryを初期化する
2. The Discalendar shall `sentry.client.config.ts` でクライアントサイドのSentryを初期化する
3. The Discalendar shall `sentry.server.config.ts` でサーバーサイドのSentryを初期化する
4. The Discalendar shall `sentry.edge.config.ts` でEdgeランタイムのSentryを初期化する
5. The Discalendar shall `next.config.ts` を `withSentryConfig` でラップしてビルド統合を有効化する

### Requirement 2: クライアントサイドエラー捕捉
**Objective:** As a 開発者, I want Client Componentsで発生するランタイムエラーがSentryに自動送信される状態, so that ユーザーが遭遇するフロントエンドエラーを即座に検知できる

#### Acceptance Criteria
1. When Client Componentsで未捕捉のJavaScriptエラーが発生した場合, the Discalendar shall エラー情報をSentryに自動送信する
2. The Discalendar shall `app/global-error.tsx` にSentryエラーレポートを統合し、アプリケーション全体のエラー境界として機能させる
3. When React Error Boundaryがエラーを捕捉した場合, the Discalendar shall エラーコンテキスト（コンポーネントスタック等）を含めてSentryに送信する

### Requirement 3: サーバーサイドエラー捕捉
**Objective:** As a 開発者, I want Server Components・Route Handlers・Server Actionsで発生するエラーがSentryに自動送信される状態, so that サーバーサイドの障害を漏れなく検知できる

#### Acceptance Criteria
1. When Server Componentsでエラーが発生した場合, the Discalendar shall エラー情報をSentryに自動送信する
2. When Route Handlersでエラーが発生した場合, the Discalendar shall エラー情報をSentryに自動送信する
3. When Server Actionsでエラーが発生した場合, the Discalendar shall エラー情報をSentryに自動送信する
4. The Discalendar shall `instrumentation.ts` を使用してサーバーサイドのSentry初期化を行う（Next.js推奨パターン）

### Requirement 4: ソースマップとデバッグ情報
**Objective:** As a 開発者, I want Sentryのエラーレポートで元のTypeScriptソースコードの行番号とファイル名が表示される状態, so that エラーの原因箇所を迅速に特定できる

#### Acceptance Criteria
1. When プロダクションビルドを実行した場合, the Discalendar shall ソースマップをSentryに自動アップロードする
2. The Discalendar shall ソースマップをクライアントに公開せず、Sentryへのアップロードのみに使用する
3. When GitHub Actions CIでビルドを実行した場合, the Discalendar shall ソースマップアップロードが正常に完了する

### Requirement 5: 環境分離と設定管理
**Objective:** As a 開発者, I want 開発環境と本番環境でSentryの動作が適切に分離されている状態, so that 開発中のノイズが本番監視に混入しない

#### Acceptance Criteria
1. While 開発環境（`NODE_ENV=development`）で実行中, the Discalendar shall Sentryへのエラー送信を無効化する（またはSentry送信をスキップする）
2. While 本番環境（`NODE_ENV=production`）で実行中, the Discalendar shall Sentryへのエラー送信を有効化する
3. The Discalendar shall Sentry DSNおよび認証トークンを環境変数で管理し、ソースコードにハードコードしない
4. The Discalendar shall 必要な環境変数を `.env.example` に文書化する
5. If Sentry DSN環境変数が未設定の場合, the Discalendar shall エラーを発生させずにSentry機能を無効化してアプリケーションを正常起動する
