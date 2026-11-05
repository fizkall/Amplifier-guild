'use client';

import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Experience, UserProfile } from '@/shared/models';
import { AppShell } from '@/components/AppShell';
import { Avatar } from '@/components/Avatar';
import { CheckIcon } from '@/components/Icons';
import { PostCard, type PostWithId } from '@/components/PostCard';
import { db, firebaseReady } from '@/lib/firebase';

type Tab = 'posts' | 'cv';

function Profile({ handle }: { handle: string }) {
  const [user, setUser] = useState<UserProfile | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>('posts');
  const [posts, setPosts] = useState<PostWithId[]>([]);
  const [exps, setExps] = useState<(Experience & { id: string })[]>([]);

  useEffect(() => {
    (async () => {
      const h = await getDoc(doc(db, 'handles', handle.toLowerCase()));
      if (!h.exists()) return setUser(null);
      const uid = h.get('uid') as string;
      const u = await getDoc(doc(db, 'users', uid));
      setUser(u.exists() ? (u.data() as UserProfile) : null);
      const [p, e] = await Promise.all([
        getDocs(query(collection(db, 'posts'), where('authorId', '==', uid), where('parentId', '==', null),
          where('status', '==', 'published'), orderBy('createdAt', 'desc'), limit(30))),
        getDocs(collection(db, 'users', uid, 'experiences')),
      ]);
      setPosts(p.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PostWithId, 'id'>) })));
      setExps(e.docs.map((d) => ({ id: d.id, ...(d.data() as Experience) })).sort((a, b) => a.order - b.order));
    })().catch((e) => { console.error(e); setUser(null); });
  }, [handle]);

  if (user === undefined) return <div className="center" style={{ minHeight: 200 }}><div className="spinner" /></div>;
  if (user === null) return <div className="empty">Kullanıcı bulunamadı.</div>;

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
        <div className="chips">
          {user.programs?.map((p, i) => (
            <span key={i} className="chip solid">{p.program}{p.teamNumber ? ` #${p.teamNumber}` : ''}{p.role ? ` · ${p.role}` : ''}</span>
          ))}
          {user.openToWork && <span className="chip solid" style={{ color: 'var(--success)' }}>● Projelere açık</span>}
        </div>
        <div className="chips">{user.skills?.map((s) => <span key={s} className="chip">{s}</span>)}</div>
        <div className="meta">
          {user.stats?.followers ?? 0} takipçi · {user.stats?.projectsJoined ?? 0} proje
          {user.school ? ` · ${user.school.name}` : ''}
        </div>
      </div>
      <div className="tabs">
        <button className={`tab${tab === 'posts' ? ' active' : ''}`} onClick={() => setTab('posts')}>Gönderiler</button>
        <button className={`tab${tab === 'cv' ? ' active' : ''}`} onClick={() => setTab('cv')}>CV</button>
      </div>
      {tab === 'posts' ? (
        posts.length ? posts.map((p) => <PostCard key={p.id} post={p} />) : <div className="empty">Henüz gönderi yok.</div>
      ) : exps.length ? (
        exps.map((x) => (
          <div key={x.id} className="card">
            <div className="row" style={{ gap: 6 }}>
              <span className="post-name">{x.title}</span>
              {x.verified && <span className="verified" title="Amfiplier Guild tarafından doğrulandı"><CheckIcon /></span>}
            </div>
            <div className="meta">{x.organization} · {x.startDate}{x.endDate ? ` – ${x.endDate}` : ' – devam ediyor'}</div>
            {x.description && <p className="post-text" style={{ marginBottom: 0 }}>{x.description}</p>}
          </div>
        ))
      ) : (
        <div className="empty">Henüz deneyim eklenmemiş.</div>
      )}
    </>
  );
}

export default function ProfilePage() {
  const { handle } = useParams<{ handle: string }>();
  return <AppShell title={`@${decodeURIComponent(handle)}`}>{firebaseReady && <Profile handle={decodeURIComponent(handle)} />}</AppShell>;
}
