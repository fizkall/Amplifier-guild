'use client';

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '@/lib/auth';
import { db, firebaseReady } from '@/lib/firebase';

const TOPICS = [
  ['genel', 'Genel soru'], ['proje', 'Girişim / proje olarak katılmak'], ['destek', 'Teknik destek'],
  ['kvkk', 'KVKK / veri talebi'], ['diger', 'Diğer'],
] as const;

export function ContactForm() {
  const { user, profile } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState<(typeof TOPICS)[number][0]>('genel');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (profile && !name) setName(profile.displayName);
    if (user?.email && !email) setEmail(user.email);
  }, [profile, user]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr('');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setErr('Geçerli bir e-posta adresi gir.');
    if (!message.trim()) return setErr('Mesajını yaz.');
    setBusy(true);
    try {
      await addDoc(collection(db, 'messages'), {
        name: name.trim().slice(0, 80), email: email.trim().slice(0, 120), subject: subject.trim().slice(0, 120),
        message: message.trim().slice(0, 3000), topic, status: 'new', uid: user?.uid ?? null, createdAt: serverTimestamp(),
      });
      setSent(true);
    } catch (e2) {
      console.error(e2);
      setErr('Mesaj gönderilemedi. Lütfen e-posta ile ulaş.');
    } finally {
      setBusy(false);
    }
  }

  if (!firebaseReady) return null;
  if (sent) {
    return (
      <div className="notice" style={{ margin: 0, textAlign: 'center' }}>
        <div style={{ fontSize: 32 }} aria-hidden>✉️</div>
        <b>Mesajın bize ulaştı.</b>
        <p className="meta">En kısa sürede {email} adresine dönüş yapacağız.</p>
        <button className="btn" onClick={() => { setSent(false); setSubject(''); setMessage(''); }}>Yeni mesaj</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="stack" style={{ gap: 0 }} noValidate>
      <div className="row" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div className="field" style={{ flex: '1 1 200px' }}><label htmlFor="c-name">Ad soyad *</label><input id="c-name" className="input" autoComplete="name" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} required /></div>
        <div className="field" style={{ flex: '1 1 200px' }}><label htmlFor="c-email">E-posta *</label><input id="c-email" className="input" type="email" autoComplete="email" maxLength={120} value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
      </div>
      <div className="field">
        <label htmlFor="c-topic">Konu türü</label>
        <select id="c-topic" className="input" value={topic} onChange={(e) => setTopic(e.target.value as typeof topic)}>
          {TOPICS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>
      <div className="field"><label htmlFor="c-subject">Başlık</label><input id="c-subject" className="input" maxLength={120} value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
      <div className="field"><label htmlFor="c-msg">Mesaj *</label><textarea id="c-msg" className="input" rows={6} maxLength={3000} value={message} onChange={(e) => setMessage(e.target.value)} required /></div>
      <p className="meta" style={{ fontSize: 12, marginTop: 0 }}>Gönderdiğin bilgiler yalnızca sana dönüş yapmak için kullanılır (<a href="/kvkk" style={{ textDecoration: 'underline' }}>KVKK</a>).</p>
      {err && <p className="error" role="alert">{err}</p>}
      <button className="btn btn-primary btn-lg" disabled={busy}>{busy ? 'Gönderiliyor…' : 'Gönder'}</button>
    </form>
  );
}
