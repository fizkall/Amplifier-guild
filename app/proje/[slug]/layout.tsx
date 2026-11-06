import type { Metadata } from 'next';
import { clip, getPublicDoc, SITE, str } from '@/lib/server-firestore';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPublicDoc(`projects/${encodeURIComponent(slug)}`);
  if (!p) return { title: 'Proje', description: 'Amplifier Guild girişim ve proje sayfası.' };
  const name = str(p, 'name');
  const description = clip(str(p, 'tagline') || str(p, 'description') || `${name} — Amplifier Guild projesi`);
  return {
    title: name,
    description,
    alternates: { canonical: `${SITE}/proje/${slug}` },
    openGraph: { title: `${name} · Amplifier Guild`, description, url: `${SITE}/proje/${slug}`, type: 'website' },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
