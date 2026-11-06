'use client';

import { collection, getDocs, query, where } from 'firebase/firestore';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { Project } from '@/shared/models';
import { Avatar } from '@/components/Avatar';
import { db } from '@/lib/firebase';
import { KIND_LABEL } from '@/lib/projects';

type Row = Project & { id: string; openCount: number };

export function Ventures() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState('');
  const [kind, setKind] = useState<'all' | Project['kind']>('all');
  const [q, setQ] = useState('');

  useEffect(() => {
    (async () => {
      const ps = await getDocs(query(collection(db, 'projects'), where('status', '==', 'active')));
      const list = await Promise.all(ps.docs.map(async (d) => {
        const opps = await getDocs(query(collection(db, 'projects', d.id, 'opportunities'), where('status', '==', 'open'))).catch(() => null);
        return { id: d.id, ...(d.data() as Project), openCount: opps?.size ?? 0 };
      }));
      list.sort((a, b) => b.openCount - a.openCount || a.name.localeCompare(b.name, 'tr'));
      setRows(list);
    })().catch((e) => { console.error(e); setError((e as { code?: string }).code ?? String(e)); setRows([]); });
  }, []);

  const kinds = useMemo(() => [...new Set((rows ?? []).map((r) => r.kind))], [rows]);
  const list = (rows ?? []).filter((r) =>
    (kind === 'all' || r.kind === kind)
    && (!q.trim() || `${r.name} ${r.tagline} ${r.description}`.toLocaleLowerCase('tr').includes(q.trim().toLocaleLowerCase('tr'))));

  return (
    <>
      <div className="pad stack" style={{ borderBottom: '1px solid var(--border)' }}>
        <input className="input" type="search" placeholder="Girişim veya proje ara…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Girişim ara" />
        {kinds.length > 1 && (
          <div className="chips">
            <button className={`chip${kind === 'all' ? ' on' : ''}`} onClick={() => setKind('all')}>Tümü</button>
            {kinds.map((k) => <button key={k} className={`chip${kind === k ? ' on' : ''}`} onClick={() => setKind(k)}>{KIND_LABEL[k] ?? k}</button>)}
          </div>
        )}
      </div>

      {error && <div className="notice" role="alert">Girişimler yüklenemedi. <span className="meta">Hata: {error}</span></div>}

      {rows === null ? (
        <div className="center" style={{ minHeight: 160 }}><div className="spinner" /></div>
      ) : list.length === 0 ? (
        <div className="empty">{rows.length ? 'Aramana uyan girişim yok.' : 'Henüz yayında girişim yok.'}</div>
      ) : (
        list.map((p) => (
          <Link key={p.id} href={`/proje/${p.id}`} className="card venture">
            <Avatar name={p.name} src={p.logoUrl} size={56} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="post-name" style={{ fontSize: 16 }}>{p.name}</div>
              {p.tagline && <div className="meta venture-tag">{p.tagline}</div>}
              <div className="chips" style={{ marginTop: 8 }}>
                <span className="chip solid" style={{ fontSize: 12 }}>{KIND_LABEL[p.kind] ?? p.kind}</span>
                {p.openCount > 0
                  ? <span className="chip on" style={{ fontSize: 12 }}>{p.openCount} açık pozisyon</span>
                  : <span className="chip" style={{ fontSize: 12 }}>Şu an ilan yok</span>}
              </div>
            </div>
            <span className="meta" aria-hidden>→</span>
          </Link>
        ))
      )}
    </>
  );
}

