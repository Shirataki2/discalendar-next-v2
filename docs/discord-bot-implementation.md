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
import discord
from discord.ext import commands
from supabase import create_client, Client

class DisCalendarBot(commands.Bot):
    def __init__(self):
        intents = discord.Intents.default()
        intents.guilds = True
        super().__init__(command_prefix="cal ", intents=intents)
        
        self.supabase: Client = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_SERVICE_KEY")
        )
    
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
from discord import app_commands
from discord.ext import commands

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
        range: app_commands.Choice[str] = None
    ):
        range_value = range.value if range else "future"
        guild_id = str(interaction.guild_id)
        
        # Supabaseからイベント取得
        response = self.bot.supabase.table("events")\
            .select("*")\
            .eq("guild_id", guild_id)\
            .order("start_at")\
            .execute()
        
        events = response.data
        
        if not events:
            await interaction.response.send_message(
                "現在登録されている予定はありません",
                ephemeral=True
            )
            return
        
        embed = discord.Embed(title="予定一覧", color=0x0000ff)
        for event in events[:10]:  # 最大10件
            embed.add_field(
                name=event["name"],
                value=f"開始: {event['start_at']}\n終了: {event['end_at']}",
                inline=False
            )
        
        await interaction.response.send_message(embed=embed)

async def setup(bot):
    await bot.add_cog(ListCommand(bot))
```

### 通知タスク例

```python
from discord.ext import tasks
from datetime import datetime, timezone

class NotifyTask(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.notify_loop.start()
    
    def cog_unload(self):
        self.notify_loop.cancel()
    
    @tasks.loop(seconds=60)
    async def notify_loop(self):
        now = datetime.now(timezone.utc)
        
        # 通知対象のイベントを取得
        response = self.bot.supabase.table("events")\
            .select("*, event_settings!inner(channel_id)")\
            .gte("start_at", now.isoformat())\
            .execute()
        
        for event in response.data:
            # 通知時刻チェック・送信処理
            await self.send_notification(event)
    
    async def send_notification(self, event):
        channel = self.bot.get_channel(int(event["event_settings"]["channel_id"]))
        if not channel:
            return
        
        embed = discord.Embed(
            title=event["name"],
            description=event.get("description", ""),
            color=int(event["color"].lstrip("#"), 16)
        )
        embed.add_field(name="日時", value=event["start_at"])
        
        await channel.send("📅 以下の予定が開催されます", embed=embed)
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

## 参考リンク

- [discord.py Documentation](https://discordpy.readthedocs.io/)
- [Supabase Python Client](https://supabase.com/docs/reference/python/introduction)
- [Discord Developer Portal](https://discord.com/developers/applications)
- 既存Bot実装: `refs/DisCalendarV2/bot/`
