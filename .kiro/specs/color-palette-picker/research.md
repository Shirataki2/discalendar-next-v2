# Research & Design Decisions

## Summary
- **Feature**: `color-palette-picker`
- **Discovery Scope**: Extension（既存UIコンポーネントの置換）
- **Key Findings**:
  - 既存の `ColorField` はHTML5 `<input type="color">` を使用しており、置換は局所的
  - `useEventForm` フックの `handleChange("color", value)` インターフェースはそのまま利用可能
  - lucide-react の `Check` アイコンがプロジェクトで既に使用されておりチェックマーク表示に活用可能

## Research Log

### 既存のColorField統合ポイント
- **Context**: 新しいColorPickerが既存フォームにどう統合されるか
- **Sources Consulted**: `components/calendar/event-form.tsx`, `hooks/calendar/use-event-form.ts`
- **Findings**:
  - `ColorField` は `form.handleChange("color", e.target.value)` で値を通知
  - `color` フィールドは `string` 型（HEXコード）
  - `onBlur` でタッチ状態を管理（`form.handleBlur("color")`）
  - カラーフィールドにバリデーションルールは存在しない
- **Implications**: 新コンポーネントは `value: string` と `onChange: (value: string) => void` のシンプルなインターフェースで十分

### アクセシビリティパターン: radiogroup
- **Context**: カラーパレットのアクセシビリティ実装方法
- **Sources Consulted**: WAI-ARIA Practices
- **Findings**:
  - カラーパレットは `role="radiogroup"` + 各スウォッチに `role="radio"` が適切
  - `aria-checked` で選択状態を伝達
  - 矢印キーによるフォーカス移動は任意（tabキーのみでも可）
- **Implications**: Radix UIの `ToggleGroup` に近いパターンだが、シンプルなbutton配列で十分

### プリセットカラー定数設計
- **Context**: プリセットカラーをどこに定義するか
- **Findings**:
  - 9色は固定値として定数配列で管理
  - 各色にラベル（英語名）とHEXコードを持たせる
  - ラベルは `aria-label` と将来のツールチップに使用
- **Implications**: コンポーネントファイル内の定数として定義（外部設定不要）

## Design Decisions

### Decision: Controlled Component パターン
- **Context**: ColorPickerの状態管理方法
- **Alternatives Considered**:
  1. 内部状態を持つUncontrolled Component
  2. 外部から制御するControlled Component
- **Selected Approach**: Controlled Component（`value` + `onChange` props）
- **Rationale**: 既存の `useEventForm` フックとの統合が自然。他のフォームフィールドと同じパターン
- **Trade-offs**: 親コンポーネントが状態を管理する必要があるが、既存パターンと一致

### Decision: カスタムカラー入力のトグル表示
- **Context**: カスタムHEX入力をどう表示するか
- **Alternatives Considered**:
  1. 常にHEX入力を表示
  2. トグルボタンで切り替え
  3. Popover/ダイアログで表示
- **Selected Approach**: トグルボタンで切り替え
- **Rationale**: パレットのシンプルさを保ちつつ、必要時にカスタム入力にアクセス可能。Popoverは過剰
- **Trade-offs**: トグル操作が1ステップ増えるが、大多数のユーザーはプリセットで済む

## Risks & Mitigations
- カスタムHEX入力時のリアルタイムバリデーション → 正規表現で即座に検証、無効値は反映しない
- 既存イベントのカスタムカラーがプリセットに存在しない場合 → カスタムモードを自動展開し現在の色をプレビュー表示

## References
- [WAI-ARIA Radiogroup Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/radio/) — カラーパレットのアクセシビリティ実装参考
- lucide-react `Check` アイコン — 選択インジケータ用
