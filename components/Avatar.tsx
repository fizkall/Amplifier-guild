/* eslint-disable @next/next/no-img-element */
export function Avatar({ name, src, size = 36 }: { name?: string; src?: string | null; size?: number }) {
  const initial = (name ?? '?').trim().charAt(0).toLocaleUpperCase('tr-TR') || '?';
  return src ? (
    <img className="avatar" src={src} alt={name ? `${name} görseli` : 'Profil görseli'} width={size} height={size} style={{ width: size, height: size }} referrerPolicy="no-referrer" />
  ) : (
    <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.42 }} role="img" aria-label={name ? `${name} görseli` : 'Profil görseli'}>
      {initial}
    </div>
  );
}
