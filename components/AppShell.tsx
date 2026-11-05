'use client';
/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { firebaseReady } from '@/lib/firebase';
import { SetupNotice } from './SetupNotice';
import { HomeIcon, InboxIcon, JobsIcon, MenuIcon, UserIcon } from './Icons';

/** Giriş + onboarding korumalı, Threads tarzı uygulama iskeleti. */
export function AppShell({ title, children }: { title?: string; children: ReactNode }) {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    if (!firebaseReady || loading) return;
    if (!user) router.replace('/login');
    else if (!profile?.onboardingComplete) router.replace('/onboarding');
  }, [user, profile, loading, router]);

  const items = [
    { href: '/feed', label: 'Akış', Icon: HomeIcon },
    { href: '/jobs', label: 'İlanlar', Icon: JobsIcon },
    { href: '/me/applications', label: 'Başvurularım', Icon: InboxIcon },
    { href: profile ? `/u/${profile.handle}` : '/feed', label: 'Profil', Icon: UserIcon },
  ];

  const nav = items.map(({ href, label, Icon }) => {
    const active = path === href || (href !== '/feed' && path.startsWith(href));
    return (
      <Link key={label} href={href} className={`nav-btn${active ? ' active' : ''}`} aria-label={label} title={label}>
        <Icon filled={active} />
      </Link>
    );
  });

  const ready = firebaseReady && !loading && user && profile?.onboardingComplete;

  return (
    <div className="shell">
      <aside className="rail">
        <Link href="/feed" aria-label="Amfiplier Guild">
          <img className="logo-img" src="/logo.png" alt="" width={38} height={38} />
        </Link>
        <nav>{nav}</nav>
        <button className="nav-btn" aria-label="Çıkış yap" title="Çıkış yap" onClick={() => signOut().then(() => router.push('/'))}>
          <MenuIcon />
        </button>
      </aside>

      <main className="main">
        <header className="topbar">
          {title ? <span>{title}</span> : <img className="logo-img" src="/logo.png" alt="Amfiplier Guild" />}
        </header>
        {!firebaseReady ? (
          <SetupNotice />
        ) : ready ? (
          <div className="panel">{children}</div>
        ) : (
          <div className="center"><div className="spinner" /></div>
        )}
      </main>

      <nav className="bottom-bar">{nav}</nav>
    </div>
  );
}
