'use client';

import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { UserProfile } from '@/shared/models';
import { Avatar } from '@/components/Avatar';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { programChip } from '@/lib/team';

/** Keşfet → Üyeler: görünür profiller (giriş yapmayanlar yalnızca herkese açık profilleri görür). */
export function Members() {
  const { user } = useAuth();
  const [rows, setRows] = useState<UserProfile[] | null>(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [openOnly, setOpenOnly] = useState(false);

  useEffect(() => {
    const vis = user ? where('visibility', 'in', ['public', 'members']) : where('visibility', '==', 'public');
    getDocs(query(collection(db, 'users'), vis, limit(300)))
      .then((s) => setRows(s.docs.map((d) => d.data() as UserProfile)
        .filter((u) => u.onboardingComplete && !u.deactivated)
        .sort((a, b) => Number(b.openToWork) - Number(a.openToWork) || (b.stats?.projectsJoined ?? 0) - (a.stats?.projectsJoined ?? 0) || a.displayName.localeCompare(b.displayName, 'tr'))))
      .catch((e) => { console.error(e); setError((e as { code?: string }).code ?? String(e)); setRows([]); });
  }, [user]);

  const list = useMemo(() => {
    const t = q.trim().toLocaleLowerCase('tr');
    return (rows ?? []).filter((u) => (!openOnly || u.openToWork) && (!t || [
      u.displayName, u.handle, u.headline, u.school?.name, ...(u.skills ?? []), ...(u.programs ?? []).map(programChip),
    ].join(' ').toLocaleLowerCase('tr').includes(t)));
  }, [rows, q, openOnly]);

  return (
    <>
      <div className="pad stack" style={{ borderBottom: '1px solid var(--border)' }}>
        <input className="input" type="search" placeholder="İsim, yetenek, okul veya takım ara…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Üye ara" />
        <div className="chips">
          <button className={`chip${openOnly ? ' on' : ''}`} onClick={() => setOpenOnly(!openOnly)}>● Projelere açık</button>
          {!user && <span className="meta" style={{ fontSize: 12, alignSelf: 'center' }}>Giriş yapınca tüm üyeleri görürsün.</span>}
        </div>
      </div>
      {error && <div className="notice" role="alert">Üyeler yüklenemedi. <span className="meta">Hata: {error}</span></div>}
      {rows === null ? (
        <div className="center" style={{ minHeight: 160 }}><div className="spinner" /></div>
      ) : list.length === 0 ? (
        <div className="empty">{rows.length ? 'Aramana uyan üye yok.' : 'Henüz görünür üye yok.'}</div>
      ) : list.map((u) => (
        <Link key={u.uid} href={`/profil/${u.handle}`} className="card venture">
          <Avatar name={u.displayName} src={u.photoURL} size={52} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="row" style={{ gap: 6 }}>
              <span className="post-name">{u.displayName}</span>
              {u.openToWork && <span title="Projelere açık" style={{ color: 'var(--success)', fontSize: 12 }}>●</span>}
            </div>
            <div className="meta">@{u.handle}{u.school?.name ? ` · ${u.school.name}` : ''}</div>
            {u.headline && <div className="meta venture-tag" style={{ color: 'var(--text)' }}>{u.headline}</div>}
            <div className="chips" style={{ marginTop: 6 }}>
              {(u.programs ?? []).slice(0, 1).map((p, i) => <span key={i} className="chip solid" style={{ fontSize: 12 }}>{programChip(p)}</span>)}
              {(u.skills ?? []).slice(0, 3).map((s) => <span key={s} className="chip" style={{ fontSize: 12 }}>{s}</span>)}
            </div>
          </div>
        </Link>
      ))}
    </>
  );
}
