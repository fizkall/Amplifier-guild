import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ayarlar',
  description: 'Profil, gizlilik, görünüm, şifre ve hesap ayarların.',
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
