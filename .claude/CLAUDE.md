# Ultracite Code Standards

このプロジェクトは **Ultracite** (Biomeベースのゼロコンフィグプリセット) でコード品質を自動管理している。

```bash
npx ultracite check   # lint + format チェック
npx ultracite fix     # 自動修正（コミット前に実行）
```

大半のスタイル・リントルールはBiomeが自動検出・修正する。以下はBiomeでは検出できず、手動で注意すべき規約のみ。

## プロジェクト固有のコード規約

- `unknown` を `any` より優先（型が不明な場合）
- `for...of` を `.forEach()` やインデックスループより優先
- `const` デフォルト、`let` は再代入時のみ、`var` 禁止
- マジックナンバーを名前付き定数に抽出
- `async/await` をPromiseチェーンより優先
- コンポーネント内でコンポーネントを定義しない
- ネストした三項演算子を避け、早期returnでネストを浅くする
- バレルファイル（re-export用index.ts）を作成しない
- Next.js `<Image>` コンポーネントを `<img>` の代わりに使用
- React 19: `React.forwardRef` 不要、ref を直接propとして使用
