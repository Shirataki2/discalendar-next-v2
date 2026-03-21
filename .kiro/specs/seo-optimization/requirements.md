# Requirements Document

## Project Description (Input)

メタタグ・OGP・構造化データでSEOを最適化する

## 背景

ランディングページのOGP画像、Twitter Card、構造化データ（JSON-LD）が未対応。
現在のメタデータはルートlayout.tsxに最低限のtitle/descriptionのみ設定されている。
SNSシェア時のプレビューや検索エンジンでの表示を改善し、流入を増やす。

## 目的

各ページに適切なメタデータを設定し、SNSシェア・検索結果での見栄えを向上させる。

## 受け入れ条件

- [ ] ランディングページにOGP画像が設定され、SNSシェア時にプレビュー表示される
- [ ] Twitter Card（summary_large_image）が設定されている
- [ ] ランディングページにJSON-LD構造化データ（WebApplication）が追加されている
- [ ] 各公開ページ（/, /terms, /privacy, /docs/\*, /auth/login）に適切なtitle/descriptionが設定されている
- [ ] OGP画像がNext.js ImageResponse（og route）で動的生成される
- [ ] Lighthouse SEOスコアが90以上である

## 技術メモ

- Next.js Metadata API（`generateMetadata` / `export const metadata`）を使用
- OGP画像: `app/api/og/route.tsx` で `ImageResponse` を使った動的生成
- JSON-LD: `<script type="application/ld+json">` をlayout or pageに埋め込み
- 対象の公開ページ: `/`, `/terms`, `/privacy`, `/docs/*`, `/auth/login`
- 保護ページ（dashboard以下）はSEO対象外（noindex）
- 参照: `feature-expansion-plan.md` 1.3節

## Metadata

- URL: [https://linear.app/ff2345/issue/DIS-10/メタタグogp構造化データでseoを最適化する](https://linear.app/ff2345/issue/DIS-10/メタタグogp構造化データでseoを最適化する)
- Identifier: DIS-10
- Status: Backlog
- Priority: High
- Assignee: Tomoya Ishii
- Labels: リリース準備
- Created: 2026-02-20T07:51:37.917Z
- Updated: 2026-03-20T05:51:27.369Z

## Sub-issues

- [DIS-116 各公開ページにMetadata APIでtitle/descriptionを設定する](https://linear.app/ff2345/issue/DIS-116/各公開ページにmetadata-apiでtitledescriptionを設定する)
- [DIS-117 OGP画像をImageResponseで動的生成する](https://linear.app/ff2345/issue/DIS-117/ogp画像をimageresponseで動的生成する)
- [DIS-118 JSON-LD構造化データをランディングページに追加する](https://linear.app/ff2345/issue/DIS-118/json-ld構造化データをランディングページに追加する)

## Requirements

### Requirement 1: 公開ページのメタデータ統一設定

**Objective:** サービス利用者・訪問者として、各公開ページが検索エンジンやSNSで適切に表示されるよう、統一されたメタデータが設定されていてほしい

#### Acceptance Criteria

1. The Discalendar shall ランディングページ（`/`）に固有の `title`、`description`、`keywords` を Metadata API で設定する
2. The Discalendar shall 利用規約ページ（`/terms`）に固有の `title` と `description` を設定する
3. The Discalendar shall プライバシーポリシーページ（`/privacy`）に固有の `title` と `description` を設定する
4. The Discalendar shall ドキュメントページ（`/docs/*`）に `generateMetadata` で動的に `title` と `description` を設定する
5. The Discalendar shall ログインページ（`/auth/login`）に固有の `title` と `description` を設定する
6. The Discalendar shall すべての公開ページの `title` を「ページ名 | Discalendar」形式で統一する
7. The Discalendar shall ルートレイアウトの `metadataBase` にプロダクションURL（`https://discalendar.app`）を設定する

### Requirement 2: Open Graphメタデータ

**Objective:** サービス利用者として、DiscalendarのURLをSNS（Discord、X/Twitter、LINE等）でシェアしたときに、サービス名・説明・画像がリッチプレビューとして表示されてほしい

#### Acceptance Criteria

1. The Discalendar shall すべての公開ページに `og:title`、`og:description`、`og:type`、`og:url`、`og:image` を設定する
2. The Discalendar shall ランディングページの `og:type` を `"website"` に設定する
3. The Discalendar shall `og:site_name` を `"Discalendar"` に設定する
4. The Discalendar shall `og:locale` を `"ja_JP"` に設定する
5. The Discalendar shall OGP画像のサイズを 1200×630px に設定する

### Requirement 3: Twitter Cardメタデータ

**Objective:** サービス利用者として、DiscalendarのURLをX（Twitter）でシェアしたときに、大きな画像付きのカード形式でプレビュー表示されてほしい

#### Acceptance Criteria

1. The Discalendar shall すべての公開ページに `twitter:card` を `"summary_large_image"` として設定する
2. The Discalendar shall `twitter:title` と `twitter:description` を各ページ固有の値で設定する
3. The Discalendar shall `twitter:image` に OGP画像のURLを設定する

### Requirement 4: OGP画像の動的生成

**Objective:** サービス運営者として、OGP画像をコードで動的生成し、デザイン変更時にコード修正だけで反映できるようにしたい

#### Acceptance Criteria

1. The Discalendar shall Next.js `ImageResponse` を使用して OGP画像を動的に生成するAPIルートを提供する
2. The Discalendar shall OGP画像にサービス名「Discalendar」とキャッチコピーを含める
3. The Discalendar shall OGP画像をサービスのブランドカラーとフォントでレンダリングする
4. The Discalendar shall OGP画像を 1200×630px のPNG形式で出力する
5. When クエリパラメータで `title` が指定された場合、the Discalendar shall OGP画像にそのタイトルテキストを反映する

### Requirement 5: JSON-LD構造化データ

**Objective:** サービス運営者として、検索エンジンがDiscalendarの情報を正確に理解・表示できるよう、構造化データを提供したい

#### Acceptance Criteria

1. The Discalendar shall ランディングページに `WebApplication` タイプの JSON-LD を埋め込む
2. The Discalendar shall JSON-LD に `name`、`description`、`url`、`applicationCategory`、`operatingSystem` を含める
3. The Discalendar shall ランディングページに `WebSite` タイプの JSON-LD を埋め込む
4. The Discalendar shall JSON-LD を `<script type="application/ld+json">` タグで出力する
5. The Discalendar shall JSON-LD が Schema.org の仕様に準拠する

### Requirement 6: 保護ページのインデックス制御

**Objective:** サービス運営者として、認証が必要なページが検索エンジンにインデックスされないようにしたい

#### Acceptance Criteria

1. The Discalendar shall ダッシュボード配下（`/dashboard/*`）のすべてのページに `robots: { index: false, follow: false }` を設定する
2. While ユーザーが未認証の状態で保護ページにアクセスした場合、the Discalendar shall `/auth/login` にリダイレクトする（既存動作の維持）

### Requirement 7: SEO品質基準

**Objective:** サービス運営者として、SEO実装が業界標準の品質基準を満たしていることを客観的に検証したい

#### Acceptance Criteria

1. The Discalendar shall ランディングページの Lighthouse SEO スコアが 90 以上を達成する
2. The Discalendar shall すべての公開ページで `<meta name="viewport">` が適切に設定されている
3. The Discalendar shall すべての公開ページに canonical URL を設定する
