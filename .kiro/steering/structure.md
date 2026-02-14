# プロジェクト構造

## 組織哲学

Next.js App Routerの規約に従いつつ、shadcn/uiのコンポーネント管理パターンを採用。機能はApp Router配下でルーティングベース、UIコンポーネントは独立して管理。

## ディレクトリパターン

### App Router (`/app/`)

**目的**: Next.jsのルーティングとレイアウト定義
**例**:
- `app/layout.tsx` - ルートレイアウト（グローバル設定）
- `app/page.tsx` - トップページ
- `app/globals.css` - グローバルスタイル

**ルート構成**:
- `app/page.tsx` - ランディングページ
- `app/auth/` - 認証（login, callback, actions）
- `app/dashboard/` - ダッシュボード（カレンダー表示）

**特徴**:
- ファイルシステムベースルーティング
- Server Componentsがデフォルト
- 共通レイアウトとテンプレート管理

### UIコンポーネント (`/components/ui/`)

**目的**: shadcn/uiで管理される再利用可能プリミティブ
**例**:
- `button.tsx` - ボタンコンポーネント
- `card.tsx` - カードコンポーネント
- `dropdown-menu.tsx` - ドロップダウンメニュー

**特徴**:
- Radix UIプリミティブのラッパー
- Tailwind CSSでスタイリング
- プロジェクトに直接コピーされ、カスタマイズ可能
- Biomeのlint対象外（`biome.jsonc`で除外）

### カスタムコンポーネント (`/components/`)

**目的**: アプリケーション固有のビジネスロジックを持つコンポーネント
**パターン**: 機能ドメインごとにサブディレクトリで整理

**サブディレクトリ構成**:
- `components/calendar/` - カレンダー機能（グリッド、イベント、ツールバー等）
- `components/guilds/` - ギルド関連（カード、リスト、アイコン等）
- `components/auth/` - 認証関連（ログインボタン、ログアウトボタン等）
- `components/` 直下 - ランディングページ・共通コンポーネント（Header、Hero、Footer等）

**Co-locationパターン**: コンポーネントと同ディレクトリにテスト・ストーリーを配置
```
components/calendar/
  calendar-grid.tsx          # コンポーネント
  calendar-grid.test.tsx     # テスト
  calendar-grid.stories.tsx  # Storybookストーリー
```

### カスタムフック (`/hooks/`)

**目的**: アプリケーション固有のReactカスタムフック
**パターン**: 機能ドメインごとにサブディレクトリで整理
- `hooks/calendar/` - カレンダー状態管理、URL同期、イベント操作のフック群
- `hooks/` 直下 - 汎用フック（`use-local-storage.ts`等）

**特徴**: `index.ts`でバレルエクスポート（ドメインサブディレクトリ内）

### ユーティリティ・ロジック (`/lib/`)

**目的**: 共通関数、ヘルパー、外部サービスクライアント
**パターン**: 機能ドメインごとにサブディレクトリで整理
- `lib/supabase/` - Supabaseクライアント設定（Server/Client/Middleware）
- `lib/auth/` - 認証ロジック
- `lib/calendar/` - カレンダーデータ処理
- `lib/discord/` - Discord API連携
- `lib/guilds/` - ギルドデータ処理
- `lib/utils.ts` - Tailwind CSS mergeなど汎用ユーティリティ

**特徴**: Biomeのlint対象外

### 型定義 (`/types/`)

**目的**: アプリケーション共通の型定義
**パターン**: ドメインごとにファイル分割（例: `landing-page.ts`）

### テスト (`/__tests__/`, `/e2e_tests/`)

**単体・統合テスト** (`/__tests__/`):
- 関心領域ごとにサブディレクトリ（`app/`, `components/`, `hooks/`, `lib/`, `integration/`等）
- Co-locateテストと併用（複雑な統合テストはこちら）

**E2Eテスト** (`/e2e_tests/`):
- Playwrightによるエンドツーエンドテスト
- `*.spec.ts`形式

### 参照コード (`/refs/`)

**目的**: 移植元のソースコード（DisCalendarV2）を参照用に保管
**特徴**:
- Biomeのlint対象外
- 実装時の参照目的のみ

## 命名規則

- **ファイル**: kebab-case（例: `dropdown-menu.tsx`）
- **コンポーネント**: PascalCase（例: `DropdownMenu`）
- **関数・変数**: camelCase（例: `createClient`）
- **定数**: UPPER_SNAKE_CASE（例: `API_ENDPOINT`）

## インポート構成

```typescript
// 外部ライブラリ
import { useState } from 'react'
import { Button } from '@radix-ui/react-button'

// パスエイリアス（@/で絶対参照）
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'

// 相対パス（同階層・近接のみ）
import { localHelper } from './utils'
```

**パスエイリアス設定**:
- `@/*` → プロジェクトルート（`tsconfig.json`）
- `@/components` → `/components`
- `@/lib` → `/lib`
- `@/hooks` → `/hooks`

## コード構成原則

### コンポーネント配置

- **UIプリミティブ**: `/components/ui/`（shadcn/ui管理）
- **機能コンポーネント**: `/components/`（アプリロジック）
- **ページ固有**: App Router内の`page.tsx`と同階層

### レイヤー分離

- **Server Components**: データフェッチング、認証チェック
- **Client Components**: インタラクション、ブラウザAPI使用
- **Server Actions**: フォーム送信、データ更新

### 依存関係ルール

- UIコンポーネント → ビジネスロジック依存禁止
- ビジネスロジック → UIコンポーネント依存OK
- `/lib` → 他モジュール依存最小化

---
_パターンを文書化し、ファイルツリーは記載しない。パターンに従った新規ファイルは更新不要_
