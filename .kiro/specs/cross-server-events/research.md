# Research & Design Decisions

## Summary
- **Feature**: `cross-server-events`
- **Discovery Scope**: Extension（既存ダッシュボードへの新セクション追加）
- **Key Findings**:
  - 既存の `fetchEventsWithSeries()` は単一ギルドスコープだが、内部ロジック（オカレンス展開・例外マージ）は再利用可能
  - DB RLS ポリシーは `USING (true)` で全認証ユーザーに SELECT を許可しており、横断取得を妨げない
  - `CalendarEvent` 型は react-big-calendar 向けに設計されており、ギルド情報を含まない。横断表示には専用型が必要
  - Server Component → Client Component 間では `Date` オブジェクトをシリアライズできないため、ISO string で渡す必要がある

## Research Log

### Server Component データシリアライゼーション
- **Context**: Server Component で取得したイベントデータを Client Component に渡す際、`Date` オブジェクトは JSON シリアライズ不可
- **Sources Consulted**: Next.js App Router ドキュメント、既存コードパターン
- **Findings**:
  - Server → Client の props は JSON シリアライズ可能な値に限定される
  - 既存のダッシュボードでは `Guild` 型（string/number のみ）を渡しており、Date 問題は発生していない
  - `CalendarEvent` は `Date` を含むため、Server Component で直接生成して渡すことは不可
- **Implications**: 横断表示用の型は `start`/`end` を ISO string で保持する設計とし、Client 側で必要に応じて Date に変換する

### 取得戦略: 一括クエリ vs 並列個別クエリ
- **Context**: 全ギルドのイベントを効率的に取得する方法の選定
- **Findings**:
  - **一括クエリ**: `guild_id IN (SELECT user_guild_ids())` で events + event_series を一括取得可能。クエリ数は 2-3 で固定。ただしオカレンス展開は JS 側で行うため、シリーズデータも必要
  - **並列個別クエリ**: 既存の `fetchEventsWithSeries()` をギルドごとに `Promise.allSettled()` で並列呼び出し。クエリ数は 3N（N = ギルド数）だが、個別ギルドの失敗が他に影響しない
  - **ハイブリッド**: 新規の一括取得クエリを `createClient()` (Server) で実行し、オカレンス展開ロジックは既存関数を切り出して再利用
- **Implications**: 一括クエリ方式を採用。Server Component から直接 Supabase クエリを実行することで、クエリ数を最小化し、パフォーマンスを確保する

### useCalendarUrlSync の日付パラメータ対応
- **Context**: 予定クリック時にカレンダーページで該当日付を表示する必要がある
- **Findings**:
  - `useCalendarUrlSync` は `?view=month&date=2026-01-15` 形式で URL からビューモードと日付を復元する
  - `?guild={guildId}&date={YYYY-MM-DD}` の組み合わせでギルド選択 + 日付指定が可能
- **Implications**: 遷移先 URL に `date` パラメータを付加するだけで対応可能。追加のフック変更は不要

### Skeleton コンポーネント
- **Context**: ローディング中の表示に shadcn/ui の Skeleton コンポーネントが必要
- **Findings**:
  - `components/ui/skeleton.tsx` は未導入
  - `pnpm dlx shadcn@latest add skeleton` で追加可能
  - 他の既存コンポーネントでは `Loader2` アイコンでローディングを表示している
- **Implications**: Skeleton コンポーネントを導入し、予定一覧のローディング表示に使用する

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| A: 既存型拡張 | CalendarEvent にギルド情報を追加 | ファイル数最小 | 型の肥大化、既存カレンダー表示への影響 | 不採用 |
| B: 完全新規 | 独立した型・サービス・UI | 関心分離が明確 | オカレンス展開ロジックの重複リスク | 部分採用 |
| C: ハイブリッド | 新規型 + 既存ロジック再利用 | 変更最小限、型汚染なし | サービス層の設計が鍵 | **採用** |

## Design Decisions

### Decision: 横断表示専用の UpcomingEvent 型を新規定義する
- **Context**: CalendarEvent は react-big-calendar 向けの型でギルド情報を含まない
- **Alternatives Considered**:
  1. CalendarEvent にオプショナルフィールドとしてギルド情報を追加
  2. 新規の UpcomingEvent 型を定義
- **Selected Approach**: 新規 UpcomingEvent 型を定義。start/end は ISO string で保持
- **Rationale**: CalendarEvent の変更は既存カレンダー表示の全コンポーネントに波及する。横断表示は独立した関心であり、専用型が適切
- **Trade-offs**: 型変換コードが増えるが、既存コードへの影響ゼロ
- **Follow-up**: CalendarEvent と UpcomingEvent の変換が将来的に必要になった場合のユーティリティ検討

### Decision: Server Component でのプリフェッチ + Suspense 境界
- **Context**: Req 5.3 で Server Component プリフェッチが要求されている
- **Alternatives Considered**:
  1. Server Component でプリフェッチし、ページ全体をブロック
  2. Suspense 境界で予定セクションを分離し、ストリーミング SSR
  3. Client-side fetch（useEffect）
- **Selected Approach**: Suspense 境界で予定セクションを分離
- **Rationale**: ダッシュボード全体のレンダリングをブロックせず、SSR の恩恵も得られる
- **Trade-offs**: Suspense 境界の追加による構造の複雑化。ただし Next.js App Router では自然なパターン

### Decision: 一括クエリによるイベント取得
- **Context**: 全ギルドのイベントを効率的に取得する方法
- **Alternatives Considered**:
  1. 各ギルドに対して fetchEventsWithSeries を並列呼び出し（3N クエリ）
  2. user_guild_ids() を使った一括クエリ（2-3 クエリ固定）
- **Selected Approach**: 一括クエリ方式。events + event_series を user_guild_ids() でフィルタして取得
- **Rationale**: クエリ数が固定でギルド数に依存しない。Server Component の createClient() で直接実行可能
- **Trade-offs**: 既存の fetchEventsWithSeries のロジック（オカレンス展開）を関数として切り出す必要がある
- **Follow-up**: オカレンス展開ロジックの共有方法を設計フェーズで確定

## Risks & Mitigations
- **R1**: オカレンス展開の計算コスト — 多数のシリーズを一度に展開すると CPU 負荷が高い → 30日範囲制限 + 20件表示制限で軽減
- **R2**: Server Component → Client Component のデータサイズ — 全ギルドのイベントが大量の場合 → 最大20件にトランケートしてから渡す
- **R3**: 一部ギルドのクエリ失敗 — RLS ポリシーが変更された場合など → クエリ自体は user_guild_ids() に基づくため、個別ギルドの失敗は発生しにくい。DB エラー時はエラー状態を表示

## References
- Next.js App Router: Server Components のデータフェッチングパターン
- Supabase: RPC / user_guild_ids() 関数によるギルドスコープ
- react-big-calendar: CalendarEvent 型の制約
