# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Discordコミュニティ向けカレンダー予定管理サービス。Nuxt.js/Vue 2版からNext.js/Reactへの移植プロジェクト。

## Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19
- **Language**: TypeScript (strict mode)
- **Database/Auth**: Supabase (PostgreSQL + Cookie-based SSR認証)
- **UI**: shadcn/ui (Radix UI) + Tailwind CSS 3
- **Linter/Formatter**: Biome (Ultracite preset)
- **Testing**: Vitest + Testing Library (単体) / Playwright (E2E)
- **Storybook**: v10 (CSF3, autodocs)

## Commands

```bash
npm run dev              # 開発サーバー起動
npm run build            # プロダクションビルド
npm run storybook        # Storybook起動 (port 6006)

# テスト
npm run test:unit                        # Vitest全テスト実行
npx vitest run path/to/file.test.ts      # 単一テストファイル実行
npx vitest run --testNamePattern="name"  # テスト名でフィルタ
npm run test:e2e                         # Playwright E2E (devサーバー自動起動)
npx playwright test e2e_tests/file.spec.ts  # 単一E2Eテスト実行

# コード品質
npx ultracite check      # lint + format チェック
npx ultracite fix        # 自動修正
npm run type-check       # TypeScript型チェック (tsconfig.type-check.json使用)

# データベース
npx supabase db push     # マイグレーション適用
```

## Development Guidelines

- 思考は英語、レスポンスは日本語で生成
- プロジェクトファイル（requirements.md, design.md, tasks.md等）は仕様の言語設定に従って記述

## Architecture

### Supabase認証フロー (Cookie-based SSR)

3つのSupabaseクライアントが異なるコンテキストで使われる:

- **`lib/supabase/server.ts`** - Server Components / Server Actions用。リクエストごとに `await createClient()` で新規作成（Fluid compute対応）
- **`lib/supabase/client.ts`** - Client Components用。`document.cookie` から自動でセッション読み取り
- **`lib/supabase/proxy.ts`** - Middleware用。`getClaims()` でセッションCookieをリフレッシュ。**`createServerClient` と `getClaims()` の間にコードを挟まないこと**（ランダムログアウトの原因になる）

認証フロー: Discord OAuth → `/auth/callback` route handler → セッションCookie設定 → Middlewareで毎リクエスト更新

### ルーティング（Public / Protected）

Middleware (`lib/supabase/proxy.ts` の `updateSession`) がルート保護を制御:
- **Public**: `/`, `/auth/*`, `/login`, `/test/*`, `/terms`, `/privacy`, `/docs/*`
- **Protected**: 上記以外は未認証時 `/auth/login` にリダイレクト
- 認証済みユーザーが `/auth/login` にアクセスすると `/dashboard` にリダイレクト

### Server Actions パターン

`app/dashboard/actions.ts` でミューテーション処理。共通パターン:
- `"use server"` ディレクティブ
- Result型 `{ success: true; data: T } | { success: false; error: E }` を返す
- Supabaseエラーを `classifySupabaseError()` でドメインエラーコードに変換

### コンポーネント構成

- **Server Components** (デフォルト): データフェッチング・認証チェック
- **Client Components** (`"use client"`): インタラクション・ブラウザAPI
- **shadcn/ui**: `components/ui/` に直接コピー（Biome lint除外対象）

### Biome (Ultracite) 除外範囲

`biome.jsonc` で以下を除外: `components/ui`, `lib`, `hooks`, `refs`。これらはshadcn/uiの生成コードやSupabaseヘルパーなど外部由来のコード。

## Component Development Rules

- **Storybook必須**: 新規コンポーネント作成時は `*.stories.tsx` も必ず作成
  - コンポーネントと同じディレクトリに配置（Co-located）
  - CSF3形式、`tags: ["autodocs"]` を設定
  - 主要なバリアント・状態をストーリーとして定義
- **テスト**: コンポーネントには `*.test.tsx` を作成（Vitest + Testing Library）
- **命名**: ファイルはkebab-case、コンポーネントはPascalCase
- **インポート**: `@/` パスエイリアスで絶対参照
- **React 19**: `React.forwardRef` 不要、ref を直接propとして使用

## Type Conventions

- DB行は snake_case (`guild_id`, `avatar_url`)、ドメインオブジェクトは camelCase (`guildId`, `avatarUrl`) で明示的なコンバータ関数を使用
- サービス層はResult型パターンを採用（例外throwではなく成功/失敗の判別共用体）
- イベントサービスは AbortSignal をサポート（UIからのリクエストキャンセル用）

## Database Migrations

`supabase/migrations/` にタイムスタンプ命名: `YYYYMMDDHHMMSS_description.sql`（連番禁止、`date` コマンドで現在時刻を取得して使用）

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

## Steering Configuration

- `.kiro/steering/` 全体をプロジェクトメモリとして読み込み
- デフォルトファイル: `product.md`, `tech.md`, `structure.md`
- カスタムファイル対応（`/kiro:steering-custom` で管理）
