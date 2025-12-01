# Requirements Document

## Project Description (Input)
ランディングページのモックアップページを作成

## Introduction

本要件は、Discalendarプロジェクトのランディングページモックアップを作成するための仕様を定義します。ランディングページは、Discordコミュニティ向け予定管理サービスの価値提案を訪問者に伝え、ユーザー登録を促進する重要な役割を果たします。

本モックアップページでは、Next.js App Router、shadcn/ui、Tailwind CSSを活用し、レスポンシブでアクセシブルなUIを実装します。実際のデータ統合は行わず、UIコンポーネントとレイアウトの構造を確立することに焦点を当てます。

## Requirements

### Requirement 1: ページ構造とレイアウト
**Objective:** ランディングページの訪問者として、Discalendarの主要機能と価値提案を一目で理解できるページ構造を閲覧したい、サービスへの興味を高めるため

#### Acceptance Criteria
1. When ユーザーがランディングページにアクセスした時, the Landing Page shall ヘッダー、ヒーローセクション、機能紹介セクション、CTAセクション、フッターを含む完全なページ構造を表示する
2. The Landing Page shall Next.js App Routerの`app/page.tsx`として実装される
3. The Landing Page shall レスポンシブデザインを適用し、モバイル（320px以上）、タブレット（768px以上）、デスクトップ（1024px以上）の各画面サイズで適切に表示される
4. The Landing Page shall shadcn/uiコンポーネントを活用してUIプリミティブを構成する
5. The Landing Page shall Tailwind CSSを使用してスタイリングを実装する

### Requirement 2: ヘッダーナビゲーション
**Objective:** ページ訪問者として、サービス名とナビゲーションリンクを常に確認できるヘッダーを利用したい、ページ内の情報に素早くアクセスするため

#### Acceptance Criteria
1. The Landing Page shall ページ上部にヘッダーセクションを配置する
2. The Landing Page shall ヘッダー内にDiscalendarロゴまたはサービス名を表示する
3. The Landing Page shall ヘッダー内に主要セクションへのナビゲーションリンク（機能、使い方、料金など）を表示する
4. The Landing Page shall ヘッダー内に「ログイン」および「無料で始める」ボタンを配置する
5. While ユーザーがモバイル画面でアクセスしている時, the Landing Page shall ハンバーガーメニューでナビゲーションリンクを表示する
6. The Landing Page shall ヘッダーにセマンティックHTMLの`<header>`および`<nav>`要素を使用する

### Requirement 3: ヒーローセクション
**Objective:** 初回訪問者として、ページ上部でDiscalendarの主要な価値提案を理解したい、サービスの魅力を即座に把握するため

#### Acceptance Criteria
1. The Landing Page shall ヘッダー直下にヒーローセクションを配置する
2. The Landing Page shall ヒーローセクション内にキャッチコピー（見出し）を大きく表示する
3. The Landing Page shall ヒーローセクション内にサービスの簡潔な説明文（サブヘッディング）を表示する
4. The Landing Page shall ヒーローセクション内にCTAボタン（「無料で始める」）を目立つように配置する
5. The Landing Page shall ヒーローセクション内にメインビジュアル（カレンダーUIのモックアップ画像またはプレースホルダー）を表示する
6. While デスクトップ画面でアクセスしている時, the Landing Page shall テキストコンテンツとビジュアルを横並び（2カラム）レイアウトで表示する
7. While モバイル画面でアクセスしている時, the Landing Page shall テキストコンテンツとビジュアルを縦並び（1カラム）レイアウトで表示する

### Requirement 4: 機能紹介セクション
**Objective:** 訪問者として、Discalendarの主要機能を視覚的に理解したい、サービスの実用性を判断するため

#### Acceptance Criteria
1. The Landing Page shall ヒーローセクション後に機能紹介セクションを配置する
2. The Landing Page shall 機能紹介セクションのタイトルとして「主な機能」または類似の見出しを表示する
3. The Landing Page shall 少なくとも3つの主要機能（カレンダーUI、Discord連携、予定管理）をカードまたはグリッドレイアウトで表示する
4. The Landing Page shall 各機能カードにアイコン、機能名、簡潔な説明文を含める
5. The Landing Page shall 機能カードにshadcn/uiの`Card`コンポーネントを使用する
6. The Landing Page shall 機能カードにlucide-reactのアイコンを使用する
7. While デスクトップ画面でアクセスしている時, the Landing Page shall 機能カードを3カラムグリッドレイアウトで表示する
8. While タブレットまたはモバイル画面でアクセスしている時, the Landing Page shall 機能カードを1カラムまたは2カラムレイアウトで表示する

### Requirement 5: CTAセクション
**Objective:** 訪問者として、ページの途中や末尾で明確な行動喚起を受け取りたい、サービス登録やログインの次のステップを把握するため

#### Acceptance Criteria
1. The Landing Page shall 機能紹介セクション後にCTAセクションを配置する
2. The Landing Page shall CTAセクション内に行動を促すメッセージ（「今すぐ始めよう」など）を表示する
3. The Landing Page shall CTAセクション内に目立つCTAボタン（「無料で始める」）を配置する
4. The Landing Page shall CTAセクションに背景色またはグラデーションを適用して視覚的に強調する
5. The Landing Page shall CTAボタンにshadcn/uiの`Button`コンポーネントを使用する

### Requirement 6: フッター
**Objective:** 訪問者として、ページ下部で補足情報やリンクにアクセスしたい、サービスの詳細情報や連絡先を確認するため

#### Acceptance Criteria
1. The Landing Page shall ページ最下部にフッターセクションを配置する
2. The Landing Page shall フッター内にサービス名または簡潔な説明を表示する
3. The Landing Page shall フッター内に補足ナビゲーションリンク（利用規約、プライバシーポリシー、お問い合わせなど）を表示する
4. The Landing Page shall フッター内にソーシャルメディアリンクまたはプレースホルダーアイコンを表示する
5. The Landing Page shall フッター内に著作権表記を含める
6. The Landing Page shall フッターにセマンティックHTMLの`<footer>`要素を使用する

### Requirement 7: アクセシビリティとセマンティクス
**Objective:** スクリーンリーダー利用者や支援技術ユーザーとして、ランディングページの内容を理解しナビゲートできるようにしたい、インクルーシブなサービス体験を得るため

#### Acceptance Criteria
1. The Landing Page shall セマンティックHTML要素（`<header>`, `<main>`, `<section>`, `<nav>`, `<footer>`）を適切に使用する
2. The Landing Page shall 全ての画像に意味のある`alt`属性を設定する
3. The Landing Page shall 見出し階層（`<h1>`, `<h2>`, `<h3>`など）を論理的に構成する
4. The Landing Page shall インタラクティブ要素（ボタン、リンク）にキーボードでアクセス可能にする
5. The Landing Page shall フォーカス状態を視覚的に識別可能にする
6. The Landing Page shall ARIA属性（`aria-label`, `aria-labelledby`など）を必要に応じて適用する

### Requirement 8: パフォーマンスと最適化
**Objective:** 訪問者として、高速で滑らかなページ読み込みとインタラクションを体験したい、ストレスなくサービス情報を閲覧するため

#### Acceptance Criteria
1. The Landing Page shall Next.jsの`next/image`コンポーネントを使用して画像を最適化する
2. The Landing Page shall 不要なクライアントサイドJavaScriptを最小限に抑える
3. The Landing Page shall 可能な限りReact Server Componentsとして実装する
4. While クライアントサイドインタラクションが必要な場合, the Landing Page shall `"use client"`ディレクティブを明示的に使用する
5. The Landing Page shall Tailwind CSSのユーティリティクラスを使用して不要なCSSを削減する

### Requirement 9: コンポーネント構成と再利用性
**Objective:** 開発者として、保守性が高く再利用可能なコンポーネント構成でランディングページを実装したい、将来の機能拡張や変更を容易にするため

#### Acceptance Criteria
1. The Landing Page shall `/app/page.tsx`をメインページコンポーネントとして実装する
2. Where 複雑なセクション（ヒーロー、機能紹介、CTA）が独立したコンポーネントに分離できる場合, the Landing Page shall `/components/`配下にカスタムコンポーネントを作成する
3. The Landing Page shall `/components/ui/`のshadcn/uiコンポーネント（Button, Card等）を直接インポートして使用する
4. The Landing Page shall TypeScriptの型定義を明示的に適用する
5. The Landing Page shall プロップスの型にinterface または typeを使用して定義する
6. The Landing Page shall コンポーネントファイル名にkebab-case命名規則を適用する

### Requirement 10: スタイリングとデザインシステム
**Objective:** デザイナーおよび開発者として、一貫したデザインシステムに基づくスタイリングを適用したい、ブランドイメージの統一性を保つため

#### Acceptance Criteria
1. The Landing Page shall Tailwind CSSのユーティリティクラスを使用してスタイリングを実装する
2. The Landing Page shall カラーパレットにTailwind CSSのデフォルトカラーまたはカスタムカラー変数を使用する
3. The Landing Page shall フォントサイズと行間にTailwind CSSのタイポグラフィユーティリティ（`text-xl`, `leading-relaxed`など）を使用する
4. The Landing Page shall スペーシングにTailwind CSSの標準スケール（`p-4`, `mt-8`など）を使用する
5. The Landing Page shall ホバー、フォーカス、アクティブ状態にTailwind CSSの状態バリアント（`hover:`, `focus:`など）を適用する
6. Where アニメーションが必要な場合, the Landing Page shall tailwindcss-animateプラグインを使用する

### Requirement 11: モックデータとプレースホルダー
**Objective:** 開発者として、実際のデータ統合前にUIの外観と動作を確認したい、デザインと実装の妥当性を検証するため

#### Acceptance Criteria
1. The Landing Page shall テキストコンテンツにプレースホルダーテキストまたはダミーコピーを使用する
2. The Landing Page shall 画像にプレースホルダー画像（Next.jsのblurDataURL等）またはアイコンを使用する
3. The Landing Page shall 機能カードのコンテンツに固定のモックデータ配列を使用する
4. The Landing Page shall 実際のAPI呼び出しやデータベースクエリを含めない
5. The Landing Page shall モックデータをコンポーネント内の定数として定義する

### Requirement 12: コード品質とリンティング
**Objective:** 開発チームとして、プロジェクトのコード品質基準に準拠したコードを作成したい、保守性と一貫性を維持するため

#### Acceptance Criteria
1. The Landing Page shall Biome（Ultracite preset）のリンティングルールに準拠する
2. When 開発者が`npx ultracite check`を実行した時, the Landing Page shall エラーや警告を表示しない
3. The Landing Page shall TypeScript strict modeの型チェックに合格する
4. The Landing Page shall `any`型の使用を避け、明示的な型定義を使用する
5. The Landing Page shall 未使用のインポートや変数を含めない
6. The Landing Page shall `console.log`等のデバッグコードを含めない
