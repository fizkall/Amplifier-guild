/* eslint-disable @next/next/no-img-element */
import type { Metadata } from 'next';
import Link from 'next/link';
import { About } from '@/components/About';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  alternates: { canonical: '/hakkinda' },
  title: 'Hakkında',
  description: 'Genç yetenekleri projeler ve girişimlerle buluşturan ekosistem: insan kaynağı, network, görünürlük, operasyonel destek ve sürdürülebilir yetenek havuzu.',
};

export default function HakkindaPage() {
  return (
    <main>
      <header className="about-top">
        <Link href="/" aria-label="Ana sayfaya dön"><img className="logo-img" src="/logo.png" alt="Amplifier Guild logosu" width={40} height={40} /></Link>
        <h1 className="h1">Hakkında</h1>
      </header>
      <About />
      <Footer />
    </main>
  );
}
