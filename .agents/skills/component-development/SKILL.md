---
name: component-development
description: Discalendar プロジェクトにおけるコンポーネント開発の統合ワークフロー。新規コンポーネント作成時に、実装・Storybookストーリー・テスト・design.pen デザイン追加をまとめて行う。「コンポーネントを作成」「新しいUIを追加」「〇〇コンポーネントを実装」など、コンポーネント開発全般で使用する。
---

# Component Development Skill

Discalendar プロジェクトでコンポーネントを作成する際の統合ワークフロー。
1つのコンポーネントにつき、以下の4成果物を必ず作成する。

## 成果物チェックリスト

| # | 成果物 | ファイル | 必須 |
|---|--------|----------|------|
| 1 | コンポーネント実装 | `component-name.tsx` | Yes |
| 2 | Storybook ストーリー | `component-name.stories.tsx` | Yes |
| 3 | ユニットテスト | `component-name.test.tsx` | Yes |
| 4 | design.pen デザイン | `design.pen` 内に追加 | Yes |

## ワークフロー

### Step 1: 要件確認

コンポーネントの目的・Props・配置先カテゴリを確認する。

**カテゴリ別配置:**
- `components/ui/` — 汎用UI（shadcn/ui ベース）
- `components/calendar/` — カレンダー関連
- `components/guilds/` — ギルド関連
- `components/auth/` — 認証関連
- `components/` 直下 — ページレベルコンポーネント（Header, Footer 等）

### Step 2: コンポーネント実装

```typescript
// component-name.tsx
"use client"; // インタラクション・hooks使用時のみ

import { useCallback } from "react";
import { cn } from "@/lib/utils";

/** Props型は export type で公開。JSDoc必須 */
export type ComponentNameProps = {
  /** 各propにJSDocコメント */
  label: string;
  onClick?: () => void;
};

/** コンポーネント本体もJSDocで説明 */
export function ComponentName({ label, onClick }: ComponentNameProps) {
  const handleClick = useCallback(() => onClick?.(), [onClick]);
  return (
    <button
      aria-label={label}
      className={cn("...")}
      onClick={handleClick}
      type="button"
    >
      {label}
    </button>
  );
}
```

**実装ルール:**
- `"use client"` はクライアント機能が必要な場合のみ付与
- Props 型は `export type` で公開し、各プロパティにJSDocコメント
- 関数コンポーネントとして named export（default export 不可）
- スタイリングは Tailwind CSS + `cn()` ユーティリティ
- アイコンは `lucide-react` を使用
- 画像は Next.js `<Image>` コンポーネントを使用
- コールバックは `useCallback` でメモ化
- セマンティック HTML 要素を使用（`<button>`, `<nav>`, `<section>` 等）
- アクセシビリティ: `aria-label`, `aria-pressed`, `role` 等を適切に設定
- キーボード操作対応: `tabIndex`, Enter/Space キーハンドリング

### Step 3: Storybook ストーリー作成

```typescript
// component-name.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { ComponentName } from "./component-name";

const meta = {
  title: "Category/ComponentName",  // カテゴリ/コンポーネント名
  component: ComponentName,
  tags: ["autodocs"],               // 必須
  parameters: {
    layout: "centered",             // or "padded", "fullscreen"
  },
} satisfies Meta<typeof ComponentName>;

export default meta;
type Story = StoryObj<typeof meta>;

/** デフォルト状態 */
export const Default: Story = {
  args: { label: "ラベル" },
};

/** 各バリアント・状態をストーリーとして定義 */
export const Active: Story = {
  args: { label: "アクティブ", isActive: true },
};
```

**Storybook ルール:**
- CSF3 形式で記述
- `tags: ["autodocs"]` 必須
- `satisfies Meta<typeof Component>` で型安全に
- title 命名: `"UI/Button"`, `"Calendar/EventBlock"`, `"Components/Guilds/GuildCard"` 等
- コンポーネントと同じディレクトリに Co-located 配置
- 主要バリアント（Default, Active, Disabled, Error 等）を網羅
- モックデータは型に忠実に定義
- 複数コンポーネントの組み合わせ表示は `render` 関数を使用

### Step 4: ユニットテスト作成

```typescript
// component-name.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ComponentName } from "./component-name";

describe("ComponentName", () => {
  it("正しくレンダリングされること", () => {
    render(<ComponentName label="テスト" />);
    expect(screen.getByText("テスト")).toBeInTheDocument();
  });

  it("クリックでコールバックが呼ばれること", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<ComponentName label="テスト" onClick={onClick} />);
    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("ARIA属性が正しく設定されること", () => {
    render(<ComponentName label="テスト" />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-label", "テスト");
  });
});
```

**テストルール:**
- Vitest + @testing-library/react + @testing-library/user-event
- テストファイルはコンポーネントと同じディレクトリに Co-located 配置
- `vi.fn()` でモック関数、`vi.mock()` でモジュールモック
- `userEvent.setup()` でユーザー操作をシミュレート
- テスト対象カテゴリ:
  - **レンダリング**: Props に応じた正しい表示
  - **インタラクション**: クリック、キーボード操作、フォーム入力
  - **アクセシビリティ**: ARIA 属性、role、セマンティクス
  - **条件分岐**: 各状態（選択/非選択、エラー/正常、ローディング等）
  - **エッジケース**: 空データ、長文テキスト、null/undefined
- テスト記述言語: 日本語（it 文のテスト名）

### Step 5: design.pen デザイン追加

コンポーネント作成後、`design.pen` にデザインを追加する。

**ワークフロー:**
1. `get_editor_state` で現在の .pen ファイルを確認
2. `get_variables` で利用可能なデザイントークンを確認
3. `batch_get` で既存コンポーネントの構造を確認（参考として）
4. 適切なコンポーネントフレームを特定（`6zgKF`: Calendar, `XhfUi`: Guild, `jnh2O`: Auth, `EmWTa`: Landing Page）
5. `snapshot_layout` で配置可能な位置を確認
6. `batch_design` でデザインを追加:
   - セクションフレーム内にラベル・説明テキスト・コンポーネントプレビューを配置
   - デザインシステム変数（`$--foreground`, `$--background` 等）を使用
   - コンポーネントの主要バリアントを並べて表示
7. `get_screenshot` で仕上がりを視覚確認

**design.pen 配置構造:**
```
既存カテゴリフレーム
└── ComponentName Section (cornerRadius: 8, fill: $--card, stroke: $--border)
    ├── ラベルテキスト (fontSize: 20, fontWeight: 600)
    ├── 説明テキスト (fontSize: 14, fill: $--muted-foreground)
    └── コンポーネントプレビュー (各バリアントを横並び/縦並び)
```

**デザインルール:**
- テキストには必ず `fill` プロパティを設定（未設定だと不可視）
- フォント: Inter ファミリーを使用
- flexbox レイアウト優先（`layout: "vertical"` / `"horizontal"`）
- サイズは `fill_container` / `fit_content` を活用
- 再利用可能な既存コンポーネント（Button, Card, Avatar 等）は `ref` で参照
- ページフレームに統合する場合は対応するページフレーム（`Jiq1Y`: Landing, `Zc7nh`: Login, `5mYGv`: Dashboard）も更新

## コード品質チェック

全成果物作成後に確認する事項:
- `npx ultracite check` でフォーマット・lint エラーがないこと
- `npx vitest run <テストファイル>` でテストが通ること
- ReadLints ツールで編集ファイルの型エラーがないこと

## 参考: 既存コンポーネント一覧

| カテゴリ | コンポーネント | ファイル |
|----------|---------------|----------|
| UI | Button, Card, Dialog, Input, Label, Select, Badge, Checkbox, Popover | `components/ui/*.tsx` |
| Calendar | CalendarContainer, CalendarGrid, CalendarToolbar, EventBlock, EventPopover, EventDialog, EventForm, ConfirmDialog | `components/calendar/*.tsx` |
| Guilds | GuildCard, SelectableGuildCard, GuildIconButton, GuildListClient | `components/guilds/*.tsx` |
| Auth | DiscordLoginButton, LogoutButton | `components/auth/*.tsx` |
| Page | Header, Hero, Features, CTA, Footer, MobileNav, ThemeSwitcher | `components/*.tsx` |
