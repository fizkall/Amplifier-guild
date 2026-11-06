import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Yönetim Paneli',
  description: 'Girişim ve projeleri, yöneticileri, ilanları ve mesajları yönet.',
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
