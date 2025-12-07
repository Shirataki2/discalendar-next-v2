# Research & Design Decisions

## Summary
- **Feature**: `storybook-integration`
- **Discovery Scope**: Extension (新規ツール導入を既存のNext.js + React 19環境に統合)
- **Key Findings**:
  - Storybook 8+はReact 19をサポートしているが、`@storybook/nextjs`との互換性には注意が必要
  - `@storybook/addon-themes`を使用してTailwind CSSのダークモード切り替えを実現
  - CSF3形式が現行標準、プロジェクトの既存パターン(shadcn/ui + Tailwind CSS変数)との統合が必要

## Research Log

### Storybook + React 19 互換性
- **Context**: React 19.2.1を使用する本プロジェクトでStorybookが動作するか確認
- **Sources Consulted**:
  - [GitHub Issue #29805 - Support React 19](https://github.com/storybookjs/storybook/issues/29805)
  - [GitHub Issue #30646 - React versions inconsistency](https://github.com/storybookjs/storybook/issues/30646)
- **Findings**:
  - Storybook 8+はReact 19を公式サポート
  - `@storybook/nextjs`はNext.jsにバンドルされたReactを使用するため、バージョン差異が発生する可能性がある
  - React 19のref props変更による予期しない動作の報告あり
- **Implications**: `@storybook/nextjs`の最新版を使用し、Reactバージョンの整合性を確認する必要がある

### Next.js App Router + RSC対応
- **Context**: App RouterとReact Server Componentsのサポート状況
- **Sources Consulted**:
  - [Storybook Next.js Framework docs](https://storybook.js.org/docs/get-started/frameworks/nextjs)
  - [Storybook RSC + MSW Blog](https://storybook.js.org/blog/build-a-nextjs-app-with-rsc-msw-storybook/)
- **Findings**:
  - Storybook 8はRSC互換性を提供
  - `experimentalRSC`フラグでServer Componentsをブラウザでレンダリング可能
  - Server Componentsはブラウザ環境では制限があり、モック化が必要な場合がある
- **Implications**: 本プロジェクトのカレンダーコンポーネントは`"use client"`でClient Componentsのため、RSC設定は不要

### Tailwind CSS ダークモード統合
- **Context**: 既存のshadcn/ui + Tailwind CSSテーマシステムとの統合
- **Sources Consulted**:
  - [Storybook Tailwind CSS Recipe](https://storybook.js.org/recipes/tailwindcss)
  - [Storybook addon-themes](https://storybook.js.org/addons/@storybook/addon-themes)
- **Findings**:
  - `@storybook/addon-themes`の`withThemeByClassName`デコレータを使用
  - 既存の`darkMode: ["class"]`設定と互換性あり
  - CSS変数ベースのテーマ(globals.css)をStorybookにインポートする必要あり
  - iframe内でのクラス適用には`withThemeByClassName`が適切
- **Implications**: `.storybook/preview.tsx`でglobals.cssをインポートし、テーマデコレータを設定

### CSF3とアドオン構成
- **Context**: ストーリーフォーマットとアドオンの選定
- **Sources Consulted**:
  - [Storybook CSF docs](https://storybook.js.org/docs/8/api/csf/csf-factories)
  - [Essential addons](https://storybook.js.org/docs/8/essentials/index)
  - [Accessibility addon](https://storybook.js.org/docs/writing-tests/accessibility-testing)
- **Findings**:
  - CSF3が現行標準(meta + named exports)
  - `@storybook/addon-essentials`にControls, Actions, Docs, Viewport含む
  - `@storybook/addon-a11y`はaxe-coreベースでWCAG検証可能
  - autodocs機能でDocsページを自動生成
- **Implications**: CSF3形式を採用し、autodocs有効化で開発者体験を向上

### 既存コンポーネント分析
- **Context**: ストーリー作成対象コンポーネントの特定
- **Sources Consulted**: プロジェクト内のGlob結果
- **Findings**:
  - UIプリミティブ(8個): badge, button, card, checkbox, dropdown-menu, input, label, popover
  - カスタムコンポーネント(5個): calendar-container, calendar-grid, calendar-toolbar, event-block, event-popover
  - ランディングページコンポーネント(6個): header, mobile-nav, hero, features, cta, footer
  - カレンダー系コンポーネントはSupabaseに依存するためモック化が必要
- **Implications**: 依存関係の少ないUIプリミティブから開始し、段階的に複雑なコンポーネントに拡張

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Co-located Stories | ストーリーファイルをコンポーネントと同じディレクトリに配置 | 保守性が高い、発見しやすい | ディレクトリが肥大化する可能性 | shadcn/uiパターンと整合 |
| Centralized Stories | `.storybook/stories/`に集約 | 分離が明確 | コンポーネントとの乖離リスク | 本プロジェクトには不適 |

**選択**: Co-located Stories - 要件6.3に合致し、既存のテストファイル配置パターン(*.test.tsx)と整合

## Design Decisions

### Decision: Storybook Framework選択
- **Context**: Next.js App Router環境でのフレームワーク選択
- **Alternatives Considered**:
  1. `@storybook/react-vite` - Viteベースで高速だがNext.js固有機能非対応
  2. `@storybook/nextjs` - Next.js専用、App Router/パスエイリアス対応
- **Selected Approach**: `@storybook/nextjs`
- **Rationale**: `@/`パスエイリアス、next/image、next/link等のNext.js機能を自動サポート
- **Trade-offs**: Webpack依存のためViteより起動が遅い可能性があるが、互換性を優先
- **Follow-up**: パフォーマンスが問題になる場合はSWCオプション(`useSWC: true`)を検討

### Decision: ダークモード実装方式
- **Context**: 既存のTailwind CSS + next-themesとの統合
- **Alternatives Considered**:
  1. `storybook-dark-mode`アドオン - シンプルだがカスタマイズ性低い
  2. `@storybook/addon-themes` - 公式サポート、柔軟な設定
  3. カスタムデコレータ - 完全制御だが保守コスト高い
- **Selected Approach**: `@storybook/addon-themes`の`withThemeByClassName`
- **Rationale**: 公式サポート、既存の`darkMode: ["class"]`と互換、ツールバーでの切り替えUI提供
- **Trade-offs**: next-themesとは別系統だがStorybook内では問題なし
- **Follow-up**: globals.cssの変数定義がStorybook環境でも正しく適用されることを確認

### Decision: ストーリーファイルのLint対象化
- **Context**: Biome/Ultraciteでストーリーファイルの品質を担保
- **Alternatives Considered**:
  1. 除外継続 - 設定変更不要だが品質管理が不十分
  2. 全ストーリーを対象に追加 - 一貫した品質管理
- **Selected Approach**: `biome.jsonc`の`includes`にストーリーファイルを追加
- **Rationale**: 要件5.1に合致、プロジェクト全体の品質基準を維持
- **Trade-offs**: 既存コードと異なるスタイルの場合は修正が必要
- **Follow-up**: `*.stories.tsx`パターンが正しく認識されることを確認

### Decision: カレンダーコンポーネントのモック戦略
- **Context**: CalendarContainerはSupabaseクライアントに依存
- **Alternatives Considered**:
  1. MSW (Mock Service Worker) - ネットワークレベルでモック
  2. モジュールモック - Storybookデコレータでプロバイダーをモック
  3. プロップスインジェクション - データをprops経由で注入
- **Selected Approach**: プロップスインジェクション + 単体コンポーネントストーリー
- **Rationale**: CalendarContainerは統合テスト向け、子コンポーネント(CalendarGrid, EventBlock等)は単体でストーリー化可能
- **Trade-offs**: 完全なE2Eストーリーは限定的だが、UI検証には十分
- **Follow-up**: 必要に応じてMSW統合を検討

## Risks & Mitigations
- **React 19互換性問題** - 最新の`@storybook/nextjs`を使用し、問題発生時はGitHub Issuesを参照
- **Tailwind CSSスタイル未適用** - globals.cssをpreview.tsxでインポート、PostCSS設定をStorybook用に構成
- **パスエイリアス解決失敗** - `@storybook/nextjs`がtsconfig.jsonを自動読み込みするため通常は問題なし、失敗時はmain.tsで明示設定
- **ビルド時間増加** - 初期はUI基盤コンポーネントのみ対象とし、段階的に拡張

## References
- [Storybook for Next.js Documentation](https://storybook.js.org/docs/get-started/frameworks/nextjs) - 公式Next.js統合ガイド
- [Storybook Tailwind CSS Recipe](https://storybook.js.org/recipes/tailwindcss) - Tailwind統合のベストプラクティス
- [Component Story Format 3](https://storybook.js.org/docs/8/api/csf/csf-factories) - CSF3形式の公式ドキュメント
- [Accessibility Addon](https://storybook.js.org/docs/writing-tests/accessibility-testing) - a11yテスト設定ガイド
