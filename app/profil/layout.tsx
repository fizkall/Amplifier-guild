import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Profil',
  description: 'Amplifier Guild üyesinin yetenek profili ve doğrulanmış deneyimleri.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
