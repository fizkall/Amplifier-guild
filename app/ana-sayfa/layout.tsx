import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ana sayfa',
  description: 'Başvurularının durumu ve sana en uygun ilanlar.',
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
