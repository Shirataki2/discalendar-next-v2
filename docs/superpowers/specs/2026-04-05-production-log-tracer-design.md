# Production Log Tracer - Design Spec

## Overview

本番環境のログを手元のターミナルからリアルタイムにトレースするシェルスクリプト。
Discord Bot (AWS CloudWatch) と Next.js Web (Vercel) の2つのログソースを色付きラベルで統合表示する。

## File

`scripts/logs.sh`

## Usage

```bash
# 両方のログを統合表示（デフォルト）
./scripts/logs.sh

# Bot のみ
./scripts/logs.sh --bot-only

# Web のみ
./scripts/logs.sh --web-only
```

## Dependencies

| ツール | 必須 | 用途 |
|--------|------|------|
| `aws` CLI | Bot ログ取得時 | `aws logs tail` で CloudWatch ストリーミング |
| `vercel` CLI | Web ログ取得時 | `vercel logs --follow` でリアルタイム取得 |
| `jq` | オプション | Bot の Pino JSON ログを整形表示 |

## Architecture

### Startup Flow

1. 引数パース（`--bot-only`, `--web-only`）
2. 必要な CLI の存在チェック（`--bot-only` 時は `vercel` スキップ、`--web-only` 時は `aws` スキップ）
3. 環境変数のバリデーション（Bot: `AWS_REGION`, `CLOUDWATCH_LOG_GROUP`）
4. バックグラウンドで各ログストリームを起動（PID記録）
5. `trap` で Ctrl+C / TERM 時に全子プロセスをクリーンアップ
6. `wait` で子プロセスの終了を待機

### Environment Variables

Bot 用の環境変数はプロジェクトルートの `.env` または `.env.local` から自動読み込みする。
未設定の場合は手動設定を促すエラーメッセージを表示。

| 変数 | デフォルト | 説明 |
|------|-----------|------|
| `AWS_REGION` | `ap-northeast-1` | CloudWatch のリージョン |
| `CLOUDWATCH_LOG_GROUP` | (必須) | Bot ログの CloudWatch ロググループ名 |

Vercel CLI はプロジェクトリンク済み（`.vercel/project.json` 存在）であれば追加設定不要。

### Output Format

```
[BOT] 2026-04-05T10:23:45.123Z INFO  Bot ready as Discalendar#1234
[WEB] 2026-04-05T10:23:46.500Z GET /dashboard 200 in 45ms
[BOT] 2026-04-05T10:23:47.000Z WARN  Guild 12345 not found in cache
```

| Source | Label Color | Processing |
|--------|-------------|------------|
| Bot (CloudWatch) | Cyan `\033[36m` | Pino JSON を `jq` でパース → `LEVEL メッセージ` 形式に整形 |
| Web (Vercel) | Magenta `\033[35m` | Vercel CLI 出力をそのまま表示（既にフォーマット済み） |

### Bot Log Formatting

CloudWatch から取得される Pino JSON を `jq` で以下のように変換:
- `time` フィールド → ISO8601 タイムスタンプ
- `level` (数値) → ラベル（10=TRACE, 20=DEBUG, 30=INFO, 40=WARN, 50=ERROR, 60=FATAL）
- `msg` フィールド → メッセージ本文

`jq` 未インストール時は生 JSON にラベルだけ付けてフォールバック表示。

### AWS CLI Options

- `--follow`: リアルタイムストリーミング
- `--format short`: 簡潔な出力（ストリーム名省略）
- `--since 5m`: スクリプト起動時に直近5分のログも表示

### Vercel CLI Options

- `vercel logs --follow`: プロジェクトリンク済みディレクトリで実行

## Error Handling

### Prerequisite Checks

| 状況 | 動作 |
|------|------|
| `aws` CLI 未インストール | エラー + `brew install awscli` ヒント表示 |
| `vercel` CLI 未インストール | エラー + `pnpm add -g vercel` ヒント表示 |
| `jq` 未インストール | 警告表示、Bot ログは生 JSON + ラベルでフォールバック続行 |
| `CLOUDWATCH_LOG_GROUP` 未設定 | エラー + `.env` / `.env.local` への設定方法を案内 |

### Process Management

- 各ストリームを `&` でバックグラウンド起動、PID を変数に記録
- `trap 'kill $BOT_PID $WEB_PID 2>/dev/null; exit' INT TERM` で Ctrl+C 時に全停止
- 片方が異常終了した場合: エラーメッセージを表示し、残りのストリームは継続

## Testing

- `--bot-only` / `--web-only` の各モードで起動確認
- Ctrl+C で子プロセスが確実に停止されることを確認
- `jq` 未インストール環境でのフォールバック表示を確認
- 必須 CLI 未インストール時のエラーメッセージを確認
