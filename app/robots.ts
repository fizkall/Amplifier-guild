import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/server-firestore';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{
      userAgent: '*',
      allow: ['/', '/kesfet', '/girisimler', '/hakkinda', '/iletisim', '/kvkk', '/kullanim-kosullari', '/proje/', '/ilan/', '/profil/'],
      disallow: ['/ayarlar', '/yonetim', '/basvurularim', '/profil-olustur', '/ana-sayfa', '/giris', '/tesekkurler', '/surum', '/*/yonet', '/*/basvurular', '/*/duzenle', '/*/ilan-yeni'],
    }],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
