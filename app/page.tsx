'use client';
/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { About } from '@/components/About';
import { Footer } from '@/components/Footer';
import { InstallPrompt } from '@/components/InstallPrompt';
import { useAuth } from '@/lib/auth';

/** Giriş yapmamış ziyaretçinin ilk gördüğü sayfa: tanıtım + hakkında, sonra "Loncaya katıl". */
export default function Landing() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [notice, setNotice] = useState('');
  useEffect(() => {
    if (!loading && user) router.replace('/ana-sayfa');
  }, [user, loading, router]);
  useEffect(() => {
    const h = new URLSearchParams(window.location.search).get('hesap');
    if (h === 'silindi') setNotice('Hesabın ve verilerin silindi. Seni tekrar görmek isteriz 👋');
    if (h === 'devre-disi') setNotice('Hesabın devre dışı bırakıldı. Tekrar giriş yaparak istediğin zaman etkinleştirebilirsin.');
  }, []);

  return (
    <main>
      <link rel="canonical" href="https://amplifierguild.online/" />
      {notice && <div className="notice" role="status" style={{ maxWidth: 560, margin: '16px auto 0' }}>{notice}</div>}
      <section className="hero" style={{ minHeight: '88dvh' }}>
        <img className="logo-img" src="/logo.png" alt="Amplifier Guild logosu" width={112} height={112} />
        <div className="bars" aria-hidden><span /><span /><span /><span /><span /></div>
        <h1>Amplifier Guild</h1>
        <p>
          FRC ve etkinlik topluluklarındaki öğrencileri gerçek girişim ve projelerle buluşturan lonca.
          Projelerde yer al, network kur, <b style={{ color: 'var(--text)' }}>doğrulanmış CV</b> kazan.
        </p>
        <div className="row" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/giris?mod=kayit" className="btn btn-primary btn-lg">Loncaya katıl — ücretsiz</Link>
          <a href="#hakkinda" className="btn btn-lg">Nasıl çalışır?</a>
        </div>
        <Link href="/giris" className="link-btn">Zaten üye misin? <b>Giriş yap</b></Link>
        <a href="#hakkinda" className="scroll-hint" aria-label="Aşağı kaydır">↓</a>
      </section>

      <div id="hakkinda">
        <About />
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px 48px' }}>
        <InstallPrompt variant="button" />
      </div>
      <Footer />
      <div style={{ height: 72 }} className="mobile-only-spacer" aria-hidden />
      <div className="sticky-cta at-bottom">
        <Link href="/giris?mod=kayit" className="btn btn-primary">Loncaya katıl</Link>
        <Link href="/giris" className="btn">Giriş yap</Link>
      </div>
    </main>
  );
}
