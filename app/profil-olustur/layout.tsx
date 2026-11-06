import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Profilini oluştur',
  description: 'Yeteneklerini, takım geçmişini ve okulunu ekleyerek CV\'ni 2 dakikada oluştur.',
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
