'use client';

import { useEffect, useState } from 'react';
import { getInstallEvent, initInstallCapture, onInstallChange } from '@/lib/install';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const KEY = 'amplifier-install-dismissed';

/** "Ana ekrana ekle" kartı: Android/Chrome'da tek tık kurulum, iOS'ta yönerge. */
export function InstallPrompt({ variant = 'card' }: { variant?: 'card' | 'button' }) {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [hidden, setHidden] = useState(true);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    let dismissed = false;
    try { dismissed = localStorage.getItem(KEY) === '1'; } catch { /* yok say */ }
    if (standalone || (dismissed && variant === 'card')) return;

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIos(isIos);
    if (isIos) setHidden(false);

    initInstallCapture();
    const sync = () => {
      const e = getInstallEvent();
      setEvt(e);
      if (e) setHidden(false);
    };
    sync();
    return onInstallChange(sync);
  }, [variant]);

  if (hidden) return null;

  async function install() {
    if (evt) {
      await evt.prompt();
      const { outcome } = await evt.userChoice;
      if (outcome === 'accepted') setHidden(true);
      setEvt(null);
    } else if (ios) {
      setShowIosHelp(true);
    }
  }

  function dismiss() {
    try { localStorage.setItem(KEY, '1'); } catch { /* yok say */ }
    setHidden(true);
  }

  const help = showIosHelp && (
    <div className="meta" style={{ marginTop: 8 }}>
      Safari'de alttaki <b style={{ color: 'var(--text)' }}>Paylaş</b> (□↑) butonuna dokun →
      <b style={{ color: 'var(--text)' }}> Ana Ekrana Ekle</b> → <b style={{ color: 'var(--text)' }}>Ekle</b>.
    </div>
  );

  if (variant === 'button') {
    return (
      <div className="stack" style={{ alignItems: 'center' }}>
        <button className="btn btn-lg" onClick={install}>📲 Uygulamayı yükle</button>
        {help}
      </div>
    );
  }

  return (
    <div className="notice">
      <div className="row spread">
        <div>
          <b>Uygulamayı ana ekrana ekle</b>
          <div className="meta">İlanlara ve başvurularına tek dokunuşla ulaş.</div>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <button className="btn btn-primary" onClick={install}>Ekle</button>
          <button className="link-btn" onClick={dismiss} aria-label="Kapat">✕</button>
        </div>
      </div>
      {help}
    </div>
  );
}
