# Research & Design Decisions

## Summary
- **Feature**: `japanese-holidays`
- **Discovery Scope**: Extension（既存カレンダーコンポーネントへの祝日レイヤー追加）
- **Key Findings**:
  - `@holiday-jp/holiday_jp` v2.5.1 が `between(start, end)` API で期間指定の祝日取得をサポート。振替休日・国民の休日も対応済み
  - react-big-calendar の `dayPropGetter` と `backgroundEvents` が祝日表示の統合ポイント
  - 既存の `useUserPreferences` + `useLocalStorage` パターンが祝日ON/OFF永続化に再利用可能

## Research Log

### @holiday-jp/holiday_jp ライブラリ調査
- **Context**: 祝日データのオフライン提供に使用するnpmライブラリの選定
- **Sources**: npm registry, GitHub (holiday-jp/holiday_jp-js)
- **Findings**:
  - 最新バージョン: v2.5.1、MIT License
  - TypeScript型定義を内蔵
  - 主要API: `between(startDate, endDate)` → Holiday[] を返却
  - Holiday オブジェクト: `{ date: Date, name: string, name_en: string, week: string, week_en: string }`
  - 振替休日（substitute holidays）・国民の休日（citizens' holiday）を自動判定して含む
  - Google Calendarデータから自動生成、外部APIリクエスト不要
  - `setHolidays()` で年単位のセレクティブロードも可能（バンドルサイズ最適化）
- **Implications**: 要件1.2～1.4の振替休日・国民の休日対応がライブラリ側で完結。ユーティリティ層は薄いラッパーで済む

### react-big-calendar 祝日統合ポイント
- **Context**: 既存カレンダーグリッドへの祝日表示の統合方法
- **Sources**: 既存コードベース分析（calendar-grid.tsx, calendar-container.tsx）
- **Findings**:
  - `dayPropGetter` で日付セルのclassName/styleをカスタマイズ可能（既存: 今日のハイライト、月外セル、土日色分け）
  - `backgroundEvents` prop で背景イベントとして祝日を表示可能（react-big-calendar v1.x+）
  - 既存の `calendarComponents` オブジェクトでカスタムヘッダーを設定済み（WeekendHeader, WeekendDateHeader）
  - CalendarContainer → CalendarGrid へのデータフローが確立済み
- **Implications**: `dayPropGetter` の拡張で祝日セル背景色、`backgroundEvents` でラベル表示が自然に統合可能。既存のWeekendDateHeaderを拡張して祝日名を追加表示する方針が最もシンプル

### 祝日ON/OFF永続化パターン
- **Context**: 祝日表示設定の永続化方法
- **Sources**: 既存コードベース（use-user-preferences.ts, use-local-storage.ts）
- **Findings**:
  - `useLocalStorage<T>(key, defaultValue)` フックが既に存在
  - `useUserPreferences` がこのフックを使用してカレンダービュー設定を永続化するパターンを確立
  - `discalendar:` プレフィックスのキー命名規則
- **Implications**: 同じパターンで `useUserPreferences` に `showHolidays` を追加するのが最もコードベースと一貫性がある

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| backgroundEvents統合 | react-big-calendarのbackgroundEvents propに祝日を終日イベントとして渡す | RBCの公式APIを使用、月/週/日すべてのビューで自動表示 | 祝日セルの背景色はdayPropGetterで別途対応が必要 | 推奨: 最もクリーンな統合 |
| CalendarEvent統合 | 祝日をCalendarEvent型に変換してevents配列にマージ | 既存のイベント表示インフラを再利用 | 祝日がユーザーイベントと同じ扱いになり、ドラッグ/編集対象になるリスク | 非推奨: 祝日の特別扱いが複雑化 |
| カスタムレンダラー | dayPropGetter + カスタムDateHeaderのみで祝日名を表示 | 軽量、既存コンポーネントの拡張のみ | 週/日ビューでの祝日表示がヘッダー部分に限定される | 部分採用: dayPropGetterは背景色に使用 |

## Design Decisions

### Decision: backgroundEvents + dayPropGetter 併用アプローチ
- **Context**: 祝日をカレンダー上でどのように表示するか
- **Alternatives Considered**:
  1. backgroundEvents のみ — 祝日を背景イベントとして表示
  2. dayPropGetter のみ — ヘッダーに祝日名を追加
  3. CalendarEvent にマージ — 通常イベントとして扱う
- **Selected Approach**: backgroundEvents で祝日ラベルを表示し、dayPropGetter で祝日セルの背景色を適用する
- **Rationale**: react-big-calendar の公式APIを使用し、全ビュー（月/週/日）で一貫した表示を実現。祝日はドラッグ/編集対象にならない
- **Trade-offs**: backgroundEvents のスタイルカスタマイズにCSS追加が必要。ただし既存の eventStyleGetter パターンと同様のアプローチで対応可能
- **Follow-up**: react-big-calendar v1.19 での backgroundEvents の挙動を実装時に検証

### Decision: useUserPreferences フックの拡張
- **Context**: 祝日表示ON/OFF設定の永続化方法
- **Alternatives Considered**:
  1. useUserPreferences に showHolidays を追加
  2. 新規 useHolidaySettings フックを作成
- **Selected Approach**: 既存の useUserPreferences フックに showHolidays プロパティを追加
- **Rationale**: 既にユーザー設定の永続化パターンが確立されており、同一フックに集約することでコードの一貫性を維持
- **Trade-offs**: フックの責務が若干増えるが、設定項目が少数（2項目）のため管理可能
- **Follow-up**: 将来の設定項目増加時にはドメイン別フック分割を検討

## Risks & Mitigations
- `@holiday-jp/holiday_jp` のバンドルサイズ — 全年データロードの場合のサイズ影響を確認。必要に応じて年別セレクティブロードを使用
- react-big-calendar の backgroundEvents の表示制限 — 月ビューでの表示件数制限に祝日が影響する可能性。dayPropGetter による背景色で補完
- ダークモード対応 — CSS変数を使用して祝日スタイルをテーマ対応にする

## References
- [@holiday-jp/holiday_jp npm](https://www.npmjs.com/package/@holiday-jp/holiday_jp) — 日本の祝日データライブラリ
- [holiday-jp/holiday_jp-js GitHub](https://github.com/holiday-jp/holiday_jp-js) — ソースコード・API仕様
- [react-big-calendar backgroundEvents](http://jquense.github.io/react-big-calendar/examples/index.html) — backgroundEvents API
