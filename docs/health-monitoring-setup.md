# 死活監視セットアップガイド

Discalendar の Web アプリおよび Discord Bot の死活監視を構成する手順。

## アーキテクチャ概要

```
UptimeRobot (5分間隔)
    │
    ▼ GET /api/health
Next.js Web アプリ
    │
    ▼ SELECT from service_health
Supabase (PostgreSQL)
    ▲
    │ UPSERT (60秒間隔)
Discord Bot (heartbeat task)
    │
    ▼ write /tmp/bot-healthy
Docker healthcheck (60秒間隔)
```

### コンポーネント

| コンポーネント | 役割 |
|---------------|------|
| `/api/health` | ヘルスチェックエンドポイント。DB疎通 + Bot稼働状態を返す |
| `service_health` テーブル | Bot がハートビートを書き込むテーブル |
| Bot heartbeat タスク | 60秒ごとに `service_health` を更新 + センチネルファイル書き込み |
| Docker healthcheck | Bot コンテナのローカルヘルスチェック（センチネルファイルの鮮度確認） |
| UptimeRobot | 外部からの定期監視 + Discord Webhook 通知 |

## 1. データベースマイグレーション

`service_health` テーブルを作成する。

```bash
pnpm supabase db push
```

マイグレーションファイル: `supabase/migrations/20260403234338_create_service_health_table.sql`

### テーブル定義

| カラム | 型 | 説明 |
|--------|---|------|
| `service_name` | `TEXT` (PK) | サービス識別子（例: `discord-bot`） |
| `last_seen_at` | `TIMESTAMPTZ` | 最終ハートビート時刻 |
| `metadata` | `JSONB` | メタデータ（guildCount, wsPing 等） |

RLS ポリシー:
- `anon` ロール: `SELECT` のみ許可（ヘルスチェックエンドポイントが読み取り）
- `service_role`: 全操作可（Bot が書き込み）

## 2. ヘルスチェックエンドポイント

### リクエスト

```
GET /api/health
```

認証不要（公開エンドポイント）。

### レスポンス

**正常時 (HTTP 200)**:
```json
{
  "status": "healthy",
  "db": "connected",
  "bot": "online",
  "botLastSeenAt": "2026-04-03T14:30:00.000Z",
  "botMetadata": {
    "guildCount": 42,
    "wsPing": 55
  },
  "responseTime": 38
}
```

**異常時 (HTTP 503)**:
```json
{
  "status": "unhealthy",
  "db": "connected",
  "bot": "offline",
  "botLastSeenAt": "2026-04-03T14:25:00.000Z",
  "botMetadata": {
    "guildCount": 42,
    "wsPing": 55
  },
  "responseTime": 42
}
```

### ステータス判定ロジック

| 条件 | `status` | HTTP |
|------|----------|------|
| DB接続OK + Bot最終ハートビートが2分以内 | `healthy` | 200 |
| DB接続OK + Bot最終ハートビートが2分超過 | `unhealthy` (bot: `offline`) | 503 |
| DB接続OK + ハートビート行なし | `unhealthy` (bot: `unknown`) | 503 |
| DB接続エラー | `unhealthy` (db: `error`) | 503 |

## 3. Discord Bot ハートビート

Bot は起動後、60秒間隔で以下を実行する:

1. `service_health` テーブルに `discord-bot` 行を upsert（`last_seen_at` + メタデータ更新）
2. 成功時、`/tmp/bot-healthy` にタイムスタンプを書き込み（Docker healthcheck 用）

### 関連ファイル

- `packages/bot/src/tasks/heartbeat.ts` — タスク本体
- `packages/bot/src/services/health-service.ts` — Supabase upsert ロジック

### オフライン判定閾値

`BOT_OFFLINE_THRESHOLD_MS = 120000`（2分）

ハートビート間隔（60秒）の2倍。1回のハートビート失敗は許容し、2回連続失敗でオフライン判定。

## 4. Docker healthcheck

`docker-compose.prod.yml` に設定済み。Bot コンテナ内のセンチネルファイル `/tmp/bot-healthy` のタイムスタンプが120秒以内であることを確認する。

```yaml
healthcheck:
  test: ["CMD", "node", "-e", "const s=require('fs').readFileSync('/tmp/bot-healthy','utf8');const age=Date.now()-Number(s);if(isNaN(age)||age>120000)process.exit(1)"]
  interval: 60s
  timeout: 10s
  retries: 3
  start_period: 60s
```

- `start_period: 60s` — Bot の Discord Gateway 接続完了 + 初回ハートビートまでの猶予
- `retries: 3` — 3回連続失敗で `unhealthy` 判定

## 5. UptimeRobot セットアップ

### 5.1 アカウント作成

[UptimeRobot](https://uptimerobot.com/) で無料アカウントを作成。

### 5.2 モニター追加

1. **Dashboard** → **Add New Monitor**
2. 設定:

| 項目 | 値 |
|------|---|
| Monitor Type | HTTP(s) |
| Friendly Name | Discalendar Health |
| URL | `https://discalendar.app/api/health` |
| Monitoring Interval | 5 minutes |

3. **Advanced Settings**:
   - Keyword Monitoring: Type = `Keyword Exists`, Value = `"status":"healthy"`
   - HTTP Method: `GET`

### 5.3 Discord Webhook 通知の設定

1. **Discord** で通知先チャンネルの **設定** → **連携サービス** → **ウェブフック** → **新しいウェブフック**
2. ウェブフック名（例: `UptimeRobot`）を設定し、**ウェブフックURLをコピー**
3. **UptimeRobot** → **My Settings** → **Alert Contacts** → **Add Alert Contact**
4. 設定:

| 項目 | 値 |
|------|---|
| Alert Contact Type | Webhook |
| Friendly Name | Discord - Monitoring |
| URL to Notify | コピーした Discord Webhook URL |
| POST Value (JSON Header) | `Content-Type: application/json` |
| POST Value (JSON Body) | 下記参照 |

**JSON Body テンプレート**:
```json
{
  "content": null,
  "embeds": [{
    "title": "*monitorFriendlyName* is *alertTypeFriendlyName*",
    "description": "*alertDetails*",
    "color": "*alertTypeColor*",
    "fields": [
      { "name": "URL", "value": "*monitorURL*" },
      { "name": "Duration", "value": "*alertDuration*" }
    ]
  }]
}
```

> UptimeRobot のプレースホルダー（`*monitorFriendlyName*` 等）は送信時に自動置換される。
> 詳細は [UptimeRobot Webhook Docs](https://uptimerobot.com/help/integrations/webhook/) を参照。

5. 作成したモニターの **Alert Contacts** にこの Webhook を追加

### 5.4 動作確認

1. モニター作成後、UptimeRobot が初回チェックを実行するまで待つ（最大5分）
2. Dashboard でステータスが **Up** になっていることを確認
3. テスト通知: Alert Contact の **Send Test Notification** で Discord チャンネルに通知が届くことを確認

## トラブルシューティング

| 症状 | 原因 | 対処 |
|------|------|------|
| `/api/health` が 307 リダイレクトを返す | Middleware で公開ルートに登録されていない | `lib/supabase/proxy.ts` の `isPublicRoute` に `/api/health` が含まれているか確認 |
| `bot: "unknown"` が続く | マイグレーション未適用 or Bot 未デプロイ | `pnpm supabase db push` を実行、Bot をデプロイ |
| `bot: "offline"` が続く | Bot のハートビートが2分以上途絶 | Bot のログを確認。Supabase 接続エラーの可能性 |
| `db: "error"` | Supabase に接続できない | Supabase のステータスページ確認、環境変数が正しいか確認 |
| Docker healthcheck が unhealthy | Bot 起動失敗 or ハートビート書き込み失敗 | `docker logs discalendar-bot` でログ確認 |
