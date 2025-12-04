# Research & Design Decisions

---
**Purpose**: カレンダービュー機能の設計判断と調査結果を記録する。

**Usage**:
- 設計フェーズで行った調査活動と結果をログとして残す
- design.md には詳細すぎる設計判断のトレードオフを記録
- 将来の監査や再利用のための参照とエビデンスを提供
---

## Summary
- **Feature**: `calendar-view`
- **Discovery Scope**: Complex Feature (新規カレンダーUI + 既存システム連携)
- **Key Findings**:
  - react-big-calendar が日/週/月ビューをサポートし、カスタマイズ性と軽量さのバランスが良い
  - date-fns はTree-shakeableで、日本語ロケール対応も充実している
  - shadcn/ui のスタイリングパターンと Radix UI Popover を活用することで、既存UIとの一貫性を確保できる

## Research Log

### カレンダーライブラリの選定

- **Context**: 日/週/月ビュー切り替え、イベント表示、レスポンシブ対応を満たすReactカレンダーライブラリの選定が必要
- **Sources Consulted**:
  - [React calendar components: 6 best libraries for 2025 - Builder.io](https://www.builder.io/blog/best-react-calendar-component-ai)
  - [React FullCalendar vs Big Calendar - Bryntum](https://bryntum.com/blog/react-fullcalendar-vs-big-calendar/)
  - [npm-compare: react-big-calendar vs fullcalendar](https://npm-compare.com/calendar,fullcalendar,react-big-calendar)
  - [react-big-calendar - npm](https://www.npmjs.com/package/react-big-calendar)
- **Findings**:
  - **react-big-calendar**: MIT License、軽量（約60kb gzipped）、日/週/月/アジェンダビュー対応、date-fns対応
  - **FullCalendar**: 機能豊富だが約250kb gzipped、商用ライセンス必要（プレミアム機能）
  - **DayPilot Lite**: Next.js 15対応、オープンソース版あり
  - **react-day-picker (shadcn/ui Calendar)**: 日付ピッカーとしては優秀だがスケジュールビュー非対応
- **Implications**: react-big-calendarを採用。本Specではイベント編集がスコープ外のため、組み込みDnD不要の軽量なreact-big-calendarが最適

### 日付操作ライブラリの選定

- **Context**: カレンダー操作に必要な日付計算・フォーマット・ロケール対応
- **Sources Consulted**:
  - [react-big-calendar localizers documentation](https://github.com/jquense/react-big-calendar/blob/master/README.md)
  - date-fns公式ドキュメント
- **Findings**:
  - react-big-calendarは4つのlocalizer（Moment.js, Globalize.js, date-fns, Day.js）をサポート
  - date-fnsはTree-shakeable、TypeScript対応、日本語ロケール（`date-fns/locale/ja`）完備
  - Moment.jsは非推奨（メンテナンスモード）、バンドルサイズ大
- **Implications**: date-fnsを採用。react-big-calendarのdateFnsLocalizerと組み合わせて使用

### アクセシビリティ要件の調査

- **Context**: Requirement 8でキーボードナビゲーション、ARIAラベル、十分なコントラスト比が要求されている
- **Sources Consulted**:
  - WAI-ARIA Authoring Practices - Grid Pattern
  - react-big-calendar Storybook examples
- **Findings**:
  - react-big-calendarは基本的なキーボード操作に対応しているが、カスタマイズが必要な場合がある
  - ARIAグリッドロールは手動で適用する必要がある
  - カラーコントラストはTailwind CSSのカラーパレットを適切に選択することで対応可能
- **Implications**: カスタムラッパーコンポーネントでARIA属性を追加、キーボードイベントハンドラーを実装

### 既存実装（DisCalendarV2）の分析

- **Context**: Nuxt.js + Vue 2版の参照コードから設計パターンを抽出
- **Sources Consulted**:
  - `refs/DisCalendarV2/web/components/calendar/Calendar.vue`
  - `refs/DisCalendarV2/web/components/calendar/Controller.vue`
  - `refs/DisCalendarV2/web/store/calendar.ts`
- **Findings**:
  - V2ではVuetifyのv-calendarコンポーネントを使用
  - ビューモード（month/week/day/4day）、ナビゲーション（prev/next/today）をVuex storeで管理
  - イベントデータ構造: `id, guild_id, name, description, notifications, color, is_all_day, start_at, end_at, created_at`
  - ドラッグ&ドロップ編集機能は本Specスコープ外
- **Implications**: 状態管理はReact 19のuseStateで十分（Vuexほど複雑ではない）、イベントデータ構造は継承可能

### レスポンシブデザインアプローチ

- **Context**: Requirement 6でデスクトップ/タブレット/モバイル対応が要求されている
- **Sources Consulted**:
  - Tailwind CSS Responsive Design documentation
  - react-big-calendar responsive examples
- **Findings**:
  - react-big-calendarはコンテナサイズに応じて自動リサイズ
  - モバイル（768px未満）では週ビューが使いにくい → 日ビューをデフォルト推奨
  - タッチイベントはreact-big-calendarがネイティブサポート
- **Implications**: CSS Media Queriesでビューモード制御、モバイルでは週ビューを非表示または簡略化

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| react-big-calendar + カスタムラッパー | 既存ライブラリにshadcn/uiスタイルを適用 | 開発速度、信頼性、メンテナンス性 | スタイルカスタマイズに制限あり | 推奨アプローチ |
| FullCalendar | 商用グレードの完成度 | 機能網羅、ドキュメント充実 | バンドルサイズ大、商用ライセンス | 過剰機能 |
| フルカスタム実装 | Tailwind + date-fnsで一から構築 | 完全なコントロール | 開発工数大、バグリスク | スコープ超過 |
| DayPilot Lite | Next.js最適化済み | App Router対応 | ドキュメント少、コミュニティ小 | 次点候補 |

## Design Decisions

### Decision: カレンダーコアライブラリの選定

- **Context**: 日/週/月ビュー対応のカレンダーUIが必要
- **Alternatives Considered**:
  1. FullCalendar — 機能最強だがバンドルサイズ250kb、商用ライセンス必要
  2. DayPilot Lite — Next.js対応だがコミュニティが小さい
  3. フルカスタム実装 — 工数大
- **Selected Approach**: react-big-calendar
- **Rationale**:
  - MIT License、60kb gzippedの軽量さ
  - date-fnsサポートで既存エコシステムと整合
  - 本Specはイベント表示のみ（編集はスコープ外）なので、シンプルなライブラリで十分
- **Trade-offs**:
  - イベント作成・編集機能が限定的（本Specではスコープ外なので問題なし）
  - デフォルトスタイルがシンプル（カスタムCSSで対応）
- **Follow-up**: イベント編集Specで再評価の可能性あり

### Decision: 日付操作ライブラリ

- **Context**: 日付計算、フォーマット、ロケール対応が必要
- **Alternatives Considered**:
  1. Moment.js — 非推奨、バンドルサイズ大
  2. Day.js — 軽量だがTypeScript型が弱い
  3. Luxon — 高機能だがAPIが複雑
- **Selected Approach**: date-fns
- **Rationale**:
  - Tree-shakeable、TypeScript完全対応
  - react-big-calendarのdateFnsLocalizerと直接連携
  - 日本語ロケール（`date-fns/locale/ja`）が充実
- **Trade-offs**: 関数インポートが冗長（個別関数をimport）
- **Follow-up**: なし

### Decision: イベント詳細ポップオーバーの実装

- **Context**: イベントクリック時に詳細表示するUIが必要
- **Alternatives Considered**:
  1. モーダルダイアログ — フルスクリーン遷移感
  2. サイドパネル — 画面占有大
  3. ポップオーバー — コンテキスト維持
- **Selected Approach**: Radix UI Popover（shadcn/ui経由）
- **Rationale**:
  - カレンダーから離れずにコンテキスト維持
  - Escキー、外部クリックでの閉じ動作がネイティブ対応
  - 既存shadcn/uiパターンとの一貫性
- **Trade-offs**: モバイルでは画面幅の制約あり
- **Follow-up**: モバイル用にボトムシートへのフォールバック検討

### Decision: 状態管理アプローチ

- **Context**: ビューモード、選択日付、イベントデータの管理
- **Alternatives Considered**:
  1. Zustand — グローバル状態管理
  2. Jotai — アトミック状態管理
  3. React useState/useReducer — コンポーネントローカル
  4. URL State — ブックマーク可能
- **Selected Approach**: useStateとURL State（URLパラメータ）の組み合わせ
- **Rationale**:
  - カレンダー状態は1つのページコンポーネントで完結
  - ビューモード・日付をURLパラメータに持たせることでブックマーク・共有可能
  - React 19のServer Componentsと相性が良い
- **Trade-offs**: URLパラメータ変更時のリレンダリング管理が必要
- **Follow-up**: パフォーマンス問題が発生した場合はuseTransitionで対応

## Risks & Mitigations

- **react-big-calendarのスタイルカスタマイズ制限** — カスタムCSSとcomponentsプロパティで対応、必要に応じてCSS変数でテーマ統合
- **大量イベント時のパフォーマンス** — 表示期間外のイベントは取得しない、必要に応じて仮想スクロール検討
- **モバイルでのタッチ操作UX** — 週ビューはモバイルで非表示、タップでポップオーバー表示を確認
- **タイムゾーン処理** — UTC保存・ローカル表示の方針を明確化、date-fns-tzの追加検討

## References

- [react-big-calendar - npm](https://www.npmjs.com/package/react-big-calendar) — 公式npmページ
- [React calendar components: 6 best libraries for 2025 - Builder.io](https://www.builder.io/blog/best-react-calendar-component-ai) — ライブラリ比較
- [React FullCalendar vs Big Calendar - Bryntum](https://bryntum.com/blog/react-fullcalendar-vs-big-calendar/) — 詳細比較記事
- [date-fns Documentation](https://date-fns.org/docs/Getting-Started) — 日付操作ライブラリ
- [shadcn/ui Calendar](https://ui.shadcn.com/docs/components/calendar) — UIコンポーネント参照
- [WAI-ARIA Grid Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/) — アクセシビリティガイドライン
