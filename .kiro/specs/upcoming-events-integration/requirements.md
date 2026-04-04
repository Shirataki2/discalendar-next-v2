# Requirements Document

## Introduction
ダッシュボードの「直近の予定」セクションをページ上部の独立表示から削除し、サーバー一覧サイドバーの先頭に統合する。サーバー一覧の先頭に「直近の予定」項目を追加し、選択すると右ペインに従来の直近予定一覧を表示する。これによりファーストビューでサーバー一覧とカレンダーに即アクセス可能にし、モバイル・低解像度環境でのUXを改善する。

## Requirements

### Requirement 1: 直近の予定をサイドバー項目として追加
**Objective:** ダッシュボードユーザーとして、サーバー一覧の先頭に「直近の予定」項目を表示したい。サーバーを選ぶのと同じ動線で直近の予定にアクセスできるようにするため。

#### Acceptance Criteria
1. The Dashboard shall サーバー一覧（デスクトップサイドバー）の先頭に「直近の予定」項目を表示する
2. The 直近の予定項目 shall サーバーカード（SelectableGuildCard）と視覚的に同列のカード形式で表示される
3. The 直近の予定項目 shall カレンダーアイコンとテキスト「直近の予定」を表示する
4. When ユーザーが「直近の予定」項目をクリックした時, the Dashboard shall 選択状態を視覚的にハイライトする（サーバー選択時と同様のスタイル）
5. When 「直近の予定」が選択されている時, the Dashboard shall 他のサーバーカードの選択状態を解除する

### Requirement 2: 右ペインに直近の予定一覧を表示
**Objective:** ダッシュボードユーザーとして、「直近の予定」を選択した際に、右ペイン（カレンダー表示エリア）に従来の直近予定一覧を表示したい。既存の情報量を維持しつつレイアウトを統一するため。

#### Acceptance Criteria
1. When ユーザーが「直近の予定」項目を選択した時, the Dashboard shall 右ペインにUpcomingEventListコンポーネントの内容を表示する
2. While 直近の予定データを取得中, the Dashboard shall UpcomingEventsSkeletonによるローディング表示を右ペインに表示する
3. If 直近の予定データの取得に失敗した場合, the Dashboard shall UpcomingEventsErrorコンポーネントでエラー状態を表示する
4. If 直近の予定が0件の場合, the Dashboard shall UpcomingEventsEmptyコンポーネントで空状態を表示する
5. The 直近の予定一覧 shall 既存のイベント情報（イベント名・日時・サーバー名）を維持して表示する

### Requirement 3: ページ上部の独立セクションを削除
**Objective:** ダッシュボードユーザーとして、ページ上部の独立した「直近の予定」セクションを削除したい。ファーストビューでサーバー一覧とカレンダーに即アクセスできるようにするため。

#### Acceptance Criteria
1. The DashboardPageLayout shall upcomingEventsSlotプロパティを廃止し、ページ上部に「直近の予定」セクションを表示しない
2. The DashboardPage shall UpcomingEventsCollapsible / UpcomingEventsSection のインポートおよびSlot渡しを削除する
3. When ダッシュボードページを表示した時, the Dashboard shall ファーストビューでサーバー一覧（またはモバイルではサーバー選択UI）が表示される

### Requirement 4: モバイル対応
**Objective:** モバイルユーザーとして、「直近の予定」にモバイルUIからもアクセスしたい。デバイスに関わらず一貫した操作体験を得るため。

#### Acceptance Criteria
1. The MobileGuildSelector shall サーバー選択ドロップダウンの前に「直近の予定」選択肢を含める
2. When モバイルで「直近の予定」を選択した時, the Dashboard shall デスクトップ版と同じ直近予定一覧を右ペイン（カレンダーエリア）に表示する
3. The Dashboard shall モバイル表示（lg未満）でレイアウトが崩れずに表示される

### Requirement 5: サイドバー折りたたみ時の対応
**Objective:** ダッシュボードユーザーとして、サイドバーが折りたたまれた状態でも「直近の予定」にアクセスしたい。既存のサイドバーの折りたたみ機能との整合性を保つため。

#### Acceptance Criteria
1. While サイドバーが折りたたまれている時, the Dashboard shall 「直近の予定」をアイコンのみ（GuildIconButtonと同様の形式）で表示する
2. When 折りたたまれたサイドバーで「直近の予定」アイコンをクリックした時, the Dashboard shall 右ペインに直近予定一覧を表示する
