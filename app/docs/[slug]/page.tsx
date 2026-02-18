import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocsCalendar } from "@/components/docs/content/docs-calendar";
import { DocsCommands } from "@/components/docs/content/docs-commands";
import { DocsEdit } from "@/components/docs/content/docs-edit";
import { DocsGettingStarted } from "@/components/docs/content/docs-getting-started";
import { DocsInitialize } from "@/components/docs/content/docs-initialize";
import { DocsInvite } from "@/components/docs/content/docs-invite";
import { DocsLogin } from "@/components/docs/content/docs-login";
import { DocNavigation } from "@/components/docs/doc-navigation";
import { DocPagination } from "@/components/docs/doc-pagination";
import { StaticPageLayout } from "@/components/static-page-layout";
import {
  DOC_ENTRIES,
  getAdjacentDocs,
  getAllDocSlugs,
  getDocBySlug,
} from "@/lib/docs/config";

type Params = { slug: string };

const CONTENT_MAP: Record<string, React.ComponentType> = {
  "getting-started": DocsGettingStarted,
  login: DocsLogin,
  invite: DocsInvite,
  initialize: DocsInitialize,
  calendar: DocsCalendar,
  edit: DocsEdit,
  commands: DocsCommands,
};

export async function generateStaticParams() {
  return getAllDocSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = getDocBySlug(slug);
  if (!doc) {
    return {};
  }
  return {
    title: `${doc.title} | Discalendar ドキュメント`,
    description: doc.description,
  };
}

export default async function DocsSlugPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const doc = getDocBySlug(slug);
  if (!doc) {
    notFound();
  }

  const Content = CONTENT_MAP[slug];
  if (!Content) {
    notFound();
  }

  const { prev, next } = getAdjacentDocs(slug);

  return (
    <StaticPageLayout>
      <section className="border-b bg-gradient-to-b from-muted/50 to-background">
        <div className="container mx-auto max-w-4xl px-4 py-12 lg:max-w-6xl">
          <div className="animate-fade-in-up">
            <p className="font-medium text-primary text-sm">ドキュメント</p>
            <h1 className="mt-2 font-uni-sans-heavy text-[length:var(--font-size-3xl)] leading-tight tracking-tight">
              {doc.title}
            </h1>
            {doc.description ? (
              <p className="mt-3 text-muted-foreground">{doc.description}</p>
            ) : null}
          </div>
        </div>
      </section>

      <div className="container mx-auto max-w-4xl px-4 py-12 lg:max-w-6xl">
        <div className="flex flex-col gap-8 lg:flex-row">
          <aside className="shrink-0 lg:w-56">
            <div className="rounded-lg border bg-card p-4 lg:sticky lg:top-20">
              <DocNavigation currentSlug={slug} entries={DOC_ENTRIES} />
            </div>
          </aside>
          <div className="animation-delay-100 min-w-0 flex-1 animate-fade-in-up">
            <Content />
            <DocPagination next={next} prev={prev} />
          </div>
        </div>
      </div>
    </StaticPageLayout>
  );
}
