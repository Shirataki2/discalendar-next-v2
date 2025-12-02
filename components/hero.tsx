/**
 * @file Hero コンポーネント
 * @description ランディングページのヒーローセクション
 *
 * 実装タスク:
 * - 4.1: Hero基本構造とテキストコンテンツ実装
 * - 4.2: HeroセクションのCTAボタンとビジュアル実装
 * - 4.3: Heroセクションのレスポンシブレイアウト実装
 */

import Image from "next/image";
import { Button } from "@/components/ui/button";

// テキストコンテンツ定数（タスク4.1）
const heroContent = {
  headline: "Discordコミュニティの予定を、もっと見やすく",
  subheading:
    "カレンダー形式で一目で把握。Discordと連携して、予定管理をスマートに。",
  ctaText: "無料で始める",
  ctaHref: "#signup",
};

export function Hero() {
  return (
    <section
      className="container mx-auto px-4 py-16"
      data-testid="landing-hero"
    >
      {/* タスク4.3: レスポンシブレイアウト - モバイル縦並び、デスクトップ横並び */}
      <div className="flex flex-col items-center gap-8 lg:flex-row lg:gap-12">
        {/* テキストコンテンツ領域 */}
        <div className="flex-1 space-y-6 text-center lg:w-1/2 lg:text-left">
          {/* タスク4.1: キャッチコピー（h1見出し） */}
          <h1 className="font-bold text-4xl leading-tight tracking-tight md:text-5xl lg:text-6xl">
            {heroContent.headline}
          </h1>

          {/* タスク4.1: サービス説明文（サブヘッディング） */}
          <p className="text-muted-foreground text-xl leading-relaxed">
            {heroContent.subheading}
          </p>

          {/* タスク4.2: CTAボタン */}
          <div className="flex justify-center lg:justify-start">
            <Button asChild size="lg">
              <a href={heroContent.ctaHref}>{heroContent.ctaText}</a>
            </Button>
          </div>
        </div>

        {/* ビジュアル領域 */}
        <div className="flex-1 lg:w-1/2">
          {/* タスク4.2: メインビジュアル（カレンダーUIモックアップ） */}
          <div className="relative aspect-[3/2] w-full">
            <Image
              alt="Discalendarのカレンダーインターフェース - Discordコミュニティの予定を視覚的に管理"
              className="rounded-lg shadow-2xl"
              height={400}
              priority
              src="/hero-placeholder.svg"
              width={600}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
