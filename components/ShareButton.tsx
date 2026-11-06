'use client';

import { useState } from 'react';

/** Telefonda paylaşım menüsünü açar (WhatsApp, Instagram…); desteklenmiyorsa linki kopyalar. */
export function ShareButton({ path, title, text, className = 'btn', label = 'Paylaş' }: {
  path: string; title: string; text?: string; className?: string; label?: string;
}) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== 'undefined' ? new URL(path, window.location.origin).toString() : path;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const t = document.createElement('textarea');
      t.value = url; document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); } finally { t.remove(); }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function share() {
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) {
      try { await nav.share({ title, text: text ?? title, url }); return; } catch (e) {
        if ((e as Error).name === 'AbortError') return;
      }
    }
    await copy();
  }

  return (
    <div className="row" style={{ gap: 6 }}>
      <button type="button" className={className} onClick={share} aria-label={`${label}: ${title}`}>↗ {label}</button>
      <button type="button" className="btn" onClick={copy} aria-live="polite">{copied ? 'Kopyalandı ✓' : '🔗 Linki kopyala'}</button>
    </div>
  );
}
