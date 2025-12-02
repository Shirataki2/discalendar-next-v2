import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // cacheComponents: true, // 認証状態取得のため一時的に無効化
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.discordapp.com",
        pathname: "/avatars/**",
      },
    ],
  },
};

export default nextConfig;
