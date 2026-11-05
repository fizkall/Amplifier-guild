import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Amfiplier Guild',
    short_name: 'Amfiplier',
    description: 'FRC ve etkinlik topluluklarındaki öğrencileri girişimler ve projelerle buluşturan lonca.',
    lang: 'tr',
    dir: 'ltr',
    start_url: '/ana-sayfa?kaynak=uygulama',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#000000',
    theme_color: '#000000',
    categories: ['education', 'productivity', 'social'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'İlanlar', url: '/ilanlar', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Başvurularım', url: '/basvurularim', icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }] },
    ],
  };
}
