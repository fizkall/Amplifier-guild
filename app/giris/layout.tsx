import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Giriş yap',
  description: 'Amplifier Guild\'e Google veya e-posta ile giriş yap ya da ücretsiz hesap oluştur.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
