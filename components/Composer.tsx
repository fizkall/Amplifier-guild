'use client';

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { Avatar } from './Avatar';

const MAX = 500;

export function Composer({ parent, placeholder = 'Neler oluyor?', onPosted }: {
  parent?: { id: string; rootId: string | null };
  placeholder?: string;
  onPosted?: () => void;
}) {
  const { profile } = useAuth();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  if (!profile) return null;

  async function submit() {
    const t = text.trim();
    if (!t || t.length > MAX || !profile) return;
    setBusy(true);
    setErr('');
    try {
      await addDoc(collection(db, 'posts'), {
        authorId: profile.uid,
        authorSnapshot: {
          displayName: profile.displayName, handle: profile.handle,
          photoURL: profile.photoURL, badges: profile.badges ?? [],
        },
        projectId: null, projectSnapshot: null, type: 'text', text: t, media: [], link: null,
        opportunityRef: null, mentions: [], tags: Array.from(t.matchAll(/#([\p{L}\d_]+)/gu), (m) => m[1].toLowerCase()),
        parentId: parent?.id ?? null, rootId: parent ? parent.rootId ?? parent.id : null,
        replyCount: 0, likeCount: 0, repostCount: 0, status: 'published', pinned: false,
        createdAt: serverTimestamp(), editedAt: null,
      });
      setText('');
      onPosted?.();
    } catch (e) {
      setErr('Gönderilemedi. E-postanın doğrulandığından emin ol.');
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  const left = MAX - text.length;
  return (
    <div className="composer">
      <Avatar name={profile.displayName} src={profile.photoURL} />
      <div>
        <div className="post-name">{profile.displayName}</div>
        <textarea
          value={text} rows={2} placeholder={placeholder} maxLength={MAX + 50}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); }}
        />
        <div className="composer-foot">
          <span className={left < 0 ? 'error' : 'meta'}>{text ? left : ''}</span>
          <button className="btn btn-primary" disabled={busy || !text.trim() || left < 0} onClick={submit}>
            {parent ? 'Yanıtla' : 'Paylaş'}
          </button>
        </div>
        {err && <div className="error">{err}</div>}
      </div>
    </div>
  );
}
