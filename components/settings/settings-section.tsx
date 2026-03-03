import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type SettingsSectionProps = {
  /** セクションタイトル */
  title: string;
  /** セクションの説明文 */
  description: string;
  /** セクション内コンテンツ */
  children: ReactNode;
};

/**
 * 汎用セクションラッパーコンポーネント
 *
 * shadcn/ui の Card でセクション区切りを表現し、
 * タイトル・説明文・children を受け取る。
 * 将来のセクション追加（通知チャンネル、ロケール等）が
 * 同一パターンで行えるようにする。
 *
 * Requirements: 4.1, 4.3
 */
export function SettingsSection({
  title,
  description,
  children,
}: SettingsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
