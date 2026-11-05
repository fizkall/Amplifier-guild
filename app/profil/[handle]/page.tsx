'use client';

import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Experience, UserProfile } from '@/shared/models';
import { AppShell } from '@/components/AppShell';
import { Avatar } from '@/components/Avatar';
import { CheckIcon } from '@/components/Icons';
import { useAuth } from '@/lib/auth';
import { db, firebaseReady } from '@/lib/firebase';

function Profile({ handle }: { handle: string }) {
  const { profile: me, signOut } = useAuth();
  const [user, setUser] = useState<UserProfile | null | undefined>(undefined);
  const [exps, setExps] = useState<(Experience & { id: string })[]>([]);

  useEffect(() => {
    (async () => {
      const h = await getDoc(doc(db, 'handles', handle.toLowerCase()));
      if (!h.exists()) return setUser(null);
      const uid = h.get('uid') as string;
      const [u, e] = await Promise.all([
        getDoc(doc(db, 'users', uid)),
        getDocs(collection(db, 'users', uid, 'experiences')),
      ]);
      setUser(u.exists() ? (u.data() as UserProfile) : null);
      setExps(e.docs.map((d) => ({ id: d.id, ...(d.data() as Experience) })).sort((a, b) => a.order - b.order));
    })().catch((e) => { console.error(e); setUser(null); });
  }, [handle]);

  if (user === undefined) return <div className="center" style={{ minHeight: 200 }}><div className="spinner" /></div>;
  if (user === null) return <div className="empty">Kullanıcı bulunamadı.</div>;
  const isMe = me?.uid === user.uid;

  return (
    <>
      <div className="pad stack">
        <div className="row spread" style={{ alignItems: 'flex-start' }}>
          <div>
            <h1 className="h1">{user.displayName}</h1>
            <div>@{user.handle}</div>
          </div>
          <Avatar name={user.displayName} src={user.photoURL} size={72} />
        </div>
        {user.headline && <p style={{ margin: 0 }}>{user.headline}</p>}
        {user.bio && <p className="post-text meta" style={{ margin: 0 }}>{user.bio}</p>}
        {Object.entries(user.links ?? {}).filter(([, v]) => v).length > 0 && (
          <div className="chips">
            {Object.entries(user.links ?? {}).filter(([, v]) => v).map(([k, v]) => (
              <a key={k} href={v as string} target="_blank" rel="noopener noreferrer" className="chip">{({ github: 'GitHub', linkedin: 'LinkedIn', portfolio: 'Portfolyo', instagram: 'Instagram' } as Record<string, string>)[k] ?? k} ↗</a>
            ))}
          </div>
        )}
        <div className="chips">
          {user.programs?.map((p, i) => (
            <span key={i} className="chip solid">{p.program}{p.teamNumber ? ` #${p.teamNumber}` : ''}{p.role ? ` · ${p.role}` : ''}</span>
          ))}
          {user.openToWork && <span className="chip solid" style={{ color: 'var(--success)' }}>● Projelere açık</span>}
        </div>
        <div className="chips">{user.skills?.map((s) => <span key={s} className="chip">{s}</span>)}</div>
        <div className="meta">
          {user.stats?.projectsJoined ?? 0} Guild projesi
          {user.school ? ` · ${user.school.name}` : ''}
          {user.availability?.hoursPerWeek ? ` · haftada ${user.availability.hoursPerWeek} saat` : ''}
        </div>
      </div>

      <div className="section-head"><span>Deneyimler</span></div>
      {exps.length ? (
        exps.map((x) => (
          <div key={x.id} className="card">
            <div className="row" style={{ gap: 6 }}>
              <span className="post-name">{x.title}</span>
              {x.verified && <span className="verified" title="Amplifier Guild tarafından doğrulandı"><CheckIcon /></span>}
            </div>
            <div className="meta">{x.organization} · {x.startDate}{x.endDate ? ` – ${x.endDate}` : ' – devam ediyor'}</div>
            {x.description && <p className="post-text" style={{ marginBottom: 0 }}>{x.description}</p>}
          </div>
        ))
      ) : (
        <div className="empty">Henüz deneyim yok. Guild projelerine kabul edildiğinde doğrulanmış deneyimler burada görünür.</div>
      )}

      {isMe && (
        <div className="pad" style={{ display: 'flex', justifyContent: 'center' }}>
          <div className="row"><a href="/ayarlar/profil" className="btn btn-primary">Profili düzenle</a><a href="/ayarlar" className="btn">Ayarlar</a></div>
        </div>
      )}
    </>
  );
}

export default function ProfilPage() {
  const { handle } = useParams<{ handle: string }>();
  const h = decodeURIComponent(handle);
  return <AppShell title={`@${h}`}>{firebaseReady && <Profile handle={h} />}</AppShell>;
}
