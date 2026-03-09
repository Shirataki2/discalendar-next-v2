# Research & Design Decisions

## Summary
- **Feature**: `bot-recurring-notification`
- **Discovery Scope**: Extension（既存通知システムの拡張）
- **Key Findings**:
  - Web側 `rrule-utils.ts` は純粋関数で `rrule` パッケージのみに依存。共有パッケージ化が容易
  - Bot の `createNotificationEmbed` は `EventRecord` 型を要求。シリーズオカレンスからの変換レイヤーが必要
  - npm workspaces が既に `"packages/*"` で構成済み。新パッケージ追加のインフラは整っている

## Research Log

### rrule パッケージの互換性
- **Context**: Bot に `rrule` を追加する際のバージョン互換性確認
- **Sources Consulted**: ルート `package.json` の依存関係
- **Findings**:
  - ルート: `rrule: ^2.8.1`
  - Bot: `rrule` 未インストール
  - `rrule` は純粋な RRULE パーサー/展開ライブラリ。Node.js ランタイムで問題なく動作
- **Implications**: 共有パッケージが `rrule` を依存に持つか、Bot が直接 `rrule` を追加する

### モジュール解決の制約
- **Context**: Bot の `tsconfig.json` は `module: "Node16"`, `moduleResolution: "Node16"` を使用
- **Sources Consulted**: `packages/bot/tsconfig.json`
- **Findings**:
  - Node16 モジュール解決ではインポートに `.js` 拡張子が必要（既存パターン）
  - npm workspaces 経由のパッケージ参照は `@discalendar/xxx` 形式で可能
  - Bot は既に `@supabase/supabase-js` を使用しており、外部パッケージ参照パターンは確立済み
- **Implications**: 共有パッケージは `@discalendar/rrule-utils` として公開し、`exports` フィールドで ESM エントリポイントを定義する

### 通知 Embed の型制約
- **Context**: `createNotificationEmbed(event: EventRecord, label: string)` がシリーズオカレンスで使えるか
- **Sources Consulted**: `packages/bot/src/utils/embeds.ts`
- **Findings**:
  - `createNotificationEmbed` は `EventRecord` の `name`, `description`, `color`, `is_all_day`, `start_at`, `end_at` を使用
  - シリーズオカレンスは `start_at`/`end_at` を RRULE 展開から計算する必要がある
  - `EventRecord` には `id`, `guild_id`, `notifications`, `created_at`, `updated_at` 等のフィールドもあるが、Embed 生成には不要
- **Implications**: シリーズオカレンスを `EventRecord` 互換の形に変換するか、通知に必要な共通型を新設する。後者は変更範囲が大きいため、前者を採用

### 既存通知フローの分析
- **Context**: `processNotifications` の処理フローと拡張ポイント
- **Sources Consulted**: `packages/bot/src/tasks/notify.ts`
- **Findings**:
  - `processNotifications` は `getFutureEventsForAllGuilds(now)` → `getEventSettingsByGuildIds` → イベントごとに `checkEventNotifications` の流れ
  - `checkEventNotifications` は `EventRecord` の `start_at` と `notifications` から通知判定
  - 1分間ウィンドウ（`diff >= 0 && diff < MS_PER_MINUTE`）で通知タイミングを判定
  - 終日イベントは JST 午前0時基準（`Date.UTC(y, m, d) - JST_OFFSET_MS`）
  - エラーはイベント単位で catch し、他イベントの処理は継続
- **Implications**: シリーズ取得を並列追加し、展開後のオカレンスを同じ `checkEventNotifications` に流せる構造が理想

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| オカレンス→EventRecord変換 | シリーズオカレンスを EventRecord 互換に変換し、既存 checkEventNotifications を再利用 | 変更最小限、既存ロジック再利用 | EventRecord にない情報（duration_minutes）の扱い | 採用 |
| 専用通知パイプライン | シリーズ用の独立した通知処理を新設 | 関心の分離が明確 | コード重複、保守コスト増 | 不採用 |
| 統一 NotificationItem 型 | 単発・シリーズ共通の軽量型を新設 | 型が正確 | 既存コードの変更範囲大 | 将来検討 |

## Design Decisions

### Decision: RRULE共有方式
- **Context**: Web 側 `rrule-utils.ts` を Bot から利用する方法
- **Alternatives Considered**:
  1. `packages/rrule-utils` 共有パッケージ — npm workspace で新パッケージ作成
  2. Bot に直接コピー — 関数をそのまま複製
  3. ルート `lib/` からの相対インポート — ワークスペース境界を越えた直接参照
- **Selected Approach**: Option 1 — `packages/rrule-utils` 共有パッケージ
- **Rationale**: npm workspaces が既に構成済みで追加コスト小。コード重複回避。DIS-90 のスコープと一致
- **Trade-offs**: パッケージ初期セットアップが必要だが、一度作ればWeb・Bot両方から利用可能
- **Follow-up**: `tsconfig.json` と `package.json` の exports 設定を検証

### Decision: オカレンスの通知処理方式
- **Context**: RRULE 展開後のオカレンスをどのように通知フローに統合するか
- **Selected Approach**: オカレンスを `EventRecord` 互換オブジェクトに変換し、既存の `checkEventNotifications` を再利用
- **Rationale**: 変更範囲最小化。通知ロジック（1分ウィンドウ判定、センチネル、終日処理）は単発予定と同一
- **Trade-offs**: `EventRecord` の `id` に合成IDを使用する必要がある（`series:{seriesId}:occ:{occDate}`）。将来的に送信済み管理を導入する際のキー設計に影響

## Risks & Mitigations
- **RRULE展開のパフォーマンス** — 大量のシリーズがある場合に展開コストが増大。7日間ウィンドウで範囲を限定して軽減
- **通知重複** — 単発予定（events テーブル）の中に `series_id` を持つ例外オカレンスがある場合、シリーズ展開と重複する可能性。例外オカレンスは events テーブル側で処理し、シリーズ展開から除外する
- **共有パッケージのビルド依存** — Bot の CI/CD に共有パッケージのビルドステップ追加が必要

## References
- [rrule.js GitHub](https://github.com/jakubroztocil/rrule) — RRULE パーサー/展開ライブラリ
- [npm workspaces docs](https://docs.npmjs.com/cli/v10/using-npm/workspaces) — ワークスペース設定
