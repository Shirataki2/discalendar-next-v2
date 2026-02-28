# Implementation Plan

- [ ] 1. ColorPickerコンポーネントのコア実装
- [x] 1.1 プリセットカラーパレットと選択インタラクションを実装する
  - プリセット9色（Blue, Green, Amber, Red, Violet, Orange, Pink, Cyan, Gray）の定数定義とカラースウォッチのグリッド表示を作成する
  - `value` / `onChange` / `disabled` propsによるControlled Componentとして設計する
  - スウォッチクリック時に `onChange` で選択色のHEXコードを親に通知する
  - 選択中のスウォッチにチェックマークアイコン（lucide-react `Check`）を重ねて表示する
  - 選択中のスウォッチにリング（枠線強調）を付与して視覚的に区別する
  - `value` propに一致するスウォッチを初期表示時に選択状態にする
  - `value` がプリセットに一致しない場合はどのスウォッチも選択状態にしない
  - 各スウォッチに `role="radio"` + `aria-checked` + `aria-label`（色名とHEXコード）を設定する
  - パレット全体を `role="radiogroup"` でグループ化する
  - Enter/Spaceキーでスウォッチを選択できるキーボード操作を実装する
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5, 4.5, 5.1, 5.2, 5.3, 5.4_

- [x] 1.2 カスタムカラーHEX入力機能を追加する
  - プリセットパレットの下にカスタムカラー入力のトグルボタンを配置する
  - トグルボタンクリック時にHEXカラーコード入力フィールドを展開・折りたたみする
  - `value` がプリセットに一致しない場合はカスタム入力を自動展開する
  - HEX入力フィールドの横に入力中の色のプレビュースウォッチを表示する
  - 有効なHEXコード（`#RRGGBB`形式）入力時のみ `onChange` で親に通知する
  - 無効なHEXコードが入力された場合は `onChange` を呼ばず直前の有効な色を維持する
  - _Requirements: 2.5, 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 2. EventFormへのColorPicker統合
  - `event-form.tsx` の `ColorField` 内の `<Input type="color">` を `ColorPicker` コンポーネントに置換する
  - `ColorPicker` の `onChange` を `form.handleChange("color", value)` に接続する
  - イベント作成時のデフォルトカラー `#3B82F6` がColorPickerの初期値として表示されることを確認する
  - イベント編集時に既存イベントの色がColorPickerの初期値として表示されることを確認する
  - ColorPickerの出力値が既存の `#RRGGBB` 形式を維持し、DB保存に影響がないことを確認する
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 3. テストとStorybookストーリーの作成
- [ ] 3.1 (P) ColorPickerのユニットテストを作成する
  - プリセットカラースウォッチが9個レンダリングされることを検証する
  - スウォッチクリックで `onChange` が正しいHEX値で呼ばれることを検証する
  - 選択中スウォッチにチェックマークが表示されることを検証する
  - `value` propに応じた初期選択状態を検証する
  - プリセット外の `value` でどのスウォッチも選択されないことを検証する
  - カスタム入力トグルの展開・折りたたみを検証する
  - 有効なHEXコード入力で `onChange` が呼ばれることを検証する
  - 無効なHEXコード入力で `onChange` が呼ばれないことを検証する
  - キーボード操作（Enter/Space）での色選択を検証する
  - `aria-checked` 属性が正しく設定されることを検証する
  - _Requirements: 1.1, 2.1, 2.2, 2.4, 2.5, 3.2, 3.3, 3.5, 5.3, 5.4_

- [ ] 3.2 (P) Storybookストーリーを作成する
  - `Default`: デフォルトカラー（Blue）が選択された状態
  - `WithCustomColor`: プリセット外の色が設定された状態（カスタム入力自動展開）
  - `CustomInputExpanded`: カスタム入力が展開された状態
  - `Disabled`: 無効化状態
  - `AllColors`: 各プリセットカラーが選択された状態のギャラリー
  - CSF3形式、`tags: ["autodocs"]` を設定し、コンポーネントと同ディレクトリに配置する
  - _Requirements: 1.1, 1.2, 2.2, 2.3, 3.1_
