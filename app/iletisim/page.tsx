/* eslint-disable @next/next/no-img-element */
import type { Metadata } from 'next';
import Link from 'next/link';
import { ContactForm } from '@/components/ContactForm';
import { Footer, INSTAGRAM_URL } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'İletişim · Amplifier Guild',
  description: 'Amplifier Guild ile iletişime geç: soru, öneri, girişim/proje başvurusu veya KVKK talebi.',
};

const EMAIL = 'fizkall34en@gmail.com';

export default function IletisimPage() {
  return (
    <main>
      <header className="about-top">
        <Link href="/" aria-label="Ana sayfaya dön"><img className="logo-img" src="/logo.png" alt="" width={40} height={40} /></Link>
        <h1 className="h1">İletişim</h1>
      </header>
      <div className="about">
        <section className="about-sec">
          <h2>Bize ulaş</h2>
          <p>Sorun, önerin ya da girişimini/projeni Guild&apos;e dahil etmek mi istiyorsun? Formu doldur, en kısa sürede dönelim.</p>
          <div className="features" style={{ marginTop: 8 }}>
            <a className="feature" href={`mailto:${EMAIL}`}><b>E-posta</b><span style={{ wordBreak: 'break-all' }}>{EMAIL}</span></a>
            <a className="feature" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer"><b>Instagram</b><span>@amplifierguild</span></a>
          </div>
        </section>
        <section className="about-sec">
          <h2>Mesaj gönder</h2>
          <ContactForm />
        </section>
      </div>
      <Footer />
    </main>
  );
}
