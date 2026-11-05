import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // amplifierguild.online/@ayse → profil sayfası
  async rewrites() {
    return [{ source: '/@:handle', destination: '/u/:handle' }];
  },
};

export default nextConfig;
