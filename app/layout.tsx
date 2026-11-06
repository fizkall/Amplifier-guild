import type { Metadata, Viewport } from 'next';
import { ServiceWorker } from '@/components/ServiceWorker';
import { UpdateChecker } from '@/components/UpdateChecker';
import { CookieConsent } from '@/components/CookieConsent';
import { AuthProvider } from '@/lib/auth';
import { THEME_INIT_SCRIPT } from '@/lib/theme-script';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Amplifier Guild — Gençleri girişim ve projelerle buluşturan lonca', template: '%s · Amplifier Guild' },
  description:
    'FRC ve etkinlik topluluklarındaki öğrencileri girişimler ve projelerle buluşturan lonca. Network, gerçek proje deneyimi ve doğrulanmış CV.',
  metadataBase: new URL('https://amplifierguild.online'),
  openGraph: {
    type: 'website', locale: 'tr_TR', siteName: 'Amplifier Guild', url: '/',
    title: 'Amplifier Guild', description: "Amfi'den sahneye — gençleri girişim ve projelerle buluşturan lonca.",
  },
  twitter: { card: 'summary_large_image', title: 'Amplifier Guild', description: "Amfi'den sahneye — gençleri girişim ve projelerle buluşturan lonca." },
  applicationName: 'Amplifier Guild',
  appleWebApp: { capable: true, title: 'Amplifier', statusBarStyle: 'black-translucent' },
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
    <html lang="tr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
        <ServiceWorker />
        <UpdateChecker />
        <CookieConsent />
      </body>
    </html>
  );
}
