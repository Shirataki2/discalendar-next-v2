# 技術スタック

## アーキテクチャ

npm workspacesによるモノレポ構成。Next.js App RouterのWebアプリとDiscord Botが同一リポジトリに共存し、Supabase（PostgreSQL）をデータストアとして共有する。

## モノレポ基盤

- **パッケージマネージャ**: npm workspaces (`"workspaces": ["packages/*"]`)
- **パッケージ**: ルート（Webアプリ）、`packages/bot`（Discord Bot）

## コアテクノロジー（Web）

- **言語**: TypeScript (strict mode)
- **フレームワーク**: Next.js 16 (App Router) + React 19
- **ランタイム**: Node.js (ES2017ターゲット)
- **データベース**: Supabase (PostgreSQL)
- **認証**: Supabase Auth (Cookie-based SSR)

## コアテクノロジー（Bot）

- **言語**: TypeScript (strict mode)
- **ライブラリ**: discord.js v14
- **ランタイム**: Node.js (ES2022ターゲット、Node16モジュール解決)
- **データベース**: Supabase (service key経由)
- **ログ**: pino / pino-pretty

## 主要ライブラリ（Web）

- **UIコンポーネント**: shadcn/ui (Radix UI primitives)
- **スタイリング**: Tailwind CSS 3 + tailwindcss-animate
- **テーマ**: next-themes（ダークモード対応）
- **カレンダー**: react-big-calendar + date-fns（日付操作）
- **アイコン**: lucide-react
- **状態管理**: React 19組み込み機能 (Server Components/Actions)

## 主要ライブラリ（Bot）

- **Discord**: discord.js v14（スラッシュコマンド、イベントハンドリング）
- **データベース**: @supabase/supabase-js（service key認証）
- **ログ**: pino（構造化ログ）+ pino-pretty（開発時整形）
- **開発**: tsx（TypeScript実行・ホットリロード）

## 開発標準

### 型安全性

- TypeScript strict mode有効化
- `strictNullChecks`有効
- `any`の使用禁止、`unknown`を推奨

### コード品質

- **Linter/Formatter**: Biome (Ultracite preset使用)
  - `ultracite/core` + `ultracite/next`を継承
  - Rustベースの高速処理
- **除外パス**: `components/ui`, `lib`, `hooks`, `refs` (自動生成・参照コード)

### テスト

- **E2Eテスト**: Playwright
- **単体テスト**: Vitest + Testing Library
- **テスト環境**: jsdom

### Storybook

- **バージョン**: Storybook v10 (`@storybook/nextjs`)
- **形式**: CSF3（Component Story Format 3）、`tags: ["autodocs"]`
- **アドオン**: a11y、docs、themes
- **配置**: コンポーネントと同ディレクトリに`*.stories.tsx`をCo-locate

## 開発環境

### 必須ツール

- Node.js (package.json参照)
- npm (またはpnpm/yarn)
- Git + Husky (pre-commit hooks)

### 共通コマンド（Web - ルートで実行）

```bash
npm run dev              # 開発サーバー起動
npm run build            # プロダクションビルド
npx ultracite check     # コード品質チェック
npx ultracite fix       # 自動修正
npm run test:unit       # Vitest単体テスト
npm run test:e2e        # Playwright E2E
npm run type-check      # 型チェック
npm run storybook       # Storybook (port 6006)
```

### 共通コマンド（Bot - `packages/bot` で実行）

```bash
npm run dev              # 開発サーバー (tsx --watch)
npm run build            # TypeScriptビルド
npm run start            # プロダクション実行
npm run test             # Vitest テスト
npm run type-check       # 型チェック
npm run lint             # Biome lint + format チェック
```

## 重要な技術的判断

### Next.js App Router採用

React Server Componentsを活用し、データフェッチングをサーバー側で完結。クライアントバンドルサイズを削減しパフォーマンスを最適化。

### Supabase SSR統合

`@supabase/ssr`を使用してCookie-based認証を実装。App Router全体（Client Components、Server Components、Route Handlers、Server Actions、Middleware）でユーザーセッションを共有。

### shadcn/ui + Radix UI

アクセシビリティ標準に準拠したプリミティブコンポーネント。プロジェクトに直接コピーされるためカスタマイズ可能（`components/ui/`）。

### Ultracite採用

Biomeのゼロコンフィグプリセット。ESLint/Prettierよりも高速で、厳格な品質基準を自動適用。

### パスエイリアス

`@/`でプロジェクトルートを参照（tsconfig.json設定）。絶対インポートで依存関係を明確化。

---
_標準とパターンを文書化し、全ての依存関係は列挙しない_
