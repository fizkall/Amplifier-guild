import type { SocialKey } from '@/shared/models';
import { SOCIALS } from '@/lib/image';

export function SocialLinks({ links }: { links: Partial<Record<SocialKey, string>> | undefined }) {
  const items = SOCIALS.filter((s) => links?.[s.key]);
  if (!items.length) return null;
  return (
    <div className="chips">
      {items.map((s) => (
        <a key={s.key} href={links![s.key]} target="_blank" rel="noopener noreferrer" className="chip">{s.label} ↗</a>
      ))}
    </div>
  );
}
