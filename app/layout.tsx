import type { Metadata, Viewport } from 'next';
import { ServiceWorker } from '@/components/ServiceWorker';
import { AuthProvider } from '@/lib/auth';
import './globals.css';

export const metadata: Metadata = {
  title: 'Amfiplier Guild',
  description:
    'FRC ve etkinlik topluluklarındaki öğrencileri girişimler ve projelerle buluşturan lonca. Network, gerçek proje deneyimi ve doğrulanmış CV.',
  metadataBase: new URL('https://amplifierguild.online'),
  openGraph: { title: 'Amfiplier Guild', description: "Amfi'den sahneye — potansiyelini yükselt.", images: ['/logo.png'] },
  applicationName: 'Amfiplier Guild',
  appleWebApp: { capable: true, title: 'Amfiplier', statusBarStyle: 'black-translucent' },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <AuthProvider>{children}</AuthProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
