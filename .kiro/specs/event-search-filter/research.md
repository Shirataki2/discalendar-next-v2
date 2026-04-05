# Research & Design Decisions

## Summary
- **Feature**: `event-search-filter`
- **Discovery Scope**: Extension（既存のカレンダーシステムへのUI機能追加）
- **Key Findings**:
  - CalendarContainerが全イベントを`state.events`で保持しており、クライアントサイドフィルタリングの導入は自然
  - CalendarToolbarは既にレスポンシブ対応（`isMobile` prop）しており、検索UIの追加パターンが明確
  - CalendarEventの`title`フィールドが検索対象として適切

## Research Log

### 既存アーキテクチャとの統合ポイント
- **Context**: 検索フィルタの状態管理と既存のカレンダー状態管理の統合方法
- **Sources Consulted**: `calendar-container.tsx`, `use-calendar-state.ts`, `calendar-toolbar.tsx`
- **Findings**:
  - CalendarContainerが`state.events`（全イベント）を保持し、`visibleEvents`を計算してCalendarGridに渡す
  - 既存の`visibleEvents`計算ロジック（祝日の統合）に検索フィルタを追加する形が最小変更
  - CalendarToolbarはpropsドリブン設計で、新しいpropの追加でUI拡張可能
- **Implications**: 新規カスタムフック`useEventSearch`を作成し、CalendarContainerで統合するパターンが最適

### デバウンス実装
- **Context**: 300msデバウンスの実装方法
- **Sources Consulted**: React 19のベストプラクティス
- **Findings**:
  - `useDeferredValue`は検索インプットよりレンダリング最適化向け
  - カスタムフック内で`setTimeout`ベースのデバウンスを実装するのがシンプルで制御可能
- **Implications**: `useEventSearch`フック内にデバウンスロジックを内包する

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| CalendarContainer内で直接フィルタ | CalendarContainerにフィルタロジックを追加 | 変更箇所が少ない | 既に複雑なコンポーネントがさらに肥大化 | 不採用 |
| useEventSearchフック分離 | 検索状態とフィルタロジックを専用フックに分離 | 関心の分離、テスト容易性 | フック間の連携が必要 | 採用 |

## Design Decisions

### Decision: クライアントサイドフィルタリング
- **Context**: イベント検索をサーバーサイドで行うかクライアントサイドで行うか
- **Alternatives Considered**:
  1. サーバーサイド検索（Supabase full-text search）
  2. クライアントサイドフィルタリング（既存のstate.eventsをフィルタ）
- **Selected Approach**: クライアントサイドフィルタリング
- **Rationale**: 既にCalendarContainerが表示期間のイベントを全件取得しており、追加のネットワークリクエストは不要。要件にも「クライアントサイドフィルタリング」と明記
- **Trade-offs**: 大量イベント時のパフォーマンスは将来課題だが、現状のユースケースでは問題なし
- **Follow-up**: イベント数が数百件を超える場合はサーバーサイド検索への拡張を検討

### Decision: 検索UIの配置
- **Context**: 検索フィールドをどこに配置するか
- **Alternatives Considered**:
  1. CalendarToolbar内にインライン配置
  2. Toolbar上部に別行で配置
  3. サイドパネルとして配置
- **Selected Approach**: CalendarToolbar内にインライン配置（デスクトップ）/ アイコンボタンから展開（モバイル）
- **Rationale**: 既存のツールバーレイアウトに自然に統合でき、追加のスペースを取らない
- **Trade-offs**: モバイルでは展開アクションが必要だが、画面スペースを節約できる

## Risks & Mitigations
- 祝日イベントが検索対象に含まれる可能性 → `isHolidayEvent`でフィルタ対象から除外
- CalendarContainerの認知的複雑性がさらに増加 → フックへのロジック分離で緩和

## References
- CalendarContainer: `components/calendar/calendar-container.tsx`
- CalendarToolbar: `components/calendar/calendar-toolbar.tsx`
- CalendarEvent型: `lib/calendar/types.ts`
- useCalendarState: `hooks/calendar/use-calendar-state.ts`
