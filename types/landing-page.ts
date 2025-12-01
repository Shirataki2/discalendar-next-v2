/**
 * ランディングページの共通型定義
 * Task 1.2: 共通型定義とモックデータ構造の作成
 */

import type { LucideIcon } from "lucide-react";

/**
 * ナビゲーションリンクの型定義
 * ヘッダーおよびモバイルナビゲーションで使用
 */
export type NavLink = {
  label: string;
  href: string;
};

/**
 * 機能カードアイテムの型定義
 * 機能紹介セクションで使用
 */
export type FeatureItem = {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
};

/**
 * フッターリンクの型定義
 * フッターセクションで使用
 */
export type FooterLink = {
  label: string;
  href: string;
};

/**
 * ソーシャルメディアリンクの型定義
 * フッターセクションで使用
 */
export type SocialLink = {
  platform: string;
  icon: LucideIcon;
  href: string;
};
