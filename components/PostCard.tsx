'use client';

import Link from 'next/link';
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, type Timestamp } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import type { Post } from '@/shared/models';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { timeAgo } from '@/lib/format';
import { Avatar } from './Avatar';
import { CheckIcon, HeartIcon, ReplyIcon } from './Icons';

export type PostWithId = Post & { id: string };

export function PostCard({ post, showThreadLine }: { post: PostWithId; showThreadLine?: boolean }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [count, setCount] = useState(post.likeCount);
  const a = post.authorSnapshot;

  useEffect(() => setCount(post.likeCount), [post.likeCount]);
  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'posts', post.id, 'likes', user.uid)).then((s) => setLiked(s.exists())).catch(() => {});
  }, [post.id, user]);

  async function toggleLike() {
    if (!user) return;
    const ref = doc(db, 'posts', post.id, 'likes', user.uid);
    const next = !liked;
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));
    try {
      if (next) await setDoc(ref, { createdAt: serverTimestamp() });
      else await deleteDoc(ref);
    } catch {
      setLiked(!next);
      setCount((c) => c + (next ? -1 : 1));
    }
  }

  return (
    <article className="post">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Link href={`/u/${a.handle}`}><Avatar name={a.displayName} src={a.photoURL} /></Link>
        {showThreadLine && <div className="thread-line" />}
      </div>
      <div>
        <div className="post-head">
          <Link href={`/u/${a.handle}`} className="post-name">{a.displayName}</Link>
          {a.badges?.includes('verified_frc') && <span className="verified" title="Doğrulanmış"><CheckIcon /></span>}
          <span className="meta">@{a.handle} · {timeAgo(post.createdAt as unknown as Timestamp)}</span>
        </div>
        {post.projectSnapshot && (
          <div className="meta">▸ <Link href={`/p/${post.projectSnapshot.slug}`}>{post.projectSnapshot.name}</Link> adına</div>
        )}
        <Link href={`/post/${post.id}`}><p className="post-text">{post.text}</p></Link>
        {post.opportunityRef && (
          <Link href="/jobs" className="chip solid" style={{ display: 'inline-block', marginBottom: 8 }}>
            💼 {post.opportunityRef.title} · Başvur →
          </Link>
        )}
        <div className="actions">
          <button className={`act${liked ? ' liked' : ''}`} onClick={toggleLike} aria-pressed={liked} aria-label="Beğen">
            <HeartIcon filled={liked} /> {count > 0 && count}
          </button>
          <Link className="act" href={`/post/${post.id}`} aria-label="Yanıtla">
            <ReplyIcon /> {post.replyCount > 0 && post.replyCount}
          </Link>
        </div>
      </div>
    </article>
  );
}
