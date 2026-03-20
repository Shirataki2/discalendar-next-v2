# Implementation Plan

- [x] 1. ルートレイアウトの共通メタデータ基盤を構築する
  - metadataBaseをプロダクションURL優先のフォールバックチェーンに更新する（VERCEL_PROJECT_PRODUCTION_URL → VERCEL_URL → localhost）
  - title.templateを設定し、すべての子ページのタイトルが「ページ名 | Discalendar」形式で統一されるようにする
  - Open Graph共通プロパティ（type: website, siteName, locale: ja_JP）を追加する
  - Twitter Card設定（card: summary_large_image）を追加する
  - canonical URLの基準設定（alternates.canonical）を追加する
  - keywordsにサービス関連キーワードを設定する
  - 既存のicons、manifest、appleWebApp設定は維持する
  - _Requirements: 1.6, 1.7, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 7.3_
  - _Contracts: RootLayoutMetadata State_

- [ ] 2. 各公開ページのメタデータを統一する
- [ ] 2.1 (P) ランディングページのメタデータとJSON-LD構造化データを設定する
  - title.absoluteでブランドファースト形式（テンプレート上書き）を維持する
  - description、keywordsを充実させる
  - canonical URLを設定する
  - WebApplicationタイプのJSON-LD（name, description, url, applicationCategory, operatingSystem）を`<script type="application/ld+json">`として埋め込む
  - WebSiteタイプのJSON-LD（name, url）を埋め込む
  - JSON-LDはSchema.org仕様に準拠し、XSSインジェクション防止を考慮する
  - _Requirements: 1.1, 5.1, 5.2, 5.3, 5.4, 5.5_
  - _Contracts: LandingPageMetadata State, JsonLdScript State_

- [ ] 2.2 (P) 利用規約・プライバシーポリシーページのメタデータを更新する
  - titleをページ名のみの短縮形に変更する（ルートtemplateが「| Discalendar」を自動付与）
  - descriptionは既存の値を維持する
  - canonical URLを各ページに追加する
  - _Requirements: 1.2, 1.3_
  - _Contracts: TermsPageMetadata State, PrivacyPageMetadata State_

- [ ] 2.3 (P) ドキュメントページの動的メタデータを拡張する
  - generateMetadata内のtitleをドキュメントタイトルのみに変更する（ルートtemplateが「| Discalendar」を自動付与）
  - canonical URLを各ドキュメントスラッグに基づいて動的に設定する
  - _Requirements: 1.4_
  - _Contracts: DocsPageMetadata State_

- [ ] 2.4 (P) ログインページにメタデータ付きlayoutを追加する
  - ログインページがClient Componentのためmetadata exportが使えない制約を、Server Component layoutの新規作成で解決する
  - title（「ログイン」）、description、canonical URLを設定する
  - layoutはchildrenをそのままパススルーし、UIに変更を加えない
  - _Requirements: 1.5_
  - _Contracts: LoginLayoutMetadata State_

- [ ] 3. (P) OGP画像をファイルベース規約で動的生成する
  - Next.jsのopengraph-image.tsxファイル規約を使用してOGP画像生成を実装する（APIルートではなくファイルベース規約を採用し、Next.jsが自動的にog:image/twitter:imageメタタグを生成する）
  - 画像サイズは1200×630px、PNG形式で出力する
  - サービス名「Discalendar」とキャッチコピーを含めたビジュアルデザインを実装する
  - ブランドカラー（primary: #1875d1）とUniSansHeavyフォントを使用してレンダリングする
  - フォント読み込みにはNode.jsのfs/promisesを使用し、OTF形式の互換性問題がある場合はフォールバックを用意する
  - alt、size、contentTypeのメタデータexportを宣言する
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  - _Contracts: OpenGraphImage API_

- [ ] 4. (P) ダッシュボードのインデックス制御を設定する
  - ダッシュボード配下のすべてのページが検索エンジンにインデックスされないよう、noindex/nofollowを設定するlayoutを新規作成する
  - layoutはchildrenをそのままパススルーし、UIに変更を加えない
  - 既存のミドルウェアによる未認証リダイレクト動作は変更しない
  - _Requirements: 6.1, 6.2_
  - _Contracts: DashboardLayoutMetadata State_

- [ ] 5. テストの修正と追加
- [ ] 5.1 既存テストのtitle形式変更に対応する
  - 利用規約・プライバシーポリシー・ドキュメントページのテストで、タイトルアサーションをtitle.template適用後の形式に修正する
  - E2Eテストのタイトル検証がある場合、新しい統一形式に合わせて更新する
  - ビルド検証テストのメタデータ存在チェックが引き続きパスすることを確認する
  - _Requirements: 1.2, 1.3, 1.4, 1.6_

- [ ]* 5.2 (P) SEOメタデータとOGP画像の検証テストを追加する
  - OGP画像のレスポンスがContent-Type: image/pngで1200×630pxの画像を返すことを検証する
  - ランディングページのHTMLに`<script type="application/ld+json">`が含まれ、Schema.orgの必須フィールド（WebApplication, WebSite）が存在することを検証する
  - ダッシュボード配下でrobots noindex/nofollowが出力されることを検証する
  - 各公開ページのメタデータにcanonical URLが設定されていることを検証する
  - viewportはNext.jsがデフォルトで提供するため、明示的な実装は不要（テストで存在確認のみ）
  - Lighthouse SEOスコア90以上の達成は手動検証で確認する
  - _Requirements: 4.1, 4.4, 5.4, 5.5, 6.1, 7.1, 7.2, 7.3_
