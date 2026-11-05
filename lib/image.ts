/**
 * Seçilen görseli tarayıcıda küçültüp data URL'ye çevirir (Firestore belgesine sığsın diye).
 * Storage gerektirmez. Logo için ~256px, ilan görseli için ~1200px önerilir.
 */
export async function imageToDataUrl(file: File, maxSize: number, quality = 0.8): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Lütfen bir görsel dosyası seç.');
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Görsel işlenemedi.');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  let url = canvas.toDataURL('image/webp', quality);
  if (!url.startsWith('data:image/webp')) url = canvas.toDataURL('image/jpeg', quality);
  // Belge boyutu sınırı (1 MB) için güvenlik payı
  if (url.length > 600_000) url = canvas.toDataURL('image/jpeg', 0.6);
  if (url.length > 750_000) throw new Error('Görsel çok büyük; daha küçük bir görsel dene.');
  return url;
}

export const SOCIALS: { key: 'website' | 'instagram' | 'linkedin' | 'x' | 'youtube' | 'github' | 'tiktok'; label: string; placeholder: string }[] = [
  { key: 'website', label: 'Web sitesi', placeholder: 'https://…' },
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/…' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/company/…' },
  { key: 'x', label: 'X (Twitter)', placeholder: 'https://x.com/…' },
  { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@…' },
  { key: 'github', label: 'GitHub', placeholder: 'https://github.com/…' },
  { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@…' },
];

/** http(s) ile başlamayan bağlantılara https:// ekler; geçersizse null. */
export function normalizeUrl(v: string): string | null {
  const t = v.trim();
  if (!t) return null;
  const withProto = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  try {
    const u = new URL(withProto);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
  } catch {
    return null;
  }
}
