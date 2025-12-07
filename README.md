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

✅ **Storybook統合完成** (2025-12-07)
- コンポーネント駆動開発環境の構築
- shadcn/ui・カスタムコンポーネントのストーリー作成
- アクセシビリティ検証（addon-a11y）
- ダークモード対応（addon-themes）

## 🚀 主な機能

### 実装済み

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

- カレンダーUI
- 予定の作成・編集・削除
- Discord Bot連携
- リマインダー機能

## 🛠️ 技術スタック

- **フレームワーク:** [Next.js 16](https://nextjs.org) (App Router)
- **言語:** TypeScript (Strict Mode)
- **スタイリング:** [Tailwind CSS](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)
- **認証:** [Supabase Auth](https://supabase.com/auth)
- **データベース:** [Supabase](https://supabase.com)
- **テスト:** Vitest + Playwright
- **リンター:** Biome ([Ultracite](https://github.com/terrazzoapp/ultracite))
- **コンポーネント開発:** [Storybook](https://storybook.js.org) 8.x

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

## �� テスト

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

### テストカバレッジ

- **E2Eテスト (Playwright):** 48テスト（認証フロー含む）
- **ユニットテスト (Vitest):** 330+テスト
- **合計:** 380+テスト ✅

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
│   └── dashboard/         # ダッシュボード（認証後）
├── components/            # Reactコンポーネント
│   ├── ui/               # shadcn/ui コンポーネント
│   ├── auth/             # 認証関連コンポーネント
│   │   ├── discord-login-button.tsx
│   │   └── logout-button.tsx
│   ├── header.tsx        # ヘッダー
│   ├── mobile-nav.tsx    # モバイルナビゲーション
│   ├── hero.tsx          # ヒーローセクション
│   ├── features.tsx      # 機能紹介
│   ├── cta.tsx           # CTA
│   └── footer.tsx        # フッター
├── lib/                   # ユーティリティ
│   ├── auth/             # 認証ロジック
│   └── supabase/         # Supabaseクライアント
├── types/                 # TypeScript型定義
├── __tests__/            # テストファイル
├── e2e_tests/            # E2Eテスト（Playwright）
├── .kiro/                # 仕様・ドキュメント
│   ├── specs/           # 機能仕様
│   └── steering/        # プロジェクト方針
├── .storybook/           # Storybook設定
└── public/               # 静的ファイル
```

## 📚 ドキュメント

仕様書やタスク詳細は `.kiro/specs/` ディレクトリを参照してください。

- [Discord OAuth認証仕様](.kiro/specs/discord-login/)
  - [要件定義](.kiro/specs/discord-login/requirements.md)
  - [技術設計](.kiro/specs/discord-login/design.md)
  - [タスク計画](.kiro/specs/discord-login/tasks.md)
  - [手動検証チェックリスト](.kiro/specs/discord-login/manual-verification-checklist.md)

- [ランディングページ仕様](.kiro/specs/landing-page-mockup/)
  - [要件定義](.kiro/specs/landing-page-mockup/requirements.md)
  - [技術設計](.kiro/specs/landing-page-mockup/design.md)
  - [タスク計画](.kiro/specs/landing-page-mockup/tasks.md)

- [Storybook統合仕様](.kiro/specs/storybook-integration/)
  - [要件定義](.kiro/specs/storybook-integration/requirements.md)
  - [技術設計](.kiro/specs/storybook-integration/design.md)
  - [タスク計画](.kiro/specs/storybook-integration/tasks.md)

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
