# Requirements Document

## Introduction

本ドキュメントは、DiscalendarプロジェクトにStorybookを導入するための要件を定義します。Storybookは、UIコンポーネントを独立して開発・テスト・ドキュメント化するためのツールです。既存のNext.js App Router、React 19、shadcn/ui、Tailwind CSSの技術スタックと統合し、コンポーネント駆動開発を促進します。

## Requirements

### Requirement 1: Storybookの初期設定

**Objective:** 開発者として、Next.js + React 19環境でStorybookを実行できるようにしたい。これにより、コンポーネントを独立した環境で開発・確認できる。

#### Acceptance Criteria

1. When `npm run storybook`を実行した場合, the Storybook shall ローカル開発サーバーを起動しブラウザでアクセス可能にする
2. The Storybook shall TypeScript（strict mode）で記述されたコンポーネントを正しく解釈する
3. The Storybook shall Tailwind CSSのスタイルをプレビュー環境に適用する
4. The Storybook shall `@/`パスエイリアスを正しく解決する
5. When `npm run build-storybook`を実行した場合, the Storybook shall 静的サイトとしてビルドを生成する

### Requirement 2: shadcn/uiコンポーネントのストーリー作成

**Objective:** 開発者として、既存のshadcn/uiコンポーネントをStorybookで確認・ドキュメント化したい。これにより、UIプリミティブの使用方法を把握しやすくなる。

#### Acceptance Criteria

1. The Storybook shall `/components/ui/`配下の各コンポーネントに対応するストーリーファイルを持つ
2. When ストーリーを表示した場合, the Storybook shall コンポーネントの全バリアント（variant、size等）をプレビュー可能にする
3. The Storybook shall コンポーネントのpropsをControlsパネルで動的に変更可能にする
4. The Storybook shall 各コンポーネントの使用例とコードスニペットを表示する

### Requirement 3: カスタムコンポーネントのストーリー作成

**Objective:** 開発者として、アプリケーション固有のカスタムコンポーネントをStorybookでドキュメント化したい。これにより、コンポーネントの再利用性と理解が向上する。

#### Acceptance Criteria

1. The Storybook shall `/components/`配下の主要なカスタムコンポーネントに対応するストーリーファイルを持つ
2. When カスタムコンポーネントがpropsを受け取る場合, the Storybook shall Controlsパネルでpropsを変更可能にする
3. The Storybook shall コンポーネントの異なる状態（loading、error、empty等）をストーリーとして表示する
4. Where コンポーネントがインタラクションを持つ場合, the Storybook shall Actionsパネルでイベントハンドラーの発火を確認可能にする

### Requirement 4: アドオンの統合

**Objective:** 開発者として、Storybookのアドオンを活用してコンポーネントの品質を向上させたい。これにより、アクセシビリティやテーマ対応の検証が容易になる。

#### Acceptance Criteria

1. The Storybook shall @storybook/addon-essentialsを統合し、Controls、Actions、Docs、Viewportアドオンを利用可能にする
2. The Storybook shall アクセシビリティアドオン（@storybook/addon-a11y）を統合し、WAI-ARIA準拠を検証可能にする
3. When Viewportアドオンを使用した場合, the Storybook shall モバイル、タブレット、デスクトップのビューポートでプレビュー可能にする
4. Where プロジェクトがダークモードをサポートする場合, the Storybook shall ライト/ダークテーマを切り替えてプレビュー可能にする

### Requirement 5: 開発ワークフローの統合

**Objective:** 開発者として、既存の開発ワークフローとStorybookを統合したい。これにより、コード品質と開発効率を維持できる。

#### Acceptance Criteria

1. The Storybook shall Biome（Ultracite）のlint/format対象としてストーリーファイルを含める
2. The Storybook shall `package.json`に`storybook`（開発）と`build-storybook`（ビルド）のスクリプトを追加する
3. If Storybookのビルドが失敗した場合, the Storybook shall エラーメッセージを明確に表示する
4. The Storybook shall 既存のVitestテスト環境と競合せずに動作する

### Requirement 6: ストーリーファイルの構成規約

**Objective:** 開発者として、一貫性のあるストーリーファイル構成を持ちたい。これにより、チーム全体でStorybookを効果的に活用できる。

#### Acceptance Criteria

1. The Storybook shall Component Story Format 3（CSF3）でストーリーを記述する
2. The Storybook shall ストーリーファイルを`*.stories.tsx`の命名規則で配置する
3. The Storybook shall ストーリーファイルを対象コンポーネントと同じディレクトリに配置する
4. The Storybook shall 自動ドキュメント生成（autodocs）を有効化し、各コンポーネントのDocsページを生成する

