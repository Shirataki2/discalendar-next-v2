import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import localFont from "next/font/local";
import { ThemeProvider } from "next-themes";
import { SentryUserProvider } from "@/components/sentry/sentry-user-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PostHogIdentifyProvider } from "@/lib/analytics/posthog-identify-provider";
import { PostHogProvider } from "@/lib/analytics/posthog-provider";
import "./globals.css";

function resolveBaseUrl(): string {
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

const defaultUrl = resolveBaseUrl();

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: {
    default: "Discalendar - Discordコミュニティの予定管理をもっと便利に",
    template: "%s | Discalendar",
  },
  description:
    "Discordサーバーでイベントを簡単に管理できるカレンダーアプリケーション",
  keywords: ["Discord", "カレンダー", "予定管理", "イベント", "コミュニティ"],
  openGraph: {
    type: "website",
    title: "Discalendar - Discordコミュニティの予定管理をもっと便利に",
    description:
      "Discordサーバーでイベントを簡単に管理できるカレンダーアプリケーション",
    siteName: "Discalendar",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
  },
  alternates: {
    canonical: "/",
  },
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
          <PostHogIdentifyProvider>
            <SentryUserProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="system"
                disableTransitionOnChange
                enableSystem
              >
                <TooltipProvider>{children}</TooltipProvider>
              </ThemeProvider>
            </SentryUserProvider>
          </PostHogIdentifyProvider>
        </PostHogProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
