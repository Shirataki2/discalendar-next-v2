import { describe, expect, it } from "vitest";
import type {
  FeatureItem,
  FooterLink,
  NavLink,
  SocialLink,
} from "@/types/landing-page";

describe("Task 1.2: 共通型定義の検証", () => {
  describe("NavLink型", () => {
    it("正しい構造のNavLinkオブジェクトを受け入れること", () => {
      const navLink: NavLink = {
        label: "機能",
        href: "#features",
      };

      expect(navLink).toHaveProperty("label");
      expect(navLink).toHaveProperty("href");
      expect(typeof navLink.label).toBe("string");
      expect(typeof navLink.href).toBe("string");
    });
  });

  describe("FeatureItem型", () => {
    it("正しい構造のFeatureItemオブジェクトを受け入れること", () => {
      // lucide-reactアイコンのモック
      const mockIcon = () => null;

      const featureItem: FeatureItem = {
        id: "calendar-ui",
        icon: mockIcon,
        title: "カレンダーUI",
        description: "ビジュアルなカレンダー形式で予定を一目で把握できます。",
      };

      expect(featureItem).toHaveProperty("id");
      expect(featureItem).toHaveProperty("icon");
      expect(featureItem).toHaveProperty("title");
      expect(featureItem).toHaveProperty("description");
      expect(typeof featureItem.id).toBe("string");
      expect(typeof featureItem.icon).toBe("function");
      expect(typeof featureItem.title).toBe("string");
      expect(typeof featureItem.description).toBe("string");
    });
  });

  describe("FooterLink型", () => {
    it("正しい構造のFooterLinkオブジェクトを受け入れること", () => {
      const footerLink: FooterLink = {
        label: "利用規約",
        href: "#terms",
      };

      expect(footerLink).toHaveProperty("label");
      expect(footerLink).toHaveProperty("href");
      expect(typeof footerLink.label).toBe("string");
      expect(typeof footerLink.href).toBe("string");
    });
  });

  describe("SocialLink型", () => {
    it("正しい構造のSocialLinkオブジェクトを受け入れること", () => {
      // lucide-reactアイコンのモック
      const mockIcon = () => null;

      const socialLink: SocialLink = {
        platform: "Twitter",
        icon: mockIcon,
        href: "#twitter",
      };

      expect(socialLink).toHaveProperty("platform");
      expect(socialLink).toHaveProperty("icon");
      expect(socialLink).toHaveProperty("href");
      expect(typeof socialLink.platform).toBe("string");
      expect(typeof socialLink.icon).toBe("function");
      expect(typeof socialLink.href).toBe("string");
    });
  });
});
