# Architecture Review Checklist

Discalendar プロジェクトのアーキテクチャ規約に基づくレビューチェックリスト。

## Server Components vs Client Components

- [ ] データフェッチングや認証チェックは Server Component で行っている
- [ ] `"use client"` ディレクティブはインタラクションやブラウザAPI利用時のみ使用
- [ ] Server Component 内で `useState`, `useEffect` などのクライアントフックを使用していない
- [ ] Client Component から直接 Supabase サーバークライアントを呼んでいない

## Supabase クライアント使い分け

3つのクライアントは厳密に使い分ける:

### `lib/supabase/server.ts` (Server Components / Server Actions)
- [ ] リクエストごとに `await createClient()` で新規作成している（Fluid compute対応）
- [ ] グローバル変数にキャッシュしていない

### `lib/supabase/client.ts` (Client Components)
- [ ] クライアントコンポーネントでのみ使用している
- [ ] サーバーサイドのコードから呼んでいない

### `lib/supabase/proxy.ts` (Middleware)
- [ ] **CRITICAL**: `createServerClient()` と `supabase.auth.getClaims()` の間にコードを挟んでいない（ランダムログアウトの原因）
- [ ] `supabaseResponse` オブジェクトをそのまま返している（Cookieの同期）
- [ ] `NextResponse.next()` で新しいレスポンスを作る場合、Cookieをコピーしている

## Server Actions パターン

- [ ] ファイル先頭に `"use server"` ディレクティブがある
- [ ] Result型 `{ success: true; data: T } | { success: false; error: E }` を返している（例外throwではない）
- [ ] Supabaseエラーを `classifySupabaseError()` でドメインエラーコードに変換している
- [ ] ミューテーション後に `revalidatePath()` で適切にキャッシュを無効化している
- [ ] 認証チェック（`supabase.auth.getUser()`）をAction内で行っている

## ルート保護

以下のPublicルート以外はMiddlewareで保護される:
- `/`, `/auth/*`, `/login`, `/test/*`, `/terms`, `/privacy`, `/docs/*`

- [ ] 新しいpublicルートを追加する場合、`proxy.ts` の `isPublicRoute` に追加している
- [ ] 保護されたルートのServer Componentで追加の認証チェックを行っている

## コンポーネント配置

- [ ] コンポーネントファイルと `*.stories.tsx`, `*.test.tsx` が同一ディレクトリに配置（Co-located）
- [ ] バレルファイル（re-export用 `index.ts`）を作成していない
- [ ] `@/` パスエイリアスで絶対参照を使用している
- [ ] shadcn/ui コンポーネントは `components/ui/` に配置している

## ディレクトリ構造

- [ ] `app/` 配下はルーティング・レイアウト関連のみ
- [ ] ビジネスロジックは `lib/` 配下に分離
- [ ] カスタムフックは `hooks/` 配下
- [ ] 型定義は `types/` 配下
