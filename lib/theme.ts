'use client';

import { useEffect, useState } from 'react';

export type Theme = 'system' | 'dark' | 'light';
export type TextSize = 'normal' | 'large';

import { SIZE_KEY, THEME_KEY } from './theme-script';

function read<T extends string>(key: string, fallback: T): T {
  try { return (localStorage.getItem(key) as T) || fallback; } catch { return fallback; }
}

export function useAppearance() {
  const [theme, setThemeState] = useState<Theme>('system');
  const [size, setSizeState] = useState<TextSize>('normal');
  useEffect(() => {
    setThemeState(read<Theme>(THEME_KEY, 'system'));
    setSizeState(read<TextSize>(SIZE_KEY, 'normal'));
  }, []);

  function setTheme(t: Theme) {
    setThemeState(t);
    const el = document.documentElement;
    if (t === 'system') delete el.dataset.theme; else el.dataset.theme = t;
    try { if (t === 'system') localStorage.removeItem(THEME_KEY); else localStorage.setItem(THEME_KEY, t); } catch { /* yok say */ }
  }
  function setSize(s: TextSize) {
    setSizeState(s);
    const el = document.documentElement;
    if (s === 'normal') delete el.dataset.size; else el.dataset.size = s;
    try { if (s === 'normal') localStorage.removeItem(SIZE_KEY); else localStorage.setItem(SIZE_KEY, s); } catch { /* yok say */ }
  }
  return { theme, setTheme, size, setSize };
}
