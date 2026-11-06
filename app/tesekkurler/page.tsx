'use client';
/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Footer } from '@/components/Footer';

const CONTENT: Record<string, { title: string; text: string; primary: [string, string]; secondary?: [string, string] }> = {
  basvuru: {
    title: 'Başvurun alındı 🎉',
    text: 'Başvurun proje ekibine iletildi. Durumunu "Başvurularım" sayfasından takip edebilirsin; ekip karar verdiğinde orada göreceksin.',
    primary: ['/basvurularim', 'Başvurularım'],
    secondary: ['/ilanlar', 'Diğer ilanlara göz at'],
  },
  iletisim: {
    title: 'Mesajın bize ulaştı ✉️',
    text: 'Teşekkürler! En kısa sürede yazdığın e-posta adresine dönüş yapacağız.',
    primary: ['/', 'Ana sayfa'],
    secondary: ['/ilanlar', 'Açık ilanlar'],
  },
  kayit: {
    title: 'Loncaya hoş geldin 🙌',
    text: 'Profilin hazır. Şimdi sana uygun ilanlara göz atabilirsin.',
    primary: ['/ilanlar', 'İlanlara göz at'],
    secondary: ['/ayarlar/profil', 'Profilimi tamamla'],
  },
};

export default function TesekkurlerPage() {
  const [type, setType] = useState('iletisim');
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tip');
    if (t && CONTENT[t]) setType(t);
  }, []);
  const c = CONTENT[type];
  return (
    <main>
      <section className="hero" style={{ minHeight: '80dvh' }}>
        <img className="logo-img" src="/logo.png" alt="Amplifier Guild logosu" width={80} height={80} />
        <h1 style={{ fontSize: 'clamp(28px, 6vw, 44px)' }}>{c.title}</h1>
        <p>{c.text}</p>
        <div className="row" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href={c.primary[0]} className="btn btn-primary btn-lg">{c.primary[1]}</Link>
          {c.secondary && <Link href={c.secondary[0]} className="btn btn-lg">{c.secondary[1]}</Link>}
        </div>
      </section>
      <Footer />
    </main>
  );
}
