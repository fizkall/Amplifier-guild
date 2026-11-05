'use client';

import { collection, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { isAdminUid } from '@/lib/admin';
import { useAuth } from '@/lib/auth';
import { db, firebaseReady } from '@/lib/firebase';
import { timeAgo } from '@/lib/format';

type Msg = { id: string; name: string; email: string; subject: string; message: string; topic: string; status: 'new' | 'read' | 'done'; createdAt: never };
const TOPIC: Record<string, string> = { genel: 'Genel', proje: 'Girişim/proje', destek: 'Destek', kvkk: 'KVKK', diger: 'Diğer' };

function Messages() {
  const { user } = useAuth();
  const [msgs, setMsgs] = useState<Msg[] | null>(null);
  const [filter, setFilter] = useState<'open' | 'all'>('open');
  const admin = isAdminUid(user?.uid);

  useEffect(() => {
    if (!admin) return;
    return onSnapshot(query(collection(db, 'messages'), orderBy('createdAt', 'desc')),
      (s) => setMsgs(s.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Msg, 'id'>) }))),
      () => setMsgs([]));
  }, [admin]);

  if (!admin) return <div className="empty">Bu sayfa yalnızca Guild yöneticilerine açık.</div>;
  if (msgs === null) return <div className="center" style={{ minHeight: 200 }}><div className="spinner" /></div>;
  const list = msgs.filter((m) => filter === 'all' || m.status !== 'done');

  return (
    <>
      <div className="pad chips">
        <button className={`chip${filter === 'open' ? ' on' : ''}`} onClick={() => setFilter('open')}>Açık {msgs.filter((m) => m.status !== 'done').length}</button>
        <button className={`chip${filter === 'all' ? ' on' : ''}`} onClick={() => setFilter('all')}>Tümü {msgs.length}</button>
      </div>
      {list.length === 0 ? <div className="empty">Mesaj yok.</div> : list.map((m) => (
        <div key={m.id} className="card stack" style={{ opacity: m.status === 'done' ? 0.6 : 1 }}>
          <div className="row spread" style={{ alignItems: 'flex-start' }}>
            <div style={{ minWidth: 0 }}>
              <div className="post-name">{m.status === 'new' && <span style={{ color: 'var(--verified)' }}>● </span>}{m.subject || '(başlıksız)'}</div>
              <div className="meta">{m.name} · <a href={`mailto:${m.email}`} style={{ textDecoration: 'underline' }}>{m.email}</a> · {timeAgo(m.createdAt)}</div>
            </div>
            <span className="chip solid" style={{ fontSize: 12 }}>{TOPIC[m.topic] ?? m.topic}</span>
          </div>
          <p className="post-text" style={{ margin: 0 }}>{m.message}</p>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <a className="btn btn-primary" href={`mailto:${m.email}?subject=${encodeURIComponent('Re: ' + (m.subject || 'Amplifier Guild'))}`} onClick={() => m.status === 'new' && updateDoc(doc(db, 'messages', m.id), { status: 'read' })}>Yanıtla</a>
            {m.status !== 'done'
              ? <button className="btn" onClick={() => updateDoc(doc(db, 'messages', m.id), { status: 'done' })}>Tamamlandı</button>
              : <button className="btn" onClick={() => updateDoc(doc(db, 'messages', m.id), { status: 'read' })}>Yeniden aç</button>}
            <button className="btn" onClick={() => confirm('Mesaj silinsin mi?') && deleteDoc(doc(db, 'messages', m.id))}>Sil</button>
          </div>
        </div>
      ))}
    </>
  );
}

export default function MesajlarPage() {
  return <AppShell title="İletişim mesajları">{firebaseReady && <Messages />}</AppShell>;
}
