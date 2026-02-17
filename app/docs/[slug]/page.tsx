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
      <div className="flex flex-col gap-8 lg:flex-row">
        <aside className="shrink-0 lg:w-56">
          <DocNavigation currentSlug={slug} entries={DOC_ENTRIES} />
        </aside>
        <div className="min-w-0 flex-1">
          <Content />
          <DocPagination next={next} prev={prev} />
        </div>
      </div>
    </StaticPageLayout>
  );
}
