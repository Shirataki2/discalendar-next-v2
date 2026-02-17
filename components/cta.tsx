/**
 * @file CTA コンポーネント
 * @description ランディングページの行動喚起セクション
 */

import { Button } from "@/components/ui/button";

// テキストコンテンツ定数
const ctaContent = {
  message: "今すぐ始めよう",
  subMessage: "Discalendarで予定管理をもっと便利に。",
  ctaText: "無料で始める",
  ctaHref: "#signup",
};

export function CTA() {
  return (
    <section
      className="bg-gradient-to-r from-blue-500 to-purple-600 py-16 text-white"
      data-testid="landing-cta"
    >
      <div className="container mx-auto px-4 text-center">
        <h2 className="font-bold text-[length:var(--font-size-3xl)] leading-tight tracking-tight">
          {ctaContent.message}
        </h2>
        <p className="mt-4 text-lg leading-relaxed md:text-xl">
          {ctaContent.subMessage}
        </p>
        <Button
          asChild
          className="mt-8 bg-white text-blue-600 hover:bg-gray-100"
          size="lg"
          variant="secondary"
        >
          <a href={ctaContent.ctaHref}>{ctaContent.ctaText}</a>
        </Button>
      </div>
    </section>
  );
}
