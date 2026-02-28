# Research & Design Decisions

## Summary
- **Feature**: `user-profile-page`
- **Discovery Scope**: Extension（既存ダッシュボードへの新規ページ追加）
- **Key Findings**:
  - ユーザーデータはSupabase Auth `user_metadata`から取得。専用の`users`テーブルは不要
  - ギルドデータ取得・表示は`lib/guilds/`に確立されたパターンが存在
  - LogoutButtonコンポーネントは既存で再利用可能

## Research Log

### 既存ユーザーデータ構造
- **Context**: ユーザーページで表示するデータの取得元を確認
- **Sources Consulted**: `app/dashboard/page.tsx` L408-441, Supabase Auth ドキュメント
- **Findings**:
  - `DashboardUser`型（id, email, fullName, avatarUrl）がすでに定義済み
  - `user_metadata.full_name`, `user_metadata.avatar_url` から取得
  - メタデータはDiscord OAuthプロバイダーが自動設定
- **Implications**: 新規型定義不要。既存の`DashboardUser`型を再利用可能

### ギルド取得パターン
- **Context**: 参加ギルド一覧の表示に必要なデータフローを確認
- **Sources Consulted**: `lib/guilds/service.ts`, `lib/guilds/types.ts`, `app/dashboard/page.tsx`
- **Findings**:
  - `getJoinedGuilds(guildIds)` がDB経由でギルドを取得
  - `Guild`型（id, guildId, name, avatarUrl, locale）が定義済み
  - ユーザーページではパーミッション情報は不要（表示のみ）
  - ギルドIDの取得にはDiscord APIへのアクセスが必要（`providerToken`経由）
- **Implications**: ユーザーページでは簡略化した取得ロジックで十分。パーミッション不要のため`Guild`型のみ使用

### ダッシュボードヘッダーの変更箇所
- **Context**: アバタークリックでユーザーページへのナビゲーションを追加する箇所を特定
- **Sources Consulted**: `app/dashboard/page.tsx` L102-131
- **Findings**:
  - アバターは現在`<Image>`コンポーネントで直接レンダリング
  - `Link`コンポーネントでラップすることで`/dashboard/user`へのナビゲーションを実現可能
  - ドロップダウンメニュー追加も検討したが、シンプルなリンクの方がスコープに合致
- **Implications**: `page.tsx`のヘッダー部分を最小限修正でリンク追加

### ルーティング構造
- **Context**: `/dashboard/user`ルートの配置方法を確認
- **Sources Consulted**: `app/dashboard/page.tsx`, `lib/supabase/proxy.ts`（Middleware）
- **Findings**:
  - `app/dashboard/`配下は自動的にMiddlewareのルート保護対象（AC 1.2を自動充足）
  - `app/dashboard/layout.tsx`は存在しないため、ユーザーページは独自にレイアウトを構成
  - Server Componentとして実装し、データフェッチはサーバー側で完結
- **Implications**: `app/dashboard/user/page.tsx`を追加するだけでルート保護が有効

## Design Decisions

### Decision: ページ構成 — Server Component + 既存コンポーネント再利用
- **Context**: ユーザーページの実装アプローチ選定
- **Alternatives Considered**:
  1. 完全新規のClient Component — 独自の状態管理でデータ取得
  2. Server Component + 既存コンポーネント再利用
- **Selected Approach**: Server Componentでデータフェッチし、表示部分はClient Componentで構成
- **Rationale**: ダッシュボードと同じパターンに従い一貫性を維持。LogoutButtonは既存を再利用
- **Trade-offs**: Server Componentでのデータフェッチは初期ロード時のみ。リアルタイム更新なし（現状不要）

### Decision: ヘッダーナビゲーション — Link直接ラップ
- **Context**: ダッシュボードヘッダーからユーザーページへのアクセス方法
- **Alternatives Considered**:
  1. DropdownMenu + メニュー項目（プロフィール、ログアウト等）
  2. アバターをLink直接ラップ
- **Selected Approach**: アバターをNext.js `Link`で`/dashboard/user`にラップ
- **Rationale**: 必須スコープに合致するシンプルな実装。DropdownMenuは将来拡張時に検討
- **Trade-offs**: 将来メニュー項目が増えた場合にDropdownMenuへの移行が必要

## Risks & Mitigations
- ギルド取得にDiscord APIトークンが必要 — Server Componentでセッションから取得するパターンを踏襲
- アバターURLが期限切れの場合 — イニシャルフォールバックで対応（既存パターン）

## References
- Supabase Auth User Metadata: `lib/supabase/server.ts`
- Guild Service: `lib/guilds/service.ts`, `lib/guilds/types.ts`
- LogoutButton: `components/auth/logout-button.tsx`
- Dashboard Header: `app/dashboard/page.tsx` L102-131
