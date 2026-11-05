import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/lib/auth';
import './globals.css';

export const metadata: Metadata = {
  title: 'Amfiplier Guild',
  description:
    'FRC ve etkinlik topluluklarındaki öğrencileri girişimler ve projelerle buluşturan lonca. Network, gerçek proje deneyimi ve doğrulanmış CV.',
  metadataBase: new URL('https://amplifierguild.online'),
  openGraph: { title: 'Amfiplier Guild', description: "Amfi'den sahneye — potansiyelini yükselt.", images: ['/logo.png'] },
};

export const viewport: Viewport = { themeColor: '#000000', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
