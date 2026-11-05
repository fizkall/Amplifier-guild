'use client';

import { useEffect } from 'react';

const CURRENT = process.env.NEXT_PUBLIC_APP_VERSION ?? 'dev';

/**
 * Yeni sürüm yayınlandığında (özellikle ana ekrana eklenmiş uygulamada) eski kodla kalmamak için:
 * uygulama öne geldiğinde ve 5 dakikada bir /surum kontrol edilir, farklıysa sayfa yenilenir.
 */
export function UpdateChecker() {
  useEffect(() => {
    if (CURRENT === 'dev') return;
    let busy = false;
    const check = async () => {
      if (busy || document.visibilityState !== 'visible') return;
      busy = true;
      try {
        const r = await fetch('/surum', { cache: 'no-store' });
        const { version } = (await r.json()) as { version: string };
        if (version && version !== 'dev' && version !== CURRENT) {
          const reg = await navigator.serviceWorker?.getRegistration();
          await reg?.update().catch(() => {});
          window.location.reload();
        }
      } catch { /* çevrimdışı: yok say */ } finally { busy = false; }
    };
    check();
    const t = setInterval(check, 5 * 60 * 1000);
    document.addEventListener('visibilitychange', check);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', check); };
  }, []);
  return null;
}
