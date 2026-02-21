# Type Safety Review Checklist

Discalendar プロジェクトの型安全性規約に基づくレビューチェックリスト。

## any 禁止

- [ ] `any` 型を使用していない（`unknown` を使うこと）
- [ ] 型アサーション `as any` を使用していない
- [ ] `@ts-ignore` / `@ts-expect-error` を不必要に使用していない
- [ ] 関数の引数・戻り値に明示的な型定義がある

## Result 型パターン

サービス層では例外を throw せず、判別共用体で成功/失敗を返す:

```typescript
// 正しいパターン
type Result<T> = { success: true; data: T } | { success: false; error: E }

// 避けるべきパターン
throw new Error("...")
```

- [ ] サービス関数が Result型を返している
- [ ] エラー処理が `if (!result.success)` パターンで行われている
- [ ] Server Actions が Result型を返している（例外throwではない）
- [ ] エラーオブジェクトに `code` と `message` が含まれている

## snake_case / camelCase 変換

- [ ] DB行（Supabaseから取得）は `snake_case`（`guild_id`, `avatar_url`, `start_at`）
- [ ] ドメインオブジェクト（アプリ内）は `camelCase`（`guildId`, `avatarUrl`, `startAt`）
- [ ] 明示的なコンバータ関数（例: `toCalendarEvent()`, `toCalendarEvents()`）で変換している
- [ ] DB型とドメイン型が別々に定義されている（例: `EventRecord` vs `CalendarEvent`）

## エラー分類

- [ ] Supabaseエラーは `classifySupabaseError()` で適切なエラーコードに変換している
- [ ] ネットワーク/Abort例外は `classifyException()` で分類している
- [ ] エラーメッセージはユーザーフレンドリー（`getCalendarErrorMessage()`）

## Props 型定義

- [ ] コンポーネントの Props は `interface` で定義されている
- [ ] オプショナルなpropsには `?` を使用している
- [ ] コールバックpropsの型が正確（`(value: string) => void` など）
- [ ] children の型は `React.ReactNode` を使用

## 定数とマジックナンバー

- [ ] マジックナンバーは名前付き定数に抽出している
- [ ] 文字列リテラルの繰り返し使用を避け、定数化している
- [ ] エラーコードは `as const` で定義された配列から型を生成している

## AbortSignal サポート

- [ ] ネットワーク呼び出しを行うサービスは `AbortSignal` パラメータをサポートしている
- [ ] Supabaseクエリに `.abortSignal(signal)` を設定している
- [ ] UIからのリクエストキャンセルが適切に処理されている

## TypeScript Strict Mode

- [ ] `strictNullChecks` に準拠している（null/undefinedの適切なチェック）
- [ ] オプショナルチェーン（`?.`）とNullish coalescing（`??`）を適切に使用している
- [ ] 型ガードで安全に型を絞り込んでいる
