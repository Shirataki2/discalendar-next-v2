import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Geist } from "next/font/google";
import localFont from "next/font/local";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const PostHogProvider = dynamic(
  () =>
    import("@/lib/analytics/posthog-provider").then((mod) => ({
      default: mod.PostHogProvider,
    })),
  { ssr: false }
);

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Discalendar - Discordサーバー向けカレンダー",
  description:
    "Discordサーバーでイベントを簡単に管理できるカレンダーアプリケーション",
  icons: {
    icon: "/icon.png",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Discalendar",
  },
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

const uniSansHeavy = localFont({
  src: "../public/UniSansHeavy.otf",
  variable: "--font-uni-sans-heavy",
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body
        className={`${geistSans.className} ${uniSansHeavy.variable} antialiased`}
      >
        <PostHogProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            disableTransitionOnChange
            enableSystem
          >
            <TooltipProvider>{children}</TooltipProvider>
          </ThemeProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
