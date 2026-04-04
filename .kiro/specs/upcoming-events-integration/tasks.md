# Implementation Plan

- [x] 1. 新規UIコンポーネント作成
- [x] 1.1 (P) サイドバー展開時の直近予定カードコンポーネントを作成する
  - カレンダーアイコンと「直近の予定」テキストをカード形式で表示する
  - サーバーカードと同じ Card + CardContent 構造で視覚的に統一する
  - 選択状態に応じてハイライトスタイル（border-primary bg-accent）を適用する
  - クリックとキーボード操作（Enter/Space）で選択コールバックを発火する
  - アクセシビリティ属性（aria-pressed, role="button", tabIndex）を設定する
  - テストを作成し、選択状態の切り替え・クリック・キーボード操作を検証する
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 1.2 (P) サイドバー折りたたみ時のアイコンボタンコンポーネントを作成する
  - カレンダーアイコンを円形ボタン（h-12 w-12 rounded-full）で表示する
  - GuildIconButton と同じスタイルパターンに従い、選択時に ring スタイルを適用する
  - aria-label と title に「直近の予定」を設定する
  - テストを作成し、選択状態・クリック操作を検証する
  - _Requirements: 5.1, 5.2_

- [x] 1.3 (P) 右ペインの直近予定パネルコンポーネントを作成する
  - Server Component から渡される ReactNode をそのままレンダリングするコンテナとする
  - CalendarArea と同等のレイアウト領域（min-h, rounded-lg border）を確保する
  - section 要素に aria-label="直近の予定" を設定する
  - テストを作成し、children の正常レンダリングを検証する
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 2. ダッシュボードの選択状態拡張と右ペイン切り替え
- [x] 2.1 選択状態の判別共用体型とURL変換ヘルパーを定義する
  - DashboardSelection 型（guild / upcoming / null の3状態）を定義する
  - URL パラメータから DashboardSelection を復元する関数を実装する（?view=upcoming → upcoming、?guild=id → guild）
  - DashboardSelection を URL パラメータに反映する関数を実装する
  - テストを作成し、URL変換の双方向性・エッジケースを検証する
  - _Requirements: 1.4, 1.5_

- [x] 2.2 DashboardWithCalendar の内部状態を DashboardSelection 型に移行する
  - selectedGuildId: string | null を selection: DashboardSelection に置き換える
  - Props に upcomingEventsSlot: ReactNode を追加する
  - handleGuildSelect を selection 型に対応させる
  - handleSelectUpcoming コールバックを追加する
  - URL パラメータ同期ロジック（useEffect）を DashboardSelection 型に対応させる
  - ギルド権限・カレンダー表示のロジックで selectedGuildId への参照を selection から導出する
  - _Requirements: 1.4, 1.5, 4.2, 4.3_

- [x] 2.3 右ペインの表示をselection状態で切り替える
  - selection が upcoming の場合、UpcomingEventsPanel を表示する
  - selection が guild の場合、CalendarArea を表示する（既存動作）
  - selection が null の場合、サーバー選択を促すプレースホルダーを表示する（既存動作）
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 2.4 デスクトップサイドバーの先頭に直近の予定項目を追加する
  - DesktopGuildSidebar の Props に isUpcomingSelected と onSelectUpcoming を追加する
  - ギルド一覧の前に UpcomingEventsCard（展開時）を配置する
  - ギルドアイコン一覧の前に UpcomingEventsIconButton（折りたたみ時）を配置する
  - _Requirements: 1.1, 5.1, 5.2_

- [x] 2.5 モバイルセレクターに「直近の予定」選択肢を追加する
  - MobileGuildSelector の Props に isUpcomingSelected と onSelectUpcoming を追加する
  - Select ドロップダウンの先頭に「直近の予定」選択肢を追加する
  - 「直近の予定」選択時に onSelectUpcoming コールバックを呼び出す
  - _Requirements: 4.1_

- [x] 3. ページ上部の独立セクション廃止とslot経路変更
- [x] 3.1 DashboardPageLayout から上部の直近予定表示を削除する
  - upcomingEventsSlot の上部レンダリング（div.mb-4 内）を削除する
  - upcomingEventsSlot を DashboardWithCalendar の props として渡すよう変更する
  - _Requirements: 3.1, 3.3_

- [x] 3.2 DashboardPage の slot 構成を変更する
  - UpcomingEventsCollapsible のインポートと使用を削除する
  - Suspense + UpcomingEventsSection の構成を upcomingEventsSlot として直接渡す
  - _Requirements: 3.2_

- [x] 4. 既存テストの更新と統合テスト追加
- [x] 4.1 DashboardWithCalendar の統合テストを更新する
  - 直近の予定選択 → UpcomingEventsPanel 表示の切り替えを検証する
  - ギルド選択 → CalendarArea 表示への切り替えを検証する
  - URL パラメータ ?view=upcoming の反映を検証する
  - モバイルセレクターからの直近予定選択を検証する
  - _Requirements: 1.4, 1.5, 2.1, 4.1, 4.2_

- [x] 4.2 DashboardPageLayout のテストを更新する
  - 上部に直近の予定セクションが表示されないことを確認する
  - upcomingEventsSlot が DashboardWithCalendar に渡されることを確認する
  - _Requirements: 3.1, 3.3_

- [x] 4.3 DashboardPage のテストを更新する
  - UpcomingEventsCollapsible が使用されていないことを確認する
  - upcomingEventsSlot が正しい構成で渡されることを確認する
  - _Requirements: 3.2_
