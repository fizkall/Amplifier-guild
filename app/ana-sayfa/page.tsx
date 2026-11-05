'use client';

import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { InstallPrompt } from '@/components/InstallPrompt';
import { OpportunityList, useMyApplications } from '@/components/Opportunities';
import { useAuth } from '@/lib/auth';
import { firebaseReady } from '@/lib/firebase';
import { APP_STATUS_LABEL } from '@/lib/format';

function profileCompleteness(p: NonNullable<ReturnType<typeof useAuth>['profile']>) {
  const checks = [
    [Boolean(p.photoURL), 'Profil fotoğrafı'],
    [Boolean(p.headline), 'Kısa başlık'],
    [p.skills?.length >= 3, 'En az 3 yetenek'],
    [p.programs?.length > 0, 'Program / takım geçmişi'],
    [Boolean(p.school), 'Okul bilgisi'],
  ] as const;
  const done = checks.filter(([ok]) => ok).length;
  return { pct: Math.round((done / checks.length) * 100), missing: checks.filter(([ok]) => !ok).map(([, l]) => l) };
}

function Home() {
  const { profile } = useAuth();
  const { apps } = useMyApplications();
  if (!profile) return null;
  const { pct, missing } = profileCompleteness(profile);
  const active = (apps ?? []).filter((a) => !['withdrawn'].includes(a.status));

  return (
    <>
      <div className="pad stack">
        <h1 className="h1">Merhaba, {profile.displayName.split(' ')[0]} 👋</h1>
        <p className="meta" style={{ margin: 0 }}>Sana uygun projeleri bul, tek tıkla başvur, CV'ni büyüt.</p>
      </div>

      <InstallPrompt />

      {pct < 100 && (
        <div className="notice">
          <div className="row spread"><b>Profilin %{pct} tamam</b><Link href={`/profil/${profile.handle}`} className="link-btn strong">Profile git →</Link></div>
          <div className="meter" aria-hidden><span style={{ width: `${pct}%` }} /></div>
          <div className="meta">Eksik: {missing.join(', ')}. Tamam profiller daha yüksek uyum skoru alır.</div>
        </div>
      )}

      <div className="section-head">
        <span>Başvurularım</span>
        <Link href="/basvurularim" className="link-btn">Tümü →</Link>
      </div>
      {apps === null ? (
        <div className="center" style={{ minHeight: 80 }}><div className="spinner" /></div>
      ) : active.length === 0 ? (
        <div className="empty" style={{ padding: '20px 24px' }}>Henüz başvurun yok.</div>
      ) : (
        active.slice(0, 3).map((a) => (
          <Link key={a.id} href="/basvurularim" className="card row spread">
            <div>
              <div className="meta">{a.projectSnapshot?.name}</div>
              <div className="post-name">{a.opportunitySnapshot?.title}</div>
            </div>
            <span className={`status-${a.status}`} style={{ fontWeight: 600, fontSize: 14 }}>{APP_STATUS_LABEL[a.status]}</span>
          </Link>
        ))
      )}

      <div className="section-head">
        <span>Sana en uygun ilanlar</span>
        <Link href="/ilanlar" className="link-btn">Tüm ilanlar →</Link>
      </div>
      <OpportunityList max={3} filters={false} />
    </>
  );
}

export default function AnaSayfa() {
  return <AppShell>{firebaseReady && <Home />}</AppShell>;
}
