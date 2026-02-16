# Research & Design Decisions

## Summary
- **Feature**: `static-pages`
- **Discovery Scope**: Simple Addition
- **Key Findings**:
  - V2のコンテンツはMarkdown + カスタムVueコンポーネント（VImage, Btn, Command）で構成。Next.jsでは純粋なTSXで再実装するのが最もシンプル
  - 現行アプリにはApp Routerの共有レイアウト（`layout.tsx`）がルートのみ。静的ページ用の中間レイアウトは不要（各ページが独立して Header/Footer を配置するパターン）
  - フッターのリンクは `#terms`, `#privacy` のプレースホルダー。Next.js `Link` コンポーネントへの移行が必要

## Research Log

### コンテンツ管理アプローチ
- **Context**: V2は `@nuxt/content` でMarkdownから動的ページ生成。Next.jsでの最適なアプローチを検討
- **Sources Consulted**: 既存コードベース分析、Next.js App Router パターン
- **Findings**:
  - コンテンツ量が少量（利用規約1件、プライバシーポリシー1件、ドキュメント7件）
  - 更新頻度が低い（法的文書は年単位、ドキュメントは機能追加時のみ）
  - V2のカスタムコンポーネント（VImage, Btn, Command）はReactコンポーネントに置換必要
- **Implications**: MDX導入のオーバーヘッドに対してコンテンツ量が少ないため、純粋なTSXで実装が最適

### 既存アプリのページ構成パターン
- **Context**: 新規ページが既存パターンに準拠するか確認
- **Sources Consulted**: `app/page.tsx`, `app/layout.tsx`, `app/dashboard/page.tsx`
- **Findings**:
  - ルートレイアウト（`app/layout.tsx`）はThemeProvider + TooltipProviderのみ
  - ランディングページは各セクションコンポーネントを直接配置（Header → Hero → Features → CTA → Footer）
  - ダッシュボードは独自構成（認証必須）
  - 共有レイアウトパターンは未使用（各ページが独立）
- **Implications**: 静的ページも同様に各ページが独立して Header/Footer を配置するパターンに従う

### ドキュメントページのルーティング
- **Context**: V2の `/docs/:slug` を Next.js App Router でどう実現するか
- **Sources Consulted**: Next.js App Router dynamic routes
- **Findings**:
  - `app/docs/[slug]/page.tsx` で動的ルーティング可能
  - `generateStaticParams()` でビルド時に全ページを静的生成可能
  - ドキュメントデータを定数として定義し、slug でルックアップ
- **Implications**: 動的ルートを使いつつ `generateStaticParams` で完全静的生成

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| MDX | @next/mdx でMarkdownコンテンツ管理 | コンテンツ編集が容易 | 依存追加、設定複雑化 | コンテンツ量に対して過剰 |
| 純粋TSX | Server Componentで直接JSX記述 | 依存なし、型安全、シンプル | コンテンツ変更にコード修正要 | 既存パターンと一致 |
| CMS連携 | Headless CMSからフェッチ | 非開発者が編集可能 | 外部依存、複雑化 | 現時点で不要 |

## Design Decisions

### Decision: 純粋TSX（Server Component）によるコンテンツ実装
- **Context**: 静的コンテンツの管理方式の選定
- **Alternatives Considered**:
  1. MDX — Markdown + React コンポーネント混在
  2. 純粋TSX — React Server Component でJSX直接記述
  3. CMS連携 — 外部CMSからデータ取得
- **Selected Approach**: 純粋TSX（Server Component）
- **Rationale**: コンテンツ量が少量（9ページ）、更新頻度が低く、追加依存なしで既存パターンと一致。型安全性も確保
- **Trade-offs**: コンテンツ変更にコード修正が必要だが、更新頻度を考慮すると許容範囲
- **Follow-up**: コンテンツ量が増加した場合はMDX移行を検討

### Decision: ドキュメントページの構成データ管理
- **Context**: 7ページのドキュメントの順序管理とナビゲーション生成
- **Selected Approach**: ドキュメントメタデータ配列を `lib/docs/` に定義し、slug・タイトル・順序・説明を管理
- **Rationale**: ナビゲーション（目次、前後リンク）の生成が容易。`generateStaticParams` との親和性が高い

### Decision: 利用規約・プライバシーポリシーのルーティング
- **Context**: V2では `/support/tos` と `/support/privacy` だったが、Next.jsでの最適なURLを検討
- **Selected Approach**: `/terms` と `/privacy` をトップレベルルートとして配置
- **Rationale**: SEO上、短く直感的なURLが望ましい。法的ページは独立性が高くサブディレクトリ不要

## Risks & Mitigations
- V2のスクリーンショット画像が現行UIと異なる → 初期実装ではプレースホルダーとして既存画像を使用、後日更新
- コンテンツがハードコードされるため更新にデプロイが必要 → 更新頻度が低いため許容。将来的にMDX移行可能な構造にしておく

## References
- Next.js App Router Dynamic Routes: https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes
- Next.js Metadata API: https://nextjs.org/docs/app/api-reference/functions/generate-metadata
- Next.js generateStaticParams: https://nextjs.org/docs/app/api-reference/functions/generate-static-params
