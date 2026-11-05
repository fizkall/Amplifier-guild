'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Avatar } from '@/components/Avatar';
import { InstallPrompt } from '@/components/InstallPrompt';
import { isAdminUid } from '@/lib/admin';
import { useAuth } from '@/lib/auth';
import { firebaseReady } from '@/lib/firebase';
import { useManagedProjects } from '@/lib/projects';

function Settings() {
  const { user, profile, signOut } = useAuth();
  const projects = useManagedProjects();
  const [copied, setCopied] = useState(false);
  if (!user || !profile) return null;
  const admin = isAdminUid(user.uid);

  async function copyUid() {
    try {
      await navigator.clipboard.writeText(user!.uid);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* yok say */ }
  }

  return (
    <>
      <div className="pad row">
        <Avatar name={profile.displayName} src={profile.photoURL} size={56} />
        <div style={{ minWidth: 0 }}>
          <div className="post-name">{profile.displayName}</div>
          <div className="meta">@{profile.handle} · {user.email}</div>
          {admin && <span className="chip on" style={{ display: 'inline-block', marginTop: 6, fontSize: 12 }}>Guild yöneticisi</span>}
        </div>
      </div>

      {admin && (
        <>
          <div className="section-head"><span>Yönetim</span></div>
          <Link href="/yonetim" className="card row spread">
            <div><div className="post-name">Yönetim Paneli</div><div className="meta">Girişim/proje aç, yönetici ata, ilanları ve başvuruları yönet</div></div>
            <span aria-hidden>→</span>
          </Link>
        </>
      )}

      {!admin && projects && projects.length > 0 && (
        <>
          <div className="section-head"><span>Yönettiğim projeler</span></div>
          {projects.map((p) => (
            <Link key={p.id} href={`/proje/${p.id}/yonet`} className="card row spread">
              <div className="row"><Avatar name={p.name} src={p.logoUrl} size={36} /><span className="post-name">{p.name}</span></div>
              <span aria-hidden>→</span>
            </Link>
          ))}
        </>
      )}

      <div className="section-head"><span>Hesap</span></div>
      <Link href={`/profil/${profile.handle}`} className="card row spread"><span>Profilim (CV)</span><span aria-hidden>→</span></Link>
      <div className="card stack">
        <div className="row spread">
          <span>Kullanıcı kimliği (UID)</span>
          <button className="link-btn strong" onClick={copyUid}>{copied ? 'Kopyalandı ✓' : 'Kopyala'}</button>
        </div>
        <code className="meta" style={{ wordBreak: 'break-all' }}>{user.uid}</code>
        <span className="meta" style={{ fontSize: 12 }}>Bir projede yönetici olman için bu kimliği Guild yönetimine ilet.</span>
      </div>

      <div className="section-head"><span>Uygulama</span></div>
      <InstallPrompt />
      <a href="/hakkinda" className="card row spread"><span>Hakkında</span><span aria-hidden>→</span></a>
      <a href="/kvkk" className="card row spread"><span>KVKK · Gizlilik · Çerezler</span><span aria-hidden>→</span></a>
      <div className="pad" style={{ display: 'flex', justifyContent: 'center' }}>
        <button className="btn" onClick={() => signOut()}>Çıkış yap</button>
      </div>
    </>
  );
}

export default function AyarlarPage() {
  return <AppShell title="Ayarlar">{firebaseReady && <Settings />}</AppShell>;
}
