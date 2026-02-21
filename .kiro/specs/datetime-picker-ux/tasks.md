# Implementation Plan

- [x] 1. shadcn/uiコンポーネントの追加とプロジェクト設定
- [x] 1.1 CalendarとScrollAreaコンポーネントをプロジェクトに追加する
  - shadcn CLIでCalendarコンポーネントを追加し、react-day-pickerの依存関係を解決する
  - shadcn CLIでScrollAreaコンポーネントを追加する
  - 追加されたコンポーネントがビルドエラーなく動作することを確認する
  - _Requirements: 1.1, 2.1_

- [x] 2. DatePickerコンポーネントの作成
- [x] 2.1 (P) 日付選択のPopover+Calendar合成コンポーネントを実装する
  - ボタンをクリックするとPopover内にCalendarが表示される日付ピッカーを作成する
  - 日付を選択するとフィールドに反映され、Popoverが自動的に閉じるようにする
  - 選択中の日付をプライマリカラーでハイライト表示し、今日の日付を視覚的に区別する
  - CSS変数を使用してダークモード時にカラースキームが自動切替されるようにする
  - disabled状態とエラー状態（border-destructive）をサポートする
  - aria-labelとaria-describedbyを受け取り、適切なARIA属性を設定する
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.1, 5.3, 5.4_

- [x] 2.2 (P) DatePickerのStorybookストーリーを作成する
  - Default, WithValue, Disabled, Error, DarkModeの各バリアントをストーリーとして定義する
  - CSF3形式でautodocsタグを設定し、コンポーネントと同じディレクトリに配置する
  - _Requirements: 1.1, 1.3, 1.4, 1.5_

- [x] 2.3 DatePickerの単体テストを作成する
  - 日付選択時にonChangeコールバックが正しい日付で呼ばれることを検証する
  - Popoverの開閉動作を検証する
  - disabled状態でクリックしても反応しないことを検証する
  - _Requirements: 1.1, 1.2_

- [x] 3. TimePickerコンポーネントの作成
- [x] 3.1 (P) 時間・分の2列スクロール選択UIを実装する
  - ボタンをクリックするとPopover内に時間（0-23）と分（00-55）の2列スクロールリストが表示される時刻ピッカーを作成する
  - 時刻の選択肢をminuteStepプロパティに基づいて生成する（デフォルト5分刻み）
  - 時間または分を選択すると、既存のDate値の対応部分のみ更新してonChangeに渡す
  - 選択中のアイテムにスクロール位置を自動調整し、タッチスクロールでもスムーズに動作するようにする
  - 各アイテムの最小高さを44pxにしてモバイルでのタップ操作を快適にする
  - リストにrole="listbox"、各アイテムにrole="option"とaria-selectedを設定する
  - キーボードの上下矢印キーでアイテム間を移動し、Enterキーで選択できるようにする
  - CSS変数を使用してダークモード時にカラースキームが自動切替されるようにする
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.4, 5.2, 5.3, 5.4_

- [x] 3.2 (P) TimePickerのStorybookストーリーを作成する
  - Default, WithValue, CustomStep（15分刻み）, Disabled, Errorの各バリアントをストーリーとして定義する
  - CSF3形式でautodocsタグを設定する
  - _Requirements: 2.1, 2.2, 2.4_

- [x] 3.3 TimePickerの単体テストを作成する
  - 時間と分の選択時にonChangeコールバックが正しいDateで呼ばれることを検証する
  - 5分刻みの選択肢が正しく生成されることを検証する
  - minuteStepプロパティで刻みをカスタマイズできることを検証する
  - _Requirements: 2.1, 2.2, 2.3_

- [ ] 4. DateTimeFieldの統合とEventFormへの組み込み
- [ ] 4.1 DateTimeFieldをDatePicker+TimePickerの合成コンポーネントに置き換える
  - 既存のDateTimeField（ネイティブinput使用）を、DatePickerとTimePickerを組み合わせた新しい実装に置き換える
  - 日付変更時はDate値の日付部分のみ更新し、時刻変更時は時刻部分のみ更新するマージロジックを実装する
  - 終日トグルがオンの場合はTimePickerを非表示にし、オフの場合は表示する
  - レスポンシブレイアウトとして、モバイル（640px未満）では縦並び、デスクトップでは横並びに切り替える
  - 日付と時刻のピッカーを視覚的に区別可能なレイアウトで配置する
  - エラー状態の表示とaria-describedbyの連携を既存パターンに合わせて維持する
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3_

- [ ] 4.2 開始日変更時の終了日自動調整ロジックを実装する
  - 開始日を変更した結果、終了日が開始日より前になる場合に、終了日を開始日と同日に自動調整する
  - useEventFormの既存バリデーションと連携して矛盾のない日時設定を保証する
  - _Requirements: 3.1_

- [ ] 5. 統合テストとE2Eテスト
- [ ] 5.1 EventFormとの統合テストを作成する
  - DatePicker/TimePickerでの日時選択がuseEventFormを通じてフォーム値に正しく反映されることを検証する
  - 終日トグルの切替でTimePickerの表示/非表示が正しく動作することを検証する
  - 開始日変更時の終了日自動調整が正しく動作することを検証する
  - バリデーションエラーが日付・時刻フィールドに正しく表示されることを検証する
  - _Requirements: 3.1, 3.2, 3.3_

- [ ]* 5.2 予定作成フローのE2Eテストを作成する
  - 日付ピッカーで日付を選択し、時刻ピッカーで時刻を選択して予定を保存する一連のフローを検証する
  - 終日トグルのON/OFFによる時刻ピッカーの表示/非表示を検証する
  - _Requirements: 1.1, 1.2, 2.1, 2.3, 3.2, 3.3_
