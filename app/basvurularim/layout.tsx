import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Başvurularım',
  description: 'Yaptığın başvuruların durumunu takip et.',
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
