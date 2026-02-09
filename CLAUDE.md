# Discalendar Next - AI Development Guide

Discordコミュニティ向けカレンダー予定管理サービス。Nuxt.js/Vue 2版からNext.js/Reactへの移植プロジェクト。

## Project Memory

プロジェクトの長期的なルール・規約・技術判断を管理する永続的なガイド。

- **Steering** (`.kiro/steering/`) - プロジェクト全体のポリシー: `product.md`, `tech.md`, `structure.md`
- **Specs** (`.kiro/specs/`) - 機能単位の仕様管理（Requirements → Design → Tasks → Implementation）
- **Skills** (`.cursor/skills/`) - コンポーネント開発、Supabaseマイグレーション、Playwright E2Eテストのワークフロー
- **Rules** (`.cursor/rules/`) - Ultraciteコード品質基準

## Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19
- **Language**: TypeScript (strict mode)
- **Database/Auth**: Supabase (PostgreSQL + Cookie-based SSR認証)
- **UI**: shadcn/ui (Radix UI) + Tailwind CSS 3
- **Linter/Formatter**: Biome (Ultracite preset)
- **Testing**: Vitest + Testing Library (単体) / Playwright (E2E)
- **Storybook**: v10 (CSF3, autodocs)

## Common Commands

```bash
npm run dev              # 開発サーバー起動
npm run build            # プロダクションビルド
npm run test:unit        # Vitest単体テスト
npm run test:e2e         # Playwright E2Eテスト
npm run type-check       # TypeScript型チェック
npm run storybook        # Storybook起動 (port 6006)
npx ultracite check      # コード品質チェック
npx ultracite fix        # 自動修正
npx supabase db push     # マイグレーション適用
```

## Development Guidelines

- 思考は英語、レスポンスは日本語で生成
- プロジェクトファイル（requirements.md, design.md, tasks.md等）は仕様の言語設定に従って記述

## AI-DLC Spec-Driven Workflow

3フェーズ承認ワークフロー: Requirements → Design → Tasks → Implementation

### Minimal Workflow
- Phase 0 (optional): `/kiro:steering`, `/kiro:steering-custom`
- Phase 1 (Specification):
  - `/kiro:spec-init "description"`
  - `/kiro:spec-requirements {feature}`
  - `/kiro:validate-gap {feature}` (optional: 既存コードベース向け)
  - `/kiro:spec-design {feature} [-y]`
  - `/kiro:validate-design {feature}` (optional: 設計レビュー)
  - `/kiro:spec-tasks {feature} [-y]`
- Phase 2 (Implementation): `/kiro:spec-impl {feature} [tasks]`
  - `/kiro:validate-impl {feature}` (optional: 実装後検証)
- Progress check: `/kiro:spec-status {feature}` (随時)

### Active Specifications
- `calendar-events` - カレンダーイベントCRUD
- `calendar-view` - カレンダー表示UI
- `discord-login` - Discord OAuth認証
- `guild-list` - ギルド一覧表示
- `landing-page-mockup` - ランディングページ
- `storybook-integration` - Storybook統合

## Development Rules

- 各フェーズでヒューマンレビュー必須、`-y`は意図的なファストトラック時のみ
- ユーザーの指示に正確に従い、そのスコープ内で自律的に行動
- 必須情報が欠落している場合、または指示が決定的に曖昧な場合のみ質問する

## Component Development Rules

- **Storybook必須**: 新規コンポーネント作成時は `*.stories.tsx` も必ず作成
  - コンポーネントと同じディレクトリに配置（Co-located）
  - CSF3形式、`tags: ["autodocs"]` を設定
  - 主要なバリアント・状態をストーリーとして定義
- **テスト**: コンポーネントには `*.test.tsx` を作成（Vitest + Testing Library）
- **命名**: ファイルはkebab-case、コンポーネントはPascalCase
- **インポート**: `@/` パスエイリアスで絶対参照

## Project Structure

```
app/              # Next.js App Router（ルーティング・レイアウト）
components/       # カスタムコンポーネント
  ui/             # shadcn/ui プリミティブ（Biome lint除外）
  auth/           # 認証関連
  calendar/       # カレンダー機能
  guilds/         # ギルド関連
lib/              # ユーティリティ・Supabaseクライアント（Biome lint除外）
hooks/            # カスタムフック
types/            # 型定義
e2e_tests/        # Playwright E2Eテスト
__tests__/        # Vitest単体テスト
supabase/         # マイグレーション・設定
  migrations/     # SQLマイグレーションファイル
.storybook/       # Storybook設定
.kiro/            # AI-DLCステアリング・仕様
.cursor/          # Cursorスキル・ルール
.github/workflows/ # CI/CD（ci, playwright, deploy-migrations, claude）
```

## Architecture Decisions

- **Server Components**: データフェッチング・認証チェックはサーバー側で完結
- **Client Components**: `"use client"` でインタラクション・ブラウザAPI使用
- **Supabase SSR**: `@supabase/ssr` でCookie-based認証、全App Routerコンテキストでセッション共有
- **shadcn/ui**: `components/ui/` に直接コピーされカスタマイズ可能（Radix UIベース）
- **Ultracite**: Biomeのゼロコンフィグプリセット、ESLint/Prettierより高速

## CI/CD Workflows

- `ci.yml` - lint、型チェック、単体テスト
- `playwright.yml` - E2Eテスト
- `deploy-migrations.yml` - Supabaseマイグレーションデプロイ
- `claude.yml` / `claude-code-review.yml` - AI支援レビュー

## Steering Configuration

- `.kiro/steering/` 全体をプロジェクトメモリとして読み込み
- デフォルトファイル: `product.md`, `tech.md`, `structure.md`
- カスタムファイル対応（`/kiro:steering-custom` で管理）
