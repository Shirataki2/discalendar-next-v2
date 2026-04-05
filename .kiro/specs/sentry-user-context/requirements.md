# Requirements Document

## Introduction
認証済みユーザーをSentryに紐づけて、エラー発生時に「誰が影響を受けたか」を特定可能にする。認証後に `Sentry.setUser()` を呼び出しユーザーの識別情報を設定し、ログアウト時に `Sentry.setUser(null)` でクリアする。`sendDefaultPii: false` を維持しつつ、必要最小限の識別情報のみ送信する。

## Requirements

### Requirement 1: 認証時のSentryユーザーコンテキスト設定
**Objective:** 運用者として、Sentryのエラーイシューでどのユーザーが影響を受けたかを特定したい。これにより、障害の影響範囲の把握とユーザーへの個別対応が可能になる。

#### Acceptance Criteria
1. When ユーザーがDiscord OAuthで認証に成功した後にページが表示される, the Sentry Client shall `setUser` にユーザーID を含むコンテキストを設定する
2. When 認証済みユーザーがページをリロードまたは遷移する, the Sentry Client shall 既存のセッション情報からユーザーコンテキストを復元する
3. The Sentry Client shall ユーザーコンテキストにSupabaseのユーザーID（`user.id`）を含める

### Requirement 2: ログアウト時のSentryユーザーコンテキストクリア
**Objective:** 運用者として、ログアウト後のエラーが直前のユーザーに誤って紐づけられないようにしたい。これにより、正確なユーザー影響分析が可能になる。

#### Acceptance Criteria
1. When ユーザーがログアウトする, the Sentry Client shall `setUser(null)` を呼び出してユーザーコンテキストをクリアする
2. When ログアウト後にエラーが発生する, the Sentry Client shall ユーザー情報なしでイベントを送信する

### Requirement 3: プライバシー保護
**Objective:** 開発者として、PIIの送信を最小限に抑え、プライバシーを保護したい。これにより、データ保護方針への準拠を維持できる。

#### Acceptance Criteria
1. The Sentry Client shall `sendDefaultPii: false` の設定を維持する
2. The Sentry Client shall ユーザーコンテキストにSupabaseユーザーIDのみを含め、メールアドレス等の個人情報を送信しない
3. The Sentry Server shall サーバーサイドでも同様にユーザーコンテキストを設定し、`sendDefaultPii: false` を維持する
