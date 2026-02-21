# Security Review Checklist

Discalendar プロジェクトのセキュリティ規約に基づくレビューチェックリスト。

## 認証チェック

- [ ] Server Actions で必ず認証チェック（`supabase.auth.getUser()`）を実行している
- [ ] 認証失敗時に適切な UNAUTHORIZED エラーを返している
- [ ] Cookie-based SSR認証フローを適切に使用している
- [ ] Server Component でデータフェッチ前に認証状態を確認している

## 認可（権限検証）

- [ ] ギルド操作では `resolveServerAuth()` でサーバー側権限解決を行っている
- [ ] 管理操作では `canManageGuild()` で権限検証を行っている
- [ ] **CRITICAL**: クライアントから送信された `permissionsBitfield` を信頼していない（サーバー側で再取得）
- [ ] イベント操作では `checkEventPermission()` で操作権限を検証している
- [ ] 他のユーザーのリソースにアクセスできないことを確認している

## 機密データ漏洩

- [ ] エラーメッセージにDB情報（テーブル名、カラム名、SQLクエリ）が含まれていない
- [ ] エラーメッセージにスタックトレースが含まれていない
- [ ] Supabaseエラーの `details` フィールドがクライアントに直接返されていない
  - `classifySupabaseError()` でユーザーフレンドリーなメッセージに変換すること
- [ ] ログ出力に機密情報（トークン、パスワード、セッション情報）が含まれていない
- [ ] APIレスポンスに不要なフィールド（内部ID、権限ビットフィールド）が含まれていない

## 入力検証

- [ ] Server Action の入力パラメータにバウンダリ検証がある
  - 文字列長の制限（例: タイトル255文字以内）
  - 必須フィールドの存在チェック
  - 日時の論理チェック（開始 < 終了）
- [ ] ユーザー入力を直接SQLクエリやHTML出力に使用していない
- [ ] ファイルアップロードがある場合、ファイルタイプと サイズを検証している

## 環境変数

- [ ] `NEXT_PUBLIC_` プレフィックスは非機密情報のみに使用している
  - `NEXT_PUBLIC_SUPABASE_URL` - OK（公開URL）
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` - OK（公開鍵）
- [ ] サーバーサイドのみの環境変数が `NEXT_PUBLIC_` になっていない
- [ ] APIキーや秘密鍵がクライアントコードに含まれていない
- [ ] `.env` ファイルがgitにコミットされていない

## Sentry 設定

- [ ] `sendDefaultPii: false` が維持されている（個人情報を送信しない）
- [ ] エラー報告にユーザーの機密情報が含まれていない
- [ ] Sentryのスコープにセンシティブなコンテキストが追加されていない

## CSRF / Server Actions

- [ ] Server Actions の組み込みCSRF保護を迂回していない
- [ ] `"use server"` ディレクティブが正しく設定されている
- [ ] Server Actions がGETリクエストから呼び出せない（Next.jsデフォルトで保護）

## その他

- [ ] `dangerouslySetInnerHTML` を使用していない（XSSリスク）
- [ ] 外部URLへのリダイレクトにオープンリダイレクト脆弱性がない
- [ ] Supabase RLS (Row Level Security) ポリシーに依存している箇所で、RLSが有効であることを前提としている
- [ ] `eval()`, `Function()` などの動的コード実行を使用していない
