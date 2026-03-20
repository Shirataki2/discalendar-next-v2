# Implementation Plan

- [x] 1. HolidayService の実装
- [x] 1.1 @holiday-jp/holiday_jp パッケージのインストールと HolidayService ユーティリティの作成
  - @holiday-jp/holiday_jp を依存関係に追加する
  - 指定した期間内の日本の祝日一覧（日付・祝日名）を返却する関数を実装する
  - 特定の日付が祝日かどうかを判定し、祝日名または null を返す関数を実装する
  - 祝日データを react-big-calendar の backgroundEvent 形式に変換する関数を実装する
  - 全16の国民の祝日、振替休日、国民の休日が正しく含まれることをライブラリに委譲する
  - 外部APIへのネットワークリクエストを発行せず、ライブラリのオフラインデータのみを使用する
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 1.2 HolidayService のユニットテスト
  - 期間指定での祝日取得が正しく動作することをテストする（例: 2026年1月の元日、成人の日）
  - 振替休日が含まれるケースをテストする（祝日が日曜の場合、翌月曜が振替休日として返却される）
  - 国民の休日が含まれるケースをテストする（祝日に挟まれた平日）
  - 祝日判定関数が祝日と非祝日を正しく判定することをテストする
  - backgroundEvent 形式への変換が正しいことをテストする
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. フックレイヤーの実装
- [x] 2.1 (P) useUserPreferences フックに祝日表示設定を追加する
  - 既存の useUserPreferences フックに showHolidays プロパティ（デフォルト: true）を追加する
  - 祝日表示設定を localStorage に永続化し、次回アクセス時にも維持する
  - 不正な値が保存されていた場合は true にフォールバックする
  - 既存の defaultCalendarView の動作に影響を与えないことを確認する
  - _Requirements: 5.4_

- [x] 2.2 useHolidays フックの実装
  - ビューモードと選択日付から表示期間を計算し、該当期間の祝日データを取得するフックを作成する
  - 祝日データを backgroundEvents 形式と日付→祝日名のルックアップ Map として提供する
  - showHolidays が false の場合は空データ（空配列・空Map）を返却する
  - useMemo で viewMode / selectedDate / showHolidays の変更時のみ再計算する
  - 月ビューの場合は前後の月表示分も含めた拡張期間で祝日を取得する
  - Task 1 の HolidayService に依存する
  - _Requirements: 1.1, 2.1, 3.1, 3.2_

- [x] 3. カレンダーグリッドの祝日表示
- [x] 3.1 (P) 祝日表示用の CSS スタイル定義
  - 祝日セルの背景色を通常の日付セルと区別できるスタイルで定義する（rbc-holiday クラス）
  - 祝日ラベル（backgroundEvent）をユーザー作成イベントとは異なるスタイル（背景色・テキスト色・透明度）で定義する
  - ダークモード時に適応した配色を CSS 変数で定義する（--holiday-bg, --holiday-text）
  - 月・週・日の全ビューで祝日の表示スタイルに一貫性を持たせる
  - 既存の今日ハイライト・月外セル・土日色分けと視覚的に干渉しないようにする
  - _Requirements: 3.3, 4.1, 4.2, 4.3_

- [x] 3.2 CalendarGrid コンポーネントの祝日表示対応
  - CalendarGrid の props に backgroundEvents と holidayMap を追加する
  - react-big-calendar の backgroundEvents prop に祝日データを渡して、全ビュー（月/週/日）で祝日ラベルを表示する
  - dayPropGetter を拡張して、holidayMap を参照し祝日セルに背景色クラスを適用する
  - 既存の今日ハイライト・月外セル・土日色分けロジックと共存させる
  - 祝日がある日にユーザー作成イベントも存在する場合、両方が同一セル内に表示されることを確認する
  - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2_

- [ ] 4. (P) CalendarToolbar に祝日表示トグルを追加する
  - CalendarToolbar の props に showHolidays と onToggleHolidays を追加する
  - ビュー切り替えボタン群の近くに祝日表示 ON/OFF を切り替えるトグルボタンを配置する
  - lucide-react のアイコンを使用して、祝日表示状態を視覚的に示す
  - モバイルビューでもアクセス可能なレイアウトにする
  - _Requirements: 5.1_

- [ ] 5. CalendarContainer の統合
  - useUserPreferences から showHolidays と setShowHolidays を取得する
  - useHolidays フックを呼び出して、現在のビューモード・日付・表示設定に基づく祝日データを取得する
  - 祝日 backgroundEvents と holidayMap を CalendarGrid に渡す
  - showHolidays と切り替えハンドラーを CalendarToolbar に渡す
  - 祝日表示 OFF 時に全ビューから祝日ラベルと背景色が非表示になることを確認する
  - 祝日表示 ON 時に全ビューに祝日ラベルと背景色が再表示されることを確認する
  - _Requirements: 5.2, 5.3_

- [ ] 6. テスト
- [ ] 6.1 (P) useHolidays フックと useUserPreferences 拡張のテスト
  - useHolidays が表示期間に基づく祝日データを正しく返すことをテストする
  - showHolidays が false の場合に空データが返却されることをテストする
  - 期間変更時に祝日データが再計算されることをテストする
  - useUserPreferences の showHolidays が localStorage に保存・復元されることをテストする
  - _Requirements: 1.1, 5.4_

- [ ] 6.2 (P) CalendarGrid と CalendarToolbar のコンポーネントテスト
  - CalendarGrid に backgroundEvents を渡した場合に祝日ラベルが表示されることをテストする
  - dayPropGetter が祝日セルに rbc-holiday クラスを適用することをテストする
  - CalendarToolbar の祝日トグルクリックで onToggleHolidays が呼ばれることをテストする
  - _Requirements: 2.1, 2.2, 4.1, 4.2, 5.1_

- [ ] 6.3 CalendarContainer 統合テスト
  - CalendarContainer 経由で祝日が表示されることをテストする
  - 祝日トグル操作で表示→非表示→再表示のフローが正しく動作することをテストする
  - _Requirements: 5.2, 5.3_
