/** Giriş/kayıt sonrası dönülecek sayfa (yalnızca site içi yollar). */
const KEY = 'ag-return-to';

export function rememberReturnTo() {
  try {
    const v = new URLSearchParams(window.location.search).get('sonra');
    if (v && v.startsWith('/') && !v.startsWith('//')) sessionStorage.setItem(KEY, v);
  } catch { /* yok say */ }
}

export function takeReturnTo(fallback: string): string {
  try {
    const v = sessionStorage.getItem(KEY);
    if (v) { sessionStorage.removeItem(KEY); return v; }
  } catch { /* yok say */ }
  return fallback;
}
