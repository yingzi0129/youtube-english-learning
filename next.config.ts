import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.myqcloud.com',
      },
      {
        protocol: 'https',
        hostname: 'youtube-1317088148.cos.ap-guangzhou.myqcloud.com',
      },
      {
        protocol: 'https',
        hostname: '**.speak-video.cn',
      },
      {
        protocol: 'https',
        hostname: 'video.speak-video.cn',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=86400, stale-while-revalidate=86400',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
