'use client';

import { useEffect, useState } from 'react';
import { detectPlatform, getInstallEvent, isStandalone, onInstallChange, type Platform } from '@/lib/install';

/** Ayarlar'ın altında her zaman görünen "Uygulamayı ana ekrana ekle" satırı. */
export function InstallAppRow() {
  const [installed, setInstalled] = useState(false);
  const [canPrompt, setCanPrompt] = useState(false);
  const [platform, setPlatform] = useState<Platform>('desktop');
  const [help, setHelp] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    setInstalled(isStandalone());
    setPlatform(detectPlatform());
    setCanPrompt(Boolean(getInstallEvent()));
    return onInstallChange(() => {
      setCanPrompt(Boolean(getInstallEvent()));
      if (!getInstallEvent() && !isStandalone()) setMsg('');
    });
  }, []);

  async function install() {
    setMsg('');
    const evt = getInstallEvent();
    if (evt) {
      await evt.prompt();
      const { outcome } = await evt.userChoice;
      if (outcome === 'accepted') { setMsg('Uygulama ana ekranına ekleniyor ✓'); setCanPrompt(false); }
      return;
    }
    setHelp((h) => !h);
  }

  if (installed) {
    return (
      <div className="set-row">
        <div><div style={{ fontWeight: 600 }}>Uygulama yüklü ✓</div><div className="meta">Amplifier Guild&apos;i ana ekrandan kullanıyorsun.</div></div>
      </div>
    );
  }

  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="pad stack" style={{ gap: 10 }}>
        <div className="row" style={{ gap: 12 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="Amplifier Guild uygulama simgesi" width={48} height={48} style={{ borderRadius: 12, border: '1px solid var(--border)' }} />
          <div>
            <div style={{ fontWeight: 600 }}>Uygulamayı ana ekrana ekle</div>
            <div className="meta">Tek dokunuşla aç, tam ekran kullan; ilanlara ve başvurularına hızlıca ulaş.</div>
          </div>
        </div>
        <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={install}>
          📲 {canPrompt ? 'Ana ekrana ekle' : help ? 'Yol tarifini gizle' : 'Ana ekrana ekle'}
        </button>
        {msg && <div className="meta" role="status" style={{ color: 'var(--success)' }}>{msg}</div>}
        {help && !canPrompt && (
          <ol className="install-steps">
            {platform === 'ios' && (<>
              <li><b>Safari</b> ile aç (Chrome veya Instagram içinden açtıysan önce Safari&apos;de aç).</li>
              <li>Alttaki <b>Paylaş</b> butonuna dokun (yukarı oklu kare □↑).</li>
              <li>Listeyi kaydırıp <b>Ana Ekrana Ekle</b>&apos;yi seç.</li>
              <li>Sağ üstten <b>Ekle</b>&apos;ye dokun.</li>
            </>)}
            {platform === 'android' && (<>
              <li><b>Chrome</b> ile aç (Instagram/WhatsApp içinden açtıysan &quot;Chrome&apos;da aç&quot; de).</li>
              <li>Sağ üstteki <b>⋮</b> menüye dokun.</li>
              <li><b>Uygulamayı yükle</b> ya da <b>Ana ekrana ekle</b>&apos;yi seç.</li>
              <li><b>Yükle</b>&apos;ye dokun.</li>
            </>)}
            {platform === 'desktop' && (<>
              <li><b>Chrome</b> veya <b>Edge</b> kullan.</li>
              <li>Adres çubuğunun sağındaki <b>yükle</b> simgesine (⊕ / ekran ve ok) tıkla.</li>
              <li>Ya da menüden <b>Uygulamayı yükle / Amplifier Guild&apos;i yükle</b>&apos;yi seç.</li>
            </>)}
          </ol>
        )}
      </div>
    </div>
  );
}
