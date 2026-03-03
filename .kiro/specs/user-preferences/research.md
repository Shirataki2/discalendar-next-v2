# Research & Design Decisions

---
**Purpose**: ユーザープリファレンス管理ページの技術設計を裏付けるディスカバリー調査と設計判断を記録する。
---

## Summary
- **Feature**: `user-preferences`
- **Discovery Scope**: Extension（既存ダッシュボードへの設定ページ追加）
- **Key Findings**:
  - テーマ状態は `next-themes` の `useTheme()` で一元管理されており、設定ページから直接共有可能
  - カレンダーデフォルトビューは `use-calendar-url-sync.ts` で `"month"` にハードコードされたフォールバックのみ
  - 設定の永続化は localStorage が最適（クライアント専用設定、DB不要、既存パターンとの一貫性）

## Research Log

### テーマ管理の現状分析
- **Context**: 設定ページからのテーマ変更が既存の `ThemeSwitcher` と同期するか確認
- **Sources Consulted**: `app/layout.tsx`, `components/theme-switcher.tsx`, next-themes 公式ドキュメント
- **Findings**:
  - `ThemeProvider` はルートレイアウトで設定済み（`attribute="class"`, `enableSystem`, `defaultTheme="system"`）
  - `useTheme()` は `theme` と `setTheme` を提供し、どのクライアントコンポーネントからも呼び出し可能
  - `next-themes` は内部的に localStorage（キー: `theme`）でテーマを永続化
  - 設定ページで `setTheme()` を呼べば `DashboardHeader` の `ThemeSwitcher` と自動同期される
- **Implications**: テーマ設定は `next-themes` の既存インフラをそのまま利用できる。追加の永続化ロジックは不要

### カレンダーデフォルトビューの現状分析
- **Context**: ユーザーが設定したデフォルトビューをカレンダー初期表示に反映する方法の調査
- **Sources Consulted**: `hooks/calendar/use-calendar-url-sync.ts`, `hooks/calendar/use-calendar-state.ts`, `components/calendar/calendar-container.tsx`
- **Findings**:
  - `useCalendarUrlSync` は URL パラメータ `?view=` からビューモードを読み取り、未指定時は `"month"` にフォールバック
  - `useCalendarState` は `initialViewMode` オプションを受け取る（デフォルト: `"month"`）
  - `CalendarContainer` は `useCalendarUrlSync` から取得した `viewMode` を `useCalendarState` の `initialViewMode` に渡している
  - URL に `?view=` パラメータがない場合のフォールバック値を、ユーザーの設定値に変更すれば要件を満たせる
- **Implications**: `useCalendarUrlSync` のフォールバック値を外部から注入可能にするか、呼び出し元の `CalendarContainer` で localStorage 値を読んで初期化すれば実現可能

### 設定の永続化方式の調査
- **Context**: 設定データの永続化先（DB vs localStorage vs Supabase user_metadata）の比較
- **Sources Consulted**: Supabase 公式ドキュメント、既存コードベース（`hooks/use-local-storage.ts`）
- **Findings**:
  - **Supabase user_metadata**: `supabase.auth.updateUser({ data: { ... } })` で更新可能。ただし認証情報の一部であり、ユーザー情報の取得時に追加 API コールが不要。しかし SSR で `getUser()` を呼ぶたびにネットワークコストが発生する。また Discord OAuth の provider metadata との混在リスクがある
  - **カスタムテーブル (`user_preferences`)**: RLS で保護可能。柔軟なスキーマ拡張。ただし追加のマイグレーション、API コール、Server Action が必要
  - **localStorage**: 既存の `useLocalStorage` フックが利用可能。`discalendar:sidebar-collapsed` で同パターンが実証済み。クライアント完結でサーバー負荷ゼロ。デバイス間同期は不可だが、テーマとビューはデバイス固有の設定として合理的
- **Implications**: テーマは `next-themes` が既に localStorage で管理。カレンダーデフォルトビューも localStorage が最適

### DashboardHeader の導線追加の分析
- **Context**: ユーザーアバター周辺に設定ページへのリンクを追加する方法
- **Sources Consulted**: `components/dashboard/dashboard-header.tsx`
- **Findings**:
  - 現在のヘッダーにはドロップダウンメニューがなく、アバターは `/dashboard/user` への直接リンク
  - 要件 4.2 では「ユーザーアバター周辺のUIに設定ページへのリンクを提供すること」が求められている
  - 選択肢: (A) ドロップダウンメニューを導入してプロフィール/設定/ログアウトを集約、(B) アバターリンクの隣に小さい設定アイコンを追加
  - 既存の `DropdownMenu` コンポーネントは `components/ui/` に存在
- **Implications**: ドロップダウンメニューの導入が最もクリーンだが、既存の `LogoutButton` も含める変更が大きい。最小限の変更として、アバターリンクの隣に設定アイコンリンクを追加する方が安全

### 既存 SettingsSection コンポーネントの再利用
- **Context**: ギルド設定で使用されている `SettingsSection` コンポーネントの汎用性を確認
- **Sources Consulted**: `components/guilds/settings-section.tsx`
- **Findings**:
  - `SettingsSection` は `title`, `description`, `children` を受け取る汎用ラッパー
  - shadcn/ui の `Card` ベースで統一的な見た目を提供
  - ギルド設定ドメインの `components/guilds/` に配置されているが、ロジック的にはドメイン非依存
- **Implications**: 同一パターンのコンポーネントを `components/settings/` に作成するか、既存を共通化して移動するか。新規作成が既存コードへの影響を最小化できる

## Design Decisions

### Decision: localStorage による設定永続化
- **Context**: テーマとカレンダーデフォルトビューの永続化方式の選定
- **Alternatives Considered**:
  1. Supabase `user_metadata` -- サーバーサイドで取得可能だがネットワークコスト増大
  2. カスタム `user_preferences` テーブル -- 柔軟だがオーバーエンジニアリング
  3. localStorage -- クライアント完結、既存パターン踏襲
- **Selected Approach**: localStorage（テーマは `next-themes` 内蔵の localStorage、ビューは `useLocalStorage` フック）
- **Rationale**:
  - テーマとデフォルトビューはデバイス固有の表示設定であり、デバイス間同期の必要性が低い
  - 既存の `discalendar:sidebar-collapsed` と同じパターンで一貫性がある
  - サーバー負荷ゼロ、マイグレーション不要、即座に反映
  - 将来的に通知プリファレンスなどサーバー同期が必要な設定が追加された場合は、その時点でDB化を検討
- **Trade-offs**: デバイス間同期不可、ブラウザデータ消去で設定リセット
- **Follow-up**: 将来の通知設定追加時にDB永続化への移行パスを確認

### Decision: DashboardHeader に DropdownMenu を導入
- **Context**: ユーザーアバター周辺に設定ページへのリンクを追加する方法
- **Alternatives Considered**:
  1. アバターリンクの隣に設定アイコンを追加 -- 最小変更だがUI散乱
  2. DropdownMenu でプロフィール/設定/ログアウトを集約 -- 変更大だがUX向上
- **Selected Approach**: DropdownMenu の導入
- **Rationale**:
  - ユーザーアバタークリック時にプロフィール・設定・ログアウトを集約できる
  - `LogoutButton` も DropdownMenu 内に統合でき、ヘッダーがクリーンになる
  - `DropdownMenu` コンポーネントは既に `components/ui/` に存在
  - 他の Web アプリケーションでの一般的なパターン
- **Trade-offs**: DashboardHeader の変更範囲が大きくなる。テスト・ストーリーの更新が必要
- **Follow-up**: DashboardHeader テストの更新

### Decision: カレンダーデフォルトビューの注入方式
- **Context**: ユーザー設定のデフォルトビューをカレンダー初期表示に反映する方法
- **Alternatives Considered**:
  1. `useCalendarUrlSync` のフォールバック値を引数で注入可能にする
  2. `CalendarContainer` で localStorage から読み取り、URL に未指定時にのみ適用する
- **Selected Approach**: `useCalendarUrlSync` にオプション引数 `defaultViewMode` を追加
- **Rationale**:
  - URL パラメータが存在する場合はそちらを優先（ディープリンク対応）
  - URL パラメータが未指定の場合のみユーザー設定値を使用
  - フック内で完結するため、呼び出し元の変更が最小限
- **Trade-offs**: `useCalendarUrlSync` の API 変更。ただし後方互換性あり（オプション引数）
- **Follow-up**: 既存テストの更新

## Risks & Mitigations
- **ハイドレーションミスマッチ**: テーマ設定UIはクライアント専用。`useEffect` で mounted 状態を管理し、SSR時はフォールバックUIを表示する。既存の `ThemeSwitcher` パターンを踏襲
- **localStorage 非対応環境**: `useLocalStorage` フックが catch ブロックでローカル state のみ更新するフォールバックを既に持っている
- **DashboardHeader 変更の影響**: 既存テスト・ストーリーの更新が必要。変更前後でスナップショットを比較する

## References
- [next-themes GitHub](https://github.com/pacocoursey/next-themes) -- テーマ管理ライブラリの仕様確認
- [Supabase User Management Docs](https://supabase.com/docs/guides/auth/managing-user-data) -- user_metadata vs カスタムテーブルの比較
- [Supabase Discussion #6363](https://github.com/orgs/supabase/discussions/6363) -- ユーザーメタデータの追加方法
