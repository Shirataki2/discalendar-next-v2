# Implementation Plan

- [x] 1. UpcomingEvent 型定義と基盤準備
- [x] 1.1 UpcomingEvent 型と変換ユーティリティを作成する
  - 横断表示専用の UpcomingEvent インターフェースを定義する（イベント情報 + ギルド情報をJSON シリアライズ可能な形式で保持）
  - EventRecord からギルド情報を付加して UpcomingEvent に変換する関数を実装する
  - EventSeriesRecord のオカレンスからギルド情報を付加して UpcomingEvent に変換する関数を実装する
  - 表示件数の上限定数を定義する
  - _Requirements: 1.1, 2.2, 3.1, 5.1_
  - _Contracts: UpcomingEvent type, CrossGuildEventService_

- [x] 1.2 (P) shadcn/ui Skeleton コンポーネントを導入する
  - shadcn CLI で Skeleton コンポーネントをプロジェクトに追加する
  - 正常にインポートできることを確認する
  - _Requirements: 4.1_

- [x] 2. CrossGuildEventService 横断イベント取得サービスを実装する
- [x] 2.1 全参加ギルドの単発イベントを一括取得する
  - ギルドIDリストを受け取り、events テーブルから現在日時〜30日以内の単発イベント（series_id が NULL）を一括取得するクエリを実装する
  - ギルドリストが空の場合は即座に空配列を返す
  - Supabase クエリエラーを Result 型で返却する
  - _Requirements: 1.1, 1.2, 1.3, 1.5_
  - _Contracts: CrossGuildEventService Service Interface_

- [x] 2.2 繰り返しイベントのオカレンス展開と例外マージを実装する
  - 全参加ギルドの event_series を一括取得し、30日範囲内のオカレンスを展開する
  - 例外レコード（series_id 付き events）を一括取得し、元のオカレンスと差し替えるマージ処理を実装する
  - 既存の expandOccurrences 関数を再利用してオカレンス日付を生成する
  - 各オカレンスにギルド情報を付加して UpcomingEvent に変換する
  - _Requirements: 1.3, 2.5_

- [x] 2.3 結果のマージ・ソート・件数制限を行う fetchUpcomingEvents を完成させる
  - 単発イベントとオカレンス展開結果をマージし、開始日時昇順でソートする
  - 上限件数（デフォルト20件）でトランケートし、超過の有無を hasMore フラグで返す
  - 全体を fetchUpcomingEvents 関数として統合し、Result 型で返却する
  - _Requirements: 1.4, 5.1_

- [x] 3. 予定一覧 UI コンポーネント群を実装する
- [x] 3.1 (P) UpcomingEventItem 個別予定カードを実装する
  - イベント名、開始日時、イベント色（左ボーダーまたはドット）を表示するカードコンポーネントを作成する
  - サーバー名とサーバーアイコン（Discord CDN）を表示する
  - 終日イベントは日付のみ、時刻指定イベントは時刻も含めて表示を区別する
  - カードをクリックすると該当サーバーのカレンダーページに遷移するリンクとして機能させる（URL に guild と date パラメータを含む）
  - Storybook ストーリーを作成する（通常・終日・繰り返しバリアント）
  - _Requirements: 2.2, 2.3, 2.4, 3.1, 3.2, 3.3_

- [x] 3.2 (P) UpcomingEventsSkeleton ローディング表示を実装する
  - shadcn Skeleton を使用して、予定カード3〜5行分のプレースホルダー表示を作成する
  - セクションヘッダーのスケルトンも含める
  - Storybook ストーリーを作成する
  - _Requirements: 4.1_

- [x] 3.3 (P) UpcomingEventsEmpty 空状態表示を実装する
  - variant プロパティで「予定なし」と「サーバー未参加」の2パターンを切り替えるコンポーネントを作成する
  - 予定なし: カレンダーアイコンと「直近の予定はありません」メッセージを表示する
  - サーバー未参加: Bot 招待への導線メッセージを表示する
  - Storybook ストーリーを作成する（各バリアント）
  - _Requirements: 4.2, 4.4_

- [x] 3.4 (P) UpcomingEventsError エラー・リトライ表示を実装する
  - エラーメッセージと「再読み込み」ボタンを表示するコンポーネントを作成する
  - リトライボタンは router.refresh() でページの再レンダリングをトリガーする
  - Storybook ストーリーを作成する
  - _Requirements: 4.3_

- [x] 3.5 UpcomingEventList 予定一覧リストコンテナを実装する
  - 「直近の予定」セクションヘッダーと UpcomingEventItem のリストを表示するコンテナコンポーネントを作成する
  - hasMore が true の場合に「さらに表示」ボタンを表示し、カレンダーへの導線を提供する
  - Storybook ストーリーを作成する（通常・hasMore・少数件数）
  - _Requirements: 2.1, 5.2_

- [x] 4. ダッシュボード統合
- [x] 4.1 UpcomingEventsSection Server Component を実装する
  - 非同期 Server Component としてギルド一覧を受け取り、fetchUpcomingEvents を呼び出す
  - 取得結果に応じて UpcomingEventList / UpcomingEventsEmpty / UpcomingEventsError を選択してレンダリングする
  - ギルドが0件の場合は UpcomingEventsEmpty の no-guilds バリアントを表示する
  - _Requirements: 5.3_

- [x] 4.2 DashboardPageLayout に予定セクションを組み込む
  - DashboardPage 内で UpcomingEventsSection を Suspense 境界で囲み、fallback に UpcomingEventsSkeleton を設定する
  - DashboardPageLayout のレイアウトに予定セクションを DashboardWithCalendar の前に配置する
  - 既存のギルド一覧・カレンダー表示に影響がないことを確認する
  - _Requirements: 4.1, 5.3_

- [x] 5. テスト
- [x] 5.1 CrossGuildEventService のユニットテストを作成する
  - 複数ギルドから単発+繰り返しイベントを取得して時系列順に返すことを検証する
  - 空のギルドリストで空配列を返すことを検証する
  - DB エラー時に FETCH_FAILED エラーを返すことを検証する
  - 30日範囲制限と20件上限が正しく適用されることを検証する
  - hasMore フラグが件数超過時に true になることを検証する
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 5.1_

- [x] 5.2 (P) UI コンポーネントのユニットテストを作成する
  - UpcomingEventItem: イベント名・日時・サーバー名が表示されること、カレンダーページへのリンクが正しいことを検証する
  - UpcomingEventItem: 終日イベントと時刻指定イベントの表示が異なることを検証する
  - UpcomingEventsEmpty: 各バリアントで適切なメッセージが表示されることを検証する
  - UpcomingEventsError: リトライボタンが表示されることを検証する
  - UpcomingEventList: hasMore 時に「さらに表示」ボタンが表示されることを検証する
  - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 4.2, 4.3, 4.4, 5.2_

- [x] 5.3 ダッシュボード統合テストを作成する
  - ダッシュボードページで「直近の予定」セクションがレンダリングされることを検証する
  - 予定がない場合に空状態メッセージが表示されることを検証する
  - ギルドが0件の場合に Bot 招待案内が表示されることを検証する
  - _Requirements: 2.1, 4.2, 4.4_
