'use client';

/**
 * "Ana ekrana ekle" desteği. Tarayıcının beforeinstallprompt olayı sayfa açılışında bir kez gelir;
 * hangi sayfa açık olursa olsun yakalayıp saklarız ki Ayarlar'daki buton sonradan kullanabilsin.
 */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type W = Window & { __agInstall?: BeforeInstallPromptEvent | null; __agInstallInit?: boolean };
const listeners = new Set<() => void>();

export function initInstallCapture() {
  if (typeof window === 'undefined') return;
  const w = window as W;
  if (w.__agInstallInit) return;
  w.__agInstallInit = true;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    w.__agInstall = e as BeforeInstallPromptEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener('appinstalled', () => {
    w.__agInstall = null;
    listeners.forEach((l) => l());
  });
}

export function getInstallEvent(): BeforeInstallPromptEvent | null {
  return typeof window === 'undefined' ? null : (window as W).__agInstall ?? null;
}

export function onInstallChange(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export type Platform = 'ios' | 'android' | 'desktop';
export function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'desktop';
}
