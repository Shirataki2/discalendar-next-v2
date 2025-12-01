# Research & Design Decisions

---
**Purpose**: Capture discovery findings, architectural investigations, and rationale that inform the technical design.

**Usage**:
- Log research activities and outcomes during the discovery phase.
- Document design decision trade-offs that are too detailed for `design.md`.
- Provide references and evidence for future audits or reuse.
---

## Summary
- **Feature**: `landing-page-mockup`
- **Discovery Scope**: New Feature (greenfield landing page implementation)
- **Key Findings**:
  - Next.js App RouterのServer Componentsを活用したパフォーマンス最適化が可能
  - shadcn/uiには公式のモバイルナビゲーションコンポーネントがなく、カスタム実装が必要
  - next/imageコンポーネントのblur placeholder機能によりUX向上が実現可能

## Research Log

### Next.js 15 App Router - ランディングページのベストプラクティス

- **Context**: ランディングページの実装アプローチを決定するため、Next.js 15の最新ベストプラクティスを調査
- **Sources Consulted**:
  - [Next.js 15 in 2025: Features, Best Practices](https://javascript.plainenglish.io/next-js-15-in-2025-features-best-practices-and-why-its-still-the-framework-to-beat-a535c7338ca8)
  - [Best Practices for Organizing Your Next.js 15 2025](https://dev.to/bajrayejoon/best-practices-for-organizing-your-nextjs-15-2025-53ji)
  - [Next.js Best Practices in 2025: Performance & Architecture](https://www.raftlabs.com/blog/building-with-next-js-best-practices-and-benefits-for-performance-first-teams/)
- **Findings**:
  - App RouterはReact Server Componentsを基盤とし、2025年時点でのスタンダード
  - ランディングページはSSG（Static Site Generation）が最適 - SEOとパフォーマンスの両立
  - next/imageの自動最適化（WebP/AVIF）により帯域幅を最大30%削減
  - Server Componentsをデフォルトとし、インタラクションが必要な箇所のみClient Components化
  - プロジェクト構造: `app/`にルーティング、`components/ui/`にshadcn/ui、`components/`にカスタムコンポーネント
- **Implications**:
  - ページ全体をServer Componentとして実装し、モバイルメニューのトグル部分のみClient Component化
  - 画像最適化にnext/imageを必須使用
  - メタデータ設定をApp Router標準のMetadata APIで実装

### shadcn/ui レスポンシブナビゲーション - モバイルハンバーガーメニュー

- **Context**: モバイル対応のナビゲーションメニュー実装方法を調査
- **Sources Consulted**:
  - [shadcn/ui Navigation Menu](https://ui.shadcn.com/docs/components/navigation-menu)
  - [Responsive Navbar in Next.js with shadcn/ui](https://frontendshape.com/post/create-responsive-navbar-in-next-13-with-shadcn-ui)
  - [Shadcnblocks Navbar Components](https://www.shadcnblocks.com/blocks/navbar)
  - [GitHub Issue: Add mobile nav #761](https://github.com/shadcn-ui/ui/issues/761)
- **Findings**:
  - shadcn/ui公式にはモバイル専用ナビゲーションコンポーネントは存在しない
  - 公式ドキュメントはSheetまたはDrawerコンポーネントの使用を推奨
  - コミュニティではlucide-reactの`Menu`アイコンとReact stateによるカスタム実装が一般的
  - Tailwind CSSのレスポンシブブレークポイント（md:、lg:）で表示切り替え
  - 18+のコミュニティ製navbarブロックが存在（React、TypeScript、Tailwind CSS）
- **Implications**:
  - Buttonコンポーネント + lucide-reactの`Menu`/`X`アイコンでハンバーガーメニューを実装
  - モバイルメニュー部分はClient Componentとして分離
  - md:ブレークポイント（768px）以上でデスクトップナビゲーション表示

### Next.js Image最適化 - Blur Placeholder

- **Context**: 画像読み込み時のUX向上とパフォーマンス最適化手法を調査
- **Sources Consulted**:
  - [Next.js Image Component API Reference](https://nextjs.org/docs/app/api-reference/components/image)
  - [Next.js Image Placeholder Best Practices](https://www.dhiwise.com/blog/design-converter/how-to-use-nextjs-image-placeholder-for-better-speed)
  - [Complete Guide on Placeholder using Next.js Image](https://blog.olivierlarose.com/articles/placeholder-guide-using-next-image)
- **Findings**:
  - next/imageは`placeholder="blur"`プロパティをサポート
  - 静的インポート画像の場合、blurDataURLは自動生成される
  - 外部/動的画像の場合、width、height、blurDataURLを手動指定
  - 大きなblurDataURLはパフォーマンスに悪影響 - シンプルで小さいものを推奨
  - ビューポート進入時のlazy loadingが自動適用
  - 画像最適化により品質を損なわずファイルサイズ削減
- **Implications**:
  - モックアップではプレースホルダー画像を使用するため、静的インポートまたは単純なblurDataURLを採用
  - カレンダーUIモックアップ画像にはblur placeholderを適用してUX向上
  - 将来の実装: 実データ統合時は外部画像用にblurDataURL生成戦略が必要

### lucide-react アイコンライブラリ

- **Context**: UIアイコンの選定と使用方法を確認
- **Sources Consulted**:
  - [Lucide React Official Docs](https://lucide.dev/guide/packages/lucide-react)
  - [Lucide React: Modern Icon Library Guide 2025](https://www.greasyguide.com/development/lucide-react-icon-library-guide-2025/)
  - [lucide-react npm](https://www.npmjs.com/package/lucide-react)
- **Findings**:
  - 1,000以上の高品質SVGアイコン、週次ダウンロード200,000+
  - 完全なtree-shakable - インポートしたアイコンのみがバンドルに含まれる
  - TypeScript完全サポート、型定義完備
  - カスタムプロパティ: color、size、strokeWidth
  - 必要なアイコン: Menu（ハンバーガー）、X（閉じる）、Calendar（機能紹介）、MessageSquare等
- **Implications**:
  - 機能紹介セクションのアイコンにlucide-reactを使用
  - package.jsonに既に`lucide-react: ^0.511.0`が存在 - 追加インストール不要

### Tailwind CSS レスポンシブブレークポイント

- **Context**: レスポンシブデザインの実装基準を確認
- **Sources Consulted**:
  - [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design)
  - [Tailwind Breakpoints: Complete 2025 Guide](https://tailkits.com/blog/tailwind-breakpoints-complete-guide/)
- **Findings**:
  - デフォルトブレークポイント（mobile-first）:
    - sm: 640px
    - md: 768px
    - lg: 1024px
    - xl: 1280px
    - 2xl: 1536px
  - プレフィックスなしのユーティリティは全画面サイズで有効
  - プレフィックス付き（md:など）は指定ブレークポイント以上で有効
  - グリッドレイアウト例: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- **Implications**:
  - 要件の画面サイズ基準に対応:
    - モバイル（320px以上）: デフォルト
    - タブレット（768px以上）: md:プレフィックス
    - デスクトップ（1024px以上）: lg:プレフィックス
  - 機能カード: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
  - ヒーローセクション: `flex-col lg:flex-row`

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Monolithic Page Component | すべてのセクションを`app/page.tsx`に実装 | シンプル、初期実装が高速 | 保守性低下、再利用性なし | 要件9により不採用 |
| Section Component分離 | ヘッダー、ヒーロー、機能紹介、CTA、フッターを独立コンポーネント化 | 保守性向上、再利用可能、テスト容易 | ファイル数増加、初期実装コスト | **採用** - 要件9に準拠 |
| Feature-First構造 | `/app/(marketing)/page.tsx`等のRoute Group使用 | 将来の拡張性高 | 現時点でオーバーエンジニアリング | モックアップには不要 |

## Design Decisions

### Decision: Server Components vs Client Components分離戦略

- **Context**: Next.js App RouterでServer ComponentsとClient Componentsの境界を決定
- **Alternatives Considered**:
  1. すべてをServer Componentsとして実装 - インタラクションがないため
  2. すべてをClient Componentsとして実装 - 実装の簡便性
  3. ハイブリッドアプローチ - インタラクション部分のみClient Components化
- **Selected Approach**: ハイブリッドアプローチ（オプション3）
  - メインページ（app/page.tsx）: Server Component
  - セクションコンポーネント（Hero、Features、CTA、Footer）: Server Component
  - モバイルナビゲーションメニュー: Client Component（"use client"ディレクティブ）
- **Rationale**:
  - ランディングページの大部分は静的コンテンツ - Server Componentsでパフォーマンス最適化
  - モバイルメニューのトグル状態管理のみクライアントサイドが必要
  - クライアントサイドJavaScriptを最小限に抑えることで初期ロード高速化
  - Next.js 15のベストプラクティスに準拠
- **Trade-offs**:
  - Benefits: バンドルサイズ削減、SEO向上、パフォーマンス最適化
  - Compromises: コンポーネント境界の明示的管理が必要
- **Follow-up**: モバイルメニューのハイドレーションエラーがないか実装時に検証

### Decision: コンポーネント分割粒度

- **Context**: 要件9「コンポーネント構成と再利用性」の実装方針
- **Alternatives Considered**:
  1. ページレベルのみ - `/app/page.tsx`に全実装
  2. セクションレベル - Header、Hero、Features、CTA、Footer
  3. 細粒度分割 - FeatureCard、NavLink等の小単位コンポーネント
- **Selected Approach**: セクションレベル + 一部細粒度コンポーネント（オプション2+3のハイブリッド）
  - セクションコンポーネント: `Header`, `Hero`, `Features`, `CTA`, `Footer`
  - 細粒度コンポーネント: `MobileNav`（インタラクション部分）
  - 機能カードはFeaturesコンポーネント内でmap処理（独立コンポーネント化しない）
- **Rationale**:
  - セクション単位の分離で保守性と可読性のバランスを実現
  - 機能カードはモックデータの配列処理で十分 - 過度な抽象化を回避
  - MobileNavはインタラクションロジックの明確な境界を持つため分離
  - steering/structure.mdの「機能コンポーネント: `/components/`」パターンに準拠
- **Trade-offs**:
  - Benefits: 適切な抽象化レベル、将来の拡張性、テスト容易性
  - Compromises: 中程度のファイル数（~6コンポーネント）
- **Follow-up**: 実装後にコンポーネントサイズを確認し、200行超の場合は分割を検討

### Decision: スタイリング戦略とデザインシステム

- **Context**: 要件10「スタイリングとデザインシステム」の具体的実装方針
- **Alternatives Considered**:
  1. Tailwind CSSのみ - ユーティリティクラスのみ使用
  2. CSS Modules - 独立したCSSファイル
  3. shadcn/ui variants - class-variance-authorityによるバリアント管理
- **Selected Approach**: Tailwind CSS + shadcn/ui variants（オプション1+3）
  - 基本スタイリング: Tailwind CSSユーティリティクラス
  - インタラクティブ要素: shadcn/ui Buttonコンポーネント（variants利用）
  - レスポンシブ: Tailwindブレークポイント（md:、lg:）
  - カラーパレット: Tailwind CSSデフォルトカラー + CSS変数（`--background`, `--foreground`等）
- **Rationale**:
  - プロジェクトのtech.mdで定義された標準スタック
  - next-themesによるダークモード対応が既に設定済み
  - ユーティリティファーストでCSSファイル数を最小化
  - shadcn/uiのvariantsで一貫したデザインシステムを維持
- **Trade-offs**:
  - Benefits: 高速開発、一貫性、保守性、ダークモード対応
  - Compromises: HTMLクラス名が長くなる可能性
- **Follow-up**: カスタムカラー変数の定義が必要か実装時に判断

### Decision: モックデータとプレースホルダー画像戦略

- **Context**: 要件11「モックデータとプレースホルダー」の実装方法
- **Alternatives Considered**:
  1. 外部プレースホルダーサービス（placeholder.com等）
  2. 静的画像ファイル（public/ディレクトリ）
  3. SVGプレースホルダー（インラインSVG）
  4. next/imageのblurDataURL生成
- **Selected Approach**: 組み合わせアプローチ
  - テキストコンテンツ: コンポーネント内定数として定義
  - 機能カードデータ: TypeScript型定義付き配列
  - メインビジュアル: SVGプレースホルダーまたは簡易的なグラデーション背景
  - アイコン: lucide-reactアイコンコンポーネント
- **Rationale**:
  - 外部依存なしで完結 - オフライン開発可能
  - TypeScript型定義により将来のAPI統合への移行が容易
  - SVGプレースホルダーは軽量かつカスタマイズ可能
  - next/imageのblur機能を実証できる
- **Trade-offs**:
  - Benefits: 自己完結、型安全性、将来の拡張性
  - Compromises: 本番相当のビジュアル品質ではない（モックアップとして許容範囲）
- **Follow-up**: 実データ統合時のインターフェース設計を考慮した型定義

## Risks & Mitigations

- **Risk 1: モバイルナビゲーションのアクセシビリティ不足** - 提案緩和策: ARIA属性（aria-label、aria-expanded）の適切な実装、キーボードナビゲーション（Escape、Tab）のサポート、フォーカストラップの実装
- **Risk 2: レスポンシブブレークポイントでのレイアウト崩れ** - 提案緩和策: Playwrightによる複数画面サイズでのE2Eテスト、Chrome DevToolsのデバイスエミュレーションでの検証
- **Risk 3: Biomeリンティングルール違反** - 提案緩和策: 開発中に継続的に`npx ultracite check`を実行、pre-commitフックでの自動検証（Husky設定済み）
- **Risk 4: Server ComponentsとClient Componentsの境界エラー** - 提案緩和策: "use client"ディレクティブの明示的配置、React hooksの使用箇所の厳密な管理、Next.jsビルドエラーの即時対応
- **Risk 5: 画像最適化の不十分なパフォーマンス** - 提案緩和策: next/imageのpriorityプロパティをヒーローセクションに適用、適切なwidth/height設定によるCLS（Cumulative Layout Shift）防止

## References

### Official Documentation
- [Next.js App Router](https://nextjs.org/docs/app) - App Routerの公式ドキュメント
- [Next.js Image Component](https://nextjs.org/docs/app/api-reference/components/image) - next/image最適化リファレンス
- [shadcn/ui Documentation](https://ui.shadcn.com/) - UIコンポーネントライブラリ
- [Tailwind CSS](https://tailwindcss.com/docs) - スタイリングフレームワーク
- [lucide-react](https://lucide.dev/guide/packages/lucide-react) - アイコンライブラリ

### Best Practices & Guides
- [Next.js 15 in 2025: Features, Best Practices](https://javascript.plainenglish.io/next-js-15-in-2025-features-best-practices-and-why-its-still-the-framework-to-beat-a535c7338ca8) - Next.js 15ベストプラクティス
- [Responsive Navbar in Next.js with shadcn/ui](https://frontendshape.com/post/create-responsive-navbar-in-next-13-with-shadcn-ui) - レスポンシブナビゲーション実装ガイド
- [Tailwind Breakpoints: Complete 2025 Guide](https://tailkits.com/blog/tailwind-breakpoints-complete-guide/) - Tailwindブレークポイントガイド

### Project Context
- `.kiro/steering/product.md` - Discalendarプロダクト概要
- `.kiro/steering/tech.md` - 技術スタック定義
- `.kiro/steering/structure.md` - プロジェクト構造規約
- `.kiro/settings/rules/design-principles.md` - 設計原則
