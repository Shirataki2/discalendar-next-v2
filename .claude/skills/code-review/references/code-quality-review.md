# Code Quality Review Checklist

Discalendar プロジェクトのコード品質規約に基づくレビューチェックリスト。

## Ultracite / Biome 除外パス

以下のパスはBiome lint除外対象（変更してもlint違反を報告しない）:
- `components/ui/` - shadcn/ui 生成コード
- `lib/` - Supabaseヘルパー等
- `hooks/` - カスタムフック
- `refs/` - 外部由来コード

**ただし**: 除外パス外のコードはBiome規約に準拠すること。

## Storybook 必須

- [ ] 新規コンポーネント作成時に `*.stories.tsx` を同じディレクトリに作成している
- [ ] CSF3 形式で記述している
- [ ] `tags: ["autodocs"]` を設定している
- [ ] 主要なバリアント・状態をストーリーとして定義している（default, loading, error, empty等）

## テスト必須

- [ ] 新規コンポーネントに `*.test.tsx` を作成している（Vitest + Testing Library）
- [ ] テストファイルがコンポーネントと同じディレクトリに配置されている
- [ ] 主要なユーザーインタラクションとエッジケースをカバーしている

## React 19 パターン

- [ ] `React.forwardRef` を使用していない（React 19では不要、ref を直接propとして使用）
- [ ] コンポーネント内でコンポーネントを定義していない（レンダリング毎の再生成を防止）
- [ ] `ref` を直接 props として受け取っている

## 命名規則

- [ ] ファイル名は kebab-case（例: `event-card.tsx`, `guild-list.stories.tsx`）
- [ ] コンポーネント名は PascalCase（例: `EventCard`, `GuildList`）
- [ ] 関数・変数は camelCase
- [ ] 定数は UPPER_SNAKE_CASE（例: `CALENDAR_ERROR_CODES`）

## コードスタイル（Biome非検出項目）

- [ ] `const` をデフォルト使用、`let` は再代入時のみ、`var` は禁止
- [ ] `for...of` を `.forEach()` やインデックスループより優先
- [ ] `async/await` を Promise チェーン（`.then().catch()`）より優先
- [ ] ネストした三項演算子を使用していない
- [ ] 早期 return でネストを浅くしている
- [ ] Next.js `<Image>` コンポーネントを `<img>` の代わりに使用

## インポート

- [ ] `@/` パスエイリアスで絶対参照を使用している
- [ ] バレルファイル（re-export用 `index.ts`）を作成していない
- [ ] 未使用のインポートがない

## その他

- [ ] コンソールログ（`console.log`, `console.warn`）がプロダクションコードに残っていない
  - デバッグ目的のログは削除する
  - 意図的なログには Sentry などを使用
- [ ] TODO/FIXME コメントに Issue 番号や担当者が記載されている
- [ ] 不要なコメントアウトされたコードが残っていない
