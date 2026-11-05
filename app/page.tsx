'use client';
/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth';

export default function Landing() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && user) router.replace('/feed');
  }, [user, loading, router]);

  return (
    <main className="hero">
      <img className="logo-img" src="/logo.png" alt="Amfiplier Guild logosu" width={112} height={112} />
      <div className="bars" aria-hidden><span /><span /><span /><span /><span /></div>
      <h1>Amfiplier Guild</h1>
      <p>
        FRC ve etkinlik topluluklarındaki öğrencileri gerçek girişim ve projelerle buluşturan lonca.
        Network kur, projelerde yer al, <b style={{ color: 'var(--text)' }}>doğrulanmış CV</b> kazan.
      </p>
      <div className="row">
        <Link href="/login" className="btn btn-primary btn-lg">Loncaya katıl</Link>
        <Link href="/jobs" className="btn btn-lg">Açık ilanlar</Link>
      </div>
      <section className="features">
        <div className="feature"><b>Yetenek profili</b><span>FRC/etkinlik geçmişin ve yeteneklerin tek bir paylaşılabilir CV'de.</span></div>
        <div className="feature"><b>Akış</b><span>Projelerin güncellemeleri, duyurular ve topluluk sohbeti.</span></div>
        <div className="feature"><b>Tek tıkla başvuru</b><span>Sana uygun pozisyonları gör, profilinle anında başvur.</span></div>
        <div className="feature"><b>✔ Doğrulanmış deneyim</b><span>Kabul edildiğin Guild projeleri CV'ne onaylı olarak eklenir.</span></div>
      </section>
    </main>
  );
}
