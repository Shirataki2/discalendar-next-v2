# Requirements Document

## Project Description (Input)

CI: Botパッケージのテスト・デプロイフロー追加

## 背景

PR #61 のレビューで指摘された通り、`packages/bot` のテストがCIワークフローに組み込まれていない。

既存のbotのデプロイ先は @refs/discalendar-next-bot にある通り、AWS Lightsailにする。

## やること

* GitHub Actions に `packages/bot` のテスト・ビルド・型チェックを実行するワークフローを追加
* Bot のデプロイフロー（Docker / Cloud Run 等）を構築
* `packages/bot` 配下の変更時のみトリガーする path filter 設定

## 受け入れ条件

* [ ] `packages/bot/**` の変更で CI が自動実行される
* [ ] `npm run test`, `npm run type-check`, `npm run build` が CI で検証される
* [ ] main マージ時に Bot がデプロイされる
* [ ] デプロイ先の環境変数（BOT_TOKEN, SUPABASE_SERVICE_KEY 等）が安全に管理されている

## Metadata

* URL: [https://linear.app/ff2345/issue/DIS-84/ci-botパッケージのテストデプロイフロー追加](https://linear.app/ff2345/issue/DIS-84/ci-botパッケージのテストデプロイフロー追加)
* Identifier: DIS-84
* Status: Backlog
* Priority: Medium
* Assignee: Tomoya Ishii
* Labels: Bot, 品質向上
* Created: 2026-03-08T08:33:21.952Z
* Updated: 2026-03-11T07:10:50.217Z

## Sub-issues

* [DIS-96 CI: Bot のテスト・ビルド・型チェックワークフロー追加](https://linear.app/ff2345/issue/DIS-96/ci-bot-のテストビルド型チェックワークフロー追加)
* [DIS-97 CI: Bot の path filter 設定（packages/bot/** トリガー）](https://linear.app/ff2345/issue/DIS-97/ci-bot-の-path-filter-設定packagesbot-トリガー)
* [DIS-98 Bot デプロイフロー構築（Docker / Cloud Run）](https://linear.app/ff2345/issue/DIS-98/bot-デプロイフロー構築docker-cloud-run)
* [DIS-99 デプロイ環境の Secrets 管理設定](https://linear.app/ff2345/issue/DIS-99/デプロイ環境の-secrets-管理設定)

## Introduction

Discalendar の Discord Bot (`packages/bot`) は現在、ローカル開発環境でのみテスト・ビルドが行われており、CI/CD パイプラインが整備されていない。既存の `ci.yml` には `bot-quality` ジョブが定義されているが、path filter が未設定のため全てのPR/プッシュで実行されている。また、本番環境へのデプロイフローが存在しないため、手動デプロイに依存している。

本仕様では、Bot パッケージの品質保証を自動化するCI ワークフローの改善と、AWS Lightsail への自動デプロイパイプラインの構築を定義する。

## Requirements

### Requirement 1: Bot CI ワークフロー（品質チェック）

**Objective:** As a 開発者, I want `packages/bot` の変更に対して自動的にテスト・ビルド・型チェック・リントが実行されること, so that Bot コードの品質を継続的に保証できる

#### Acceptance Criteria

1. When `packages/bot/**` 配下のファイルがPull Requestで変更された場合, the CI ワークフロー shall Bot の lint チェック (`npm run lint`) を実行する
2. When `packages/bot/**` 配下のファイルがPull Requestで変更された場合, the CI ワークフロー shall Bot の型チェック (`npm run type-check`) を実行する
3. When `packages/bot/**` 配下のファイルがPull Requestで変更された場合, the CI ワークフロー shall Bot のビルド (`npm run build`) を実行する
4. When `packages/bot/**` 配下のファイルがPull Requestで変更された場合, the CI ワークフロー shall Bot のテスト (`npm run test`) を実行する
5. If Bot の lint・型チェック・ビルド・テストのいずれかが失敗した場合, then the CI ワークフロー shall Pull Request のステータスチェックを失敗として報告する

### Requirement 2: Path Filter によるトリガー制御

**Objective:** As a 開発者, I want CI ワークフローが変更されたパッケージに応じて適切なジョブのみ実行されること, so that 不要なCI実行を削減しフィードバックループを短縮できる

#### Acceptance Criteria

1. When `packages/bot/**` 配下のファイルのみが変更されたPull Requestの場合, the CI ワークフロー shall Bot の品質チェックジョブのみを実行する
2. When Web アプリ側（ルート）のファイルのみが変更されたPull Requestの場合, the CI ワークフロー shall Web の品質チェックジョブのみを実行する
3. When `packages/bot/**` と Web アプリ側の両方のファイルが変更されたPull Requestの場合, the CI ワークフロー shall 両方の品質チェックジョブを実行する
4. When `package-lock.json` やルートの設定ファイル（`tsconfig.json` 等）が変更された場合, the CI ワークフロー shall 両方の品質チェックジョブを実行する

### Requirement 3: Bot 自動デプロイ

**Objective:** As a 開発者, I want main ブランチへのマージ時に Bot が自動的に AWS Lightsail にデプロイされること, so that 手動デプロイの手間とミスを排除できる

#### Acceptance Criteria

1. When `packages/bot/**` 配下のファイルが `main` ブランチにマージされた場合, the デプロイワークフロー shall Bot を AWS Lightsail インスタンスにデプロイする
2. While デプロイが進行中の場合, the デプロイワークフロー shall 各ステップの進捗をGitHub Actionsのログに記録する
3. If デプロイが失敗した場合, then the デプロイワークフロー shall GitHub Actions のステータスを失敗として報告する
4. The デプロイワークフロー shall Docker コンテナとしてBot をビルド・配信する
5. The デプロイワークフロー shall SSH 経由で Lightsail インスタンスにアプリケーションをデプロイする

### Requirement 4: Secrets 管理

**Objective:** As a 開発者, I want デプロイに必要な秘密情報が安全に管理されること, so that 認証情報の漏洩リスクを最小化できる

#### Acceptance Criteria

1. The CI/CD パイプライン shall GitHub Actions Secrets を通じて Bot の環境変数（`BOT_TOKEN`, `APPLICATION_ID`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`）を管理する
2. The CI/CD パイプライン shall AWS 認証に GitHub Actions OIDC を使用する
3. The デプロイワークフロー shall SSH 秘密鍵を GitHub Actions Secrets から取得する
4. If Secrets が未設定または無効な場合, then the デプロイワークフロー shall 明確なエラーメッセージとともに失敗する
5. The CI/CD パイプライン shall 秘密情報をログやアーティファクトに出力しない

### Requirement 5: デプロイ環境構成

**Objective:** As a 運用担当者, I want デプロイ先の環境が適切に構成されていること, so that Bot が安定して稼働できる

#### Acceptance Criteria

1. The デプロイ環境 shall Docker Compose を使用して Bot コンテナを管理する
2. The デプロイ環境 shall CloudWatch Logs にログを送信する
3. Where Terraform がインフラ管理に使用されている場合, the デプロイ環境 shall Terraform で定義されたリソース構成と整合性を保つ
4. The デプロイワークフロー shall デプロイ前に既存コンテナを停止し、新しいコンテナを起動する（ダウンタイムを最小化する）
