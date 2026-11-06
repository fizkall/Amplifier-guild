'use client';

import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { ProjectMember, UserProfile } from '@/shared/models';
import { Avatar } from '@/components/Avatar';
import { db } from '@/lib/firebase';

type Person = { uid: string; role: ProjectMember['role']; title: string; name: string; handle: string | null; photo: string | null };
const ORDER: Record<string, number> = { owner: 0, admin: 1, member: 2 };
const ROLE_LABEL: Record<string, string> = { owner: 'Kurucu', admin: 'Yönetici', member: 'Ekip üyesi' };

/** Proje sayfasında ekip: kurucu, yöneticiler ve kabul edilen üyeler. */
export function ProjectTeam({ projectId }: { projectId: string }) {
  const [people, setPeople] = useState<Person[] | null>(null);

  useEffect(() => {
    (async () => {
      const s = await getDocs(collection(db, 'projects', projectId, 'members'));
      const list = await Promise.all(s.docs.map(async (d) => {
        const m = d.data() as Partial<ProjectMember>;
        let name = m.userSnapshot?.displayName ?? '';
        let handle = m.userSnapshot?.handle ?? null;
        let photo = m.userSnapshot?.photoURL ?? null;
        // Güncel profil (görünürse) — eski/eksik anlık görüntüleri tamamlar
        const u = await getDoc(doc(db, 'users', d.id)).catch(() => null);
        if (u?.exists()) {
          const p = u.data() as UserProfile;
          name = p.displayName; handle = p.handle; photo = p.photoURL;
        }
        if (!name) return null;
        return { uid: d.id, role: (m.role ?? 'member') as Person['role'], title: m.title ?? '', name, handle, photo };
      }));
      setPeople((list.filter(Boolean) as Person[]).sort((a, b) => ORDER[a.role] - ORDER[b.role] || a.name.localeCompare(b.name, 'tr')));
    })().catch(() => setPeople([]));
  }, [projectId]);

  if (people === null) return <div className="center" style={{ minHeight: 80 }}><div className="spinner" /></div>;
  if (!people.length) return <div className="empty" style={{ padding: '20px 24px' }}>Ekip bilgisi henüz yok.</div>;

  return (
    <div className="team-grid">
      {people.map((p) => {
        const inner = (
          <>
            <Avatar name={p.name} src={p.photo} size={48} />
            <div style={{ minWidth: 0 }}>
              <div className="post-name" style={{ fontSize: 15 }}>{p.name}</div>
              <div className="meta" style={{ fontSize: 12 }}>
                <span className={`role-${p.role}`}>{ROLE_LABEL[p.role]}</span>
                {p.title && p.role === 'member' ? ` · ${p.title}` : ''}
              </div>
            </div>
          </>
        );
        return p.handle
          ? <Link key={p.uid} href={`/profil/${p.handle}`} className="team-card">{inner}</Link>
          : <div key={p.uid} className="team-card">{inner}</div>;
      })}
    </div>
  );
}
