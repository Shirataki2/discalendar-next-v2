/**
 * @file Footer コンポーネント
 * @description ランディングページのフッター
 */

import { Github, Twitter } from "lucide-react";

// フッターリンクの型定義
type FooterLink = {
  label: string;
  href: string;
};

// ソーシャルリンクの型定義
type SocialLink = {
  platform: string;
  icon: typeof Twitter | typeof Github;
  href: string;
  ariaLabel: string;
};

// フッターリンク定数
const footerLinks: FooterLink[] = [
  { label: "利用規約", href: "#terms" },
  { label: "プライバシーポリシー", href: "#privacy" },
  { label: "お問い合わせ", href: "#contact" },
];

// ソーシャルメディアリンク定数
const socialLinks: SocialLink[] = [
  {
    platform: "Twitter",
    icon: Twitter,
    href: "#",
    ariaLabel: "Twitter",
  },
  {
    platform: "GitHub",
    icon: Github,
    href: "#",
    ariaLabel: "GitHub",
  },
];

export function Footer() {
  // Static year for prerendering compatibility
  const currentYear = 2025;

  return (
    <footer className="border-t bg-muted/30 py-12" data-testid="landing-footer">
      <div className="container mx-auto px-4">
        <div className="grid gap-8 md:grid-cols-3">
          {/* サービス説明 */}
          <div>
            <h3 className="font-semibold text-lg">Discalendar</h3>
            <p className="mt-2 text-muted-foreground text-sm">
              Discordコミュニティ向けの予定管理サービス
            </p>
          </div>

          {/* ナビゲーションリンク */}
          <div>
            <h3 className="font-semibold text-lg">リンク</h3>
            <nav className="mt-2 flex flex-col space-y-2">
              {footerLinks.map((link) => (
                <a
                  className="text-muted-foreground text-sm hover:text-foreground"
                  href={link.href}
                  key={link.label}
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          {/* ソーシャルメディアリンク */}
          <div>
            <h3 className="font-semibold text-lg">フォロー</h3>
            <div className="mt-2 flex space-x-4">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    aria-label={social.ariaLabel}
                    className="text-muted-foreground hover:text-foreground"
                    href={social.href}
                    key={social.platform}
                  >
                    <Icon className="h-6 w-6" />
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        {/* 著作権表記 */}
        <div className="mt-8 border-t pt-8 text-center text-muted-foreground text-sm">
          © {currentYear} Discalendar. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
