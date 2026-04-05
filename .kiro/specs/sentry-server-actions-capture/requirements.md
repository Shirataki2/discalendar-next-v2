# Requirements Document

## Introduction

Server Actions全体でSentry `captureException` の適用範囲を拡大し、エラーの検知漏れを防ぐ。現在 `captureException` は `app/dashboard/actions.ts` の3箇所のみで使用されており、`app/auth/actions.ts` やサービス層のエラーはSentryに報告されていない。全Server Actionsのエラーハンドリング箇所で `captureException` を追加し、エラーメッセージにコンテキスト情報（操作名、対象リソース等）を含めた構造化エラー報告を実装する。

## Requirements

### Requirement 1: Server Actions エラーキャプチャの網羅

**Objective:** As a 運用担当者, I want 全Server Actionsのエラーが自動的にSentryに報告される, so that エラーの検知漏れを防ぎ本番環境の障害に迅速に対応できる

#### Acceptance Criteria
1. When Server Actionでデータベース操作が失敗した場合, the Sentry SDK shall `captureException` でエラーをキャプチャする
2. When Server Actionで認証操作（signOut等）が失敗した場合, the Sentry SDK shall `captureException` でエラーをキャプチャする
3. When Server ActionでSupabaseエラーが発生した場合, the Sentry SDK shall `classifySupabaseError` による分類結果とともにエラーをキャプチャする
4. The Sentry SDK shall 全Server Actions（`app/dashboard/actions.ts`、`app/auth/actions.ts`）のエラーパスをカバーする

### Requirement 2: エラーコンテキスト情報の付与

**Objective:** As a 運用担当者, I want Sentryに報告されるエラーに操作コンテキストが含まれている, so that エラーの発生箇所と原因を迅速に特定できる

#### Acceptance Criteria
1. When エラーがキャプチャされる場合, the Error オブジェクト shall 操作名（例: `[createEvent]`, `[signOut]`）をメッセージに含める
2. When エラーがキャプチャされる場合, the Error オブジェクト shall 対象リソース情報（エラーメッセージ、エラーコード等）をメッセージに含める
3. The captureException 呼び出し shall 既存の `[操作名] エラー詳細` 形式と一貫したフォーマットを使用する

### Requirement 3: 既存パターンとの一貫性

**Objective:** As a 開発者, I want 新規のcaptureException呼び出しが既存コードと一貫したパターンに従う, so that コードベースの保守性が維持される

#### Acceptance Criteria
1. The captureException 呼び出し shall `new Error("[操作名] エラー詳細: ${error.message}")` 形式でエラーを構成する
2. The エラーハンドリング shall 既存のResult型パターン（`{ success: false; error: E }`）を変更せずにcaptureExceptionを追加する
3. If Server Actionが `console.error` のみでエラーを記録している場合, the Server Action shall `captureException` を追加してSentryにも報告する
