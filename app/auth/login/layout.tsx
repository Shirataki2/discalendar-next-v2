import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ログイン",
  description:
    "Discordアカウントでログインして、カレンダー管理を始めましょう。",
  alternates: {
    canonical: "/auth/login",
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
