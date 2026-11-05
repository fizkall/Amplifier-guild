'use client';

import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Application } from '@/shared/models';
import { AppShell } from '@/components/AppShell';
import { fetchMyApplications } from '@/components/Opportunities';
import { useAuth } from '@/lib/auth';
import { db, firebaseReady } from '@/lib/firebase';
import { APP_STATUS_LABEL, ROLE_TYPE_LABEL, timeAgo } from '@/lib/format';

type App = Application & { id: string };

function MyApplications() {
  const { profile } = useAuth();
  const [apps, setApps] = useState<App[] | null>(null);

  const load = () => { if (profile) fetchMyApplications(profile.uid).then(setApps).catch(() => setApps([])); };
  useEffect(load, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  async function withdraw(a: App) {
    if (!confirm('Başvurunu geri çekmek istiyor musun?')) return;
    await updateDoc(doc(db, 'projects', a.projectId, 'applications', a.id), { status: 'withdrawn', updatedAt: serverTimestamp() });
    load();
  }

  if (apps === null) return <div className="center" style={{ minHeight: 200 }}><div className="spinner" /></div>;
  if (!apps.length) return <div className="empty">Henüz başvurun yok. <Link href="/ilanlar" style={{ textDecoration: 'underline' }}>İlanlara göz at</Link></div>;

  return (
    <>
      {apps.map((a) => (
        <div key={a.id} className="card stack">
          <div className="row spread">
            <div>
              <div className="meta">{a.projectSnapshot?.name}</div>
              <div className="post-name">{a.opportunitySnapshot?.title}</div>
            </div>
            <span className={`status-${a.status}`} style={{ fontWeight: 600, fontSize: 14 }}>{APP_STATUS_LABEL[a.status]}</span>
          </div>
          <div className="row spread">
            <span className="meta">
              {ROLE_TYPE_LABEL[a.opportunitySnapshot?.roleType] ?? ''} · {timeAgo(a.createdAt as never)}
              {a.matchScore != null && ` · %${a.matchScore} uyum`}
            </span>
            {['submitted', 'in_review', 'shortlisted'].includes(a.status) && (
              <button className="btn" onClick={() => withdraw(a)}>Geri çek</button>
            )}
          </div>
        </div>
      ))}
    </>
  );
}

export default function MyApplicationsPage() {
  return <AppShell title="Başvurularım">{firebaseReady && <MyApplications />}</AppShell>;
}
