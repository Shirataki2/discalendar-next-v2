# Research & Design Decisions

## Summary
- **Feature**: `ics-feed-export`
- **Discovery Scope**: New Feature（Edge Functions初導入 + ICSフォーマット生成）
- **Key Findings**:
  - Supabase Edge FunctionsはDeno 2ランタイムで動作し、`supabase/functions/` にディレクトリを作成する。`--no-verify-jwt` フラグでJWT検証を無効化可能（公開エンドポイント用）
  - 既存のanon RLSポリシー（`anon_can_read_public_events` 等）が公開カレンダーのデータアクセスを既にカバーしている。Edge Functionからanon keyでアクセスすれば、公開ギルドのイベントはRLSが自動的にフィルタする
  - RFC 5545のICS手動生成は十分にシンプル。`event_series.rrule` はRFC 5545準拠で保存済みなので、そのまま出力可能。外部ライブラリは不要

## Research Log

### Supabase Edge Functions アーキテクチャ
- **Context**: ICSフィードエンドポイントの実装基盤としてEdge Functionsを調査
- **Sources Consulted**: [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions), [Quickstart](https://supabase.com/docs/guides/functions/quickstart)
- **Findings**:
  - `Deno.serve()` APIでHTTPリクエストを処理
  - `supabase/functions/<function-name>/index.ts` にエントリーポイント
  - 環境変数 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` が自動注入
  - `--no-verify-jwt` でデプロイするとJWT検証なしでアクセス可能
  - ローカル開発: `supabase functions serve` でホットリロード対応
  - デプロイ: `supabase functions deploy <name> --no-verify-jwt`
  - 共有コードは `supabase/functions/_shared/` に配置
- **Implications**: JWT検証を無効化し、独自のトークン認証をアプリケーション層で実装する。公開ギルドはトークン不要、非公開ギルドはクエリパラメータのトークンで認証

### RFC 5545 ICSフォーマット生成
- **Context**: ICS出力のフォーマット仕様を調査
- **Sources Consulted**: [RFC 5545](https://www.rfc-editor.org/rfc/rfc5545), [iCalendar.org](https://icalendar.org/RFC-Specifications/iCalendar-RFC-5545/)
- **Findings**:
  - VCALENDAR必須: `VERSION:2.0`, `PRODID`
  - VEVENT必須: `UID`, `DTSTART`, `DTSTAMP`
  - 終日イベント: `DTSTART;VALUE=DATE:20260101` 形式
  - タイムゾーン付き: `DTSTART;TZID=Asia/Tokyo:20260101T090000` またはUTC `DTSTART:20260101T000000Z`
  - RRULE: VEVENTプロパティとして記述（`RRULE:FREQ=WEEKLY;BYDAY=MO`）
  - EXDATE: `EXDATE:20260115T000000Z,20260122T000000Z` 形式
  - RECURRENCE-ID: 例外オカレンスのVEVENTで元の日時を指定
  - テキストエスカープ: カンマ・セミコロンはバックスラッシュ、改行は `\n`
  - 行折り返し: 75オクテット超はCRLF+空白で継続
  - UID形式: 一意であれば自由（`{uuid}@discalendar.app` を採用）
- **Implications**: `event_series.rrule` はRFC 5545準拠で保存されているため、そのまま `RRULE:` プロパティとして出力可能。外部ライブラリなしで手動生成が実用的

### 既存RLSポリシーとデータアクセスパターン
- **Context**: Edge FunctionからのDBアクセス方式を調査
- **Sources Consulted**: プロジェクト内マイグレーション（`20260320025439`, `20260321113429`）
- **Findings**:
  - `guilds.is_public` / `guilds.public_slug` で公開/非公開を管理
  - anon RLSポリシーが公開ギルドのevents/event_seriesへの読み取りを許可
  - anon向けカラム制限: `channel_id`, `channel_name`, `notifications` は除外済み
  - 非公開ギルドへのanonアクセスはRLSで自動ブロック
- **Implications**:
  - 公開ギルド: anon keyでSupabaseクライアントを作成すれば、RLSが自動でフィルタ
  - 非公開ギルド: service role keyでRLSをバイパスし、トークン検証はアプリ層で実装

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Service Role + アプリ層認証 | service role keyで全データアクセス、トークン検証はEdge Function内 | 公開/非公開の両方を統一的に処理可能 | RLSバイパスのため、カラムフィルタを手動で行う必要 | 非公開ギルドのアクセスに必要 |
| Anon Key + 公開のみ | anon keyで公開ギルドのみアクセス | RLSが自動でセキュリティ担保 | 非公開ギルドのICSフィード不可 | 公開専用なら最もシンプル |
| Dual Client | 公開ギルドはanon、非公開はservice role | 各ケースで最適なアクセス | 2つのクライアント管理の複雑さ | 過剰な設計 |

**選択**: Service Role + アプリ層認証。理由: 非公開ギルドのサポートが要件であり、統一的なデータアクセスが保守性に優れる。内部カラム（channel_id等）の除外はSQLのSELECT句で制御

## Design Decisions

### Decision: ICS手動生成 vs ライブラリ使用
- **Context**: ICSフォーマットの生成方法の選択
- **Alternatives Considered**:
  1. ical-generator (npm) — Deno互換性が不確実、ESM.shからのインポートが必要
  2. 手動生成 — テンプレートリテラルでICSテキストを構築
- **Selected Approach**: 手動生成
- **Rationale**: ICS出力はVCALENDAR/VEVENTの単純なテキスト構造であり、必要なプロパティは限定的。外部依存を増やすよりも、テスト可能な純粋関数として実装する方が保守性が高い
- **Trade-offs**: 行折り返し・エスカープ処理の自前実装が必要だが、コード量は少ない
- **Follow-up**: RFC 5545準拠のユニットテストで正確性を検証

### Decision: Edge Function JWT検証の無効化
- **Context**: ICSフィードはカレンダーアプリからの非認証リクエストを受け付ける必要がある
- **Alternatives Considered**:
  1. JWT検証有効 — カレンダーアプリがSupabase JWTを送信できない
  2. JWT検証無効 + 独自トークン認証 — クエリパラメータのトークンで認証
- **Selected Approach**: JWT検証無効 + 独自トークン認証
- **Rationale**: Google Calendar等の外部アプリはSupabase JWTを持たない。`--no-verify-jwt` でデプロイし、非公開ギルドはカスタムトークンで認証する
- **Trade-offs**: Edge Function自体は無認証でアクセス可能になるため、トークン検証ロジックの確実な実装が必要

### Decision: アクセストークン格納方式
- **Context**: ICSフィード用アクセストークンの保存先
- **Alternatives Considered**:
  1. 新テーブル `ics_feed_tokens` — 専用テーブルでトークン管理
  2. `guilds` テーブルに `ics_token` カラム追加 — 既存テーブル拡張
- **Selected Approach**: 新テーブル `ics_feed_tokens`
- **Rationale**: トークンの無効化（revoke）とトークン履歴の管理が必要。`revoked_at` カラムで旧トークンを無効化しつつ、新トークンを発行できる。guildsテーブルの責務を拡大しない
- **Trade-offs**: JOINが必要になるが、トークン検証は低頻度かつインデックスで高速化可能

## Risks & Mitigations
- **大量イベントのパフォーマンス** — Cache-Controlヘッダーで外部カレンダーアプリのポーリング頻度を制御（例: max-age=3600）。将来的にEdge Functionレベルのキャッシュも検討
- **RFC 5545準拠の不完全性** — 主要カレンダーアプリ（Google, Apple, Outlook）での実際のインポートテストで検証
- **トークン漏洩** — トークンURLが共有されるリスクに対し、トークン再生成（revoke + 新規発行）機能をUIで提供

## References
- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions) — Edge Function作成・デプロイの公式ガイド
- [RFC 5545](https://www.rfc-editor.org/rfc/rfc5545) — iCalendar仕様の完全なリファレンス
- [iCalendar.org RRULE](https://icalendar.org/iCalendar-RFC-5545/3-8-5-3-recurrence-rule.html) — RRULEプロパティの詳細仕様
- [iCalendar.org RECURRENCE-ID](https://icalendar.org/iCalendar-RFC-5545/3-8-4-4-recurrence-id.html) — 例外オカレンスの識別方法
