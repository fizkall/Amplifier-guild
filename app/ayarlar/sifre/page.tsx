'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { AppShell } from '@/components/AppShell';
import { authErrorMessage, useAuth } from '@/lib/auth';
import { firebaseReady } from '@/lib/firebase';

function PasswordForm() {
  const { user, hasPassword, changePassword, addPassword, resetPassword } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(''); setMsg('');
    if (next.length < 6) return setErr('Yeni şifre en az 6 karakter olmalı.');
    if (next !== again) return setErr('Yeni şifreler eşleşmiyor.');
    setBusy(true);
    try {
      if (hasPassword) await changePassword(current, next); else await addPassword(next);
      setMsg(hasPassword ? 'Şifren değiştirildi ✓' : 'Şifren oluşturuldu ✓ Artık e-posta ve şifreyle de giriş yapabilirsin.');
      setCurrent(''); setNext(''); setAgain('');
    } catch (e2) {
      setErr(authErrorMessage(e2));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="pad" onSubmit={submit}>
      <p className="meta" style={{ marginTop: 0 }}>
        {hasPassword ? 'Güvenliğin için önce mevcut şifreni gir.' : 'Hesabına Google ile giriş yapıyorsun. Buradan bir şifre oluşturursan e-posta ve şifreyle de girebilirsin; onay için Google penceresi açılacak.'}
      </p>
      <input type="email" autoComplete="username" value={user?.email ?? ''} readOnly hidden />
      {hasPassword && (
        <div className="field">
          <label htmlFor="pw-cur">Mevcut şifre</label>
          <input id="pw-cur" className="input" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
        </div>
      )}
      <div className="field">
        <label htmlFor="pw-new">Yeni şifre</label>
        <input id="pw-new" className="input" type="password" autoComplete="new-password" minLength={6} value={next} onChange={(e) => setNext(e.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor="pw-again">Yeni şifre (tekrar)</label>
        <input id="pw-again" className="input" type="password" autoComplete="new-password" minLength={6} value={again} onChange={(e) => setAgain(e.target.value)} required />
      </div>
      {err && <p className="error" role="alert">{err}</p>}
      {msg && <p className="meta" role="status" style={{ color: 'var(--success)' }}>{msg}</p>}
      <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={busy}>{busy ? 'Kaydediliyor…' : hasPassword ? 'Şifreyi değiştir' : 'Şifre oluştur'}</button>
      {hasPassword && (
        <p className="meta" style={{ textAlign: 'center' }}>
          Mevcut şifreni hatırlamıyor musun?{' '}
          <button type="button" className="link-btn strong" onClick={async () => { await resetPassword(user!.email!); setMsg('Şifre sıfırlama bağlantısı e-postana gönderildi.'); }}>Sıfırlama e-postası gönder</button>
        </p>
      )}
      <p style={{ textAlign: 'center' }}><Link href="/ayarlar" className="link-btn">← Ayarlar</Link></p>
    </form>
  );
}

export default function SifrePage() {
  return <AppShell title="Şifre">{firebaseReady && <PasswordForm />}</AppShell>;
}
