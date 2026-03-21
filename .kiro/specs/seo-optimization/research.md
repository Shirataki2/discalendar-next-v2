# Research & Design Decisions

## Summary
- **Feature**: `seo-optimization`
- **Discovery Scope**: Extension（既存Next.js Metadata APIの拡張 + 新規OGP画像・JSON-LD追加）
- **Key Findings**:
  - Next.jsのファイルベース規約（`opengraph-image.tsx`）がAPIルート方式よりも推奨される
  - `app/auth/login/page.tsx`が`"use client"`のため、login用layoutでメタデータを設定する必要がある
  - JSON-LDはNext.js公式ガイドに従い、`<script>`タグとしてページコンポーネントに直接レンダリングする

## Research Log

### OGP画像生成: ファイルベース規約 vs APIルート
- **Context**: 要件ではAPIルート（`app/api/og/route.tsx`）が技術メモに記載されているが、Next.js公式ドキュメントではファイルベース規約を推奨
- **Sources Consulted**:
  - [Metadata Files: opengraph-image](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image)
  - [Getting Started: Metadata and OG images](https://nextjs.org/docs/app/getting-started/metadata-and-og-images)
  - [Functions: ImageResponse](https://nextjs.org/docs/app/api-reference/functions/image-response)
- **Findings**:
  - `opengraph-image.tsx`ファイルを配置すると、Next.jsが自動的に`<meta property="og:image">`タグを生成
  - `export const size`, `export const contentType`, `export const alt`で画像メタデータを宣言的に設定可能
  - カスタムフォントは`readFile(join(process.cwd(), 'path/to/font'))`で読み込み
  - デフォルトで静的最適化（ビルド時生成・キャッシュ）される
  - `?title=`クエリパラメータによる動的テキストは、ファイルベース規約でもRoute Segment Configで対応可能
- **Implications**: ファイルベース規約を採用。`app/opengraph-image.tsx`をルートに配置し全公開ページのデフォルトOGP画像とする

### JSON-LD構造化データの実装パターン
- **Context**: Next.js App RouterでのJSON-LD推奨実装方法の確認
- **Sources Consulted**:
  - [Guides: JSON-LD](https://nextjs.org/docs/app/guides/json-ld)
- **Findings**:
  - ネイティブ`<script>`タグとしてlayout.jsまたはpage.jsコンポーネントでレンダリング
  - XSSインジェクション防止のため、HTMLタグのスクラビングが推奨（`<`を`\u003c`に置換）
  - Schema.org準拠の検証は[Rich Results Test](https://search.google.com/test/rich-results)で実施
- **Implications**: ランディングページ（`app/page.tsx`）にJSON-LDコンポーネントをインラインで配置

### Client Componentのメタデータ制約
- **Context**: `app/auth/login/page.tsx`が`"use client"`でメタデータexport不可
- **Sources Consulted**: Next.js Metadata API仕様
- **Findings**:
  - `metadata`および`generateMetadata`はServer Componentsでのみサポート
  - Client Component pageのメタデータは親layoutで設定する必要がある
  - `app/auth/login/layout.tsx`（Server Component）を新規作成して解決可能
- **Implications**: `app/auth/login/layout.tsx`を作成してloginページのメタデータを設定

### Next.js title.template機能
- **Context**: すべての公開ページのtitleを「ページ名 | Discalendar」形式で統一する要件
- **Sources Consulted**: [Functions: generateMetadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
- **Findings**:
  - ルートlayoutで`title: { default: "...", template: "%s | Discalendar" }`を設定可能
  - 子ルートのtitleが自動的にテンプレートに組み込まれる
  - ランディングページは`title`を直接設定して`template`を上書き可能
- **Implications**: ルートlayoutでtitle.templateを活用し、各ページはページ名のみを設定

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| ファイルベースOGP | `opengraph-image.tsx`規約 | 自動meta tag生成、静的最適化、Next.js推奨 | ルート間で画像を分ける場合はファイル複製が必要 | 採用 |
| APIルートOGP | `app/api/og/route.tsx` | 柔軟なクエリパラメータ対応 | meta tagを手動設定、Next.js推奨パターンから逸脱 | 不採用 |
| Layout階層メタデータ | Next.js Metadata APIのマージ動作を活用 | 共通設定を一箇所で管理、各ページは差分のみ | layoutファイル追加が必要（login, dashboard） | 採用 |

## Design Decisions

### Decision: OGP画像はファイルベース規約を採用
- **Context**: 要件R4でOGP画像の動的生成が求められている
- **Alternatives Considered**:
  1. APIルート（`app/api/og/route.tsx`）— 技術メモに記載の方式
  2. ファイルベース規約（`app/opengraph-image.tsx`）— Next.js推奨方式
- **Selected Approach**: ファイルベース規約
- **Rationale**: Next.jsが自動的にog:image meta tagを生成し、静的最適化も適用される。APIルート方式は手動でmeta tagを設定する必要があり、保守性が劣る
- **Trade-offs**: クエリパラメータによる動的テキスト対応は、ファイルベースでもsearchParamsで対応可能
- **Follow-up**: UniSansHeavy.otf（OTF形式）のImageResponse互換性を実装時に検証

### Decision: login/dashboardにlayout.tsxを追加
- **Context**: loginページが"use client"でmetadata export不可、dashboardにnoindex設定が必要
- **Selected Approach**: `app/auth/login/layout.tsx`と`app/dashboard/layout.tsx`を新規作成
- **Rationale**: Next.jsのlayout階層によるメタデータマージが最も自然なパターン
- **Trade-offs**: ファイル数は増えるが、各layoutは最小限の責任（メタデータ設定のみ）

### Decision: metadataBaseの設定方針
- **Context**: 現在`VERCEL_URL`ベースだが、要件ではプロダクションURLを明示指定
- **Selected Approach**: `VERCEL_PROJECT_PRODUCTION_URL`を優先し、フォールバックとして`VERCEL_URL`、最終的に`http://localhost:3000`
- **Rationale**: `VERCEL_PROJECT_PRODUCTION_URL`はプロダクションドメインを返すVercel環境変数。Preview Deploymentでも正しいcanonical URLが設定される
- **Trade-offs**: Preview Deploymentでのデバッグ時にOGP画像URLがプロダクションを指す可能性があるが、SEO的には正しい動作

## Risks & Mitigations
- **UniSansHeavy.otf互換性**: OTF形式がImageResponse（satori）で動作しない可能性 → 実装時にTTF変換またはGoogle Fontsフォールバックを用意
- **OGPキャッシュ**: SNS（Discord, X）のOGPキャッシュにより変更が即座に反映されない → 検証時にキャッシュクリアツールを使用
- **Lighthouse SEOスコア**: 現状ベースラインが不明 → 実装前後でスコアを計測して比較

## References
- [Next.js Metadata Files: opengraph-image](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image)
- [Next.js Getting Started: Metadata and OG images](https://nextjs.org/docs/app/getting-started/metadata-and-og-images)
- [Next.js Functions: ImageResponse](https://nextjs.org/docs/app/api-reference/functions/image-response)
- [Next.js Guides: JSON-LD](https://nextjs.org/docs/app/guides/json-ld)
- [Next.js Functions: generateMetadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
- [Vercel: OG Image Generation](https://vercel.com/docs/functions/og-image-generation)
