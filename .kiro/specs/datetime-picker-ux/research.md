# Research & Design Decisions

## Summary
- **Feature**: `datetime-picker-ux`
- **Discovery Scope**: Extension（既存EventFormの日時入力をカスタムピッカーに置き換え）
- **Key Findings**:
  - shadcn/ui公式パターンはPopover + Calendar（react-day-picker）の合成で日付ピッカーを構築
  - react-day-pickerは未インストール、Calendar/ScrollAreaコンポーネントも未追加
  - 時刻ピッカーはshadcn/ui公式にはなく、ScrollAreaベースのカスタム実装が最適

## Research Log

### shadcn/ui 日付ピッカーパターン
- **Context**: 既存のネイティブ`<input type="datetime-local">`を置き換えるアプローチの調査
- **Sources Consulted**: [shadcn/ui Date Picker](https://ui.shadcn.com/docs/components/radix/date-picker), [shadcn/ui Calendar](https://ui.shadcn.com/docs/components/radix/calendar)
- **Findings**:
  - shadcn/uiのDatePickerは独立コンポーネントではなく、`Popover` + `Calendar`の合成パターン
  - Calendarはreact-day-pickerのラッパー。`mode="single"`, `selected`, `onSelect`で日付選択
  - `captionLayout="dropdown"`で月/年のドロップダウンセレクターを表示可能
  - `--cell-size` CSS変数でセルサイズを調整可能（モバイル対応に有用）
  - ダークモードはCSS変数（`--popover`, `--popover-foreground`等）で自動対応
- **Implications**: Popoverコンポーネントは既存。Calendar + react-day-pickerを追加する必要がある

### 時刻ピッカーアプローチ比較
- **Context**: shadcn/uiには公式の時刻ピッカーがなく、カスタム実装が必要
- **Sources Consulted**: [OpenStatus TimePicker](https://time.openstatus.dev/), [shadcn/ui expansions datetime-picker](https://shadcnui-expansions.typeart.cc/docs/datetime-picker), [shadcn-time-range-picker](https://github.com/fatihcaliss/shadcn-time-range-picker)
- **Findings**:
  - **OpenStatus TimePicker**: input-based + キーボードナビ。5分ステップ設定はネイティブ非対応
  - **ScrollArea方式**: 時間・分の2列スクロールリスト。タッチ操作に最適、5分ステップ対応容易
  - **Select方式**: Radix Select で時間・分を個別選択。実装簡潔だがスクロール体験が劣る
- **Implications**: ScrollAreaベースが5分ステップ + モバイルタッチ操作の要件に最適

### 既存コードベース分析
- **Context**: 変更対象のコンポーネントと影響範囲の特定
- **Findings**:
  - `event-form.tsx`: `DateTimeField`がネイティブ`<Input type="datetime-local">`を使用
  - `use-event-form.ts`: `handleChange`で文字列→Date変換を実装。Date直接受け取りにも対応済み
  - 既存のshadcn/uiコンポーネント: Popover, Select, Input, Button, Checkbox, Dialog
  - 未インストール: react-day-picker, Calendar, ScrollArea
  - `date-fns ^4.1.0`は既にインストール済み
- **Implications**: useEventFormのhandleChangeはDate型を直接受け取れるため、フック側の変更は最小限

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Popover + Calendar合成 | shadcn/ui推奨パターン | エコシステム標準、メンテナンス安定 | react-day-picker追加が必要 | 採用 |
| ネイティブinput改善 | CSS変数でネイティブ入力をスタイリング | 追加依存なし | ブラウザ間で見た目が異なり統一困難 | 不採用 |
| ScrollArea時刻選択 | 時間/分の2列スクロールリスト | タッチ操作に最適、ステップ設定自由 | カスタム実装が必要 | 採用 |
| Input-based時刻入力 | 数値入力+キーボードナビ | 軽量、キーボード操作に強い | モバイルタッチ操作が不便 | 不採用 |

## Design Decisions

### Decision: 日付ピッカーにshadcn/ui Calendar + Popoverを採用
- **Context**: ネイティブHTML5入力の置き換え
- **Alternatives Considered**:
  1. ネイティブinputのCSS変数カスタマイズ — ブラウザ間差異が大きく統一困難
  2. react-datepicker — 別のデザインシステム、shadcn/uiとの統合に追加作業
  3. shadcn/ui Calendar + Popover — 公式推奨パターン
- **Selected Approach**: shadcn/ui Calendar + Popover
- **Rationale**: shadcn/uiエコシステムとの完全な統合、CSS変数によるダークモード自動対応、プロジェクト既存のPopoverコンポーネントを再利用
- **Trade-offs**: react-day-pickerの追加依存（ただしshadcn/ui標準）
- **Follow-up**: `npx shadcn@latest add calendar`でCalendarコンポーネントを追加

### Decision: 時刻ピッカーにScrollAreaベースのカスタムUIを採用
- **Context**: 5分刻みの時刻選択、モバイル対応
- **Alternatives Considered**:
  1. OpenStatus TimePicker (input-based) — 5分ステップの直接サポートなし
  2. Radix Select — スクロール体験がScrollAreaに劣る
  3. ScrollAreaベースの時間/分2列選択 — タッチ操作に最適
- **Selected Approach**: ScrollAreaベースの2列（時間・分）選択UI
- **Rationale**: 5分ステップの選択肢生成が容易、ScrollAreaのスクロール慣性がモバイルタッチ操作に最適、shadcn/uiのCSS変数をそのまま適用可能
- **Trade-offs**: カスタム実装のメンテナンスコスト
- **Follow-up**: `npx shadcn@latest add scroll-area`でScrollAreaコンポーネントを追加

## Risks & Mitigations
- react-day-pickerのバージョン互換性 — shadcn/ui CLIで追加することで互換バージョンを自動解決
- ScrollArea時刻ピッカーのアクセシビリティ — `role="listbox"`, `aria-selected`, キーボードナビゲーションを実装
- モバイルでのPopoverの画面外はみ出し — Radix Popoverの`avoidCollisions`プロパティで自動調整

## References
- [shadcn/ui Date Picker](https://ui.shadcn.com/docs/components/radix/date-picker) — 公式日付ピッカーパターン
- [shadcn/ui Calendar](https://ui.shadcn.com/docs/components/radix/calendar) — Calendarコンポーネント仕様
- [OpenStatus TimePicker](https://time.openstatus.dev/) — 時刻ピッカーの参考実装
- [shadcn/ui expansions datetime-picker](https://shadcnui-expansions.typeart.cc/docs/datetime-picker) — 日時ピッカー拡張
- [React DayPicker](https://daypicker.dev/) — react-day-picker公式ドキュメント
