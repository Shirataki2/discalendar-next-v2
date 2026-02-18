import { Footer } from "@/components/footer";
import { Header } from "@/components/header";

type StaticPageLayoutProps = {
  children: React.ReactNode;
};

export function StaticPageLayout({ children }: StaticPageLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
