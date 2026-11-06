'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { firebaseReady } from '@/lib/firebase';

const KEY = 'ag-cookie-consent'; // 'all' | 'essential'

/** Analytics'i yalnızca kullanıcı onay verdiyse başlatır (KVKK). */
async function startAnalytics() {
  if (!firebaseReady || process.env.NEXT_PUBLIC_USE_EMULATORS === '1') return;
  const [{ getApp }, { getAnalytics, isSupported, setAnalyticsCollectionEnabled }] = await Promise.all([
    import('firebase/app'), import('firebase/analytics'),
  ]);
  if (!(await isSupported())) return;
  const a = getAnalytics(getApp());
  setAnalyticsCollectionEnabled(a, true);
}

export function CookieConsent() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let v: string | null = null;
    try { v = localStorage.getItem(KEY); } catch { /* yok say */ }
    if (v === 'all') startAnalytics().catch(() => {});
    else if (!v) setShow(true);
    const reopen = () => setShow(true);
    window.addEventListener('ag-cookie-settings', reopen);
    return () => window.removeEventListener('ag-cookie-settings', reopen);
  }, []);

  function choose(v: 'all' | 'essential') {
    try { localStorage.setItem(KEY, v); } catch { /* yok say */ }
    setShow(false);
    if (v === 'all') startAnalytics().catch(() => {});
    else window.location.reload(); // açıksa analytics'i kapatmak için
  }

  if (!show) return null;
  return (
    <div className="cookie-bar" role="dialog" aria-live="polite" aria-label="Çerez bildirimi">
      <p>
        🍪 Siteyi çalıştırmak için zorunlu çerezler kullanıyoruz. İzin verirsen siteyi geliştirmek için anonim
        kullanım istatistikleri (Google Analytics) de toplarız. <Link href="/kvkk#cerezler">Ayrıntılar</Link>
      </p>
      <div className="row" style={{ gap: 8, flexShrink: 0 }}>
        <button className="btn" onClick={() => choose('essential')}>Sadece zorunlu</button>
        <button className="btn btn-primary" onClick={() => choose('all')}>Kabul et</button>
      </div>
    </div>
  );
}

/** Ayarlar / alt bilgide "Çerez tercihleri" bağlantısı. */
export function openCookieSettings() {
  try { localStorage.removeItem(KEY); } catch { /* yok say */ }
  window.dispatchEvent(new Event('ag-cookie-settings'));
}
