# 技術スタック

## アーキテクチャ

Next.js App Routerを採用したフルスタックWebアプリケーション。SupabaseをBaaS（Backend as a Service）として活用し、認証・データベース・リアルタイム機能を統合。

## コアテクノロジー

- **言語**: TypeScript (strict mode)
- **フレームワーク**: Next.js 16 (App Router) + React 19
- **ランタイム**: Node.js (ES2017ターゲット)
- **データベース**: Supabase (PostgreSQL)
- **認証**: Supabase Auth (Cookie-based SSR)

## 主要ライブラリ

- **UIコンポーネント**: shadcn/ui (Radix UI primitives)
- **スタイリング**: Tailwind CSS 3 + tailwindcss-animate
- **テーマ**: next-themes（ダークモード対応）
- **カレンダー**: react-big-calendar + date-fns（日付操作）
- **アイコン**: lucide-react
- **状態管理**: React 19組み込み機能 (Server Components/Actions)

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

### 共通コマンド

```bash
# 開発サーバー起動
npm run dev

# プロダクションビルド
npm run build

# コード品質チェック
npx ultracite check

# 自動修正
npx ultracite fix

# テスト
npm run test:unit       # Vitest単体テスト
npm run test:e2e        # Playwright E2E
npm run type-check      # 型チェック

# Storybook
npm run storybook       # 開発サーバー (port 6006)
npm run build-storybook # ビルド
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
