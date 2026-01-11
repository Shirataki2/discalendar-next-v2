# Discord Bot 実装計画

## 概要

discalendar-next プロジェクトと連携するDiscord Botを別リポジトリで実装する。  
データベースは discalendar-next のSupabaseを共有し、スキーマ定義はこのリポジトリで管理する。

## 技術スタック

| 項目 | 技術 | 備考 |
|------|------|------|
| 言語 | Python 3.12+ | 既存Bot (Rust) からの移行 |
| Discordフレームワーク | discord.py 2.x | Slash Commands対応 |
| データベース | Supabase (PostgreSQL) | discalendar-nextと共有 |
| DBクライアント | supabase-py | 公式Python SDK |
| 非同期処理 | asyncio | discord.pyのevent loop活用 |
| 環境変数 | python-dotenv | .env管理 |
| ログ | logging / structlog | 構造化ログ推奨 |
| タスクスケジューラ | discord.ext.tasks | 定期実行タスク用 |

## 既存Botの機能一覧

### Slash Commands

| コマンド | 説明 | 権限 |
|----------|------|------|
| `/create` | 予定を新規作成 | 全員（制限モード時は管理者のみ） |
| `/list` | 予定一覧を表示（過去/未来/全て） | 全員 |
| `/init` | 通知先チャンネルを設定 | 管理者権限必須 |
| `/help` | ヘルプを表示 | 全員 |
| `/invite` | Bot招待URLを表示 | 全員 |

### イベントハンドラ

| イベント | 処理内容 |
|----------|----------|
| `on_guild_join` | サーバー参加時にguildsテーブルに登録 |
| `on_guild_remove` | サーバー退出時にguildsテーブルから削除 |
| `on_guild_update` | サーバー情報更新時にguildsテーブルを更新 |

### バックグラウンドタスク

| タスク | 間隔 | 処理内容 |
|--------|------|----------|
| notify | 60秒 | 予定開始時刻に通知を送信 |
| presence | 10秒 | Botのステータス表示を更新 |
| icon_updater | 60秒 | アイコン関連の更新（将来的に廃止検討） |

## データベーススキーマ

### 既存テーブル（discalendar-nextで定義済み）

#### guilds
```sql
CREATE TABLE guilds (
    id SERIAL PRIMARY KEY,
    guild_id VARCHAR(32) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(512),
    locale VARCHAR(10) NOT NULL DEFAULT 'ja'
);
```

#### events
```sql
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id VARCHAR(32) NOT NULL REFERENCES guilds(guild_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) NOT NULL DEFAULT '#3B82F6',
    is_all_day BOOLEAN NOT NULL DEFAULT false,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    location VARCHAR(255),
    channel_id VARCHAR(32),
    channel_name VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 追加が必要なテーブル（マイグレーションで追加）

#### event_settings（通知先チャンネル設定）
```sql
CREATE TABLE event_settings (
    id SERIAL PRIMARY KEY,
    guild_id VARCHAR(32) UNIQUE NOT NULL REFERENCES guilds(guild_id) ON DELETE CASCADE,
    channel_id VARCHAR(32) NOT NULL
);
```

#### guild_config（サーバー設定）
```sql
CREATE TABLE guild_config (
    guild_id VARCHAR(32) PRIMARY KEY REFERENCES guilds(guild_id) ON DELETE CASCADE,
    restricted BOOLEAN NOT NULL DEFAULT false
);
```

#### 通知機能用カラム追加
```sql
ALTER TABLE events ADD COLUMN notifications JSONB DEFAULT '[]'::jsonb;
```

#### 通知履歴記録用ヘルパー関数
```sql
CREATE OR REPLACE FUNCTION append_notification(
    event_id UUID,
    notification JSONB
) RETURNS void AS $$
BEGIN
    UPDATE events
    SET notifications = notifications || jsonb_build_array(notification)
    WHERE id = event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**使用方法:**
```python
# 通知成功時
bot.supabase.rpc(
    "append_notification",
    {
        "event_id": event_id,
        "notification": {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "status": "success"
        }
    }
).execute()

# 通知失敗時
bot.supabase.rpc(
    "append_notification",
    {
        "event_id": event_id,
        "notification": {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "status": "failed",
            "error": "Channel not found"
        }
    }
).execute()
```

## プロジェクト構成（Bot側リポジトリ）

```
discalendar-bot/
├── src/
│   ├── __init__.py
│   ├── main.py              # エントリーポイント
│   ├── bot.py               # Botクラス定義
│   ├── config.py            # 設定・環境変数
│   ├── commands/            # Slashコマンド
│   │   ├── __init__.py
│   │   ├── create.py
│   │   ├── list.py
│   │   ├── init.py
│   │   ├── help.py
│   │   └── invite.py
│   ├── events/              # イベントハンドラ
│   │   ├── __init__.py
│   │   └── guild.py
│   ├── tasks/               # バックグラウンドタスク
│   │   ├── __init__.py
│   │   ├── notify.py
│   │   └── presence.py
│   ├── models/              # データモデル
│   │   ├── __init__.py
│   │   ├── guild.py
│   │   ├── event.py
│   │   └── settings.py
│   ├── services/            # ビジネスロジック
│   │   ├── __init__.py
│   │   ├── guild_service.py
│   │   └── event_service.py
│   └── utils/               # ユーティリティ
│       ├── __init__.py
│       ├── embeds.py        # Embed生成ヘルパー
│       ├── permissions.py   # 権限チェック
│       └── datetime.py      # 日時ユーティリティ
├── tests/
├── .env.example
├── .gitignore
├── pyproject.toml           # Poetry or uv
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## 環境変数

```env
# Discord
BOT_TOKEN=your_bot_token
APPLICATION_ID=your_app_id
INVITATION_URL=https://discord.com/api/oauth2/authorize?client_id=...

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key  # Bot用はservice_roleを使用

# Optional
LOG_LEVEL=INFO
SENTRY_DSN=https://...  # エラー監視用
```

## 実装フェーズ

### Phase 1: 基盤構築
1. リポジトリ作成・プロジェクト初期化
2. discord.py + supabase-py セットアップ
3. 基本的なBot起動・接続確認
4. Supabase接続確認

### Phase 2: イベントハンドラ
1. `on_guild_join` - サーバー参加時の登録
2. `on_guild_remove` - サーバー退出時の削除
3. `on_guild_update` - サーバー情報更新

### Phase 3: Slashコマンド（基本）
1. `/help` - ヘルプ表示
2. `/invite` - 招待URL表示
3. `/list` - 予定一覧表示

### Phase 4: Slashコマンド（CRUD）
1. `/create` - 予定作成
2. `/init` - 通知先設定

### Phase 5: バックグラウンドタスク
1. notify - 予定通知
2. presence - ステータス更新

### Phase 6: 追加機能・改善
1. ページネーション対応
2. エラーハンドリング強化
3. ログ・監視設定
4. Docker化・デプロイ

## discord.py 実装例

### Botクラス

```python
import os
import discord
from discord.ext import commands
from supabase import create_client, Client

class DisCalendarBot(commands.Bot):
    def __init__(self):
        intents = discord.Intents.default()
        intents.guilds = True
        super().__init__(command_prefix="cal ", intents=intents)
        
        supabase_url: str = os.getenv("SUPABASE_URL", "")
        supabase_key: str = os.getenv("SUPABASE_SERVICE_KEY", "")
        
        if not supabase_url or not supabase_key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
        
        self.supabase: Client = create_client(supabase_url, supabase_key)
    
    async def setup_hook(self):
        # Cogのロード
        await self.load_extension("commands.create")
        await self.load_extension("commands.list")
        # ...
        
        # Slashコマンド同期
        await self.tree.sync()
    
    async def on_ready(self):
        print(f"Logged in as {self.user}")
```

### Slashコマンド例 (`/list`)

```python
from typing import Optional
from discord import app_commands
from discord.ext import commands
import discord
import logging

logger = logging.getLogger(__name__)

class ListCommand(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
    
    @app_commands.command(name="list", description="予定の一覧を表示します")
    @app_commands.choices(range=[
        app_commands.Choice(name="過去", value="past"),
        app_commands.Choice(name="未来", value="future"),
        app_commands.Choice(name="全て", value="all"),
    ])
    async def list_events(
        self, 
        interaction: discord.Interaction,
        range: Optional[app_commands.Choice[str]] = None
    ):
        if interaction.guild_id is None:
            await interaction.response.send_message(
                "このコマンドはサーバー内でのみ使用できます",
                ephemeral=True
            )
            return
        
        range_value: str = range.value if range else "future"
        guild_id: str = str(interaction.guild_id)
        
        try:
            # Supabaseからイベント取得（必要なフィールドのみ明示的に指定）
            response = self.bot.supabase.table("events")\
                .select("id, name, start_at, end_at, description, color")\
                .eq("guild_id", guild_id)\
                .order("start_at")\
                .execute()
            
            events: list[dict[str, any]] = response.data
            
            if not events:
                await interaction.response.send_message(
                    "現在登録されている予定はありません",
                    ephemeral=True
                )
                return
            
            embed = discord.Embed(title="予定一覧", color=0x0000ff)
            for event in events[:10]:  # 最大10件
                event_name: str = event.get("name", "無題")
                start_at: str = event.get("start_at", "不明")
                end_at: str = event.get("end_at", "不明")
                embed.add_field(
                    name=event_name,
                    value=f"開始: {start_at}\n終了: {end_at}",
                    inline=False
                )
            
            await interaction.response.send_message(embed=embed)
        except Exception as e:
            logger.error(f"Failed to fetch events for guild {guild_id}: {e}", exc_info=True)
            await interaction.response.send_message(
                "予定の取得中にエラーが発生しました",
                ephemeral=True
            )

async def setup(bot):
    await bot.add_cog(ListCommand(bot))
```

### 通知タスク例

```python
from typing import Dict, Any, Optional
from discord.ext import tasks
from datetime import datetime, timezone, timedelta
import discord
import logging

logger = logging.getLogger(__name__)

class NotifyTask(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.notify_loop.start()
    
    def cog_unload(self):
        self.notify_loop.cancel()
    
    @tasks.loop(seconds=60)
    async def notify_loop(self):
        now = datetime.now(timezone.utc)
        # 1分以内に開始するイベントのみを取得（重複通知を防ぐ）
        one_minute_later = now + timedelta(minutes=1)
        
        try:
            # 通知対象のイベントを取得（必要なフィールドのみ明示的に指定）
            # 既に通知済みのイベントは除外（notifications配列に"success"ステータスがあるものは除外）
            response = self.bot.supabase.table("events")\
                .select("id, name, description, color, start_at, notifications, event_settings!inner(channel_id)")\
                .gte("start_at", now.isoformat())\
                .lte("start_at", one_minute_later.isoformat())\
                .execute()
            
            for event in response.data:
                # 既に通知済みかチェック
                notifications: list[dict[str, any]] = event.get("notifications", [])
                has_success_notification = any(
                    n.get("status") == "success" 
                    for n in notifications 
                    if isinstance(n, dict)
                )
                
                if has_success_notification:
                    logger.debug(f"Event {event.get('id')}: Already notified, skipping")
                    continue
                
                # 通知時刻チェック・送信処理
                await self.send_notification(event)
        except Exception as e:
            logger.error(f"Failed to fetch events for notification: {e}", exc_info=True)
    
    async def send_notification(self, event: Dict[str, Any]) -> None:
        """イベント通知を送信する
        
        Args:
            event: 通知対象のイベントデータ
        """
        event_id: str = event.get("id", "unknown")
        channel_id_str: Optional[str] = event.get("event_settings", {}).get("channel_id")
        
        if not channel_id_str:
            logger.warning(f"Event {event_id}: channel_id not found in event_settings")
            await self._record_notification_failure(event_id, "channel_id not configured")
            return
        
        try:
            channel_id: int = int(channel_id_str)
            channel = self.bot.get_channel(channel_id)
            
            if not channel:
                error_msg = f"Channel {channel_id} not found or bot has no access"
                logger.warning(f"Event {event_id}: {error_msg}")
                await self._record_notification_failure(event_id, error_msg)
                return
            
            embed = discord.Embed(
                title=event["name"],
                description=event.get("description", ""),
                color=int(event["color"].lstrip("#"), 16)
            )
            embed.add_field(name="日時", value=event["start_at"])
            
            await channel.send("📅 以下の予定が開催されます", embed=embed)
            await self._record_notification_success(event_id)
            logger.info(f"Event {event_id}: Notification sent successfully to channel {channel_id}")
            
        except ValueError as e:
            error_msg = f"Invalid channel_id format: {channel_id_str}"
            logger.error(f"Event {event_id}: {error_msg} - {e}")
            await self._record_notification_failure(event_id, error_msg)
        except discord.HTTPException as e:
            error_msg = f"Failed to send message: {e}"
            logger.error(f"Event {event_id}: {error_msg}")
            await self._record_notification_failure(event_id, error_msg)
        except Exception as e:
            error_msg = f"Unexpected error: {e}"
            logger.error(f"Event {event_id}: {error_msg}")
            await self._record_notification_failure(event_id, error_msg)
    
    async def _record_notification_success(self, event_id: str) -> None:
        """通知成功を記録する
        
        Args:
            event_id: イベントID
        """
        try:
            self.bot.supabase.rpc(
                "append_notification",
                {
                    "event_id": event_id,
                    "notification": {
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "status": "success"
                    }
                }
            ).execute()
            logger.debug(f"Event {event_id}: Notification success recorded")
        except Exception as e:
            # 記録失敗は警告として記録（通知自体は成功しているため）
            logger.warning(
                f"Failed to record notification success for event {event_id}: {e}",
                exc_info=True
            )
            # 繰り返し失敗する場合は、メトリクスやアラートを検討
    
    async def _record_notification_failure(self, event_id: str, error: str) -> None:
        """通知失敗を記録する（notifications JSONBカラムに保存）
        
        Args:
            event_id: イベントID
            error: エラーメッセージ
        """
        try:
            self.bot.supabase.rpc(
                "append_notification",
                {
                    "event_id": event_id,
                    "notification": {
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "status": "failed",
                        "error": error
                    }
                }
            ).execute()
            logger.debug(f"Event {event_id}: Notification failure recorded: {error}")
        except Exception as e:
            # 記録失敗はエラーとして記録（通知失敗の記録も失敗しているため）
            logger.error(
                f"Failed to record notification failure for event {event_id}: {e}",
                exc_info=True
            )
            # 繰り返し失敗する場合は、メトリクスやアラートを検討
```

## 注意事項

### 権限（Scopes & Permissions）

Bot招待時に必要な権限:
- `bot` scope
- `applications.commands` scope
- Permissions:
  - Send Messages
  - Embed Links
  - Use Slash Commands

### Supabase接続

- Bot側は `service_role` キーを使用（RLSをバイパス）
- Web側（discalendar-next）は `anon` キーを使用（RLS適用）
- 環境変数の取り扱いに注意

### タイムゾーン

- データベースは `TIMESTAMPTZ` で統一
- 表示時は日本時間（JST, UTC+9）に変換
- 既存Botでは `chrono::Utc::now() + Duration::hours(9)` で対応

## マイグレーションロールバック戦略

### ロールバックが必要な場合

マイグレーション `20260101212853_add_bot_settings_and_notifications.sql` をロールバックする必要がある場合、以下の手順を実行してください。

#### 1. ロールバック用マイグレーションファイルの作成

新しいマイグレーションファイル（例: `20260101220000_rollback_bot_settings.sql`）を作成し、以下の内容を記述します:

```sql
-- ロールバック: Bot設定スキーマと通知機能の削除

-- ヘルパー関数の削除
DROP FUNCTION IF EXISTS append_notification(UUID, JSONB);

-- eventsテーブルからnotificationsカラムを削除
-- 注意: 既存データは失われます
ALTER TABLE events DROP COLUMN IF EXISTS notifications;

-- guild_configテーブルの削除
DROP TABLE IF EXISTS guild_config;

-- event_settingsテーブルの削除
DROP TABLE IF EXISTS event_settings;
```

#### 2. ロールバック前の確認事項

- **データバックアップ**: 本番環境では、ロールバック前にデータベースのバックアップを取得してください
- **Botの停止**: ロールバック中はBotを停止し、データベースへの書き込みを防いでください
- **依存関係の確認**: 他のマイグレーションやアプリケーションがこのスキーマに依存していないか確認してください

#### 3. ロールバックの実行

```bash
# Supabase CLIを使用する場合
supabase migration up --version 20260101220000

# または、SQLファイルを直接実行
psql -h <host> -U <user> -d <database> -f 20260101220000_rollback_bot_settings.sql
```

#### 4. ロールバック後の確認

- テーブルが正しく削除されたことを確認
- 既存のアプリケーション（Web側）が正常に動作することを確認
- Bot側のコードがこのスキーマを参照していないことを確認

#### 5. 部分的なロールバック

特定のテーブルのみをロールバックする場合:

```sql
-- event_settingsのみを削除
DROP TABLE IF EXISTS event_settings;

-- または、notificationsカラムのみを削除
ALTER TABLE events DROP COLUMN IF EXISTS notifications;
```

### 注意事項

- **データ損失**: `notifications`カラムを削除すると、既存の通知履歴データは失われます
- **外部キー制約**: `event_settings`と`guild_config`は`guilds`テーブルに依存しているため、`guilds`テーブルを削除する場合は自動的に削除されます（CASCADE）
- **RLSポリシー**: テーブルを削除すると、関連するRLSポリシーも自動的に削除されます

## 参考リンク

- [discord.py Documentation](https://discordpy.readthedocs.io/)
- [Supabase Python Client](https://supabase.com/docs/reference/python/introduction)
- [Discord Developer Portal](https://discord.com/developers/applications)
- 既存Bot実装: `refs/DisCalendarV2/bot/`
