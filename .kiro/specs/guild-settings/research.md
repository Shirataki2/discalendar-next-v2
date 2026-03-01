# Research & Design Decisions

## Summary
- **Feature**: `guild-settings`
- **Discovery Scope**: Extension（既存ダッシュボードシステムへの新規ページ追加）
- **Key Findings**:
  - 新規ライブラリ不要。既存の shadcn/ui、Server Actions、GuildSettingsPanel を完全に流用可能
  - `/dashboard` 配下の新規ルートは Middleware で自動的に保護される（isPublicRoute 変更不要）
  - `GuildSettingsDialog` → ページ遷移への導線変更は `CalendarToolbar.onSettingsClick` の差し替えのみ

## Research Log

### 既存ルーティングパターンの分析
- **Context**: 新規ルート `/dashboard/guilds/[guildId]/settings` の追加方法
- **Findings**:
  - `app/dashboard/page.tsx` は `export const dynamic = "force-dynamic"` でSSR強制
  - Server Component で `createClient()` → `auth.getUser()` → データフェッチの一貫パターン
  - `lib/supabase/proxy.ts` の `isPublicRoute` は `/dashboard` 配下を自動で保護するため変更不要
- **Implications**: 同一パターンで新規ページを追加可能。`DashboardHeader` も共有可能

### 権限チェックのサーバーサイド実装
- **Context**: 設定ページのアクセス制御方法
- **Findings**:
  - `resolveServerAuth(guildId)` が既存の認証 + 権限取得パターン（キャッシュ → Discord API フォールバック）
  - `canManageGuild(permissions)` で管理権限判定（administrator / manageGuild / manageMessages / manageRoles）
  - Server Component レベルで redirect 可能（`next/navigation` の `redirect()`）
- **Implications**: ページの Server Component でギルド存在確認 + 権限チェック → redirect で十分

### CalendarToolbar の歯車ボタン統合
- **Context**: ダイアログからページ遷移への変更方法
- **Findings**:
  - `CalendarToolbar` は `onSettingsClick?: () => void` コールバックを受け取り、undefined なら歯車ボタン非表示
  - `DashboardWithCalendar` で `handleSettingsClick` を定義（canManageGuild 条件付き）
  - 変更箇所: `openSettingsDialog()` → `router.push()` に差し替え
  - `GuildSettingsDialog` のレンダリングと `isSettingsDialogOpen` 状態を削除
- **Implications**: `DashboardWithCalendar` のみ修正。CalendarToolbar 自体の変更不要

### GuildSettingsPanel の流用可能性
- **Context**: 既存の設定トグルコンポーネントの再利用
- **Findings**:
  - `hideTitle?: boolean` prop で Dialog 内使用時のタイトル非表示に対応済み
  - ページ内では `hideTitle` を渡さず、タイトル・ボーダー付きで表示可能
  - 楽観的更新 + rollback パターンが実装済み
  - `onRestrictedChange` コールバックで親への通知が可能
- **Implications**: そのまま設定ページの「権限設定」セクションに配置可能

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| 専用ページ（Server Component + Client Component） | App Router でフルページ新設 | 拡張性高、セクション追加容易 | ページ遷移が発生する | 採用。将来の通知チャンネル設定等のセクション追加が容易 |
| 既存ダイアログの拡大 | Dialog 内にタブやセクションを追加 | 遷移なし | ダイアログのサイズ制約、モバイル UX 悪化 | 却下。複数セクション管理に不向き |

## Design Decisions

### Decision: ページ構成パターン
- **Context**: 新しい設定ページをどのような Server/Client Component 分割にするか
- **Alternatives Considered**:
  1. 全体を Server Component にし、フォームのみ Client Component — シンプル
  2. ページ全体を Client Component にし、useEffect でデータ取得 — 既存パターンと乖離
- **Selected Approach**: Option 1 — Server Component でデータフェッチ + 権限ガード、Client Component で設定フォーム
- **Rationale**: `app/dashboard/page.tsx` と同一パターン。SSR の恩恵（初期表示速度、SEO不要だがセキュリティ面）
- **Trade-offs**: ページ遷移時に SSR のレイテンシが発生するが、設定ページの利用頻度を考えると許容範囲

### Decision: CalendarToolbar の導線変更方式
- **Context**: 歯車アイコンのクリック時の動作をダイアログからページ遷移に変更
- **Alternatives Considered**:
  1. `router.push()` でクライアントサイドナビゲーション
  2. `<Link>` コンポーネントに変更
- **Selected Approach**: Option 1 — `router.push()` でプログラマティックに遷移
- **Rationale**: `CalendarToolbar` の既存 `onSettingsClick` コールバックインターフェースを変更せずに済む。`DashboardWithCalendar` 内のハンドラのみ修正
- **Trade-offs**: プリフェッチの恩恵を受けられないが、設定ページへの遷移は低頻度操作

### Decision: GuildSettingsDialog の削除
- **Context**: ダイアログから専用ページへ移行後、GuildSettingsDialog を残すか削除するか
- **Selected Approach**: 削除する
- **Rationale**: 使用箇所がなくなるため dead code になる。GuildSettingsPanel は残して再利用
- **Follow-up**: Storybook ストーリーも削除対象

## Risks & Mitigations
- **ギルド情報取得のパフォーマンス**: fetchGuilds は全ギルドを取得 → 対象ギルドだけ使用。ただしキャッシュ（5分 TTL）があるため問題なし
- **戻る導線のUX**: 設定変更後にダッシュボードに戻る操作が煩雑 → 「カレンダーに戻る」リンクを目立つ位置に配置
- **既存テストへの影響**: GuildSettingsDialog 関連のテスト・Storybook を削除する必要あり

## References
- [Next.js App Router Dynamic Routes](https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes) — `[guildId]` パラメータの取得方法
- [shadcn/ui Card](https://ui.shadcn.com/docs/components/card) — セクション区切りの UI パターン
