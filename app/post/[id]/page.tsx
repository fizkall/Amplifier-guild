'use client';

import { collection, doc, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Composer } from '@/components/Composer';
import { PostCard, type PostWithId } from '@/components/PostCard';
import { db, firebaseReady } from '@/lib/firebase';

function Thread({ id }: { id: string }) {
  const [post, setPost] = useState<PostWithId | null | undefined>(undefined);
  const [replies, setReplies] = useState<PostWithId[]>([]);

  useEffect(() => onSnapshot(doc(db, 'posts', id),
    (s) => setPost(s.exists() ? { id: s.id, ...(s.data() as Omit<PostWithId, 'id'>) } : null),
    () => setPost(null)), [id]);

  useEffect(() => onSnapshot(
    query(collection(db, 'posts'), where('parentId', '==', id), where('status', '==', 'published'), orderBy('createdAt', 'asc')),
    (s) => setReplies(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PostWithId, 'id'>) }))),
    (e) => console.error(e)), [id]);

  if (post === undefined) return <div className="center" style={{ minHeight: 200 }}><div className="spinner" /></div>;
  if (post === null) return <div className="empty">Gönderi bulunamadı.</div>;

  return (
    <>
      <PostCard post={post} showThreadLine={replies.length > 0} />
      <Composer parent={{ id: post.id, rootId: post.rootId }} placeholder={`@${post.authorSnapshot.handle} kullanıcısına yanıt ver`} />
      {replies.map((r) => <PostCard key={r.id} post={r} />)}
    </>
  );
}

export default function ThreadPage() {
  const { id } = useParams<{ id: string }>();
  return <AppShell title="Gönderi">{firebaseReady && <Thread id={id} />}</AppShell>;
}
