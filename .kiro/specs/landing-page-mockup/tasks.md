# 実装計画

## タスク概要

本実装計画は、Discalendarランディングページのモックアップを構築するための詳細なタスクブレークダウンを提供します。Next.js App Router、shadcn/ui、Tailwind CSSを活用し、レスポンシブでアクセシブルなUIを実装します。

**実装スコープ**:
- 新規実装: ランディングページの完全な構造とコンポーネント
- 対象ファイル: `app/page.tsx`を置き換え、`components/`配下に新規コンポーネント追加
- 並行実行: 可能な箇所に`(P)`マーカーを適用

## タスク一覧

### Phase 1: プロジェクトセットアップと型定義

- [ ] 1. プロジェクト構造の確認と型定義の準備
- [x] 1.1 (P) 既存プロジェクト構造の検証とshadcn/uiコンポーネントの確認
  - Next.js App Routerの`app/layout.tsx`がThemeProvider統合済みであることを確認
  - `components/ui/`配下にButton、Cardコンポーネントが存在することを確認
  - `lucide-react`（^0.511.0）がpackage.jsonに含まれることを確認
  - Tailwind CSS設定（`tailwind.config.ts`）のブレークポイント確認
  - _Requirements: 1.2, 1.4, 9.1_

- [x] 1.2 (P) 共通型定義とモックデータ構造の作成
  - ナビゲーションリンク用の`NavLink`型定義
  - 機能カード用の`FeatureItem`型定義
  - フッターリンク用の`FooterLink`および`SocialLink`型定義
  - 各型定義をTypeScript strict modeで型安全に実装（type aliasを使用）
  - _Requirements: 9.4, 9.5, 11.3, 11.5_

### Phase 2: ページレベルコンポーネント実装

- [x] 2. メインページの実装とセマンティックHTML構造の確立
- [x] 2.1 新しい`app/page.tsx`の作成とServer Component実装
  - 既存の`app/page.tsx`を新しいランディングページ構造に置き換え
  - セマンティックHTML（`<main>`要素）でページ構造を定義
  - Server Componentとして実装（"use client"ディレクティブなし）
  - メタデータの設定（タイトル、description）
  - _Requirements: 1.1, 1.2, 7.1, 8.3_

- [x] 2.2 セクションコンポーネントの統合とレイアウト構築
  - Header、Hero、Features、CTA、Footerコンポーネントのインポートと配置
  - セクション間のスペーシング設定（Tailwind CSSマージンユーティリティ）
  - 全体のページ構造が論理的な順序で表示されることを確認
  - _Requirements: 1.1, 1.5, 10.1, 10.4_

### Phase 3: ヘッダーコンポーネント実装

- [x] 3. ヘッダーナビゲーションの実装
- [x] 3.1 (P) Headerコンポーネントの基本構造実装
  - `components/header.tsx`を作成しServer Componentとして実装
  - セマンティックHTML（`<header>`、`<nav>`要素）を使用
  - サービス名またはロゴの表示エリアを配置
  - デスクトップナビゲーションリンク（機能、使い方、料金）を実装
  - レスポンシブデザイン（md:ブレークポイント以上でナビゲーション表示）
  - _Requirements: 2.1, 2.2, 2.3, 2.6, 7.1_

- [x] 3.2 (P) ヘッダーCTAボタンとレイアウト実装
  - shadcn/uiの`Button`コンポーネントを使用して「ログイン」および「無料で始める」ボタンを配置
  - ボタンのvariant設定（ghost、default等）で視覚的差別化
  - ヘッダー内のFlexboxレイアウトで要素を適切に配置（space-between等）
  - モバイル画面でボタンの表示調整（必要に応じて省略または縮小）
  - _Requirements: 2.4, 10.1, 10.5_

- [x] 3.3 MobileNavコンポーネントの実装とHeaderへの統合
  - `components/mobile-nav.tsx`を作成しClient Componentとして実装（"use client"ディレクティブ必須）
  - React useState hookでメニュー開閉状態（`isOpen`）を管理
  - lucide-reactの`Menu`および`X`アイコンを使用してハンバーガーボタンを実装
  - メニュー開閉時のトグル動作を実装
  - ナビゲーションリンクのモーダル表示（モバイル画面のみ）
  - ARIA属性（`aria-label`、`aria-expanded`）の適用
  - キーボードアクセシビリティ（Tab、Enter）の確保
  - リンククリック時にメニューを自動的に閉じる動作の実装
  - md:ブレークポイント以上でMobileNavを非表示（`hidden md:hidden`）
  - Headerコンポーネントから`navLinks`をpropsとして渡す
  - _Requirements: 2.5, 7.4, 7.5, 7.6, 8.4_

### Phase 4: ヒーローセクション実装

- [x] 4. ヒーローセクションの実装
- [x] 4.1 (P) Heroコンポーネントの基本構造とテキストコンテンツ実装
  - `components/hero.tsx`を作成しServer Componentとして実装
  - セマンティックHTML（`<section>`要素）を使用
  - キャッチコピー（h1見出し）の表示（例: "Discordコミュニティの予定を、もっと見やすく"）
  - サービス説明文（サブヘッディング、pタグ）の表示
  - テキストコンテンツをコンポーネント内の定数として定義
  - Tailwind CSSタイポグラフィユーティリティ（`text-4xl`、`text-xl`、`leading-relaxed`等）を適用
  - _Requirements: 3.1, 3.2, 3.3, 10.1, 10.3, 11.1_

- [x] 4.2 (P) HeroセクションのCTAボタンとビジュアル実装
  - shadcn/uiの`Button`コンポーネントでCTAボタン（"無料で始める"）を配置
  - next/imageコンポーネントを使用してメインビジュアル（カレンダーUIモックアップ）を表示
  - 画像のプレースホルダーとしてSVGまたはグラデーション背景を使用
  - `priority`属性を適用してLCP（Largest Contentful Paint）を最適化
  - `alt`属性に意味のあるテキストを設定
  - blur placeholderの適用（`placeholder="blur"`）
  - 適切なwidth、height指定でCLS（Cumulative Layout Shift）を防止
  - _Requirements: 3.4, 3.5, 7.2, 8.1, 11.2_

- [x] 4.3 (P) Heroセクションのレスポンシブレイアウト実装
  - デスクトップ画面（lg:以上）でテキストとビジュアルを横並び（2カラム）レイアウト
  - モバイル画面（lg:未満）で縦並び（1カラム）レイアウト
  - FlexboxまたはGridレイアウトで実装（`flex-col lg:flex-row`または`grid`）
  - 各カラムの幅比率を適切に設定（例: lg:w-1/2）
  - スペーシングとアライメントの調整
  - _Requirements: 3.6, 3.7, 1.3, 10.4_

### Phase 5: 機能紹介セクション実装

- [x] 5. 機能紹介セクションの実装
- [x] 5.1 (P) Featuresコンポーネントの基本構造とモックデータ実装
  - `components/features.tsx`を作成しServer Componentとして実装
  - セマンティックHTML（`<section>`要素）を使用
  - セクションタイトル（"主な機能"）をh2見出しで表示
  - 機能カード用のモックデータ配列（`featuresData`）を作成
  - 3つの機能（カレンダーUI、Discord連携、予定管理）のデータを定義
  - `FeatureItem`型定義（id、icon、title、description）を適用
  - lucide-reactアイコン（`Calendar`、`MessageSquare`、`CheckSquare`）をインポート
  - _Requirements: 4.1, 4.2, 4.3, 4.6, 11.3, 11.5_

- [x] 5.2 (P) 機能カードのレイアウトとshadcn/ui統合実装
  - shadcn/uiの`Card`コンポーネントを使用して機能カードを表示
  - `featuresData`配列をmap処理して各カードをレンダリング
  - 各カードにアイコン、機能名（h3見出し）、説明文（pタグ）を配置
  - アイコンサイズの統一（`className="h-12 w-12"`等）
  - Tailwind CSSでカード内のスペーシングとアライメントを調整
  - _Requirements: 4.4, 4.5, 10.1, 10.4_

- [x] 5.3 (P) 機能カードのレスポンシブグリッドレイアウト実装
  - デスクトップ画面（lg:以上）で3カラムグリッド（`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`）
  - タブレット画面（md:以上）で2カラムグリッド
  - モバイル画面（md:未満）で1カラムレイアウト
  - グリッドアイテム間のギャップ設定（`gap-6`等）
  - 各カードの高さ調整（必要に応じて`h-full`）
  - _Requirements: 4.7, 4.8, 1.3_

### Phase 6: CTAセクションとフッター実装

- [x] 6. CTAセクションとフッターの実装
- [x] 6.1 (P) CTAコンポーネントの実装と視覚的強調
  - `components/cta.tsx`を作成しServer Componentとして実装
  - セマンティックHTML（`<section>`要素）を使用
  - 行動喚起メッセージ（"今すぐ始めよう"）をh2見出しで表示
  - サブメッセージをpタグで表示
  - shadcn/uiの`Button`コンポーネントでCTAボタン（"無料で始める"）を配置
  - 背景グラデーション（`bg-gradient-to-r from-blue-500 to-purple-600`等）を適用
  - テキストとボタンのコントラスト比を確保（アクセシビリティ）
  - テキストコンテンツをコンポーネント内の定数として定義
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 11.1_

- [x] 6.2 (P) Footerコンポーネントの実装とリンク構造
  - `components/footer.tsx`を作成しServer Componentとして実装
  - セマンティックHTML（`<footer>`要素）を使用
  - サービス名または簡潔な説明を表示
  - 補足ナビゲーションリンク（利用規約、プライバシーポリシー、お問い合わせ）の配置
  - ソーシャルメディアリンク（TwitterおよびGitHub）のアイコン表示
  - lucide-reactの`Twitter`および`Github`アイコンを使用
  - 著作権表記の追加
  - リンクにaria-label属性を設定（スクリーンリーダー対応）
  - すべてのhrefをプレースホルダー（`#`または`#section-id`）として設定
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.1, 7.2_

### Phase 7: アクセシビリティとスタイリング最終調整

- [ ] 7. アクセシビリティとスタイリングの検証・調整
- [ ] 7.1 (P) アクセシビリティ標準への準拠確認
  - すべてのセマンティックHTML要素（`<header>`、`<main>`、`<section>`、`<nav>`、`<footer>`）が正しく配置されているか検証
  - 見出し階層（h1 → h2 → h3）が論理的に構成されているか確認
  - 全ての画像に意味のある`alt`属性が設定されているか検証
  - インタラクティブ要素（ボタン、リンク）がキーボードでアクセス可能か確認（Tab、Enter）
  - フォーカス状態が視覚的に識別可能か確認（Tailwind CSSの`focus:`バリアント）
  - ARIA属性（`aria-label`、`aria-labelledby`、`aria-expanded`）が適切に適用されているか検証
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [ ] 7.2 (P) デザインシステムとスタイリングの最終調整
  - Tailwind CSSユーティリティクラスの一貫性を確認
  - カラーパレットの統一（Tailwind CSSデフォルトカラーまたはCSS変数）
  - タイポグラフィ（フォントサイズ、行間、フォントウェイト）の統一
  - スペーシング（padding、margin）の標準スケール適用確認
  - ホバー、フォーカス、アクティブ状態のスタイリング確認
  - レスポンシブブレークポイント（320px、768px、1024px）での表示確認
  - _Requirements: 1.3, 10.1, 10.2, 10.3, 10.4, 10.5_

### Phase 8: コード品質とテスト

- [ ] 8. コード品質検証とテスト実装
- [ ] 8.1 TypeScript型チェックとBiomeリンティング実行
  - `npx tsc --noEmit`でTypeScript strict modeの型チェック実行
  - `npx ultracite check`でBiomeリンティングを実行しエラーがないことを確認
  - `any`型が使用されていないことを確認
  - 未使用のインポートや変数がないことを確認
  - `console.log`等のデバッグコードが残っていないことを確認
  - TypeScriptの型定義が明示的に適用されているか検証（interface/type使用）
  - _Requirements: 9.4, 9.5, 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

- [ ]* 8.2 コンポーネント単体テストの実装（オプショナル）
  - featuresDataモックデータの構造が正しいか検証
  - MobileNavのisOpen状態トグル動作が正しいか検証
  - 各コンポーネントが正しいpropsを受け取り表示されるか確認
  - TypeScript型定義が実行時にも適用されているか検証
  - _Requirements: 9.4, 11.3, 11.5_

- [ ] 8.3 パフォーマンス最適化とServer/Client境界の検証
  - Server Componentsがデフォルトで実装されているか確認（"use client"が不要な箇所に存在しないか）
  - MobileNavのみがClient Componentとして実装されているか確認
  - next/imageコンポーネントの`priority`属性が適切に設定されているか確認
  - クライアントサイドJavaScriptのバンドルサイズを確認（50KB以下を目標）
  - Next.jsビルド（`npm run build`）が成功することを確認
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ]* 8.4 E2Eテストの実装（Playwright）（オプショナル）
  - モバイル（375px）、タブレット（768px）、デスクトップ（1280px）でのレスポンシブレイアウトテスト
  - モバイルナビゲーションのハンバーガーメニュー開閉動作テスト
  - CTAボタンのキーボードアクセシビリティテスト（Tab、Enter）
  - ビジュアルリグレッションテスト（スナップショット）
  - セマンティックHTML構造の検証
  - _Requirements: 1.3, 2.5, 7.4_

### Phase 9: 統合とデプロイ準備

- [ ] 9. 最終統合と検証
- [ ] 9.1 全コンポーネントの統合確認と最終テスト
  - `app/page.tsx`がすべてのセクションコンポーネント（Header、Hero、Features、CTA、Footer）を正しくインポートし表示しているか確認
  - ページ全体のスクロール動作とレイアウトが意図通りか確認
  - 異なるブラウザ（Chrome、Firefox、Safari）での表示確認
  - next-themesによるダークモード切り替えが正しく動作するか確認（オプショナル）
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1_

- [ ] 9.2 パフォーマンス検証とLighthouse監査
  - Chrome DevToolsのLighthouseでパフォーマンス監査実行
  - Lighthouse Performance Score > 90を確認
  - Core Web Vitals（LCP < 2.5s、FID < 100ms、CLS < 0.1）を達成
  - Lighthouse Accessibility Score > 90を確認
  - next/imageの最適化（WebP/AVIF変換、レスポンシブsrcset）が正しく機能しているか確認
  - _Requirements: 8.1, 8.2, 8.3_

- [ ] 9.3 デプロイ準備と最終チェックリスト
  - `npm run build`でプロダクションビルドを実行しエラーがないことを確認
  - ビルド出力（`.next/`）の静的HTML生成を確認
  - `npm start`でプロダクションサーバーをローカル起動し動作確認
  - 環境変数やシークレットがハードコードされていないことを確認
  - README更新（ランディングページの説明、スクリーンショット等）
  - Vercel Previewでのデプロイテスト（オプショナル）
  - _Requirements: 8.3, 12.1, 12.2_

## タスク実行の注意事項

### 並行実行可能なタスク（Pマーカー付き）

以下のタスクは依存関係がなく、並行して実行可能です：

- Phase 1: 1.1、1.2（プロジェクト構造確認と型定義）
- Phase 3: 3.1、3.2（Headerの基本構造とCTAボタン） - 3.3はMobileNav統合のため後続
- Phase 4: 4.1、4.2、4.3（Hero各サブタスクは独立実装可能）
- Phase 5: 5.1、5.2、5.3（Features各サブタスクは独立実装可能）
- Phase 6: 6.1、6.2（CTAとFooterは独立して実装可能）
- Phase 7: 7.1、7.2（アクセシビリティ検証とスタイリング調整は並行可能）

### 順次実行が必要なタスク

- Phase 2（2.1 → 2.2）: ページ作成後にセクション統合
- Phase 3（3.1/3.2 → 3.3）: Header基本構造完成後にMobileNav統合
- Phase 8（8.1 → 8.3）: 型チェック・リンティング完了後にパフォーマンス検証
- Phase 9（9.1 → 9.2 → 9.3）: 統合確認 → パフォーマンス検証 → デプロイ準備

### オプショナルタスク（*マーカー付き）

以下のタスクはMVP後の実装でも許容されます：

- 8.2: コンポーネント単体テスト（Acceptance Criteriaベースの補足テスト）
- 8.4: E2Eテスト（Playwright）（Acceptance Criteriaベースの補足テスト）

これらはAcceptance Criteriaを直接検証するテストであり、実装自体で要件は満たされています。

## 実装完了基準

すべてのタスクが完了し、以下の基準を満たした時点で本機能の実装完了とします：

- ✅ 全12要件のAcceptance Criteriaが実装に反映されている
- ✅ TypeScript型チェックとBiomeリンティングがエラーなし
- ✅ Next.jsプロダクションビルドが成功
- ✅ Lighthouse Performance Score > 90、Accessibility Score > 90
- ✅ レスポンシブデザインが320px、768px、1024px画面で正しく動作

## 推定工数

- Phase 1-2: 2-3時間
- Phase 3-4: 4-6時間
- Phase 5-6: 4-6時間
- Phase 7: 2-3時間
- Phase 8: 3-4時間
- Phase 9: 2-3時間

**合計推定工数**: 17-25時間（1タスク1-3時間、並行実行により短縮可能）
