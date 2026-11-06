'use client';

import { useEffect } from 'react';
import { initInstallCapture } from '@/lib/install';

export function ServiceWorker() {
  useEffect(() => {
    initInstallCapture();
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);
  return null;
}
