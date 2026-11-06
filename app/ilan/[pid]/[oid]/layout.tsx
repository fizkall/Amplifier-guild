import type { Metadata } from 'next';
import { clip, getPublicDoc, SITE, str } from '@/lib/server-firestore';

export async function generateMetadata({ params }: { params: Promise<{ pid: string; oid: string }> }): Promise<Metadata> {
  const { pid, oid } = await params;
  const o = await getPublicDoc(`projects/${encodeURIComponent(pid)}/opportunities/${encodeURIComponent(oid)}`);
  if (!o) return { title: 'İlan', description: 'Amplifier Guild ilanı.' };
  const title = str(o, 'title');
  const org = o.fields?.projectSnapshot?.mapValue?.fields?.name?.stringValue ?? '';
  const description = clip(str(o, 'description') || `${org} ekibine katıl: ${title}`);
  const url = `${SITE}/ilan/${pid}/${oid}`;
  return {
    title: org ? `${title} · ${org}` : title,
    description,
    alternates: { canonical: url },
    openGraph: { title: `${title}${org ? ` · ${org}` : ''}`, description, url, type: 'website' },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
