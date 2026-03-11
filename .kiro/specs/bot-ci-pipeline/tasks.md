# Implementation Plan

- [x] 1. CI ワークフローに path filter を導入する
- [x] 1.1 (P) 変更検知ジョブを追加して Web/Bot の変更フラグを出力する
  - `ci.yml` の先頭に `changes` ジョブを新設し、`dorny/paths-filter@v3` で変更ファイルを検知する
  - `web` と `bot` の2つの出力フラグを定義する
  - `packages/bot/**` の変更で `bot` フラグを `true` にする
  - `packages/bot/**` 以外の変更で `web` フラグを `true` にする
  - `package-lock.json` や `tsconfig.json` 等のルート設定ファイル変更時は両フラグを `true` にする
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 1.2 (P) 既存ジョブに path filter の条件分岐を適用する
  - `quality` ジョブに `needs: [changes]` と `if: needs.changes.outputs.web == 'true'` 条件を追加する
  - `bot-quality` ジョブに `needs: [changes]` と `if: needs.changes.outputs.bot == 'true'` 条件を追加する
  - 各ジョブが変更パッケージに応じて選択的に実行されることを確認する
  - Bot のみの変更で `quality` ジョブがスキップされ、Web のみの変更で `bot-quality` ジョブがスキップされることを検証する
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4_

- [ ] 2. Bot の Docker コンテナビルド環境を構築する
- [ ] 2.1 (P) マルチステージビルドの Dockerfile を作成する
  - モノレポ対応のマルチステージビルドで Bot の Docker イメージを定義する
  - Builder ステージでルートの `package.json`、`package-lock.json`、各パッケージの `package.json` をコピーして依存をインストールする
  - `@discalendar/rrule-utils` を先行ビルドし、その後 Bot をビルドする
  - Runtime ステージで `node:lts-slim` をベースに本番依存のみインストールし、ビルド成果物をコピーする
  - non-root ユーザーでアプリケーションを実行する
  - _Requirements: 3.4_

- [ ] 2.2 (P) .dockerignore を作成する
  - `node_modules`、`.git`、`.next`、`e2e_tests`、`.kiro`、`.cursor` 等の不要なファイルを除外する
  - ビルドコンテキストを最小化してビルド時間を短縮する
  - _Requirements: 3.4_

- [ ] 2.3 Docker Compose 構成を定義する
  - Bot コンテナの起動・停止・再起動管理を定義する
  - `awslogs` ドライバーで CloudWatch Logs にログを転送する設定を含める
  - `.env` ファイルから環境変数を読み込む
  - `restart: unless-stopped` で自動再起動を設定する
  - コンテナ名を `discalendar-bot` に設定する
  - 2.1 の Dockerfile 完成後に実施（ビルドコンテキストの参照が必要）
  - _Requirements: 5.1, 5.2_

- [ ] 3. デプロイスクリプトを作成する
- [ ] 3.1 SSH 経由のデプロイスクリプトを実装する
  - ホスト引数と必須環境変数（`BOT_TOKEN`, `APPLICATION_ID`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`）の検証を冒頭で行う
  - 未設定時は明確なエラーメッセージとともにスクリプトを終了する
  - SSH 接続でリモートコマンドを実行する: リポジトリクローン/更新、AWS 認証情報設定、`.env` ファイル生成
  - 既存コンテナを停止してから新コンテナをビルド・起動する（ダウンタイム最小化）
  - 各ステップの進捗を echo でログ出力する
  - コンテナステータス確認と直近ログ表示をデプロイ完了後に実施する
  - `set -e` でエラー時即時終了を設定する
  - 秘密情報をログに出力しない
  - _Requirements: 3.2, 3.4, 3.5, 4.4, 4.5, 5.4_

- [ ] 4. Bot デプロイワークフローを構築する
- [ ] 4.1 デプロイワークフローの基本構造を定義する
  - `deploy-bot.yml` を新規作成し、`main` ブランチへの push と `workflow_dispatch` でトリガーする
  - `id-token: write` パーミッションを設定する
  - `concurrency` で同時デプロイを防止する
  - path filter で Bot ファイルの変更検知を行い、変更がない場合はデプロイをスキップする
  - _Requirements: 3.1, 3.3_

- [ ] 4.2 AWS OIDC 認証と SSH 接続を設定する
  - `aws-actions/configure-aws-credentials@v4` で OIDC による一時的な AWS 認証情報を取得する
  - GitHub Secrets から SSH 秘密鍵を取得し、適切なパーミッション（`chmod 600`）で配置する
  - デプロイ前に SSH 接続テストを実行し、失敗時は明確なエラーメッセージを出力する
  - 秘密情報がログやアーティファクトに出力されないことを確認する
  - _Requirements: 3.5, 4.2, 4.3, 4.5_

- [ ] 4.3 デプロイジョブで Bot 環境変数を管理する
  - GitHub Actions Secrets を通じて `BOT_TOKEN`, `APPLICATION_ID`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` をデプロイスクリプトに渡す
  - CloudWatch 用の `CLOUDWATCH_ACCESS_KEY_ID`, `CLOUDWATCH_SECRET_ACCESS_KEY`, `CLOUDWATCH_LOG_GROUP` も Secrets から取得する
  - Secrets が未設定の場合にワークフローが明確なエラーで失敗することを確認する
  - 4.1, 4.2 の完成後に実施（ワークフロー構造と認証設定に依存）
  - _Requirements: 4.1, 4.5_

- [ ] 5. 統合検証を行う
- [ ] 5.1 Docker ビルドのローカル検証を行う
  - `docker compose build` でイメージのビルドが成功することを確認する
  - コンテナの起動と Bot プロセスの正常起動を検証する
  - 環境変数の正常読み込みを確認する
  - _Requirements: 3.4, 5.1_

- [ ] 5.2 CI ワークフローの動作を検証する
  - Bot のみの変更を含む PR で `bot-quality` ジョブのみが実行されることを確認する
  - Web のみの変更を含む PR で `quality` ジョブのみが実行されることを確認する
  - 両方の変更を含む PR で両ジョブが実行されることを確認する
  - `package-lock.json` やルート設定ファイル変更時に両ジョブが実行されることを確認する
  - 品質チェック失敗時に PR ステータスチェックが failure になることを確認する
  - _Requirements: 1.5, 2.1, 2.2, 2.3, 2.4_

- [ ] 5.3 デプロイワークフローの動作を検証する
  - `workflow_dispatch` による手動デプロイが正常に動作することを確認する
  - デプロイログに各ステップの進捗が記録されていることを確認する
  - 既存の Terraform で定義されたリソース構成（Lightsail インスタンス、CloudWatch ロググループ）との整合性を確認する
  - _Requirements: 3.1, 3.2, 3.3, 5.3_
