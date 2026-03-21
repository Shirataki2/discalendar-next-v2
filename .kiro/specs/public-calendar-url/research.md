# Research & Design Decisions

## Summary
- **Feature**: `public-calendar-url`
- **Discovery Scope**: Extension（既存カレンダーシステムへの公開URL機能追加）
- **Key Findings**:
  - Middleware の `isPublicRoute` に `/cal` パスを追加するだけで認証バイパスが実現可能
  - Supabase の `anon` ロールに対する SELECT RLS ポリシー追加で匿名読み取りが実現可能
  - Next.js App Router の `generateMetadata` で動的 OGP 生成がサーバーサイドで完結する

## Research Log

### Middleware 認証バイパスの実装方式
- **Context**: 公開カレンダーページは認証不要で閲覧可能にする必要がある
- **Sources Consulted**: `lib/supabase/proxy.ts`、`proxy.ts`（ミドルウェア設定）
- **Findings**:
  - 現在の `isPublicRoute` 判定は `pathname` ベースのプレフィックスマッチ
  - `/`, `/auth/*`, `/login`, `/test/*`, `/terms`, `/privacy`, `/docs/*` が公開ルート
  - `pathname.startsWith("/cal")` を追加するだけで認証バイパスが実現する
  - ミドルウェアの `matcher` パターンは全パスを対象としているため変更不要
- **Implications**: 最小限の変更で公開ルートを追加可能。既存の認証フローに影響なし

### Supabase RLS による匿名読み取りアクセス
- **Context**: 非ログインユーザーが公開ギルドのイベントデータを読み取る必要がある
- **Sources Consulted**: Supabase RLS ドキュメント、既存マイグレーション（guilds/events テーブル）
- **Findings**:
  - 現在の SELECT ポリシーは `TO authenticated` で認証済みユーザーのみ許可
  - `anon` ロール向けに条件付き SELECT ポリシーを追加する必要がある
  - guilds テーブル: `is_public = true` のレコードのみ `anon` で読み取り可
  - events テーブル: `guild_id` が公開ギルドに属するレコードのみ `anon` で読み取り可
  - event_series テーブル: events と同様のポリシーが必要
  - `anon` ロール向けポリシーは既存の `authenticated` ポリシーと共存する
  - サブクエリ `guild_id IN (SELECT guild_id FROM guilds WHERE is_public = true AND deleted_at IS NULL)` でフィルタ
- **Implications**: 既存の認証済みユーザー向けポリシーに影響なし。匿名ユーザーは公開ギルドのデータのみ閲覧可能

### 公開スラッグの生成戦略
- **Context**: ギルド単位でユニークな公開URLスラッグを生成する必要がある
- **Sources Consulted**: 既存コードベースの ID 生成パターン、PostgreSQL crypto 拡張
- **Findings**:
  - プロジェクトに nanoid は未導入。Node.js 組み込みの `crypto.randomUUID()` は既に使用されている
  - UUID v4 は URL に長すぎる（36文字）。スラッグは短く可読性が高い方が望ましい
  - PostgreSQL の `gen_random_uuid()` は既に events テーブルで使用されている
  - SQL レベルで `encode(gen_random_bytes(8), 'hex')` を使用すると16文字のランダム16進スラッグを生成可能
  - 代替案: `substr(md5(random()::text), 1, 12)` で12文字のスラッグ
  - Server Action から `crypto.randomUUID().replace(/-/g, '').slice(0, 12)` で Node.js 側生成も可能
- **Implications**: 外部依存追加不要。Node.js の `crypto.randomUUID()` ベースでスラッグ生成し、DB のユニーク制約で衝突を防止する

### Next.js App Router における動的 OGP 生成
- **Context**: 公開カレンダーページで動的な OGP メタタグを生成する必要がある
- **Sources Consulted**: Next.js 公式ドキュメント、既存 `app/docs/[slug]/page.tsx` の実装パターン
- **Findings**:
  - プロジェクト内で `generateMetadata` は `app/docs/[slug]/page.tsx` で既に使用されている
  - `generateMetadata` は Server Component でのみ使用可能で、動的パラメータからメタデータを生成する
  - `params` は `Promise<{ slug: string }>` として受け取る（Next.js 15+ の非同期 params パターン）
  - `metadata.openGraph` オブジェクトに `title`, `description`, `url`, `type`, `images` を設定
  - `metadata.twitter` に `card`, `title`, `description` を設定
  - OGP 画像は初期リリースではデフォルトのブランド画像を使用し、将来的に動的生成を検討
- **Implications**: 既存パターンに完全準拠。`app/cal/[slug]/page.tsx` に `generateMetadata` を配置するだけで OGP 対応が完了する

### 既存カレンダーコンポーネントの再利用性
- **Context**: 公開カレンダーページで既存のカレンダー表示コンポーネントを再利用できるか
- **Sources Consulted**: `components/calendar/calendar-container.tsx`, `components/calendar/calendar-grid.tsx`
- **Findings**:
  - `CalendarContainer` は認証状態（Supabase クライアントサイドセッション）に依存している
  - `CalendarGrid` は純粋な表示コンポーネントとして利用可能（`events`, `viewMode`, `selectedDate` を受け取る）
  - `CalendarToolbar` はナビゲーション機能を提供するが、追加ボタンや設定ボタンは非表示にする必要がある
  - 公開ページ専用の軽量コンテナ（`PublicCalendarContainer`）を作成し、`CalendarGrid` を再利用する
  - イベント取得はサーバーサイドで行い、クライアントにはデータを props で渡す方式が最適
  - ただし、月ナビゲーション（前月・次月）のインタラクションが必要なため、クライアントサイドでの再フェッチも必要
- **Implications**: `CalendarGrid` と `CalendarToolbar` は再利用可能。公開ページ専用のコンテナコンポーネントを新規作成し、編集系 UI を排除する

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Server Component + Client Hydration | SSR でイベントデータ取得、Client Component でナビゲーション | OGP 対応が自然、初期表示高速 | ナビゲーション時のクライアント側データ取得が必要 | 採用 |
| 完全 Server Component | 全操作をサーバーサイドで処理 | シンプル、クライアント JS 最小化 | カレンダーナビゲーションのインタラクティブ性が低下 | 不採用: UX 低下 |
| API Route + SPA | `/api/public/events` を設け、SPA で表示 | クライアントサイド完結 | OGP 対応が困難、SEO 不利 | 不採用: OGP 要件に不適合 |

## Design Decisions

### Decision: 公開ルートのパスプレフィックス
- **Context**: 公開カレンダーの URL 形式を決定する必要がある
- **Alternatives Considered**:
  1. `/public/cal/[slug]` -- 明確だが冗長
  2. `/cal/[slug]` -- 短く直感的
  3. `/c/[slug]` -- 最短だが不明瞭
- **Selected Approach**: `/cal/[slug]`
- **Rationale**: 短く可読性が高い。requirements.md の技術メモで `/cal/*` が言及されている。ミドルウェアの `isPublicRoute` に `/cal` を追加するだけで対応可能
- **Trade-offs**: `/public` プレフィックスの方が意図が明確だが、URL の短さとユーザビリティを優先
- **Follow-up**: ミドルウェアテストに `/cal/*` パスの検証を追加する

### Decision: スラッグ生成方式
- **Context**: ギルドごとにユニークな公開 URL スラッグを生成する方式を決定する
- **Alternatives Considered**:
  1. nanoid による短い ID 生成（外部依存追加が必要）
  2. PostgreSQL `gen_random_bytes` による DB レベル生成
  3. Node.js `crypto.randomUUID()` ベースのトリミング
- **Selected Approach**: Node.js `crypto.randomUUID()` から UUID を生成し、ハイフンを除去して先頭12文字を使用（例: `a1b2c3d4e5f6`）
- **Rationale**: 外部依存不要。既存コードベースで `crypto.randomUUID()` は既に使用されている。12文字の hex で十分なエントロピー（16^12 = 約 2.8 x 10^14 通り）。DB の UNIQUE 制約で衝突を検出し、再試行で対処する
- **Trade-offs**: nanoid の方がカスタムアルファベットで URL フレンドリーだが、依存追加の対価に見合わない
- **Follow-up**: DB ユニーク制約違反時のリトライロジックを実装する

### Decision: 匿名データ取得の実装方式
- **Context**: 非ログインユーザーが公開ギルドのイベントデータを取得する方法を決定する
- **Alternatives Considered**:
  1. Supabase `anon` キーでクライアントサイドから直接取得
  2. サーバーサイドで Supabase `service_role` キーを使用して取得
  3. Supabase `anon` キーでサーバーサイドから取得 + RLS ポリシーで制御
- **Selected Approach**: サーバーサイドで Supabase クライアント（anon キー）を使用し、RLS ポリシーで公開ギルドのデータのみ返却する
- **Rationale**: 既存の `createClient()` パターンを踏襲。RLS でセキュリティをデータベースレベルで強制。service_role キーは不要で、最小権限の原則に準拠
- **Trade-offs**: RLS ポリシーの追加が必要だが、セキュリティが DB レベルで保証される
- **Follow-up**: RLS ポリシーのテストマイグレーションを作成する

### Decision: guilds テーブルへのカラム追加方式
- **Context**: 公開設定を guilds テーブルに直接追加するか、別テーブル（guild_config）に追加するか
- **Alternatives Considered**:
  1. guilds テーブルに `public_slug`, `is_public` カラムを追加
  2. guild_config テーブルに `public_slug`, `is_public` カラムを追加
- **Selected Approach**: guilds テーブルに `public_slug` (VARCHAR(16), UNIQUE, NULLABLE) と `is_public` (BOOLEAN, DEFAULT false) を追加する
- **Rationale**: RLS ポリシーの WHERE 句で `guilds.is_public` を直接参照できるため、サブクエリのパフォーマンスが最適。requirements.md の技術メモでも guilds テーブルへの追加が指定されている。`public_slug` は RLS の条件判定には使わず、ルーティング用途のみであるため guilds テーブルに配置するのが自然
- **Trade-offs**: guilds テーブルのスキーマが肥大化するが、リレーション不要でクエリが単純になる
- **Follow-up**: マイグレーションで既存データのデフォルト値を設定する

## Risks & Mitigations
- **スラッグ衝突リスク** -- DB UNIQUE 制約 + リトライロジックで対処。12文字 hex で実用上衝突確率は無視できるレベル
- **RLS ポリシー漏洩リスク** -- `is_public = true` 条件を全ての anon ポリシーに必須化。テストでポリシーの正確性を検証
- **内部情報漏洩リスク** -- 公開ページからはギルドの `name`, `avatar_url` とイベントの `name`, `description`, `start_at`, `end_at`, `color`, `is_all_day`, `location` のみ返却。メンバーリスト、設定、チャンネル情報は除外する
- **パフォーマンスリスク（公開ページへの大量アクセス）** -- 初期リリースでは Next.js の標準キャッシュに依存。将来的に必要に応じて ISR（Incremental Static Regeneration）を検討

## References
- [Next.js Metadata and OG Images](https://nextjs.org/docs/app/getting-started/metadata-and-og-images) -- generateMetadata の公式ドキュメント
- [Next.js generateMetadata API Reference](https://nextjs.org/docs/app/api-reference/functions/generate-metadata) -- generateMetadata の API リファレンス
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) -- RLS ポリシーの公式ドキュメント
- [Supabase API Keys](https://supabase.com/docs/guides/api/api-keys) -- anon ロールと service_role の違い
