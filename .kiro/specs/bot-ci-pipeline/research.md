# Research & Design Decisions

## Summary
- **Feature**: `bot-ci-pipeline`
- **Discovery Scope**: Extension（既存CIワークフローへのpath filter追加 + 新規デプロイパイプライン構築）
- **Key Findings**:
  - 既存 `ci.yml` に `bot-quality` ジョブが定義済みだが path filter 未設定で全PR/pushで実行されている
  - 参照プロジェクト (`refs/discalendar-next-bot`) に完全なデプロイパイプライン（Terraform + SSH + Docker Compose）が存在し、ほぼそのまま適用可能
  - 現在の Bot は Python ベースから TypeScript (Node.js) に移植済みのため、Dockerfile の新規作成が必要

## Research Log

### 既存CIワークフロー分析
- **Context**: 現在の CI パイプラインの構造と改善ポイントの特定
- **Sources Consulted**: `.github/workflows/ci.yml`, `.github/workflows/playwright.yml`, `.github/workflows/deploy-migrations.yml`
- **Findings**:
  - `ci.yml` に2ジョブ: `quality`（Web）と `bot-quality`（Bot）
  - どちらも `on: push/pull_request` で `branches: [main, master]` に対して実行
  - path filter が一切未設定 — Web のみの変更でも Bot ジョブが実行される
  - `bot-quality` ジョブは `working-directory: packages/bot` を設定し、lint/type-check/build/test を実行
  - `npm ci` は `working-directory: .`（ルート）で実行 — npm workspaces の依存解決に必要
  - デプロイワークフローは未定義
- **Implications**: `dorny/paths-filter` を導入してジョブレベルでの条件分岐が必要。既存ジョブ構造はそのまま活用可能。

### Path Filter 方式の検討
- **Context**: モノレポでのジョブ制御方式の選択
- **Sources Consulted**: [dorny/paths-filter](https://github.com/dorny/paths-filter), GitHub Actions ドキュメント
- **Findings**:
  - GitHub Actions 組み込みの `paths:` フィルターはワークフロー全体にしか適用できず、個別ジョブの制御に不向き
  - `dorny/paths-filter@v3` はジョブ/ステップレベルでの条件分岐をサポート
  - `push` イベントと `pull_request` イベントの両方に対応
  - `list-files: none` でファイルリストを省略し、変更検知のみに利用可能
- **Implications**: `dorny/paths-filter@v3` を `changes` ジョブとして先行実行し、後続ジョブの `if` 条件で参照するパターンを採用

### 参照プロジェクトのデプロイパイプライン分析
- **Context**: `refs/discalendar-next-bot` の既存デプロイ構成を現プロジェクトに適用する方法
- **Sources Consulted**: `refs/discalendar-next-bot/.github/workflows/terraform-apply.yml`, `refs/discalendar-next-bot/scripts/deploy.sh`, `refs/discalendar-next-bot/docker-compose.yml`, `refs/discalendar-next-bot/Dockerfile`
- **Findings**:
  - **ワークフロー構成**: Terraform Apply -> SSH Setup -> Deploy Application の3段階
  - **OIDC認証**: `aws-actions/configure-aws-credentials@v4` + `id-token: write` パーミッション
  - **SSH接続**: `LIGHTSAIL_SSH_PRIVATE_KEY` を GitHub Secrets から取得、`~/.ssh/lightsail_key` に書き込み
  - **デプロイスクリプト**: `scripts/deploy.sh` がSSH経由でリポジトリクローン/更新、`.env` 作成、Docker Compose 再起動を実行
  - **Docker Compose**: `awslogs` ドライバーで CloudWatch Logs に直接送信
  - **参照 Dockerfile は Python ベース** — 現プロジェクトは TypeScript なので Node.js ベースの Dockerfile を新規作成する必要がある
- **Implications**: ワークフローと deploy.sh の構造はほぼ踏襲可能。Dockerfile と docker-compose.yml は Node.js 向けに書き直す必要あり。

### Node.js Bot 向け Docker 構成
- **Context**: TypeScript Bot の Docker イメージ設計
- **Findings**:
  - Bot は `npm run build` で `dist/` にトランスパイル、`node --env-file=.env dist/index.js` で起動
  - npm workspaces を使用 — Docker ビルドではルートの `package.json` + `package-lock.json` + `packages/bot/` が必要
  - `packages/rrule-utils` への依存あり（`npm run build` が `npm run build -w @discalendar/rrule-utils && tsc` を実行）
  - マルチステージビルドで build stage と runtime stage を分離可能
  - ベースイメージは `node:lts-slim` を推奨（セキュリティパッチ適用済み、軽量）
- **Implications**: Dockerfile はモノレポ対応のマルチステージビルドが必要。rrule-utils のビルドも含める。

### GitHub Actions OIDC + AWS Lightsail
- **Context**: AWS認証方式の安全性確認
- **Sources Consulted**: [aws-actions/configure-aws-credentials](https://github.com/aws-actions/configure-aws-credentials), [AWS公式ブログ](https://aws.amazon.com/blogs/security/use-iam-roles-to-connect-github-actions-to-actions-in-aws/)
- **Findings**:
  - OIDC は一時的な認証情報を使用 — 長期的なアクセスキーの保管不要
  - `permissions: id-token: write` がワークフローに必須
  - IAM ロールの信頼ポリシーで `sub` 条件をリポジトリスコープに限定すべき
  - `configure-aws-credentials@v4` が最新安定版
- **Implications**: 参照プロジェクトの OIDC パターンをそのまま適用。Terraform は既存インフラを共有するため、このリポジトリ用の Terraform は不要（インフラは `refs/discalendar-next-bot` 側で管理済み）。

## Design Decisions

### Decision: Terraform をこのリポジトリに含めない
- **Context**: デプロイ先インフラの管理方法
- **Alternatives Considered**:
  1. このリポジトリに Terraform ファイルをコピーして管理する
  2. 既存の `refs/discalendar-next-bot` リポジトリの Terraform をそのまま利用する
- **Selected Approach**: 既存の Terraform 管理をそのまま利用
- **Rationale**: Lightsail インスタンスは既に作成済み。同一インスタンスに新しい Bot をデプロイするため、インフラ変更は不要。Terraform の二重管理を避ける。
- **Trade-offs**: インフラ変更が必要な場合は別リポジトリでの対応が必要
- **Follow-up**: 要件 5.3 の「Terraform との整合性」は、既存インフラ構成との整合性確認として解釈

### Decision: デプロイワークフローを ci.yml から分離する
- **Context**: CI（品質チェック）とCD（デプロイ）のワークフロー構成
- **Alternatives Considered**:
  1. `ci.yml` にデプロイジョブを追加する
  2. `deploy-bot.yml` として独立したワークフローを作成する
- **Selected Approach**: 独立した `deploy-bot.yml` ワークフローを作成
- **Rationale**: 関心の分離（CI は品質保証、CD はデプロイ）。デプロイワークフローには AWS OIDC 権限が必要で CI ジョブには不要。手動トリガー (`workflow_dispatch`) もデプロイ側のみに必要。
- **Trade-offs**: ワークフローファイルが増える
- **Follow-up**: デプロイワークフローは `main` ブランチへの push + path filter で自動トリガー

### Decision: dorny/paths-filter@v3 によるジョブレベル制御
- **Context**: モノレポでの選択的ジョブ実行
- **Alternatives Considered**:
  1. GitHub Actions 組み込みの `paths:` フィルター
  2. `dorny/paths-filter@v3` アクション
  3. カスタムスクリプトによる `git diff` ベースのフィルター
- **Selected Approach**: `dorny/paths-filter@v3`
- **Rationale**: ジョブレベルの制御が可能。PR と push の両イベントに対応。メンテナンスコストが低い。広く採用されている。
- **Trade-offs**: 外部アクションへの依存が増える
- **Follow-up**: `package-lock.json` やルート設定ファイルの変更時は全ジョブ実行とする

## Risks & Mitigations
- **SSH鍵の管理**: GitHub Secrets に保管。ワークフロー内でファイルに書き出し後、即座に `chmod 600` で権限制限
- **デプロイ中のダウンタイム**: `docker compose down` -> `build` -> `up` で数十秒のダウンタイムが発生 — Discord Bot は再接続機能があるため許容範囲
- **rrule-utils 依存**: Bot ビルド時に `@discalendar/rrule-utils` のビルドが先行する必要がある — Dockerfile 内で npm workspaces 全体をインストールして対応
- **Lightsail インスタンスの既存利用**: 旧 Python Bot が動作中の可能性 — デプロイスクリプトが既存コンテナを停止してから新コンテナを起動するため問題なし

## References
- [dorny/paths-filter](https://github.com/dorny/paths-filter) -- GitHub Actions のパスベースフィルタリングアクション
- [aws-actions/configure-aws-credentials](https://github.com/aws-actions/configure-aws-credentials) -- AWS OIDC 認証アクション
- [GitHub Actions OIDC with AWS](https://docs.github.com/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services) -- OIDC 設定の公式ガイド
- `refs/discalendar-next-bot/docs/deployment.md` -- 参照プロジェクトのデプロイメントガイド
