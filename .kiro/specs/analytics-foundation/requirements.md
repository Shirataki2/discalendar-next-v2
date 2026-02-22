# Requirements Document

## Project Description (Input)

アナリティクス基盤を導入する

### 背景

ユーザー行動の計測基盤がなく、機能利用状況や導線の分析ができない。今後の機能改善やマネタイズ判断のためにデータ基盤が必要。

### 目的

アナリティクスツールを選定・導入し、主要ユーザーアクションのトラッキングを行える状態にする。

### 作業内容

* アナリティクスツールの選定と導入
* ページビュー、イベント作成、ギルド切替などの主要アクションをトラッキング
* 参照: [feature-expansion-plan.md](http://feature-expansion-plan.md) 1.5節

### 受け入れ条件

- [ ] アナリティクスツールが選定され、SDKが導入されている
- [ ] ページビューが自動トラッキングされる
- [ ] イベント作成・編集・削除がトラッキングされる
- [ ] ギルド切替がトラッキングされる
- [ ] ダッシュボードのアクセスがトラッキングされる
- [ ] 本番環境でダッシュボードからデータが確認できる

### 技術メモ

* Next.js App Routerとの相性を考慮してツール選定（Vercel Analytics, PostHog, Plausible等）
* SSR/RSC環境でのクライアントサイドトラッキングに注意
* プライバシーポリシーとの整合性を確認

### Metadata
- URL: [https://linear.app/ff2345/issue/DIS-12/アナリティクス基盤を導入する](https://linear.app/ff2345/issue/DIS-12/アナリティクス基盤を導入する)
- Identifier: DIS-12
- Status: Todo
- Priority: Low
- Assignee: Tomoya Ishii
- Labels: リリース準備
- Created: 2026-02-20T07:51:43.449Z
- Updated: 2026-02-22T08:17:45.926Z

### Sub-issues

- [DIS-37 アナリティクスツールを選定しSDKを導入する](https://linear.app/ff2345/issue/DIS-37/アナリティクスツールを選定しsdkを導入する)
- [DIS-38 ページビューの自動トラッキングを実装する](https://linear.app/ff2345/issue/DIS-38/ページビューの自動トラッキングを実装する)
- [DIS-39 イベントCRUD操作のトラッキングを実装する](https://linear.app/ff2345/issue/DIS-39/イベントcrud操作のトラッキングを実装する)
- [DIS-40 ギルド切替・ダッシュボードアクセスのトラッキングを実装する](https://linear.app/ff2345/issue/DIS-40/ギルド切替ダッシュボードアクセスのトラッキングを実装する)

## Introduction

Discalendarにアナリティクス基盤を導入し、ユーザー行動データの収集・分析を可能にする。KPI（MAU、イベント作成数、リテンション率等）の計測基盤として機能し、機能改善やマネタイズ戦略の意思決定を支援する。Next.js App Router（SSR/RSC）環境に対応したツールを選定し、プライバシーに配慮した計測を実現する。

## Requirements

### Requirement 1: アナリティクスSDK導入
**Objective:** As a 開発者, I want アナリティクスツールのSDKがアプリケーションに統合されている状態にする, so that ユーザー行動データの収集基盤が整う

#### Acceptance Criteria
1. The Analytics SDK shall Next.js App Router環境と互換性のあるアナリティクスツールとして導入される
2. The Analytics SDK shall クライアントサイドでのみ初期化され、Server Components/SSRのレンダリングに影響を与えない
3. The Analytics SDK shall 環境変数でプロジェクトIDやAPIキーを管理し、ソースコードにハードコードしない
4. The Analytics SDK shall 開発環境（`NODE_ENV=development`）ではデータ送信を無効化または開発用エンドポイントに送信する
5. The Analytics SDK shall `app/layout.tsx`のルートレイアウトにプロバイダーとして配置され、全ページで自動的に有効になる

### Requirement 2: ページビュー自動トラッキング
**Objective:** As a プロダクトオーナー, I want 全ページのページビューが自動的に記録される, so that ユーザーの導線と利用頻度を把握できる

#### Acceptance Criteria
1. When ユーザーがページに遷移した時, the Analytics Service shall ページビューイベントを自動記録する
2. When Next.jsのクライアントサイドナビゲーション（`router.push`、`<Link>`）が発生した時, the Analytics Service shall SPA遷移もページビューとして正確に記録する
3. The Analytics Service shall 各ページビューにURL パス、リファラー、タイムスタンプを含める
4. The Analytics Service shall 認証ルート（`/dashboard/*`）と公開ルート（`/`, `/docs/*`）を区別して記録する

### Requirement 3: イベントCRUD操作のトラッキング
**Objective:** As a プロダクトオーナー, I want カレンダーイベントの作成・編集・削除操作がトラッキングされる, so that イベント機能の利用状況と傾向を分析できる

#### Acceptance Criteria
1. When ユーザーがカレンダーイベントを作成した時, the Analytics Service shall `event_created`カスタムイベントをイベントのプロパティ（終日/時間指定、色、通知有無）と共に記録する
2. When ユーザーがカレンダーイベントを編集した時, the Analytics Service shall `event_updated`カスタムイベントを変更されたフィールド情報と共に記録する
3. When ユーザーがカレンダーイベントを削除した時, the Analytics Service shall `event_deleted`カスタムイベントを記録する
4. When ユーザーがドラッグ&ドロップでイベントを移動した時, the Analytics Service shall `event_moved`カスタムイベントを記録する
5. When ユーザーがドラッグリサイズでイベントの時間を変更した時, the Analytics Service shall `event_resized`カスタムイベントを記録する
6. The Analytics Service shall カスタムイベントに個人を特定できる情報（イベントタイトル、説明文等）を含めない

### Requirement 4: ギルド操作のトラッキング
**Objective:** As a プロダクトオーナー, I want ギルド切替操作がトラッキングされる, so that マルチギルド利用の実態を把握できる

#### Acceptance Criteria
1. When ユーザーがギルドを切り替えた時, the Analytics Service shall `guild_switched`カスタムイベントを記録する
2. The Analytics Service shall ギルド切替イベントにギルドIDを含め、ギルド名などの個人情報は含めない

### Requirement 5: ダッシュボードアクセスのトラッキング
**Objective:** As a プロダクトオーナー, I want ダッシュボードへのアクセスと主要操作がトラッキングされる, so that ユーザーエンゲージメントの深さを測定できる

#### Acceptance Criteria
1. When ユーザーがダッシュボード（`/dashboard`）にアクセスした時, the Analytics Service shall ページビューとしてアクセスを記録する
2. When ユーザーがカレンダーの表示モード（月/週/日）を切り替えた時, the Analytics Service shall `view_changed`カスタムイベントを切替先のビュータイプと共に記録する
3. When ユーザーがカレンダーの表示期間を移動した時（前月/次月等）, the Analytics Service shall `calendar_navigated`カスタムイベントを記録する

### Requirement 6: プライバシーとデータ品質
**Objective:** As a ユーザー, I want 個人情報が適切に保護される, so that 安心してサービスを利用できる

#### Acceptance Criteria
1. The Analytics Service shall ユーザーの個人を特定できる情報（PII）をアナリティクスデータに含めない
2. The Analytics Service shall 既存のプライバシーポリシー（`/privacy`）に記載されたデータ収集範囲と整合性を保つ
3. The Analytics Service shall Cookie同意が必要な場合、ユーザーの同意を取得してからトラッキングを開始する
4. If アナリティクスSDKの読み込みに失敗した場合, the Discalendar Application shall アプリケーションの通常動作に影響を与えずに継続する

### Requirement 7: 本番環境でのデータ確認
**Objective:** As a 開発者, I want 本番環境でアナリティクスデータが確認できる, so that 計測が正しく機能していることを検証できる

#### Acceptance Criteria
1. The Analytics Dashboard shall ページビューの集計データをリアルタイムまたは準リアルタイムで表示する
2. The Analytics Dashboard shall カスタムイベント（イベントCRUD、ギルド切替等）の発生回数と推移を表示する
3. The Analytics Dashboard shall 日別・週別・月別の集計粒度でデータをフィルタリングできる
