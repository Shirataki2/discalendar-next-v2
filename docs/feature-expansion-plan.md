# Discalendar 機能拡張計画

## 0. エグゼクティブサマリー

Discalendar は Discord コミュニティ向けカレンダー予定管理サービスである。Nuxt.js/Vue 2 版から Next.js 16 + React 19 への移植は **94% 完了**（35 項目中 33 項目）しており、Web アプリは本番レベルの品質に到達している。

**残存ギャップ（3 項目）:**

| # | 項目 | 影響度 | 備考 |
|---|------|--------|------|
| 1 | Discord Bot 通知送信 | 中 | UI/DB は実装済み、Bot 側スケジューラが未実装 |
| 2 | カレンダー日付ピッカー | 低 | ナビゲーション改善 |
| 3 | 4 日表示ビュー | 低 | ニッチな需要 |

**差別化要素:**
- **Web カレンダー UI**: 競合がすべて Bot/コマンドベースなのに対し、ブラウザ上のビジュアルカレンダーを提供
- **日本語ファースト**: 競合は英語 UI のみ、日本市場をカバーする唯一のサービス
- **モダン技術スタック**: Next.js 16 / React 19 / Supabase による高速・安全なアーキテクチャ

**収益化への道筋:**
フリーミアムモデルで無料ユーザーを獲得し、通知件数・繰り返しイベント・外部連携を Pro 機能として段階的にアップセルする。

---

## 1. 現状分析と差別化ポイント

### 1.1 実装済み機能の強み

| カテゴリ | 機能 | 競合優位性 |
|---------|------|-----------|
| カレンダー | 月/週/日ビュー | 競合は Bot コマンドでリスト表示のみ |
| カレンダー | ドラッグ&ドロップ移動 | Web UI ならではの直感操作 |
| カレンダー | ドラッグリサイズ（時間延長） | 同上 |
| カレンダー | 終日イベント対応 | 競合も対応 |
| カレンダー | イベント色分け | 視覚的な分類が可能 |
| カレンダー | 通知設定 UI（最大 10 件） | 柔軟な通知タイミング設定 |
| 認証 | Discord OAuth + Supabase SSR | Cookie ベースのセキュアな認証 |
| 認証 | ギルド内権限チェック | ビットフィールド解析による正確な権限判定 |
| 設定 | 管理者のみ編集制限（restricted） | `guild_config` + Server Action で安全に制御 |
| UI/UX | ダーク/ライトテーマ | 全画面対応 |
| UI/UX | レスポンシブデザイン | モバイルでもカレンダー操作が可能 |
| ドキュメント | 7 種のヘルプドキュメント | オンボーディング完備 |
| 法務 | 利用規約・プライバシーポリシー | 日本法準拠の詳細な規約 |

### 1.2 競合にない強み

1. **ビジュアルカレンダー**: Google Calendar ライクな月/週/日ビューで予定を一目で把握
2. **ドラッグ操作**: 予定の移動・リサイズが直感的
3. **ダークモード**: Discord ユーザーの好みに合致
4. **レスポンシブ**: モバイルブラウザでも操作可能
5. **日本語 UI**: ローカライズ不要で日本市場に即座に訴求

### 1.3 正直な弱点

| 未実装機能 | 競合の対応状況 | 影響 |
|-----------|--------------|------|
| 繰り返しイベント | Apollo/Sesh ともに対応 | コミュニティの定例イベントに不可欠 |
| Google Calendar 連携 | Sesh が対応 | 個人カレンダーとの統合ニーズ |
| RSVP（出欠管理） | Apollo/Sesh ともに対応 | イベント運営に必須 |
| AI 自然言語入力 | Sesh が対応 | 「明日 20 時にゲーム大会」のような入力 |
| iCal エクスポート | 一部競合が対応 | 外部ツールとの連携 |

---

## 2. ターゲット市場

### 2.1 主要ターゲットセグメント

| セグメント | Discord サーバー規模 | 予定頻度 | 課金意欲 |
|-----------|-------------------|---------|---------|
| VTuber コミュニティ | 100〜10,000 人 | 高（配信スケジュール） | 中〜高 |
| ゲーミングコミュニティ | 50〜5,000 人 | 高（レイド・大会） | 中 |
| 勉強・学習グループ | 10〜500 人 | 中（勉強会・輪読会） | 低〜中 |
| 趣味コミュニティ | 20〜2,000 人 | 中（オフ会・作業通話） | 低〜中 |
| 企業・チーム | 5〜100 人 | 高（ミーティング） | 高 |

### 2.2 日本市場固有の機会

- **既存のロケール対応**: `guilds.locale` カラムで `ja` がデフォルト設定済み
- **日本の祝日**: 祝日表示機能は日本ユーザーに高い訴求力
- **競合の英語 UI**: Apollo・Sesh はいずれも英語のみ。日本語 Discord コミュニティに選択肢がない
- **VTuber 文化**: 日本発の VTuber コミュニティは Discord を活用しており、配信スケジュール管理の需要が大きい
- **決済環境**: Stripe は日本円対応済み。Discord App Subscriptions も日本で利用可能

### 2.3 市場規模の推定

- Discord の日本アクティブユーザー: 推定 500 万人以上
- 予定管理 Bot を導入しているサーバー: 全体の 5〜10%
- 初期ターゲット: 日本語コミュニティの中〜大規模サーバー（100 人以上）

---

## 3. マネタイズ戦略

### 3.1 プラン設計

| | **Free** | **Pro** | **Guild Pro** | **Enterprise** |
|---|---------|---------|--------------|----------------|
| **価格** | ¥0 | ¥500/月 | ¥1,500/月（サーバー単位） | 要相談 |
| イベント上限 | 50 件/月 | 無制限 | 無制限 | 無制限 |
| 通知件数 | 1 件/イベント | 10 件/イベント | 10 件/イベント | 無制限 |
| カレンダービュー | 月/週/日 | 月/週/日/4日 | 月/週/日/4日 | 全ビュー |
| 繰り返しイベント | - | ✅ | ✅ | ✅ |
| Google Calendar 連携 | - | ✅ | ✅ | ✅ |
| iCal エクスポート | - | ✅ | ✅ | ✅ |
| RSVP（出欠管理） | - | - | ✅ | ✅ |
| カスタム Embed | - | - | ✅ | ✅ |
| Webhook 連携 | - | - | ✅ | ✅ |
| 統計ダッシュボード | - | - | ✅ | ✅ |
| カスタム Bot | - | - | - | ✅ |
| SLA | - | - | - | ✅ |
| サポート | コミュニティ | メール | 優先メール | 専任 |

### 3.2 価格根拠

- **Pro ¥500/月**: Apollo（$5.99≒¥900/月）より安価で参入障壁を下げる
- **Guild Pro ¥1,500/月**: サーバー全体の管理機能を包括。Apollo の Premium サーバー価格帯に相当
- 日本市場の課金感覚を考慮し、コーヒー 1 杯程度の価格設定

### 3.3 決済基盤

**Discord App Subscriptions（推奨・優先）:**
- Discord 内で直接課金、ユーザーの摩擦が最小
- Discord が決済処理を担当（手数料あり）
- `discord_entitlements` テーブルで Entitlement を管理

**Stripe（補助・Web 直接課金）:**
- Discord App Subscriptions でカバーできない Enterprise プラン向け
- Web ダッシュボードからの直接課金
- `subscriptions` テーブルで管理

### 3.4 課金用 DB スキーマ案

```sql
-- サブスクリプション管理（Stripe 用）
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id VARCHAR(32) NOT NULL REFERENCES guilds(guild_id) ON DELETE CASCADE,
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255) UNIQUE,
    plan VARCHAR(20) NOT NULL CHECK (plan IN ('free', 'pro', 'guild_pro', 'enterprise')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Discord App Subscriptions 用 Entitlement 管理
CREATE TABLE discord_entitlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id VARCHAR(32) NOT NULL REFERENCES guilds(guild_id) ON DELETE CASCADE,
    discord_entitlement_id VARCHAR(32) UNIQUE NOT NULL,
    sku_id VARCHAR(32) NOT NULL,
    plan VARCHAR(20) NOT NULL CHECK (plan IN ('pro', 'guild_pro')),
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS ポリシー
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discord_entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_users_can_read_subscriptions"
    ON subscriptions FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_users_can_read_discord_entitlements"
    ON discord_entitlements FOR SELECT TO authenticated USING (true);
```

### 3.5 課金ゲーティングの実装方針

既存の `guild_config.restricted` パターン（`guild-settings-panel.tsx` の Switch トグル + Server Action）を応用し、プランに応じた機能制限を実装する。

```typescript
// 概念的な実装
async function checkFeatureAccess(guildId: string, feature: string): Promise<boolean> {
  const subscription = await getGuildSubscription(guildId);
  const plan = subscription?.plan ?? 'free';
  return PLAN_FEATURES[plan].includes(feature);
}
```

---

## 4. フェーズ別ロードマップ

### Phase 1: 基盤完成とリリース準備（〜1 ヶ月）

**目標**: V2 移植を完了し、安定した本番環境を構築する

| # | タスク | 依存 | 優先度 |
|---|-------|------|--------|
| 1.1 | Discord Bot 通知スケジューラ実装（別リポジトリ） | - | 高 |
| 1.2 | カレンダー日付ピッカーナビゲーション | - | 中 |
| 1.3 | SEO 最適化（メタタグ、OGP、構造化データ） | - | 中 |
| 1.4 | エラー監視導入（Sentry） | - | 高 |
| 1.5 | アナリティクス導入 | - | 中 |
| 1.6 | パフォーマンス最適化（Core Web Vitals） | - | 中 |
| 1.7 | Bot ディレクトリ登録準備 | 1.1 | 中 |

### Phase 2: ユーザビリティ向上と新機能（〜3 ヶ月）

**目標**: ユーザーリテンションを高める機能を追加する

| # | タスク | 依存 | 優先度 |
|---|-------|------|--------|
| 2.1 | 繰り返しイベント（毎日/毎週/毎月/カスタム） | - | 高 |
| 2.2 | イベント検索・フィルタ | - | 中 |
| 2.3 | RSVP（出欠管理）基盤 | - | 高 |
| 2.4 | 公開カレンダー URL | - | 中 |
| 2.5 | i18n 基盤（英語対応） | - | 中 |
| 2.6 | 4 日表示ビュー | - | 低 |
| 2.7 | イベントテンプレート | - | 低 |
| 2.8 | キーボードショートカット | - | 低 |

### Phase 3: マネタイズ基盤構築（〜6 ヶ月）

**目標**: 収益化の仕組みを整備し、Pro 機能を提供する

| # | タスク | 依存 | 優先度 |
|---|-------|------|--------|
| 3.1 | Discord App Subscriptions 統合 | Phase 2 | 高 |
| 3.2 | Stripe 決済基盤 | - | 中 |
| 3.3 | プラン別機能ゲーティング | 3.1 or 3.2 | 高 |
| 3.4 | Google Calendar 双方向同期 | Google OAuth 追加 | 高 |
| 3.5 | iCal エクスポート/サブスクリプション | - | 中 |
| 3.6 | カスタム Embed テーマ | - | 低 |
| 3.7 | Webhook 連携 | - | 低 |

### Phase 4: 高度な機能と拡張（6 ヶ月〜）

**目標**: 差別化を強化し、プレミアム価値を高める

| # | タスク | 依存 | 優先度 |
|---|-------|------|--------|
| 4.1 | AI 自然言語イベント作成 | - | 中 |
| 4.2 | タイムファインダー（最適日時提案） | 2.3 (RSVP) | 中 |
| 4.3 | 統計ダッシュボード | - | 中 |
| 4.4 | PWA 対応 | - | 中 |
| 4.5 | 埋め込みウィジェット | 2.4 (公開URL) | 低 |
| 4.6 | Zapier / Make 連携 | 3.7 (Webhook) | 低 |
| 4.7 | Discord 標準イベント同期 | - | 中 |

---

## 5. 機能カタログ

### 5.1 ユーザビリティ改善

| 機能 | 説明 | プラン | 優先度 | Phase |
|------|------|--------|--------|-------|
| 日付ピッカーナビゲーション | カレンダーで特定日にジャンプ | Free | 高 | 1 |
| イベント検索 | キーワード・日付範囲でイベントを検索 | Free | 中 | 2 |
| イベント複製 | 既存イベントをコピーして新規作成 | Free | 中 | 2 |
| キーボードショートカット | N: 新規、E: 編集、←→: 日付移動 | Free | 低 | 2 |
| 週の開始日設定 | 月曜始まり/日曜始まりの切替 | Free | 低 | 2 |
| ドラッグで新規作成 | カレンダー上をドラッグして時間範囲を選択 | Free | 中 | 2 |
| ツールチップ | イベントホバーで詳細プレビュー | Free | 低 | 2 |
| 一括操作 | 複数イベントの一括削除・色変更 | Pro | 低 | 3 |

### 5.2 新機能

| 機能 | 説明 | プラン | 優先度 | Phase |
|------|------|--------|--------|-------|
| 繰り返しイベント | 毎日/毎週/毎月/カスタムの繰り返し | Pro | 高 | 2 |
| RSVP（出欠管理） | 参加/不参加/未定の投票 | Guild Pro | 高 | 2 |
| 公開カレンダー URL | ログイン不要で閲覧できる公開リンク | Free | 中 | 2 |
| イベントカテゴリ | ラベルによるイベント分類 | Free | 中 | 3 |
| イベントテンプレート | よく使うイベント設定を保存 | Pro | 低 | 2 |
| 日本の祝日表示 | カレンダーに祝日を自動表示 | Free | 中 | 2 |
| 統計ダッシュボード | イベント数・参加率の可視化 | Guild Pro | 中 | 4 |
| タイムファインダー | メンバーの空き時間から最適日時を提案 | Guild Pro | 中 | 4 |
| AI 自然言語入力 | 「明日20時にゲーム大会」で作成 | Pro | 中 | 4 |

### 5.3 外部連携

| 機能 | 説明 | プラン | 優先度 | Phase |
|------|------|--------|--------|-------|
| Google Calendar 同期 | 双方向の予定同期 | Pro | 高 | 3 |
| iCal エクスポート | .ics ファイルのダウンロード | Pro | 中 | 3 |
| iCal サブスクリプション | URL でカレンダーアプリに登録 | Pro | 中 | 3 |
| Discord 標準イベント同期 | Discord のサーバーイベントと双方向同期 | Free | 中 | 4 |
| Webhook 通知 | 外部サービスへのイベント通知 | Guild Pro | 低 | 3 |
| Zapier / Make 連携 | ノーコード自動化ツールとの統合 | Guild Pro | 低 | 4 |

### 5.4 モバイル対応

| 機能 | 説明 | プラン | 優先度 | Phase |
|------|------|--------|--------|-------|
| PWA 対応 | ホーム画面に追加、オフラインキャッシュ | Free | 中 | 4 |
| スワイプナビゲーション | 左右スワイプで日付移動 | Free | 中 | 4 |
| アジェンダビュー | モバイル向けリスト表示 | Free | 中 | 4 |
| プッシュ通知 | PWA のプッシュ通知でリマインド | Pro | 中 | 4 |

### 5.5 Bot 機能拡張

| 機能 | 説明 | プラン | 優先度 | Phase |
|------|------|--------|--------|-------|
| `/list` 改善 | ページネーション・フィルタ付き | Free | 高 | 1 |
| `/search` | キーワードで予定検索 | Free | 中 | 2 |
| `/rsvp` | Discord 上で出欠を回答 | Guild Pro | 高 | 2 |
| `/recurring` | 繰り返し予定の作成 | Pro | 中 | 2 |
| `/export` | iCal 形式でエクスポート | Pro | 低 | 3 |
| AI 自然言語コマンド | 自由文で予定作成・検索 | Pro | 低 | 4 |

---

## 6. 成長・リテンション戦略

### 6.1 ユーザー獲得

| チャネル | 施策 | 期待効果 | Phase |
|---------|------|---------|-------|
| Bot ディレクトリ | top.gg / Discord Bot List に登録 | 自然流入の基盤 | 1 |
| VTuber コミュニティ | VTuber 向け配信スケジュール管理としてアピール | ニッチだが熱量の高いユーザー | 1 |
| SEO | ランディングページの最適化、ブログ記事 | オーガニック検索流入 | 1 |
| Product Hunt | 日本語カレンダー Bot として Launch | グローバルでの認知獲得 | 2 |
| X (Twitter) | 日本語 Discord コミュニティ向け発信 | 日本市場での認知 | 1 |
| Discord サーバー紹介 | 日本語 Discord 紹介コミュニティ | 直接的なユーザー獲得 | 1 |

### 6.2 リテンション施策

| 施策 | 説明 | 期待効果 |
|------|------|---------|
| 週次サマリー通知 | 「今週の予定は X 件です」を Bot で送信 | 定期的なサービス接触 |
| 統計ダッシュボード | 月間イベント数・参加率のグラフ | サーバー管理者の継続利用動機 |
| 埋め込みウィジェット | Web サイトやブログにカレンダーを埋め込み | 外部からの導線 |
| オンボーディングフロー | 初回利用時のステップバイステップガイド | 初期離脱の防止 |
| テンプレートギャラリー | コミュニティ共有のイベントテンプレート | 新規ユーザーの利用促進 |

### 6.3 口コミ・バイラル施策

- **公開カレンダー URL**: ログイン不要の閲覧リンクで非ユーザーにもリーチ
- **「Powered by Discalendar」**: 埋め込みウィジェットにブランドロゴ
- **紹介報酬**: 紹介したサーバーが Pro 契約すると 1 ヶ月無料

---

## 7. 競合比較マトリクス

| 機能 | **Discalendar** | **Apollo** | **Sesh** | **Atomcal** |
|------|:--------------:|:---------:|:-------:|:----------:|
| **価格** | Free〜¥1,500/月 | Free〜$5.99/月 | サブスク + $149.99 永続 | Free〜有料 |
| **UI** | Web カレンダー | Bot コマンド | Bot コマンド | Web + Bot |
| **月表示** | ✅ | ❌ | ❌ | ✅ |
| **週表示** | ✅ | ❌ | ❌ | ✅ |
| **日表示** | ✅ | ❌ | ❌ | ❌ |
| **ドラッグ&ドロップ** | ✅ | ❌ | ❌ | ❌ |
| **繰り返しイベント** | Phase 2 | ✅ | ✅ | ✅ |
| **RSVP** | Phase 2 | ✅ | ✅ | ✅ |
| **Google Calendar** | Phase 3 | ✅ | ✅ | ✅ |
| **AI 自然言語** | Phase 4 | ❌ | ✅ | ❌ |
| **日本語対応** | ✅ | ❌ | ❌ | ❌ |
| **ダークモード** | ✅ | N/A (Bot) | N/A (Bot) | ❌ |
| **イベント色分け** | ✅ | ❌ | ❌ | ✅ |
| **通知カスタマイズ** | ✅（最大10件） | 基本のみ | 基本のみ | 基本のみ |
| **権限管理** | ✅ | ✅ | ✅ | ❌ |
| **オープンソース** | ✅ | ❌ | ❌ | ❌ |

**Discalendar の優位ポジション:**
- Web UI + 日本語 = 唯一の組み合わせ
- Bot コマンドでは実現不可能なドラッグ操作・ビジュアル表示
- 通知設定の柔軟性（10 件まで、分/時間/日/週単位）

---

## 8. 技術的考慮事項

### 8.1 繰り返しイベント設計

繰り返しイベントは `event_series` テーブルで親ルールを管理し、`events` テーブルは個別のインスタンスとして展開する方式を採用する（ハイブリッドアプローチ）。

```sql
-- 繰り返しルール定義
CREATE TABLE event_series (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild_id VARCHAR(32) NOT NULL REFERENCES guilds(guild_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) NOT NULL DEFAULT '#3B82F6',
    is_all_day BOOLEAN NOT NULL DEFAULT false,
    -- 繰り返しルール（RFC 5545 RRULE 準拠）
    rrule TEXT NOT NULL,           -- e.g., 'FREQ=WEEKLY;BYDAY=MO,WE,FR'
    dtstart TIMESTAMPTZ NOT NULL,  -- 繰り返し開始日時
    dtend TIMESTAMPTZ,             -- 繰り返し終了日時（NULL = 無期限）
    duration INTERVAL NOT NULL,    -- イベントの長さ
    -- 除外日（この日はスキップ）
    exdates TIMESTAMPTZ[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- events テーブルに系列参照を追加
ALTER TABLE events ADD COLUMN series_id UUID REFERENCES event_series(id) ON DELETE SET NULL;
ALTER TABLE events ADD COLUMN is_exception BOOLEAN DEFAULT false;
```

**設計判断:**
- RRULE 文字列で柔軟なパターンを表現（毎日/毎週/毎月/カスタム）
- 個別インスタンスは `events` テーブルに展開し、既存のクエリ・RLS をそのまま活用
- 例外（特定日の変更・削除）は `is_exception` フラグと `exdates` で管理
- ライブラリ: `rrule.js`（フロントエンド）/ Python `dateutil.rrule`（Bot 側）

### 8.2 RSVP（出欠管理）設計

```sql
-- 出欠管理テーブル
CREATE TABLE event_attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    discord_user_id VARCHAR(32) NOT NULL,
    discord_username VARCHAR(100),
    discord_avatar_url VARCHAR(512),
    status VARCHAR(10) NOT NULL CHECK (status IN ('going', 'maybe', 'not_going')),
    responded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- 同一イベントに同一ユーザーは1回のみ
    UNIQUE (event_id, discord_user_id)
);

-- RLS ポリシー
ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_users_can_read_attendees"
    ON event_attendees FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_users_can_manage_own_attendance"
    ON event_attendees FOR ALL TO authenticated
    USING (discord_user_id = (auth.jwt() -> 'user_metadata' ->> 'provider_id'))
    WITH CHECK (discord_user_id = (auth.jwt() -> 'user_metadata' ->> 'provider_id'));
```

**設計判断:**
- `discord_user_id` で Discord ユーザーを直接参照（Supabase Auth の `provider_id` と一致）
- RLS で自分の出欠のみ更新可能、閲覧は全員可能
- Bot 側は `service_role` でバイパスし、`/rsvp` コマンドから操作

### 8.3 課金ゲーティングの実装パターン

既存の `guild-settings-panel.tsx` の `restricted` トグルパターンを拡張する。

```
[ユーザーアクション]
  → [Server Action] checkFeatureAccess(guildId, feature)
    → [DB] subscriptions / discord_entitlements を参照
    → [応答] { allowed: boolean, plan: string, requiredPlan: string }
  → [UI] 制限時はアップグレード促進モーダルを表示
```

- Server Component でプランを取得し、クライアントに渡す
- Client Component でプランに応じた UI を出し分け
- Server Action で操作時にもプランを再検証（クライアント入力を信頼しない）

### 8.4 Google OAuth 追加

Supabase Auth は Google プロバイダーをサポートしており、既存の Discord OAuth と並行して追加可能。

```typescript
// Google Calendar API 用のスコープ
const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
];
```

- Supabase Auth に Google プロバイダーを追加設定
- Google Calendar API 用のアクセストークンを別途管理
- 双方向同期: Webhook（Google → Discalendar）+ API（Discalendar → Google）

### 8.5 既存スキーマとの整合性

現在のマイグレーション構成:

| マイグレーション | 内容 |
|---------------|------|
| `20251203083519` | `guilds` テーブル作成 |
| `20251206000001` | `events` テーブル作成 |
| `20251208005740` | `events` CRUD RLS ポリシー |
| `20260101212853` | `event_settings` / `guild_config` / `notifications` 追加 |
| `20260215010313` | `guild_config` 書き込みポリシー追加 |

新機能のマイグレーションは上記の後に追加される。RLS ポリシーは認証ユーザーの読み取りを許可し、権限チェックはアプリケーション層で実施する既存パターンを踏襲する。

---

## 9. KPI・成功指標

### 9.1 成長目標

| 指標 | 3 ヶ月後 | 6 ヶ月後 | 12 ヶ月後 |
|------|---------|---------|----------|
| 導入ギルド数 | 100 | 500 | 2,000 |
| MAU（月間アクティブユーザー） | 500 | 3,000 | 15,000 |
| 月間イベント作成数 | 1,000 | 8,000 | 50,000 |

### 9.2 収益目標

| 指標 | 3 ヶ月後 | 6 ヶ月後 | 12 ヶ月後 |
|------|---------|---------|----------|
| Pro 転換率 | - | 3% | 5% |
| Guild Pro 転換率 | - | 1% | 2% |
| MRR（月間定期収益） | ¥0 | ¥30,000 | ¥200,000 |
| 有料ギルド数 | 0 | 20 | 80 |

### 9.3 エンゲージメント指標

| 指標 | 目標値 | 測定方法 |
|------|--------|---------|
| 初回イベント作成率 | 60% | ログイン後 7 日以内にイベントを作成 |
| 週次リテンション | 40% | 翌週もカレンダーを閲覧 |
| 月次リテンション | 25% | 翌月もイベントを作成 |
| Bot コマンド利用率 | 30% | Web + Bot 併用ユーザーの割合 |
| 通知設定率 | 50% | イベントに通知を設定する割合 |

### 9.4 技術指標

| 指標 | 目標値 |
|------|--------|
| LCP（Largest Contentful Paint） | < 2.5 秒 |
| FID（First Input Delay） | < 100ms |
| CLS（Cumulative Layout Shift） | < 0.1 |
| API レスポンスタイム（P95） | < 500ms |
| エラー率 | < 0.1% |
| 可用性 | > 99.5% |

---

## 付録

### A. 用語集

| 用語 | 説明 |
|------|------|
| ギルド | Discord サーバーのこと |
| RSVP | 出欠確認（Répondez s'il vous plaît） |
| Entitlement | Discord App Subscriptions で購入された権利 |
| SKU | Discord App Subscriptions の商品 ID |
| RRULE | RFC 5545 で定義された繰り返しルール形式 |
| RLS | Row Level Security（Supabase のデータアクセス制御） |
| MRR | Monthly Recurring Revenue（月間定期収益） |
| MAU | Monthly Active Users（月間アクティブユーザー） |

### B. 参照ドキュメント

- [V2 移植 Gap Analysis](./v2-migration-gap-analysis.md)
- [Discord Bot 実装計画](./discord-bot-implementation.md)
- [プロダクトビジョン](../.kiro/steering/product.md)
- [Discord App Subscriptions ドキュメント](https://discord.com/developers/docs/monetization/overview)
- [Stripe Billing ドキュメント](https://stripe.com/docs/billing)

---

*作成日: 2026-02-19*
