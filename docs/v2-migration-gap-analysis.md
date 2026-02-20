# DisCalendar V2 → Next.js 移植: 不足機能分析

V2（Nuxt.js/Vue 2）と現行 Next.js 実装を比較し、未移植の機能を整理したドキュメント。

## 参照元

- **V2**: `refs/DisCalendarV2/web`（Nuxt.js + Vue 2 + Vuetify）
- **現行**: `discalendar-next`（Next.js 16 + React 19 + shadcn/ui）

---

## V2 機能一覧と移植状況

### ページ / ルート

| V2 ルート | 機能 | 移植状況 |
|-----------|------|----------|
| `/` | ランディングページ | ✅ 実装済み |
| `/login` | Discord OAuth ログイン | ✅ `/auth/login` として実装済み |
| `/callback` | OAuth コールバック | ✅ `/auth/callback` として実装済み |
| `/logout` | ログアウト（Cookie 全削除） | ✅ サーバーアクション (`signOut`) + `LogoutButton` で実装 |
| `/dashboard` | ギルド選択 + カレンダー | ✅ 実装済み |
| `/dashboard/:id` | ギルド別カレンダー | ✅ ギルド切り替えで実現 |
| `/docs/:slug` | ドキュメントページ | ✅ 実装済み（7 種: getting-started, login, invite, initialize, calendar, edit, commands） |
| `/support/:slug` | 利用規約・プライバシーポリシー | ✅ `/terms`, `/privacy` として実装済み |
| `/authorized` | 認証テスト | ⛔ 移植不要 |

### カレンダー機能

| 機能 | V2 | 現行 | 状況 |
|------|-----|------|------|
| 月表示 | ✅ | ✅ | ✅ 実装済み |
| 週表示 | ✅ | ✅ | ✅ 実装済み |
| 日表示 | ✅ | ✅ | ✅ 実装済み |
| 4日表示 | ✅ | ❌ | ❌ 未実装 |
| イベント作成 | ✅ | ✅ | ✅ 実装済み |
| イベント編集 | ✅ | ✅ | ✅ 実装済み |
| イベント削除 | ✅ | ✅ | ✅ 実装済み |
| 終日イベント | ✅ | ✅ | ✅ 実装済み |
| イベント色分け | ✅ | ✅ | ✅ 実装済み |
| ドラッグ移動 | ✅ | ✅ | ✅ 実装済み |
| ドラッグリサイズ（時間延長） | ✅ | ✅ | ✅ 実装済み（`calendar-grid.tsx` で DnD + リサイズ対応） |
| イベント通知設定 | ✅（最大10件） | ✅ | ✅ UI 実装済み（`notification-field.tsx`、DB `notifications JSONB`）。Bot 側通知送信は未実装 |
| 日付ピッカーナビゲーション | ✅ | ❌ | ❌ 未実装（前/次/今日 ボタンのみ） |

### 認証・権限

| 機能 | V2 | 現行 | 状況 |
|------|-----|------|------|
| Discord OAuth ログイン | ✅ | ✅ | ✅ 実装済み（Supabase Auth + Discord プロバイダー） |
| セッション管理（Cookie） | ✅ | ✅ | ✅ Supabase SSR で実装 |
| トークン自動リフレッシュ | ✅ | ✅ | ✅ Supabase SSR がセッション更新を管理 |
| ギルド内権限チェック | ✅ | ✅ | ✅ 実装済み（`lib/discord/permissions.ts` でビットフィールド解析、`permission-check.ts` で操作権限チェック） |
| 管理者のみ編集制限 | ✅ | ✅ | ✅ 実装済み（`guild_config.restricted` + `guild-settings-panel.tsx` + Server Action 側チェック） |

### ギルド管理

| 機能 | V2 | 現行 | 状況 |
|------|-----|------|------|
| ギルド一覧表示 | ✅ | ✅ | ✅ 実装済み |
| ギルドアイコン表示 | ✅ | ✅ | ✅ 実装済み |
| ギルド選択・切り替え | ✅ | ✅ | ✅ 実装済み |
| BOT 招待フロー | ✅ | ✅ | ✅ 実装済み（`invitable-guild-card.tsx`、`canInviteBot()` 権限判定） |
| ギルド設定（restricted） | ✅ | ✅ | ✅ 実装済み（`guild-settings-panel.tsx`、`guild-config-service.ts`、RLS ポリシー付き） |

### UI / UX

| 機能 | V2 | 現行 | 状況 |
|------|-----|------|------|
| ダーク / ライトテーマ | ✅ | ✅ | ✅ 実装済み（`next-themes` + `theme-switcher.tsx`） |
| レスポンシブデザイン | ✅ | ✅ | ✅ 実装済み |
| ナビゲーションドロワー | ✅ | ✅ | ✅ モバイルナビ（`mobile-nav.tsx`）+ ギルドサイドバー |
| ローディングアニメーション | ✅ | ✅ | ✅ 実装済み |
| フッター（バージョン表示） | ✅ | ✅ | ✅ 実装済み |

---

## 残存する不足機能

### 1. 4 日表示ビュー

**V2 の実装:**
- Vuetify Calendar の `4day` ビュータイプ
- 週表示と日表示の中間的な表示

**現行の状況:**
- `react-big-calendar` では標準で 4 日ビューがない

**必要な作業:**
- `react-big-calendar` のカスタムビュー実装
- ツールバーへのビュー切り替え追加

---

### 2. カレンダー日付ピッカーナビゲーション

**V2 の実装:**
- ツールバーに日付ピッカーを配置
- カレンダーで特定の日付にジャンプ可能

**現行の状況:**
- 前/次/今日 ボタンのみ（`calendar-toolbar.tsx`）

**必要な作業:**
- 日付ピッカーコンポーネントの追加
- ツールバーへの組み込み

---

### 3. Discord Bot 通知送信

**V2 の実装:**
- イベントに設定された通知タイミングで Discord チャンネルに通知を送信

**現行の状況:**
- UI（`notification-field.tsx`）と DB（`notifications JSONB`、`event_settings`、`append_notification` 関数）は準備済み
- Bot 本体のコードはこのリポジトリに存在しない
- 実際の Discord への通知送信ロジックは未実装

**必要な作業:**
- Discord Bot 側の通知スケジューラ実装（別リポジトリ）
- `event_settings.channel_id` との連携

---

## 優先度マトリクス

### 高優先度（公開前に必須）

なし — V2 の主要機能はすべて移植済み。

### 中優先度（公開後早期に対応）

| # | 機能 | 理由 |
|---|------|------|
| 1 | Discord Bot 通知送信 | コア機能だが Bot 側の実装が必要（UI/DB は準備済み） |
| 2 | カレンダー日付ピッカー | ナビゲーション改善 |

### 低優先度（余裕があれば対応）

| # | 機能 | 理由 |
|---|------|------|
| 3 | 4 日表示ビュー | ニッチな需要 |

---

## V2 で未使用 / 移植不要な機能

| 機能 | 理由 |
|------|------|
| `/authorized` テストページ | 開発用のみ |
| Google Analytics プラグイン | 別途導入判断 |
| PWA サポート | 別途導入判断 |
| json-bigint | Supabase が BigInt を適切に処理 |
| Vuex ストア | React hooks + Supabase で代替済み |

---

## データモデル比較

### イベント

| フィールド | V2 | 現行 | 差異 |
|-----------|-----|------|------|
| id | number | UUID | ✅ 改善（UUID 採用） |
| guild_id | string | VARCHAR(32) | ✅ 同等 |
| name | VARCHAR(32) | VARCHAR(255) | ✅ 改善（文字数増加） |
| description | VARCHAR(500) | TEXT | ✅ 改善（制限なし） |
| color | string | VARCHAR(7) | ✅ 同等 |
| is_all_day | boolean | boolean | ✅ 同等 |
| start_at | DateTime | TIMESTAMPTZ | ✅ 同等 |
| end_at | DateTime | TIMESTAMPTZ | ✅ 同等 |
| notifications | Notification[] | JSONB | ✅ 実装済み（UI + DB） |
| location | - | VARCHAR(255) | ✅ 新規追加 |
| channel_id | - | VARCHAR(32) | ✅ 新規追加 |
| channel_name | - | VARCHAR(100) | ✅ 新規追加 |
| created_at | DateTime | TIMESTAMPTZ | ✅ 同等 |
| updated_at | - | TIMESTAMPTZ | ✅ 新規追加 |

### 追加テーブル（V2 にない新規テーブル）

| テーブル | 用途 |
|---------|------|
| `event_settings` | ギルドごとの通知チャンネル設定 |
| `guild_config` | ギルド設定（restricted フラグ等） |

---

## 移植完了サマリー

V2 の主要機能 **35 項目中 33 項目**が移植完了（**94%**）。残り 2 項目はいずれも低〜中優先度（Bot 通知送信は別リポジトリ）。

| カテゴリ | 合計 | 完了 | 未完了 |
|---------|------|------|--------|
| ページ / ルート | 8 | 8 | 0 |
| カレンダー機能 | 12 | 10 | 2 |
| 認証・権限 | 5 | 5 | 0 |
| ギルド管理 | 5 | 5 | 0 |
| UI / UX | 5 | 5 | 0 |
| **合計** | **35** | **33** | **2** |

※ Bot 通知送信は別リポジトリの実装であり、Web 側の対応（UI/DB）は完了済み。

---

*最終更新: 2026-02-19*
