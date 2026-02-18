import type { Meta, StoryObj } from "@storybook/react";

/**
 * StaticPageLayoutUI（Storybook用プレゼンテーショナル版）
 *
 * 実際の StaticPageLayout は async Server Component（Header が Supabase に依存）のため、
 * Storybook では直接使用できない。このコンポーネントは UI の見た目を再現する。
 */
function StaticPageLayoutUI({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Header placeholder */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <a className="font-bold text-xl" href="/">
            Discalendar
          </a>
          <nav className="hidden md:flex md:items-center md:gap-6">
            <span className="font-medium text-sm transition-colors hover:text-primary">
              機能
            </span>
            <span className="font-medium text-sm transition-colors hover:text-primary">
              使い方
            </span>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto max-w-4xl px-4 py-12">{children}</main>

      {/* Footer placeholder */}
      <footer className="border-t bg-muted/30 py-12">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          © 2025 Discalendar. All rights reserved.
        </div>
      </footer>
    </>
  );
}

/**
 * サンプルコンテンツ: 利用規約風のページ
 */
function SampleLegalContent() {
  return (
    <article>
      <h1 className="mb-8 font-bold text-3xl">利用規約</h1>
      <section className="space-y-4">
        <h2 className="font-semibold text-xl">第1条 前提</h2>
        <p className="text-muted-foreground leading-relaxed">
          本利用規約（以下「本規約」）は、Discalendar（以下「本サービス」）の利用条件を定めるものです。
          ユーザーの皆さまには、本規約に従って本サービスをご利用いただきます。
        </p>
      </section>
      <section className="mt-6 space-y-4">
        <h2 className="font-semibold text-xl">第2条 利用資格</h2>
        <p className="text-muted-foreground leading-relaxed">
          本サービスは、Discordアカウントを持つすべてのユーザーが利用できます。
        </p>
      </section>
      <section className="mt-6 space-y-4">
        <h2 className="font-semibold text-xl">第3条 禁止事項</h2>
        <ol className="list-decimal space-y-2 pl-6 text-muted-foreground">
          <li>法令に違反する行為</li>
          <li>他のユーザーに迷惑をかける行為</li>
          <li>サービスの運営を妨害する行為</li>
        </ol>
      </section>
    </article>
  );
}

const meta: Meta<typeof StaticPageLayoutUI> = {
  title: "Layout/StaticPageLayout",
  component: StaticPageLayoutUI,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * デフォルト表示 - 法的ページ風コンテンツ
 */
export const Default: Story = {
  args: {
    children: <SampleLegalContent />,
  },
};

/**
 * モバイルビューポート表示
 */
export const Mobile: Story = {
  args: {
    children: <SampleLegalContent />,
  },
  parameters: {
    viewport: {
      defaultViewport: "mobile",
    },
  },
};

/**
 * タブレットビューポート表示
 */
export const Tablet: Story = {
  args: {
    children: <SampleLegalContent />,
  },
  parameters: {
    viewport: {
      defaultViewport: "tablet",
    },
  },
};

/**
 * 短いコンテンツ - Footer が画面下部に配置されることを確認
 */
export const ShortContent: Story = {
  args: {
    children: (
      <article>
        <h1 className="mb-4 font-bold text-3xl">短いページ</h1>
        <p className="text-muted-foreground">コンテンツが少ないページです。</p>
      </article>
    ),
  },
};
