'use client';
/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { firebaseReady } from '@/lib/firebase';
import { Footer } from './Footer';
import { SetupNotice } from './SetupNotice';
import { Reactivate } from './Reactivate';
import { VerifyEmail } from './VerifyEmail';
import { HomeIcon, InboxIcon, JobsIcon, MenuIcon, SettingsIcon, UserIcon } from './Icons';

/** Giriş + onboarding korumalı, Threads tarzı uygulama iskeleti. */
export function AppShell({ title, children, publicPage = false }: { title?: string; children: ReactNode; publicPage?: boolean }) {
  const { user, profile, loading, emailVerified, signOut } = useAuth();
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    if (!firebaseReady || loading) return;
    try { if (sessionStorage.getItem('ag-deleting')) return; } catch { /* yok say */ }
    if (!user) { if (!publicPage) router.replace('/'); }
    else if (emailVerified && !profile?.onboardingComplete) router.replace('/profil-olustur');
  }, [user, profile, loading, emailVerified, router, publicPage]);

  const items = [
    { href: '/ana-sayfa', label: 'Ana Sayfa', Icon: HomeIcon },
    { href: '/ilanlar', label: 'İlanlar', Icon: JobsIcon },
    { href: '/basvurularim', label: 'Başvurularım', Icon: InboxIcon },
    { href: profile ? `/profil/${profile.handle}` : '/ana-sayfa', label: 'Profil', Icon: UserIcon },
    { href: '/ayarlar', label: 'Ayarlar', Icon: SettingsIcon },
  ];

  const nav = items.map(({ href, label, Icon }) => {
    const active = path === href || path.startsWith(`${href}/`);
    return (
      <Link key={label} href={href} className={`nav-btn${active ? ' active' : ''}`} aria-label={label} title={label}>
        <Icon filled={active} />
      </Link>
    );
  });

  if (firebaseReady && !loading && user && !emailVerified) return <VerifyEmail />;
  if (firebaseReady && !loading && user && (profile as { deactivated?: boolean } | null)?.deactivated) return <Reactivate />;

  const guest = publicPage && firebaseReady && !loading && !user;
  const ready = guest || (firebaseReady && !loading && user && profile?.onboardingComplete);
  const here = typeof window !== 'undefined' ? window.location.pathname : path;

  return (
    <div className="shell">
      <aside className="rail">
        <Link href="/ana-sayfa" aria-label="Amplifier Guild">
          <img className="logo-img" src="/logo.png" alt="Amplifier Guild — ana sayfa" width={38} height={38} />
        </Link>
        <nav>{guest ? null : nav}</nav>
        <button className="nav-btn" style={guest ? { visibility: 'hidden' } : undefined} aria-label="Çıkış yap" title="Çıkış yap" onClick={() => signOut().then(() => router.push('/'))}>
          <MenuIcon />
        </button>
      </aside>

      <main className="main">
        <header className="topbar">
          {title ? <span>{title}</span> : <img className="logo-img" src="/logo.png" alt="Amplifier Guild" />}
        </header>
        {!firebaseReady ? (
          <SetupNotice />
        ) : ready ? (
          <div className="panel">{children}</div>
        ) : (
          <div className="center"><div className="spinner" /></div>
        )}
        <Footer />
      </main>

      {guest ? (
        <nav className="bottom-bar guest-bar">
          <Link href={`/giris?mod=kayit&sonra=${encodeURIComponent(here)}`} className="btn btn-primary">Loncaya katıl</Link>
          <Link href={`/giris?sonra=${encodeURIComponent(here)}`} className="btn">Giriş yap</Link>
        </nav>
      ) : (
        <nav className="bottom-bar">{nav}</nav>
      )}
    </div>
  );
}
