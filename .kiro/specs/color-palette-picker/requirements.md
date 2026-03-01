# Requirements Document

## Project Description (Input)
イベント色選択UIの改善: カラーパレット + カスタムカラー対応

### 背景

現在、イベントの色選択はHTML5標準の`<input type="color">`を使用しており、ブラウザネイティブのカラーピッカーUIに依存している。直感的にプリセットの色を選べず、UXが良くない。

### 現状

* `components/calendar/event-form.tsx` の `ColorField` コンポーネントでHTML5カラーピッカーを使用
* 色は`#RRGGBB`形式（VARCHAR(7)）でDB保存
* デフォルト色: `#3B82F6`（blue-500）
* バリデーションなし

### 要件

* よく使う基本色をカラーパレット（カラースウォッチ）として表示し、クリックで選択できるようにする
* カラーパレットに加えて、カスタムカラー（RGB/HEX入力）も引き続き指定可能にする
* プリセットカラー候補:
  * 🔵 Blue (#3B82F6) - デフォルト
  * 🟢 Green (#22C55E)
  * 🟡 Amber (#F59E0B)
  * 🔴 Red (#EF4444)
  * 🟣 Violet (#8B5CF6)
  * 🟠 Orange (#F97316)
  * 🩷 Pink (#EC4899)
  * 🩵 Cyan (#06B6D4)
  * ⚫ Gray (#6B7280)
* 選択中の色にチェックマークやリングなどの視覚的インジケータを表示
* 「カスタム」ボタンからカラーピッカー（HEX入力含む）にアクセス可能

### 対象ファイル

* `components/calendar/event-form.tsx` - ColorFieldコンポーネントの置換
* 新規: カラーパレットコンポーネント（Storybook・テスト含む）

### 受け入れ条件

- [ ] プリセットカラーがパレット形式で表示される
- [ ] カラーパレットからクリックで色を選択できる
- [ ] 選択中の色に視覚的なインジケータがある
- [ ] カスタムカラー（HEX）も入力可能
- [ ] 既存のイベント作成・編集フローが正常に動作する
- [ ] Storybookストーリーが作成されている
- [ ] ユニットテストが作成されている

### Metadata
- URL: [https://linear.app/ff2345/issue/DIS-59/イベント色選択uiの改善-カラーパレット-カスタムカラー対応](https://linear.app/ff2345/issue/DIS-59/イベント色選択uiの改善-カラーパレット-カスタムカラー対応)
- Identifier: DIS-59
- Status: In Progress
- Priority: High
- Assignee: Tomoya Ishii
- Labels: UI UX向上
- Created: 2026-02-28T17:36:26.599Z
- Updated: 2026-02-28T17:40:11.808Z

### Sub-issues

- [DIS-60 ColorPaletteコンポーネントを作成しevent-formに統合する](https://linear.app/ff2345/issue/DIS-60/colorpaletteコンポーネントを作成しevent-formに統合する)
- [DIS-61 Storybookストーリー・ユニットテストを作成する](https://linear.app/ff2345/issue/DIS-61/storybookストーリーユニットテストを作成する)

## Introduction

イベント作成・編集フォームにおける色選択UIを、HTML5標準カラーピッカーからプリセットカラーパレット＋カスタムHEX入力のハイブリッドUIに置換する。ユーザーがワンクリックで直感的に色を選択できるようにし、必要に応じてカスタムカラーも指定できる柔軟性を維持する。

## Requirements

### Requirement 1: プリセットカラーパレットの表示

**Objective:** ユーザーとして、よく使う色をパレット形式で一覧表示したい。ワンクリックで素早く色を選べるようにするため。

#### Acceptance Criteria
1. The ColorPicker shall プリセットカラー9色（Blue #3B82F6, Green #22C55E, Amber #F59E0B, Red #EF4444, Violet #8B5CF6, Orange #F97316, Pink #EC4899, Cyan #06B6D4, Gray #6B7280）をカラースウォッチとして表示する
2. The ColorPicker shall 各カラースウォッチを円形またはボタン形式で等間隔に配置し、グリッドレイアウトで表示する
3. The ColorPicker shall プリセットカラーの順序を固定し、一貫した並びで表示する

### Requirement 2: カラー選択インタラクション

**Objective:** ユーザーとして、パレットから色をクリックして選択したい。選択した色がフォームに即座に反映されるようにするため。

#### Acceptance Criteria
1. When ユーザーがプリセットカラーのスウォッチをクリックした時, the ColorPicker shall 選択された色の値（HEXコード）を親コンポーネントに通知する
2. When 色が選択された時, the ColorPicker shall 選択中のスウォッチにチェックマークアイコンを重ねて表示する
3. When 色が選択された時, the ColorPicker shall 選択中のスウォッチにリング（枠線強調）を付与して他のスウォッチと視覚的に区別する
4. While コンポーネントの初期表示時, the ColorPicker shall `value` propに一致するスウォッチを選択状態で表示する
5. If `value` propがプリセットカラーのいずれにも一致しない場合, the ColorPicker shall どのプリセットスウォッチも選択状態にせず、カスタムカラーとして扱う

### Requirement 3: カスタムカラー入力

**Objective:** ユーザーとして、プリセット以外の任意の色もHEXコードで指定したい。ブランドカラーなど特定の色を使いたい場合があるため。

#### Acceptance Criteria
1. The ColorPicker shall プリセットパレットに加えて、カスタムカラー入力用のトグルボタンを表示する
2. When ユーザーがカスタムカラーボタンをクリックした時, the ColorPicker shall HEXカラーコード入力フィールドを表示する
3. When ユーザーがHEX入力フィールドに有効なカラーコード（`#RRGGBB`形式）を入力した時, the ColorPicker shall 入力された色の値を親コンポーネントに通知する
4. The ColorPicker shall HEX入力フィールドの横に、入力中の色のプレビュー（カラースウォッチ）を表示する
5. If ユーザーが無効なHEXカラーコードを入力した場合, the ColorPicker shall 色の値を更新せず、直前の有効な色を維持する

### Requirement 4: イベントフォーム統合

**Objective:** ユーザーとして、イベント作成・編集フォームで新しいカラーパレットUIを使いたい。既存の操作フローを変えずにUXを向上させるため。

#### Acceptance Criteria
1. The EventForm shall 既存の `<input type="color">` を ColorPicker コンポーネントに置換する
2. The EventForm shall ColorPickerの値変更を `useEventForm` フックの `handleChange("color", value)` に接続する
3. When イベント作成フォームが表示された時, the EventForm shall デフォルトカラー `#3B82F6` をColorPickerの初期値として設定する
4. When イベント編集フォームが表示された時, the EventForm shall 既存イベントの色をColorPickerの初期値として設定する
5. The EventForm shall ColorPickerが返す値を既存の `#RRGGBB` 形式（VARCHAR(7)）のまま保持し、DBスキーマへの変更を不要とする

### Requirement 5: アクセシビリティ

**Objective:** すべてのユーザーとして、キーボードやスクリーンリーダーでもカラーパレットを操作したい。アクセシブルなUIを提供するため。

#### Acceptance Criteria
1. The ColorPicker shall 各カラースウォッチにキーボードフォーカスを当てられるようにする
2. The ColorPicker shall 各カラースウォッチに色名を含む `aria-label` を付与する（例: "Blue (#3B82F6)"）
3. When ユーザーがカラースウォッチにフォーカスしてEnterまたはSpaceキーを押した時, the ColorPicker shall そのスウォッチの色を選択する
4. The ColorPicker shall 選択状態のスウォッチに `aria-checked="true"` を設定し、スクリーンリーダーに選択状態を伝える
