/* eslint-disable @next/next/no-img-element */
import type { Metadata } from 'next';
import Link from 'next/link';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = { title: 'Sayfa bulunamadı', robots: { index: false } };

export default function NotFound() {
  return (
    <main>
      <section className="hero" style={{ minHeight: '80dvh' }}>
        <img className="logo-img" src="/logo.png" alt="Amplifier Guild logosu" width={88} height={88} />
        <div className="bars bars-flat" aria-hidden><span /><span /><span /><span /><span /></div>
        <h1>404</h1>
        <p>Aradığın sayfa sessize alınmış ya da hiç var olmamış. Adres yanlış yazılmış olabilir veya ilan yayından kaldırılmış olabilir.</p>
        <div className="row" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href="/" className="btn btn-primary btn-lg">Ana sayfaya dön</Link>
          <Link href="/ilanlar" className="btn btn-lg">Açık ilanlar</Link>
        </div>
        <Link href="/iletisim" className="link-btn">Bir sorun olduğunu düşünüyorsan bize yaz →</Link>
      </section>
      <Footer />
    </main>
  );
}
