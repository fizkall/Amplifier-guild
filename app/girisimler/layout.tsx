import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Girişimler',
  description: 'Amplifier Guild\'deki girişim ve projeler: ne yaptıkları, sosyal medya hesapları ve açık pozisyonları.',
  alternates: { canonical: '/girisimler' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
