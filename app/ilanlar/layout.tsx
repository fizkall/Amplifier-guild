import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'İlanlar',
  description: 'Girişim ve projelerin açık pozisyonları: yeteneklerine göre uyum skoru, site içinden tek tıkla başvuru.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
