import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // amplifierguild.online/@ayse → profil sayfası
    return [{ source: '/@:handle', destination: '/profil/:handle' }];
  },
  async redirects() {
    // Eski İngilizce adresler → Türkçe adresler
    return [
      { source: '/login', destination: '/giris', permanent: true },
      { source: '/onboarding', destination: '/profil-olustur', permanent: true },
      { source: '/feed', destination: '/ana-sayfa', permanent: true },
      { source: '/post/:id', destination: '/ana-sayfa', permanent: true },
      { source: '/jobs', destination: '/ilanlar', permanent: true },
      { source: '/me/applications', destination: '/basvurularim', permanent: true },
      { source: '/u/:handle', destination: '/profil/:handle', permanent: true },
      { source: '/p/:slug', destination: '/proje/:slug', permanent: true },
    ];
  },
  async headers() {
    return [
      { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache' }, { key: 'Service-Worker-Allowed', value: '/' }] },
    ];
  },
};

export default nextConfig;
