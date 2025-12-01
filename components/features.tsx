/**
 * @file Features コンポーネント
 * @description ランディングページの機能紹介セクション
 *
 * 実装対象:
 * - タスク5.1: Featuresコンポーネントの基本構造とモックデータ実装
 * - タスク5.2: 機能カードのレイアウトとshadcn/ui統合実装
 * - タスク5.3: 機能カードのレスポンシブグリッドレイアウト実装
 *
 * Requirements: 4.1-4.8, 11.3, 11.5
 */

import type { LucideIcon } from "lucide-react";
import { Calendar, CheckSquare, MessageSquare } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * FeatureItem型定義
 * 機能カードの構造を定義
 */
type FeatureItem = {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
};

/**
 * 機能カードのモックデータ
 * Requirements: 4.3 (3つの主要機能), 11.3 (モックデータ配列)
 */
const featuresData: FeatureItem[] = [
  {
    id: "calendar-ui",
    icon: Calendar,
    title: "カレンダーUI",
    description: "ビジュアルなカレンダー形式で予定を一目で把握できます。",
  },
  {
    id: "discord-integration",
    icon: MessageSquare,
    title: "Discord連携",
    description:
      "Discordアカウントでログインし、コミュニティの予定と同期します。",
  },
  {
    id: "schedule-management",
    icon: CheckSquare,
    title: "予定管理",
    description: "直感的に予定を追加・編集・削除できます。",
  },
];

/**
 * Featuresコンポーネント
 * 主要機能をカード形式で表示するセクション
 *
 * Requirements:
 * - 4.1: ヒーローセクション後に機能紹介セクションを配置
 * - 4.2: セクションタイトル「主な機能」を表示
 * - 4.3: 3つの主要機能をカード/グリッドレイアウトで表示
 * - 4.4: 各機能カードにアイコン、機能名、説明文を含める
 * - 4.5: shadcn/ui Cardコンポーネントを使用
 * - 4.6: lucide-reactアイコンを使用
 * - 4.7: デスクトップで3カラムグリッド
 * - 4.8: タブレット/モバイルで1-2カラムレイアウト
 */
export function Features() {
  return (
    <section
      className="px-4 py-16 sm:px-6 lg:px-8"
      data-testid="landing-features"
    >
      <div className="container mx-auto max-w-7xl">
        {/* セクションタイトル - Requirement 4.2 */}
        <h2 className="mb-12 text-center font-bold text-3xl">主な機能</h2>

        {/* 機能カードグリッド - Requirements 4.7, 4.8 */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {featuresData.map((feature) => {
            const IconComponent = feature.icon;
            return (
              <Card className="h-full" key={feature.id}>
                <CardHeader>
                  {/* アイコン - Requirement 4.6 */}
                  <div className="mb-4">
                    <IconComponent className="h-12 w-12 text-primary" />
                  </div>
                  {/* 機能名 - Requirement 4.4 */}
                  <CardTitle className="text-xl">
                    <h3>{feature.title}</h3>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* 説明文 - Requirement 4.4 */}
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
