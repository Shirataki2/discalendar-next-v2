/**
 * @file ランディングページメインコンポーネント
 * @description Discalendarのランディングページを構成
 *
 * タスク2.1: 新しいapp/page.tsxの作成とServer Component実装
 * - セマンティックHTML（main要素）でページ構造を定義
 * - Server Componentとして実装（"use client"ディレクティブなし）
 * - メタデータの設定
 *
 * タスク2.2: セクションコンポーネントの統合とレイアウト構築
 * - Header、Hero、Features、CTA、Footerコンポーネントの配置
 * - セクション間のスペーシング設定
 * - 論理的な順序での表示
 *
 * Requirements:
 * - 1.1: ページ構造とレイアウト
 * - 1.2: Next.js App Router実装
 * - 7.1: セマンティックHTML
 * - 8.3: Server Components優先
 * - 10.1: Tailwind CSSスタイリング
 * - 10.4: スペーシング設定
 */

import type { Metadata } from "next";
import { CTA } from "@/components/cta";
import { Features } from "@/components/features";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { Hero } from "@/components/hero";

/**
 * ページメタデータ
 * Requirement 1.2: メタデータの設定
 */
export const metadata: Metadata = {
  title: "Discalendar - Discordコミュニティの予定管理をもっと便利に",
  description:
    "Discordコミュニティ向け予定管理サービス。カレンダー形式で予定を視覚的に管理し、Discordと連携して予定を同期します。",
};

/**
 * ランディングページコンポーネント
 *
 * セマンティックHTML構造:
 * - main要素でページのメインコンテンツを定義
 * - セクション間のスペーシング（space-y-0）
 * - 論理的な順序: Header -> Hero -> Features -> CTA -> Footer
 */
export default function Home() {
  return (
    <main className="space-y-0">
      <Header />
      <Hero />
      <Features />
      <CTA />
      <Footer />
    </main>
  );
}
