import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Keşfet',
  description: 'Amplifier Guild\'deki girişimleri, üyeleri ve açık alımları keşfet.',
  alternates: { canonical: '/kesfet' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
