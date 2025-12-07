# Implementation Plan

## Task Overview

Storybook環境の構築とコンポーネントストーリーの作成を段階的に実装する。

---

- [x] 1. Storybook基盤の構築
- [x] 1.1 Storybook依存パッケージのインストール
  - `@storybook/nextjs`、`@storybook/addon-essentials`、`@storybook/addon-a11y`、`@storybook/addon-themes`をdevDependenciesに追加
  - Storybook CLIで初期化またはマニュアルで`.storybook/`ディレクトリを作成
  - _Requirements: 1.1, 4.1, 4.2_

- [x] 1.2 Storybookメイン設定の作成
  - `.storybook/main.ts`を作成し、ストーリーファイル検出パターンを設定
  - `@storybook/nextjs`フレームワークを指定してパスエイリアス解決を有効化
  - アドオン群（essentials、a11y、themes）を登録
  - autodocs機能を有効化してDocsページ自動生成を設定
  - 静的アセット用に`staticDirs`を設定
  - _Requirements: 1.2, 1.4, 4.1, 4.2, 6.4_

- [x] 1.3 Storybookプレビュー設定の作成
  - `.storybook/preview.tsx`を作成し、`globals.css`をインポートしてTailwind CSSスタイルを適用
  - Controlsパネルのmatcher設定（color、date）を追加
  - ビューポートプリセット（mobile、tablet、desktop）を定義
  - `withThemeByClassName`デコレータでダークモード切り替え機能を設定
  - _Requirements: 1.3, 2.3, 4.3, 4.4_

- [x] 1.4 npm scriptsの追加と動作確認
  - `package.json`に`storybook`（開発サーバー起動）と`build-storybook`（静的ビルド）スクリプトを追加
  - `npm run storybook`でローカルサーバー起動を確認
  - `npm run build-storybook`で静的ビルド生成を確認
  - 既存のVitestテスト環境と競合がないことを確認
  - _Requirements: 1.1, 1.5, 5.2, 5.3, 5.4_

- [x] 1.5 Biome lint対象の確認
  - `biome.jsonc`の設定でストーリーファイル（`*.stories.tsx`）がlint対象に含まれることを確認
  - `.storybook/`ディレクトリがlint対象から除外されていないことを確認
  - _Requirements: 5.1_

- [x] 2. shadcn/uiコンポーネントのストーリー作成
- [x] 2.1 (P) Buttonコンポーネントのストーリー作成
  - CSF3形式で`button.stories.tsx`を作成
  - 全バリアント（default、destructive、outline、secondary、ghost、link）のストーリーを定義
  - サイズ別（sm、default、lg、icon）のストーリーを定義
  - disabled状態のストーリーを定義
  - argTypesでvariant、size、disabledプロパティを制御可能に設定
  - autodocsタグを追加してDocsページを自動生成
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 6.1, 6.2, 6.3_

- [x] 2.2 (P) Badge・Card・Checkboxコンポーネントのストーリー作成
  - `badge.stories.tsx`を作成し、バリアント別ストーリーを定義
  - `card.stories.tsx`を作成し、ヘッダー・コンテンツ・フッター構成のストーリーを定義
  - `checkbox.stories.tsx`を作成し、checked/unchecked/disabled状態のストーリーを定義
  - 各コンポーネントのargTypesを設定してControlsパネルで操作可能に
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 6.1, 6.2, 6.3_

- [x] 2.3 (P) Input・Label・Popoverコンポーネントのストーリー作成
  - `input.stories.tsx`を作成し、タイプ別・placeholder・disabled状態のストーリーを定義
  - `label.stories.tsx`を作成し、基本使用例のストーリーを定義
  - `popover.stories.tsx`を作成し、トリガーとコンテンツ表示のストーリーを定義
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 6.1, 6.2, 6.3_

- [x] 2.4 (P) DropdownMenuコンポーネントのストーリー作成
  - `dropdown-menu.stories.tsx`を作成
  - メニュー項目、セパレータ、サブメニューを含む構成のストーリーを定義
  - アイコン付きメニュー項目のストーリーを定義
  - ActionsパネルでonSelect等のイベント発火を確認可能に設定
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 6.1, 6.2, 6.3_

- [x] 3. カスタムコンポーネント（ランディングページ）のストーリー作成
- [x] 3.1 (P) Header・MobileNavコンポーネントのストーリー作成
  - `header.stories.tsx`を作成し、フルスクリーンレイアウトでプレビュー
  - モバイルビューポートでの表示ストーリーを定義
  - `mobile-nav.stories.tsx`を作成し、開閉状態のストーリーを定義
  - ナビゲーションリンクのActionsパネル連携を設定
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 6.1, 6.2, 6.3_

- [x] 3.2 (P) Hero・Featuresコンポーネントのストーリー作成
  - `hero.stories.tsx`を作成し、フルスクリーンレイアウトでプレビュー
  - `features.stories.tsx`を作成し、機能リスト表示のストーリーを定義
  - レスポンシブ表示（mobile、tablet、desktop）の確認用ストーリーを定義
  - _Requirements: 3.1, 3.2, 3.3, 6.1, 6.2, 6.3_

- [x] 3.3 (P) CTA・Footerコンポーネントのストーリー作成
  - `cta.stories.tsx`を作成し、アクションボタンの表示ストーリーを定義
  - `footer.stories.tsx`を作成し、フルスクリーンレイアウトでプレビュー
  - リンククリック時のActionsパネル連携を設定
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 6.1, 6.2, 6.3_

- [x] 4. カレンダーコンポーネントのストーリー作成
- [x] 4.1 (P) CalendarGrid・CalendarToolbarコンポーネントのストーリー作成
  - `calendar-grid.stories.tsx`を作成し、モックイベントデータを定義
  - ビューモード別（month、week、day）のストーリーを定義
  - イベントなし（empty）状態のストーリーを定義
  - `calendar-toolbar.stories.tsx`を作成し、ビューモード切替・日付ナビゲーションのストーリーを定義
  - onEventClick、onDateChange等のActionsパネル連携を設定
  - argTypesでviewMode、selectedDate等を制御可能に設定
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 6.1, 6.2, 6.3_

- [x] 4.2 (P) EventBlock・EventPopoverコンポーネントのストーリー作成
  - `event-block.stories.tsx`を作成し、モックイベントデータを定義
  - 通常イベント・終日イベントのストーリーを定義
  - `event-popover.stories.tsx`を作成し、ポップオーバー開閉状態のストーリーを定義
  - イベント詳細表示（タイトル、時間、説明）のストーリーを定義
  - onEventClick等のActionsパネル連携を設定
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 6.1, 6.2, 6.3_

- [x] 5. 統合確認とアクセシビリティ検証
- [x] 5.1 ストーリー一覧の動作確認
  - すべてのストーリーがエラーなくレンダリングされることを確認
  - Docsページが各コンポーネントで自動生成されていることを確認
  - コードスニペットが正しく表示されることを確認
  - _Requirements: 2.4, 6.4_

- [x] 5.2 Controlsパネルとテーマ切り替えの検証
  - 各コンポーネントのpropsがControlsパネルで動的に変更可能であることを確認
  - ツールバーからライト/ダークテーマの切り替えが正しく動作することを確認
  - テーマ切り替え時にCSS変数が正しく適用されることを確認
  - _Requirements: 2.3, 4.4_

- [x] 5.3 アクセシビリティとビューポート検証
  - a11yパネルで各コンポーネントのアクセシビリティ違反がないことを確認
  - Viewportアドオンでmobile、tablet、desktopの表示を確認
  - WAI-ARIA属性が正しく設定されていることを確認
  - _Requirements: 4.2, 4.3_
