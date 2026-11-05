'use client';
/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { About } from '@/components/About';
import { Footer } from '@/components/Footer';
import { InstallPrompt } from '@/components/InstallPrompt';
import { useAuth } from '@/lib/auth';

/** Giriş yapmamış ziyaretçinin ilk gördüğü sayfa: tanıtım + hakkında, sonra "Loncaya katıl". */
export default function Landing() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && user) router.replace('/ana-sayfa');
  }, [user, loading, router]);

  return (
    <main>
      <section className="hero" style={{ minHeight: '88dvh' }}>
        <img className="logo-img" src="/logo.png" alt="Amplifier Guild logosu" width={112} height={112} />
        <div className="bars" aria-hidden><span /><span /><span /><span /><span /></div>
        <h1>Amplifier Guild</h1>
        <p>
          FRC ve etkinlik topluluklarındaki öğrencileri gerçek girişim ve projelerle buluşturan lonca.
          Projelerde yer al, network kur, <b style={{ color: 'var(--text)' }}>doğrulanmış CV</b> kazan.
        </p>
        <div className="row" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
          <a href="#hakkinda" className="btn btn-primary btn-lg">Nasıl çalışır?</a>
          <Link href="/giris" className="btn btn-lg">Giriş yap</Link>
        </div>
        <a href="#hakkinda" className="scroll-hint" aria-label="Aşağı kaydır">↓</a>
      </section>

      <div id="hakkinda">
        <About />
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px 48px' }}>
        <InstallPrompt variant="button" />
      </div>
      <Footer />
    </main>
  );
}
