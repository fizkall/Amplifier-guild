'use client';

import { collection, getDocs, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Composer } from '@/components/Composer';
import { PostCard, type PostWithId } from '@/components/PostCard';
import { useAuth } from '@/lib/auth';
import { db, firebaseReady } from '@/lib/firebase';

type Tab = 'all' | 'following';

function Feed() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('all');
  const [posts, setPosts] = useState<PostWithId[] | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!user) return;
    setPosts(null);
    setErr('');
    const base = [where('status', '==', 'published'), where('parentId', '==', null), orderBy('createdAt', 'desc'), limit(30)];

    if (tab === 'all') {
      return onSnapshot(
        query(collection(db, 'posts'), ...base),
        (s) => setPosts(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PostWithId, 'id'>) }))),
        (e) => { console.error(e); setErr('Akış yüklenemedi.'); setPosts([]); },
      );
    }

    // Takip: Faz 1 pull modeli — takip edilenler 30'luk parçalar halinde
    let cancelled = false;
    (async () => {
      const f = await getDocs(query(collection(db, 'users', user.uid, 'following'), where('kind', '==', 'user')));
      const ids = [user.uid, ...f.docs.map((d) => d.id)];
      const chunks: string[][] = [];
      for (let i = 0; i < ids.length; i += 30) chunks.push(ids.slice(i, i + 30));
      const res = await Promise.all(chunks.map((c) =>
        getDocs(query(collection(db, 'posts'), where('status', '==', 'published'), where('parentId', '==', null),
          where('authorId', 'in', c), orderBy('createdAt', 'desc'), limit(30)))));
      const all = res.flatMap((s) => s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PostWithId, 'id'>) })));
      all.sort((a, b) => (b.createdAt?.seconds ?? Infinity) - (a.createdAt?.seconds ?? Infinity));
      if (!cancelled) setPosts(all.slice(0, 30));
    })().catch((e) => { console.error(e); if (!cancelled) { setErr('Akış yüklenemedi.'); setPosts([]); } });
    return () => { cancelled = true; };
  }, [tab, user]);

  return (
    <>
      <div className="tabs">
        <button className={`tab${tab === 'all' ? ' active' : ''}`} onClick={() => setTab('all')}>Senin için</button>
        <button className={`tab${tab === 'following' ? ' active' : ''}`} onClick={() => setTab('following')}>Takip</button>
      </div>
      <Composer />
      {err && <div className="empty error">{err}</div>}
      {posts === null ? (
        <div className="center" style={{ minHeight: 200 }}><div className="spinner" /></div>
      ) : posts.length === 0 && !err ? (
        <div className="empty">Henüz gönderi yok. İlk sesi sen çıkar 🎙️</div>
      ) : (
        posts.map((p) => <PostCard key={p.id} post={p} />)
      )}
    </>
  );
}

export default function FeedPage() {
  return <AppShell>{firebaseReady && <Feed />}</AppShell>;
}
