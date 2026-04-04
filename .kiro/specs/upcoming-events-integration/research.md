# Research & Design Decisions

## Summary
- **Feature**: `upcoming-events-integration`
- **Discovery Scope**: Extension（既存ダッシュボードレイアウトの再構成）
- **Key Findings**:
  - `UpcomingEventsSection` は Server Component。Client Component の `DashboardWithCalendar` 内で直接レンダリングするには ReactNode slot パターンが必要
  - 選択状態は `selectedGuildId: string | null` で管理されており、「直近の予定」表示を表現するには状態モデルの拡張が必要
  - URL パラメータ `?guild=<id>` がギルド選択と連動しており、直近の予定表示にも URL 表現が必要

## Research Log

### Server Component を Client Component 内で表示する方法
- **Context**: `UpcomingEventsSection` は async Server Component（Supabase からデータ取得）。`DashboardWithCalendar` は Client Component。
- **Sources Consulted**: Next.js App Router のコンポジションパターン
- **Findings**:
  - Client Component 内で Server Component を直接 import・レンダリングはできない
  - ReactNode を props/slot として渡すパターンが推奨（現在の `upcomingEventsSlot` と同じ手法）
  - 既に `DashboardPageLayout` が `upcomingEventsSlot: ReactNode` で Server Component を受け渡している実績がある
- **Implications**: `DashboardWithCalendar` に `upcomingEventsSlot: ReactNode` を追加し、Server Component のデータ取得を維持する

### 選択状態モデルの拡張
- **Context**: 現在 `selectedGuildId: string | null` で null = 未選択、string = ギルドID。「直近の予定」を表現する状態が必要
- **Sources Consulted**: 既存コードベース（`dashboard-with-calendar.tsx`）
- **Findings**:
  - 判別共用体型 `{ type: "guild"; guildId: string } | { type: "upcoming" } | null` は型安全だが変更箇所が多い
  - 特殊文字列 `"__upcoming__"` は既存の `string | null` 型を変えずに済むが型安全性が低い
  - URL パラメータとの連動も考慮すると、`?view=upcoming` を新設し `selectedGuildId` とは別の状態として管理するか、`?guild=upcoming` のように特殊値を使うか
- **Implications**: 判別共用体型を採用。型安全性を重視し、URL は `?view=upcoming` で表現

### 影響範囲の分析
- **Context**: 変更が必要なファイルと後方互換性の確認
- **Findings**:
  - `app/dashboard/page.tsx` — `upcomingEventsSlot` の渡し先を変更、上部セクション削除
  - `app/dashboard/dashboard-with-calendar.tsx` — 選択状態の型変更、右ペインの条件分岐追加、サイドバーへの項目追加
  - `components/calendar/upcoming-events-collapsible.tsx` — 不要になる（削除候補）
  - テスト・ストーリーファイルの更新
  - 既存の `UpcomingEventList`, `UpcomingEventItem`, `UpcomingEventsSection` は変更不要（再利用）

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| ReactNode Slot | Server Component を ReactNode として Client に渡す | 既存パターン踏襲、Server Component のデータ取得維持 | slot が常に事前レンダリングされる | 採用 |
| Client-side Fetch | Client Component 内で直近予定を fetch | 遅延読み込み可能 | Server Component パターンから逸脱、認証トークン管理が複雑 | 不採用 |
| Route Segment | `/dashboard/upcoming` を別ルートとして分離 | 明確な URL 構造 | サイドバーとの統合が複雑、共通レイアウトの重複 | 不採用 |

## Design Decisions

### Decision: 選択状態の型モデル
- **Context**: サイドバーで「ギルド」と「直近の予定」を同列に扱う必要がある
- **Alternatives Considered**:
  1. 特殊文字列 `"__upcoming__"` — 既存型を変えないが型安全性が低い
  2. 判別共用体型 `DashboardSelection` — 型安全だが変更箇所が多い
- **Selected Approach**: 判別共用体型 `DashboardSelection`
- **Rationale**: TypeScript strict mode プロジェクトで型安全性を最重視。変更箇所は限定的（`DashboardWithCalendar` 内部）
- **Trade-offs**: 内部状態の型変更が必要だが、URL パラメータとの変換は集約できる

### Decision: URL パラメータ設計
- **Context**: 直近の予定表示状態を URL で表現する必要がある
- **Alternatives Considered**:
  1. `?view=upcoming` — 新パラメータ追加
  2. `?guild=upcoming` — 既存パラメータに特殊値
- **Selected Approach**: `?view=upcoming`（guild パラメータなし）
- **Rationale**: guild パラメータは Discord Guild ID（数字文字列）であり、特殊文字列を混入させるべきでない
- **Trade-offs**: URL パラメータが1つ増えるが、意味が明確

### Decision: UpcomingEventsCollapsible の廃止
- **Context**: ページ上部の折りたたみ可能セクションが不要になる
- **Selected Approach**: コンポーネントファイルは残し、`DashboardPage` からの使用を削除
- **Rationale**: 他の場所で再利用される可能性は低いが、今回のスコープでは使用箇所の削除に留める
- **Follow-up**: 未使用コンポーネントの削除は別タスクとして管理可能

## Risks & Mitigations
- **ReactNode slot の事前レンダリング**: upcomingEventsSlot は Server Component で常にデータ取得が発生する → guilds が0件の場合の早期return で軽減
- **既存テストへの影響**: `DashboardPageLayout` の props 変更により既存テストが壊れる → テスト更新をタスクに含める
- **URL の後方互換性**: ブックマークされた `?guild=xxx` URL は引き続き動作する。新規の `?view=upcoming` は追加のみ
