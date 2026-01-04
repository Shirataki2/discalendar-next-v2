import type { MetadataRoute } from "next";

/**
 * Web App Manifest
 *
 * PWA（Progressive Web App）として動作するための設定を定義します。
 * ブラウザにアプリケーションのメタデータを提供し、
 * ホーム画面への追加やスタンドアロン表示を可能にします。
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Discalendar - Discordサーバー向けカレンダー",
    short_name: "Discalendar",
    description:
      "Discordサーバーでイベントを簡単に管理できるカレンダーアプリケーション",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    icons: [
      {
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    categories: ["productivity", "utilities"],
    lang: "ja",
    dir: "ltr",
    orientation: "portrait-primary",
  };
}
