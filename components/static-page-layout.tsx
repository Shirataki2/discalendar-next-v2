import { Footer } from "@/components/footer";
import { Header } from "@/components/header";

type StaticPageLayoutProps = {
  children: React.ReactNode;
};

export function StaticPageLayout({ children }: StaticPageLayoutProps) {
  return (
    <>
      <Header />
      <main className="container mx-auto max-w-4xl px-4 py-12">{children}</main>
      <Footer />
    </>
  );
}
