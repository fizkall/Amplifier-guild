'use client';
/* eslint-disable @next/next/no-img-element */

import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { Footer } from '@/components/Footer';
import { SetupNotice } from '@/components/SetupNotice';
import { authErrorMessage, useAuth } from '@/lib/auth';
import { firebaseReady } from '@/lib/firebase';

type Mode = 'signin' | 'signup' | 'reset';

export default function Login() {
  const { user, profile, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');

  useEffect(() => {
    if (loading || !user) return;
    router.replace(profile?.onboardingComplete ? '/ana-sayfa' : '/profil-olustur');
  }, [user, profile, loading, router]);

  function switchMode(m: Mode) {
    setMode(m);
    setErr('');
    setInfo('');
  }

  async function google() {
    setErr('');
    try {
      await signInWithGoogle();
    } catch (e) {
      if ((e as { code?: string })?.code !== 'auth/popup-closed-by-user') setErr(authErrorMessage(e));
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    setInfo('');
    try {
      if (mode === 'signin') await signInWithEmail(email, password);
      else if (mode === 'signup') await signUpWithEmail(name, email, password);
      else {
        await resetPassword(email);
        setInfo('Şifre sıfırlama linki gönderildi. Gelen kutunu kontrol et.');
      }
    } catch (e2) {
      setErr(authErrorMessage(e2));
    } finally {
      setBusy(false);
    }
  }

  const title = { signin: 'Loncaya giriş', signup: 'Hesap oluştur', reset: 'Şifreni sıfırla' }[mode];
  const cta = { signin: 'Giriş yap', signup: 'Kayıt ol', reset: 'Sıfırlama linki gönder' }[mode];

  return (
    <main className="hero" style={{ gap: 18 }}>
      <img className="logo-img" src="/logo.png" alt="" width={84} height={84} />
      <h1 style={{ fontSize: 30 }}>{title}</h1>

      {!firebaseReady ? (
        <SetupNotice />
      ) : (
        <div style={{ width: '100%', maxWidth: 360 }} className="stack">
          {mode !== 'reset' && (
            <>
              <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={google}>
                Google ile devam et
              </button>
              <div className="row meta" style={{ gap: 10, margin: '6px 0' }}>
                <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />veya
                <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>
            </>
          )}

          <form onSubmit={submit} className="stack" style={{ textAlign: 'left' }} noValidate>
            {mode === 'signup' && (
              <input className="input" placeholder="Ad Soyad" autoComplete="name" value={name}
                onChange={(e) => setName(e.target.value)} aria-label="Ad Soyad" />
            )}
            <input className="input" type="email" placeholder="E-posta" autoComplete="email" value={email}
              onChange={(e) => setEmail(e.target.value)} aria-label="E-posta" required />
            {mode !== 'reset' && (
              <input className="input" type="password" placeholder={mode === 'signup' ? 'Şifre (en az 6 karakter)' : 'Şifre'}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password}
                onChange={(e) => setPassword(e.target.value)} aria-label="Şifre" required minLength={6} />
            )}
            <button type="submit" className="btn btn-lg" style={{ width: '100%' }}
              disabled={busy || !email || (mode !== 'reset' && !password) || (mode === 'signup' && !name.trim())}>
              {busy ? 'Bekle…' : cta}
            </button>
          </form>

          {err && <div className="error" role="alert">{err}</div>}
          {info && <div className="meta" role="status">{info}</div>}

          <div className="stack meta" style={{ gap: 6, marginTop: 4 }}>
            {mode === 'signin' && (
              <>
                <button className="link-btn" onClick={() => switchMode('reset')}>Şifreni mi unuttun?</button>
                <span>Hesabın yok mu? <button className="link-btn strong" onClick={() => switchMode('signup')}>Kayıt ol</button></span>
              </>
            )}
            {mode === 'signup' && (
              <span>Zaten üye misin? <button className="link-btn strong" onClick={() => switchMode('signin')}>Giriş yap</button></span>
            )}
            {mode === 'reset' && (
              <button className="link-btn strong" onClick={() => switchMode('signin')}>← Girişe dön</button>
            )}
          </div>
        </div>
      )}

      <a href="/hakkinda" className="link-btn strong">Amfiplier Guild nedir? →</a>
      <p className="meta" style={{ fontSize: 12, maxWidth: 360 }}>
        Devam ederek KVKK aydınlatma metnini ve kullanım koşullarını kabul etmiş olursun.
      </p>
      <Footer />
    </main>
  );
}
