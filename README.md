# Discalendar

<p align="center">
  <strong>Discordコミュニティの予定を、もっと見やすく</strong>
</p>

<p align="center">
  Discordサーバー向けのカレンダー・予定管理サービス
</p>

---

## 📋 プロジェクト概要

DiscalendarはDiscordコミュニティ向けの予定管理サービスです。Discord上で共有される予定やイベントを、視覚的にわかりやすいカレンダーUIで表示・管理できます。

### 現在の実装状況

✅ **カレンダービュー完成** (2025-12-07)
- Googleカレンダー風の日/週/月ビュー切り替え
- イベント表示・詳細ポップオーバー
- レスポンシブ対応（モバイル/タブレット/デスクトップ）
- アクセシビリティ対応（キーボードナビゲーション、ARIA）
- ダッシュボード統合

✅ **ギルド一覧表示完成** (2025-12-06)
- Discord所属ギルド一覧の表示
- DB照合によるギルドフィルタリング
- ギルドアイコン表示（フォールバック対応）

✅ **Storybook統合完成** (2025-12-07)
- コンポーネント駆動開発環境の構築
- shadcn/ui・カスタムコンポーネントのストーリー作成
- アクセシビリティ検証（addon-a11y）
- ダークモード対応（addon-themes）

✅ **Discord OAuth認証完成** (2025-12-03)
- Supabase Auth連携によるDiscord OAuth認証
- セッション管理とルート保護
- ログイン/ログアウト機能
- 認証状態に応じたUI切り替え
- セキュリティ要件（PKCE、CSRF対策）対応

✅ **ランディングページモックアップ完成** (2025-12-02)
- レスポンシブデザイン対応
- アクセシビリティ準拠
- パフォーマンス最適化済み

## 🚀 主な機能

### 実装済み

- **カレンダービュー**
  - 日/週/月ビューの切り替え
  - 日付ナビゲーション（前/次/今日）
  - イベントのグリッド表示
  - イベント詳細ポップオーバー
  - 終日イベント対応
  - 今日の日付ハイライト
  - キーボードナビゲーション

- **ギルド一覧**
  - Discord所属ギルドの表示
  - ギルドアイコン表示
  - 選択可能なギルドカード

- **Discord OAuth認証**
  - Discordアカウントでのログイン/ログアウト
  - セッション管理（Cookie + Middleware）
  - 保護ルートへのアクセス制御
  - エラーハンドリング（ネットワークエラー、認証失敗等）
  - ダッシュボードページ（ユーザー情報表示）

- **ランディングページ**
  - ヘッダーナビゲーション (デスクトップ・モバイル対応)
  - 認証状態に応じたログイン/ログアウトボタン表示
  - ヒーローセクション
  - 機能紹介セクション
  - CTAセクション
  - フッター

### 今後の実装予定

- 予定の作成・編集・削除
- Discord Bot連携
- リマインダー機能

## 🛠️ 技術スタック

- **フレームワーク:** [Next.js 16](https://nextjs.org) (App Router)
- **言語:** TypeScript (Strict Mode)
- **スタイリング:** [Tailwind CSS](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)
- **カレンダー:** [react-big-calendar](https://github.com/jquense/react-big-calendar) + [date-fns](https://date-fns.org)
- **認証:** [Supabase Auth](https://supabase.com/auth) (Discord OAuth)
- **データベース:** [Supabase](https://supabase.com) (PostgreSQL)
- **テスト:** Vitest + Playwright
- **リンター:** Biome ([Ultracite](https://github.com/terrazzoapp/ultracite))
- **コンポーネント開発:** [Storybook](https://storybook.js.org) 10.x

## 📦 セットアップ

### 前提条件

- Node.js 18以上
- npm / yarn / pnpm
- Supabaseアカウント ([database.new](https://database.new) で作成)

### ローカル開発環境のセットアップ

1. **リポジトリのクローン**

   ```bash
   git clone <repository-url>
   cd discalendar-next
   ```

2. **依存関係のインストール**

   ```bash
   npm install
   ```

3. **環境変数の設定**

   `.env.example`を`.env.local`にコピーして、以下の値を設定:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=[Supabaseプロジェクト URL]
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=[Supabase API Key]
   ```

   > Supabaseプロジェクトの設定は[API settings](https://supabase.com/dashboard/project/_?showConnect=true)から取得できます。

4. **開発サーバーの起動**

   ```bash
   npm run dev
   ```

   ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## 🧪 テスト

### すべてのテストを実行

```bash
npm test
```

### ユニットテストのみ

```bash
npm run test:unit
```

### E2Eテストのみ

```bash
npm run test:e2e
```

## 📖 Storybook

コンポーネントの開発・ドキュメント化にStorybookを使用しています。

### Storybook開発サーバー起動

```bash
npm run storybook
```

ブラウザで [http://localhost:6006](http://localhost:6006) を開いてください。

### Storybookビルド

```bash
npm run build-storybook
```

### 含まれるストーリー

- **UI Components:** Button, Badge, Card, Checkbox, Input, Label, Popover, DropdownMenu
- **Landing Page:** Header, MobileNav, Hero, Features, CTA, Footer
- **Calendar:** CalendarGrid, CalendarToolbar, EventBlock, EventPopover

## 🎨 コード品質

### リンティング

```bash
npm run lint
```

### フォーマット

```bash
npx ultracite fix
```

### 型チェック

```bash
npm run type-check
```

## 🏗️ ビルド

### プロダクションビルド

```bash
npm run build
```

### プロダクションサーバー起動

```bash
npm start
```

## 📁 プロジェクト構造

```
discalendar-next/
├── app/                    # Next.js App Router
│   ├── page.tsx           # ランディングページ
│   ├── layout.tsx         # ルートレイアウト
│   ├── auth/              # 認証関連ページ
│   │   ├── login/        # ログインページ
│   │   └── callback/     # OAuthコールバック
│   ├── dashboard/         # ダッシュボード（認証後）
│   └── test/              # テスト用ページ
├── components/            # Reactコンポーネント
│   ├── ui/               # shadcn/ui コンポーネント
│   ├── auth/             # 認証関連コンポーネント
│   ├── calendar/         # カレンダー関連コンポーネント
│   │   ├── calendar-container.tsx
│   │   ├── calendar-grid.tsx
│   │   ├── calendar-toolbar.tsx
│   │   ├── event-block.tsx
│   │   └── event-popover.tsx
│   ├── guilds/           # ギルド関連コンポーネント
│   │   ├── guild-card.tsx
│   │   ├── guild-list-client.tsx
│   │   └── selectable-guild-card.tsx
│   └── ...               # Landing Page コンポーネント
├── lib/                   # ユーティリティ・サービス
│   ├── auth/             # 認証ロジック
│   ├── calendar/         # カレンダー関連ロジック
│   ├── discord/          # Discord APIクライアント
│   ├── guilds/           # ギルドサービス
│   └── supabase/         # Supabaseクライアント
├── types/                 # TypeScript型定義
├── __tests__/            # ユニットテスト
├── e2e_tests/            # E2Eテスト（Playwright）
├── supabase/             # Supabase設定
│   └── migrations/       # DBマイグレーション
├── .kiro/                # 仕様・ドキュメント
│   ├── specs/           # 機能仕様
│   └── steering/        # プロジェクト方針
├── .storybook/           # Storybook設定
└── public/               # 静的ファイル
```

## 📚 ドキュメント

仕様書やタスク詳細は `.kiro/specs/` ディレクトリを参照してください。

- [カレンダービュー仕様](.kiro/specs/calendar-view/)
  - [要件定義](.kiro/specs/calendar-view/requirements.md)
  - [技術設計](.kiro/specs/calendar-view/design.md)
  - [タスク計画](.kiro/specs/calendar-view/tasks.md)

- [ギルド一覧仕様](.kiro/specs/guild-list/)
  - [要件定義](.kiro/specs/guild-list/requirements.md)
  - [技術設計](.kiro/specs/guild-list/design.md)
  - [タスク計画](.kiro/specs/guild-list/tasks.md)

- [Storybook統合仕様](.kiro/specs/storybook-integration/)
  - [要件定義](.kiro/specs/storybook-integration/requirements.md)
  - [技術設計](.kiro/specs/storybook-integration/design.md)
  - [タスク計画](.kiro/specs/storybook-integration/tasks.md)

- [Discord OAuth認証仕様](.kiro/specs/discord-login/)
  - [要件定義](.kiro/specs/discord-login/requirements.md)
  - [技術設計](.kiro/specs/discord-login/design.md)
  - [タスク計画](.kiro/specs/discord-login/tasks.md)

- [ランディングページ仕様](.kiro/specs/landing-page-mockup/)
  - [要件定義](.kiro/specs/landing-page-mockup/requirements.md)
  - [技術設計](.kiro/specs/landing-page-mockup/design.md)
  - [タスク計画](.kiro/specs/landing-page-mockup/tasks.md)

## 🚢 デプロイ

### Vercelへのデプロイ

```bash
vercel deploy --prod
```

または、GitHubリポジトリをVercelに接続して自動デプロイを設定できます。

## 🤝 コントリビューション

このプロジェクトは開発中です。コントリビューションガイドラインは今後追加予定です。

## 📄 ライセンス

TBD

## 🔗 リンク

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Storybook Documentation](https://storybook.js.org/docs)
