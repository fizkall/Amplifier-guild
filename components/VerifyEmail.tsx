'use client';

import { useEffect, useState } from 'react';
import { authErrorMessage, useAuth } from '@/lib/auth';

/** E-posta/şifre ile kayıt olan kullanıcı, doğrulama linkine tıklayana kadar bu ekranı görür. */
export function VerifyEmail() {
  const { user, resendVerification, refreshVerification, signOut } = useAuth();
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Kullanıcı başka sekmede linke tıklayınca otomatik algıla
  useEffect(() => {
    const t = setInterval(() => { refreshVerification().catch(() => {}); }, 5000);
    const onFocus = () => { refreshVerification().catch(() => {}); };
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(t); window.removeEventListener('focus', onFocus); };
  }, [refreshVerification]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function check() {
    setBusy(true);
    setMsg('');
    try {
      if (!(await refreshVerification())) setMsg('Henüz doğrulanmamış görünüyor. Gelen kutunu (ve spam klasörünü) kontrol et.');
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setMsg('');
    try {
      await resendVerification();
      setMsg('Doğrulama e-postası tekrar gönderildi.');
      setCooldown(60);
    } catch (e) {
      setMsg(authErrorMessage(e));
    }
  }

  return (
    <main className="hero">
      <div style={{ fontSize: 44 }} aria-hidden>✉️</div>
      <h1 style={{ fontSize: 28 }}>E-postanı doğrula</h1>
      <p>
        <b style={{ color: 'var(--text)' }}>{user?.email}</b> adresine bir doğrulama linki gönderdik.
        Linke tıkladıktan sonra bu sayfa kendiliğinden devam edecek.
      </p>
      <div className="row" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
        <button className="btn btn-primary btn-lg" disabled={busy} onClick={check}>Doğruladım</button>
        <button className="btn btn-lg" disabled={cooldown > 0} onClick={resend}>
          {cooldown > 0 ? `Tekrar gönder (${cooldown})` : 'Tekrar gönder'}
        </button>
      </div>
      {msg && <p className="meta" role="status">{msg}</p>}
      <button className="btn" onClick={() => signOut()}>Farklı hesapla giriş yap</button>
    </main>
  );
}
